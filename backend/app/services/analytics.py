"""SQL aggregations for dashboard charts.

All grouping is done in PostgreSQL. Local time is computed once in the `orders` CTE
(`created_at AT TIME ZONE :tz`), and GROUP BY expressions reference only CTE columns:
asyncpg sends every literal as a separate `$n` parameter, so a parameter inside a
GROUP BY expression would not match the same expression in SELECT.
"""

from datetime import timedelta
from typing import Any

from sqlalchemy import (
    CTE,
    ColumnElement,
    Date,
    Integer,
    Interval,
    Numeric,
    and_,
    cast,
    distinct,
    extract,
    func,
    literal,
    select,
    true,
)
from sqlalchemy.ext.asyncio import AsyncSession

from app.models import Category, Location, Order, OrderItem, OrderStatus, Product
from app.schemas.analytics import (
    BestProduct,
    CategoryShare,
    CategoryShareItem,
    HeatmapCell,
    Kpi,
    LocationCompareItem,
    Metric,
    RevenueDailyPoint,
    TopProduct,
)
from app.services.periods import Period

HEATMAP_FIRST_HOUR = 7
HEATMAP_LAST_HOUR = 22


def _orders_cte(period: Period, location_id: int | None, *, with_previous: bool) -> CTE:
    """Non-cancelled orders of the period (optionally with the previous period) and their local time."""
    stmt = select(
        Order.id,
        Order.location_id,
        Order.total_amount,
        Order.created_at,
        func.timezone(period.tz.key, Order.created_at).label("local_ts"),
    ).where(
        Order.status != OrderStatus.CANCELLED,
        Order.created_at >= (period.prev_start if with_previous else period.start),
        Order.created_at < period.end,
    )
    if location_id is not None:
        stmt = stmt.where(Order.location_id == location_id)
    return stmt.cte("o")


def _delta_pct(current: ColumnElement[Any], previous: ColumnElement[Any]) -> ColumnElement[Any]:
    """Percent change rounded to 0.1; NULL when there is nothing to compare with."""
    return func.round(cast(current - previous, Numeric) * 100 / func.nullif(previous, 0), 1)


def _avg(total: ColumnElement[Any], count: ColumnElement[Any]) -> ColumnElement[int]:
    return func.coalesce(cast(func.round(cast(total, Numeric) / func.nullif(count, 0)), Integer), 0)


def _pct(part: ColumnElement[Any], whole: ColumnElement[Any]) -> ColumnElement[Any]:
    return func.coalesce(func.round(cast(part, Numeric) * 100 / func.nullif(whole, 0), 1), 0)


async def get_kpi(session: AsyncSession, period: Period, location_id: int | None) -> Kpi:
    o = _orders_cte(period, location_id, with_previous=True)
    is_current = o.c.created_at >= period.start

    totals = select(
        func.coalesce(func.sum(o.c.total_amount).filter(is_current), 0).label("revenue"),
        func.count().filter(is_current).label("orders"),
        func.coalesce(func.sum(o.c.total_amount).filter(~is_current), 0).label("prev_revenue"),
        func.count().filter(~is_current).label("prev_orders"),
    ).subquery("t")
    avg_check = _avg(totals.c.revenue, totals.c.orders)
    prev_avg_check = _avg(totals.c.prev_revenue, totals.c.prev_orders)
    kpi_stmt = select(
        totals.c.revenue,
        totals.c.prev_revenue,
        _delta_pct(totals.c.revenue, totals.c.prev_revenue).label("revenue_delta"),
        totals.c.orders,
        totals.c.prev_orders,
        _delta_pct(totals.c.orders, totals.c.prev_orders).label("orders_delta"),
        avg_check.label("avg_check"),
        prev_avg_check.label("prev_avg_check"),
        _delta_pct(avg_check, prev_avg_check).label("avg_check_delta"),
    )
    k = (await session.execute(kpi_stmt)).one()

    quantity = func.sum(OrderItem.quantity).filter(is_current)
    prev_quantity = func.coalesce(func.sum(OrderItem.quantity).filter(~is_current), 0)
    orders_with_product = func.count(distinct(OrderItem.order_id)).filter(is_current)
    current_orders = select(func.count()).select_from(o).where(is_current).scalar_subquery()
    best_stmt = (
        select(
            Product.id,
            Product.name,
            quantity.label("quantity"),
            _pct(orders_with_product, current_orders).label("order_share_pct"),
            _delta_pct(quantity, prev_quantity).label("delta_pct"),
        )
        .select_from(OrderItem)
        .join(o, o.c.id == OrderItem.order_id)
        .join(Product, Product.id == OrderItem.product_id)
        .group_by(Product.id)
        .having(quantity > 0)
        .order_by(quantity.desc(), Product.id)
        .limit(1)
    )
    best = (await session.execute(best_stmt)).mappings().one_or_none()

    return Kpi(
        revenue=Metric(value=k.revenue, previous=k.prev_revenue, delta_pct=k.revenue_delta),
        orders_count=Metric(value=k.orders, previous=k.prev_orders, delta_pct=k.orders_delta),
        avg_check=Metric(value=k.avg_check, previous=k.prev_avg_check, delta_pct=k.avg_check_delta),
        best_product=BestProduct.model_validate(best) if best else None,
    )


async def get_revenue_daily(
    session: AsyncSession, period: Period, location_id: int | None
) -> list[RevenueDailyPoint]:
    o = _orders_cte(period, location_id, with_previous=True)
    local_day = cast(o.c.local_ts, Date)
    daily = (
        select(
            local_day.label("day"),
            func.sum(o.c.total_amount).label("revenue"),
            func.count().label("orders_count"),
        )
        .group_by(local_day)
        .cte("daily")
    )
    series = (
        func.generate_series(
            literal(period.date_from, Date),
            literal(period.date_to, Date),
            literal(timedelta(days=1), Interval),
        )
        .table_valued("value")
        .render_derived(name="gs")
    )
    days = select(cast(series.c.value, Date).label("day")).cte("days")
    cur = daily.alias("cur")
    prev = daily.alias("prev")

    stmt = (
        select(
            days.c.day.label("date"),
            func.coalesce(cur.c.revenue, 0).label("revenue"),
            func.coalesce(cur.c.orders_count, 0).label("orders_count"),
            func.coalesce(prev.c.revenue, 0).label("previous_revenue"),
        )
        .select_from(days)
        .outerjoin(cur, cur.c.day == days.c.day)
        .outerjoin(prev, prev.c.day == days.c.day - period.days)
        .order_by(days.c.day)
    )
    rows = (await session.execute(stmt)).mappings().all()
    return [RevenueDailyPoint.model_validate(row) for row in rows]


async def get_top_products(
    session: AsyncSession, period: Period, location_id: int | None, limit: int
) -> list[TopProduct]:
    o = _orders_cte(period, location_id, with_previous=False)
    quantity = func.sum(OrderItem.quantity).label("quantity")
    stmt = (
        select(
            Product.id.label("product_id"),
            Product.name,
            Product.category_id,
            Category.color.label("category_color"),
            quantity,
            func.sum(OrderItem.line_total).label("revenue"),
        )
        .select_from(OrderItem)
        .join(o, o.c.id == OrderItem.order_id)
        .join(Product, Product.id == OrderItem.product_id)
        .join(Category, Category.id == Product.category_id)
        .group_by(Product.id, Category.id)
        .order_by(quantity.desc(), Product.id)
        .limit(limit)
    )
    rows = (await session.execute(stmt)).mappings().all()
    return [TopProduct.model_validate(row) for row in rows]


async def get_category_share(session: AsyncSession, period: Period, location_id: int | None) -> CategoryShare:
    o = _orders_cte(period, location_id, with_previous=False)
    by_category = (
        select(Product.category_id, func.sum(OrderItem.line_total).label("revenue"))
        .select_from(OrderItem)
        .join(o, o.c.id == OrderItem.order_id)
        .join(Product, Product.id == OrderItem.product_id)
        .group_by(Product.category_id)
        .subquery("by_category")
    )
    revenue = func.coalesce(by_category.c.revenue, 0)
    total = func.sum(revenue).over()
    stmt = (
        select(
            Category.id.label("category_id"),
            Category.name,
            Category.color,
            revenue.label("revenue"),
            _pct(revenue, total).label("share_pct"),
            func.coalesce(total, 0).label("total_revenue"),
        )
        .outerjoin(by_category, by_category.c.category_id == Category.id)
        .order_by(Category.sort_order, Category.id)
    )
    rows = (await session.execute(stmt)).mappings().all()
    return CategoryShare(
        total_revenue=rows[0]["total_revenue"] if rows else 0,
        items=[CategoryShareItem.model_validate(row) for row in rows],
    )


async def get_heatmap(session: AsyncSession, period: Period, location_id: int | None) -> list[HeatmapCell]:
    o = _orders_cte(period, location_id, with_previous=False)

    series = (
        func.generate_series(
            literal(period.date_from, Date),
            literal(period.date_to, Date),
            literal(timedelta(days=1), Interval),
        )
        .table_valued("value")
        .render_derived(name="gs")
    )
    isodow_of_day = extract("isodow", cast(series.c.value, Date))
    weekdays = (
        select(isodow_of_day.label("isodow"), func.count().label("days"))
        .select_from(series)
        .group_by(isodow_of_day)
        .cte("weekdays")
    )
    hours = (
        func.generate_series(HEATMAP_FIRST_HOUR, HEATMAP_LAST_HOUR)
        .table_valued("value")
        .render_derived(name="h")
    )

    order_isodow = extract("isodow", o.c.local_ts)
    order_hour = extract("hour", o.c.local_ts)
    counts = (
        select(order_isodow.label("isodow"), order_hour.label("hour"), func.count().label("orders"))
        .group_by(order_isodow, order_hour)
        .cte("counts")
    )

    stmt = (
        select(
            cast(weekdays.c.isodow - 1, Integer).label("weekday"),
            hours.c.value.label("hour"),
            func.round(cast(func.coalesce(counts.c.orders, 0), Numeric) / weekdays.c.days, 1).label(
                "avg_orders"
            ),
        )
        .select_from(weekdays)
        .join(hours, true())
        .outerjoin(counts, and_(counts.c.isodow == weekdays.c.isodow, counts.c.hour == hours.c.value))
        .order_by(weekdays.c.isodow, hours.c.value)
    )
    rows = (await session.execute(stmt)).mappings().all()
    return [HeatmapCell.model_validate(row) for row in rows]


async def get_locations_compare(session: AsyncSession, period: Period) -> list[LocationCompareItem]:
    o = _orders_cte(period, None, with_previous=True)
    is_current = o.c.created_at >= period.start
    by_location = (
        select(
            o.c.location_id,
            func.sum(o.c.total_amount).filter(is_current).label("revenue"),
            func.count().filter(is_current).label("orders"),
            func.sum(o.c.total_amount).filter(~is_current).label("prev_revenue"),
        )
        .group_by(o.c.location_id)
        .subquery("by_location")
    )
    revenue = func.coalesce(by_location.c.revenue, 0)
    orders = func.coalesce(by_location.c.orders, 0)
    prev_revenue = func.coalesce(by_location.c.prev_revenue, 0)
    stmt = (
        select(
            Location.id.label("location_id"),
            Location.name,
            revenue.label("revenue"),
            orders.label("orders_count"),
            _avg(revenue, orders).label("avg_check"),
            _delta_pct(revenue, prev_revenue).label("delta_pct"),
        )
        .outerjoin(by_location, by_location.c.location_id == Location.id)
        .order_by(Location.id)
    )
    rows = (await session.execute(stmt)).mappings().all()
    return [LocationCompareItem.model_validate(row) for row in rows]
