"""Fill the database with reproducible, realistic demo data.

uv run python -m app.scripts.seed --reset [--days 90] [--seed 42]
"""

import argparse
import asyncio
import math
import random
import sys
from dataclasses import dataclass
from datetime import UTC, date, datetime, time, timedelta
from typing import Any
from zoneinfo import ZoneInfo

from sqlalchemy import func, insert, select, text
from sqlalchemy.ext.asyncio import AsyncConnection

from app.core.config import get_settings
from app.core.db import engine
from app.models import Category, Location, Order, OrderStatus, Product

COFFEE, TEA, PASTRY, DESSERT = "Кофе", "Чай", "Выпечка", "Десерты"

CATEGORIES: list[tuple[str, str]] = [
    (COFFEE, "#E05A2B"),
    (TEA, "#0F8F8A"),
    (PASTRY, "#C8901A"),
    (DESSERT, "#A2452F"),
]

# (category, name, price ₸, popularity weight inside the category)
PRODUCTS: list[tuple[str, str, int, float]] = [
    (COFFEE, "Эспрессо", 900, 3),
    (COFFEE, "Американо", 1200, 8),
    (COFFEE, "Капучино", 1500, 12),
    (COFFEE, "Латте", 1600, 10),
    (COFFEE, "Флэт уайт", 1700, 6),
    (COFFEE, "Раф ванильный", 1800, 5),
    (COFFEE, "Мокко", 1700, 3),
    (COFFEE, "Колд брю", 1600, 2),
    (TEA, "Чёрный чай", 900, 3),
    (TEA, "Зелёный чай", 900, 3),
    (TEA, "Матча латте", 1800, 5),
    (TEA, "Облепиховый чай", 1300, 5),
    (TEA, "Масала чай", 1500, 2),
    (PASTRY, "Круассан", 1100, 10),
    (PASTRY, "Миндальный круассан", 1400, 3),
    (PASTRY, "Синнабон", 1400, 6),
    (PASTRY, "Маффин", 1000, 3),
    (PASTRY, "Сэндвич с курицей", 2200, 4),
    (PASTRY, "Чиабатта с моцареллой", 2100, 2),
    (DESSERT, "Чизкейк", 2300, 6),
    (DESSERT, "Тирамису", 2100, 4),
    (DESSERT, "Брауни", 1300, 5),
    (DESSERT, "Медовик", 2000, 3),
    (DESSERT, "Макарон", 900, 2),
]

OPENS_AT, CLOSES_AT = time(7, 0), time(22, 0)
CANCEL_RATE = 0.015
TREND = 0.10  # demand grows by ~10% over the seeded period


@dataclass(frozen=True)
class LocationProfile:
    name: str
    slug: str
    address: str
    weekday_orders: float  # mean orders on a regular weekday
    weekday_factors: tuple[float, ...]  # Mon..Sun
    peaks: tuple[tuple[float, float, float], ...]  # (center hour, height, sigma)
    basket_sizes: tuple[float, ...]  # weights for 1..4 positions
    category_boost: dict[str, float]


PROFILES = [
    LocationProfile(
        name="Центр",
        slug="center",
        address="пр. Абылай хана, 45",
        weekday_orders=46,
        weekday_factors=(1.0, 1.0, 1.0, 1.0, 1.05, 0.6, 0.55),
        peaks=((8.6, 1.0, 0.9), (13.0, 0.8, 1.1), (17.8, 0.35, 1.4)),
        basket_sizes=(0.42, 0.34, 0.17, 0.07),
        category_boost={COFFEE: 1.1},
    ),
    LocationProfile(
        name="Университет",
        slug="university",
        address="ул. Сатпаева, 22",
        weekday_orders=45,
        weekday_factors=(1.0, 1.0, 1.0, 1.0, 0.9, 0.3, 0.2),
        peaks=((9.0, 1.0, 1.1), (13.0, 0.9, 0.9), (16.0, 0.4, 1.4)),
        basket_sizes=(0.62, 0.29, 0.07, 0.02),
        category_boost={PASTRY: 1.2, DESSERT: 0.6},
    ),
    LocationProfile(
        name="Набережная",
        slug="embankment",
        address="наб. реки Есентай, 8",
        weekday_orders=25,
        weekday_factors=(0.9, 0.95, 0.95, 1.0, 1.15, 1.85, 1.75),
        peaks=((14.5, 1.0, 2.8), (19.0, 0.55, 1.4), (9.0, 0.2, 1.0)),
        basket_sizes=(0.34, 0.36, 0.2, 0.1),
        category_boost={DESSERT: 1.8, TEA: 1.2},
    ),
]


def category_weights(hour: int) -> dict[str, float]:
    if hour < 11:
        return {COFFEE: 0.58, TEA: 0.10, PASTRY: 0.27, DESSERT: 0.05}
    if hour < 16:
        return {COFFEE: 0.42, TEA: 0.18, PASTRY: 0.20, DESSERT: 0.20}
    return {COFFEE: 0.38, TEA: 0.22, PASTRY: 0.12, DESSERT: 0.28}


def hourly_shares(profile: LocationProfile) -> dict[int, float]:
    """Share of daily orders per opening hour: a mixture of gaussians plus a small floor."""
    hours = range(OPENS_AT.hour, CLOSES_AT.hour)
    raw = {
        h: 0.08
        + sum(height * math.exp(-(((h + 0.5) - c) ** 2) / (2 * s**2)) for c, height, s in profile.peaks)
        for h in hours
    }
    total = sum(raw.values())
    return {h: v / total for h, v in raw.items()}


def poisson(rng: random.Random, lam: float) -> int:
    threshold, k, p = math.exp(-lam), 0, 1.0
    while True:
        p *= rng.random()
        if p <= threshold:
            return k
        k += 1


@dataclass
class GeneratedOrder:
    location_id: int
    created_at: datetime
    status: OrderStatus
    lines: list[tuple[int, int, int]]  # (product_id, quantity, unit_price)


def generate_orders(
    rng: random.Random,
    days: int,
    tz: ZoneInfo,
    location_ids: dict[str, int],
    products: dict[str, list[tuple[int, int, float]]],
) -> list[GeneratedOrder]:
    now = datetime.now(tz)
    first_day = now.date() - timedelta(days=days - 1)
    orders: list[GeneratedOrder] = []

    for profile in PROFILES:
        shares = hourly_shares(profile)
        boost = profile.category_boost
        for day_index in range(days):
            day: date = first_day + timedelta(days=day_index)
            trend = 1 + TREND * day_index / max(days - 1, 1)
            noise = rng.lognormvariate(0, 0.08)
            daily = profile.weekday_orders * profile.weekday_factors[day.weekday()] * trend * noise
            for hour, share in shares.items():
                slot_start = datetime.combine(day, time(hour), tzinfo=tz)
                if slot_start + timedelta(hours=1) > now:
                    continue  # today only up to the current hour
                cat_weights = {c: w * boost.get(c, 1.0) for c, w in category_weights(hour).items()}
                for _ in range(poisson(rng, daily * share)):
                    created_at = slot_start + timedelta(seconds=rng.randrange(3600))
                    orders.append(
                        GeneratedOrder(
                            location_id=location_ids[profile.slug],
                            created_at=created_at.astimezone(UTC),
                            status=OrderStatus.CANCELLED
                            if rng.random() < CANCEL_RATE
                            else OrderStatus.COMPLETED,
                            lines=build_basket(rng, profile, cat_weights, products),
                        )
                    )
    orders.sort(key=lambda o: o.created_at)
    return orders


def build_basket(
    rng: random.Random,
    profile: LocationProfile,
    cat_weights: dict[str, float],
    products: dict[str, list[tuple[int, int, float]]],
) -> list[tuple[int, int, int]]:
    size = rng.choices(range(1, 5), weights=profile.basket_sizes)[0]
    basket: dict[int, list[int]] = {}  # product_id -> [quantity, unit_price]
    categories = list(cat_weights)
    for _ in range(size):
        category = rng.choices(categories, weights=[cat_weights[c] for c in categories])[0]
        options = products[category]
        product_id, price, _weight = rng.choices(options, weights=[o[2] for o in options])[0]
        quantity = 2 if rng.random() < 0.08 else 1
        if product_id in basket:
            basket[product_id][0] += quantity
        else:
            basket[product_id] = [quantity, price]
    return [(pid, qty, price) for pid, (qty, price) in basket.items()]


async def insert_reference_data(
    conn: AsyncConnection,
) -> tuple[dict[str, int], dict[str, list[tuple[int, int, float]]]]:
    location_rows = await conn.execute(
        insert(Location).returning(Location.slug, Location.id),
        [
            {
                "name": p.name,
                "slug": p.slug,
                "address": p.address,
                "opens_at": OPENS_AT,
                "closes_at": CLOSES_AT,
            }
            for p in PROFILES
        ],
    )
    location_ids = {slug: id_ for slug, id_ in location_rows.all()}

    category_rows = await conn.execute(
        insert(Category).returning(Category.name, Category.id),
        [{"name": n, "color": c, "sort_order": i} for i, (n, c) in enumerate(CATEGORIES, start=1)],
    )
    category_ids = {name: id_ for name, id_ in category_rows.all()}

    product_rows = await conn.execute(
        insert(Product).returning(Product.name, Product.id),
        [{"category_id": category_ids[c], "name": n, "price": p} for c, n, p, _ in PRODUCTS],
    )
    product_ids = {name: id_ for name, id_ in product_rows.all()}

    products: dict[str, list[tuple[int, int, float]]] = {c: [] for c, _ in CATEGORIES}
    for category, name, price, weight in PRODUCTS:
        products[category].append((product_ids[name], price, weight))
    return location_ids, products


async def copy_orders(conn: AsyncConnection, orders: list[GeneratedOrder]) -> int:
    order_records: list[tuple[Any, ...]] = []
    item_records: list[tuple[Any, ...]] = []
    for order_id, order in enumerate(orders, start=1):
        total = sum(qty * price for _, qty, price in order.lines)
        items_count = sum(qty for _, qty, _ in order.lines)
        order_records.append(
            (order_id, order.location_id, order.created_at, order.status.value, total, items_count)
        )
        for product_id, qty, price in order.lines:
            item_records.append((len(item_records) + 1, order_id, product_id, qty, price, qty * price))

    raw = await conn.get_raw_connection()
    driver = raw.driver_connection
    assert driver is not None
    await driver.copy_records_to_table(
        "orders",
        records=order_records,
        columns=["id", "location_id", "created_at", "status", "total_amount", "items_count"],
    )
    await driver.copy_records_to_table(
        "order_items",
        records=item_records,
        columns=["id", "order_id", "product_id", "quantity", "unit_price", "line_total"],
    )
    for table in ("orders", "order_items"):
        await conn.execute(
            text(f"SELECT setval(pg_get_serial_sequence('{table}', 'id'), (SELECT max(id) FROM {table}))")
        )
    return len(item_records)


async def seed(days: int, rng_seed: int, reset: bool) -> None:
    settings = get_settings()
    async with engine.begin() as conn:
        has_data = await conn.scalar(select(func.count()).select_from(Location))
        if has_data and not reset:
            sys.exit("Database already has data. Run with --reset to wipe and reseed it.")
        if reset:
            await conn.execute(
                text("TRUNCATE order_items, orders, products, categories, locations RESTART IDENTITY CASCADE")
            )

        location_ids, products = await insert_reference_data(conn)
        orders = generate_orders(random.Random(rng_seed), days, settings.tz, location_ids, products)
        items = await copy_orders(conn, orders)

        print(f"Seeded {len(orders)} orders and {items} order items over {days} days")
        summary = await conn.execute(
            select(
                Location.name,
                func.count(Order.id),
                func.sum(Order.total_amount),
                func.round(func.avg(Order.total_amount)),
            )
            .join(Order, Order.location_id == Location.id)
            .where(Order.status != OrderStatus.CANCELLED)
            .group_by(Location.id)
            .order_by(Location.id)
        )
        for name, count, revenue, avg_check in summary:
            print(f"  {name:<12} orders={count:>6}  revenue={revenue:>12,} KZT  avg check={avg_check} KZT")
    await engine.dispose()


def main() -> None:
    parser = argparse.ArgumentParser(description="Seed CoffeeMetrics with demo data")
    parser.add_argument("--days", type=int, default=90, help="number of days of history (default: 90)")
    parser.add_argument("--seed", type=int, default=42, help="random seed for reproducible data")
    parser.add_argument("--reset", action="store_true", help="wipe existing data first")
    args = parser.parse_args()
    asyncio.run(seed(args.days, args.seed, args.reset))


if __name__ == "__main__":
    main()
