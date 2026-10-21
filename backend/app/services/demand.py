"""Demand model for simulated live orders: which location orders what right now.

Popularity comes from the order history: for the current local hour and day type
(weekday / weekend) PostgreSQL counts orders per location, basket sizes and sold
quantities per product over the last four weeks. Today is excluded, so orders created
by the simulator do not feed back into the model while it runs.
"""

import random
from collections import Counter
from collections.abc import Mapping, Sequence
from dataclasses import dataclass
from datetime import datetime, time, timedelta
from zoneinfo import ZoneInfo

from sqlalchemy import extract, func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models import Location, Order, OrderItem, OrderStatus, Product
from app.services.periods import local_day_start

HISTORY_DAYS = 28
MAX_BASKET = 6
WEEKEND_ISODOW = (6, 7)
# Pseudo-count added to every location and product: new ones still get orders.
SMOOTHING = 1.0
# Basket sizes when a location has no history for this hour.
DEFAULT_BASKET_SIZES: dict[int, float] = {1: 0.5, 2: 0.3, 3: 0.14, 4: 0.06}


@dataclass(frozen=True)
class DemandStats:
    """History of one local hour and day type, per location."""

    basket_sizes: dict[int, dict[int, int]]  # location_id -> {items_count: orders}
    quantities: dict[int, dict[int, int]]  # location_id -> {product_id: sold quantity}

    def orders(self, location_id: int) -> int:
        return sum(self.basket_sizes.get(location_id, {}).values())


@dataclass(frozen=True)
class OpeningHours:
    location_id: int
    opens_at: time
    closes_at: time

    def is_open(self, at: time) -> bool:
        return self.opens_at <= at < self.closes_at


@dataclass(frozen=True)
class OrderLine:
    product_id: int
    quantity: int
    unit_price: int


@dataclass(frozen=True)
class OrderDraft:
    location_id: int
    lines: list[OrderLine]


async def load_stats(session: AsyncSession, now: datetime, tz: ZoneInfo) -> DemandStats:
    local_now = now.astimezone(tz)
    today = local_now.date()
    local_ts = func.timezone(tz.key, Order.created_at)
    weekend = extract("isodow", local_ts).in_(WEEKEND_ISODOW)
    recent = (
        select(
            Order.id,
            Order.location_id,
            func.least(Order.items_count, MAX_BASKET).label("basket_size"),
        )
        .where(
            Order.status != OrderStatus.CANCELLED,
            Order.created_at >= local_day_start(today - timedelta(days=HISTORY_DAYS), tz),
            Order.created_at < local_day_start(today, tz),
            extract("hour", local_ts) == local_now.hour,
            weekend if local_now.isoweekday() in WEEKEND_ISODOW else ~weekend,
        )
        .cte("recent")
    )

    basket_rows = await session.execute(
        select(recent.c.location_id, recent.c.basket_size, func.count()).group_by(
            recent.c.location_id, recent.c.basket_size
        )
    )
    basket_sizes: dict[int, dict[int, int]] = {}
    for location_id, size, count in basket_rows:
        basket_sizes.setdefault(location_id, {})[size] = count

    quantity_rows = await session.execute(
        select(recent.c.location_id, OrderItem.product_id, func.sum(OrderItem.quantity))
        .join(OrderItem, OrderItem.order_id == recent.c.id)
        .group_by(recent.c.location_id, OrderItem.product_id)
    )
    quantities: dict[int, dict[int, int]] = {}
    for location_id, product_id, quantity in quantity_rows:
        quantities.setdefault(location_id, {})[product_id] = quantity

    return DemandStats(basket_sizes=basket_sizes, quantities=quantities)


async def load_opening_hours(session: AsyncSession) -> list[OpeningHours]:
    rows = await session.execute(
        select(Location.id, Location.opens_at, Location.closes_at).order_by(Location.id)
    )
    return [OpeningHours(*row) for row in rows]


async def load_menu(session: AsyncSession) -> dict[int, int]:
    """Active products and their current prices: product_id -> price."""
    rows = await session.execute(
        select(Product.id, Product.price).where(Product.is_active.is_(True)).order_by(Product.id)
    )
    return {product_id: price for product_id, price in rows}


def draft_order(
    rng: random.Random,
    stats: DemandStats,
    location_ids: Sequence[int],
    menu: Mapping[int, int],
) -> OrderDraft:
    """Pick a location by its load at this hour, then a basket by product popularity there."""
    location_id = rng.choices(location_ids, weights=[stats.orders(id_) + SMOOTHING for id_ in location_ids])[
        0
    ]

    sizes: Mapping[int, float] = stats.basket_sizes.get(location_id) or DEFAULT_BASKET_SIZES
    size = rng.choices(list(sizes), weights=list(sizes.values()))[0]

    sold = stats.quantities.get(location_id, {})
    product_ids = list(menu)
    picks = Counter(
        rng.choices(product_ids, weights=[sold.get(id_, 0) + SMOOTHING for id_ in product_ids], k=size)
    )
    return OrderDraft(
        location_id=location_id,
        lines=[OrderLine(product_id, quantity, menu[product_id]) for product_id, quantity in picks.items()],
    )
