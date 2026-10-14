from datetime import timedelta
from typing import Any
from zoneinfo import ZoneInfo

from sqlalchemy import ColumnElement, Select, String, case, cast, exists, func, literal, select
from sqlalchemy.dialects.postgresql import aggregate_order_by
from sqlalchemy.ext.asyncio import AsyncSession

from app.models import Location, Order, OrderItem, Product
from app.schemas.base import Page
from app.schemas.order import OrderFilters, OrderItemRead, OrderListItem, OrderRead, OrderSort
from app.services.errors import NotFoundError
from app.services.periods import local_day_start

SORT_COLUMNS: dict[OrderSort, ColumnElement[Any]] = {
    OrderSort.CREATED_AT_DESC: Order.created_at.desc(),
    OrderSort.CREATED_AT_ASC: Order.created_at.asc(),
    OrderSort.TOTAL_DESC: Order.total_amount.desc(),
    OrderSort.TOTAL_ASC: Order.total_amount.asc(),
    OrderSort.ID_DESC: Order.id.desc(),
    OrderSort.ID_ASC: Order.id.asc(),
}


def _filter_conditions(filters: OrderFilters, tz: ZoneInfo) -> list[ColumnElement[bool]]:
    conditions: list[ColumnElement[bool]] = []
    if filters.location_id is not None:
        conditions.append(Order.location_id == filters.location_id)
    if filters.status is not None:
        conditions.append(Order.status == filters.status)
    if filters.date_from is not None:
        conditions.append(Order.created_at >= local_day_start(filters.date_from, tz))
    if filters.date_to is not None:
        conditions.append(Order.created_at < local_day_start(filters.date_to + timedelta(days=1), tz))
    if filters.min_total is not None:
        conditions.append(Order.total_amount >= filters.min_total)
    if filters.max_total is not None:
        conditions.append(Order.total_amount <= filters.max_total)
    if filters.product_id is not None:
        conditions.append(
            exists().where(OrderItem.order_id == Order.id, OrderItem.product_id == filters.product_id)
        )
    if filters.category_id is not None:
        conditions.append(
            exists()
            .where(OrderItem.order_id == Order.id)
            .where(Product.id == OrderItem.product_id, Product.category_id == filters.category_id)
        )
    return conditions


def _items_summary() -> Select[tuple[str]]:
    """«Капучино ×2, Круассан» — positions of the order in insertion order."""
    item_label = case(
        (OrderItem.quantity > 1, Product.name + " ×" + cast(OrderItem.quantity, String)),
        else_=Product.name,
    )
    return (
        select(func.string_agg(item_label, aggregate_order_by(literal(", "), OrderItem.id)))
        .select_from(OrderItem)
        .join(Product, Product.id == OrderItem.product_id)
        .where(OrderItem.order_id == Order.id)
    )


async def list_orders(session: AsyncSession, filters: OrderFilters, tz: ZoneInfo) -> Page[OrderListItem]:
    conditions = _filter_conditions(filters, tz)

    total = await session.scalar(select(func.count()).select_from(Order).where(*conditions)) or 0

    stmt = (
        select(
            Order.id,
            Order.location_id,
            Location.name.label("location_name"),
            Order.created_at,
            Order.status,
            Order.total_amount,
            Order.items_count,
            func.coalesce(_items_summary().scalar_subquery(), "").label("items_summary"),
        )
        .join(Location, Location.id == Order.location_id)
        .where(*conditions)
        .order_by(SORT_COLUMNS[filters.sort], Order.id.desc())
        .limit(filters.page_size)
        .offset((filters.page - 1) * filters.page_size)
    )
    rows = (await session.execute(stmt)).mappings().all()
    return Page[OrderListItem](
        items=[OrderListItem.model_validate(row) for row in rows],
        total=total,
        page=filters.page,
        page_size=filters.page_size,
    )


async def get_order(session: AsyncSession, order_id: int) -> OrderRead:
    order_stmt = (
        select(
            Order.id,
            Order.location_id,
            Location.name.label("location_name"),
            Order.created_at,
            Order.status,
            Order.total_amount,
            Order.items_count,
        )
        .join(Location, Location.id == Order.location_id)
        .where(Order.id == order_id)
    )
    order = (await session.execute(order_stmt)).mappings().one_or_none()
    if order is None:
        raise NotFoundError(f"Order {order_id} not found")

    items_stmt = (
        select(
            OrderItem.id,
            OrderItem.product_id,
            Product.name.label("product_name"),
            Product.category_id,
            OrderItem.quantity,
            OrderItem.unit_price,
            OrderItem.line_total,
        )
        .join(Product, Product.id == OrderItem.product_id)
        .where(OrderItem.order_id == order_id)
        .order_by(OrderItem.id)
    )
    items = (await session.execute(items_stmt)).mappings().all()
    return OrderRead.model_validate(
        {**order, "items": [OrderItemRead.model_validate(item) for item in items]}
    )
