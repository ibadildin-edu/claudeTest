import random
from collections.abc import AsyncIterator
from datetime import datetime, time

import pytest
from httpx import ASGITransport, AsyncClient
from sqlalchemy import insert, text
from sqlalchemy.engine import make_url
from sqlalchemy.ext.asyncio import AsyncEngine, AsyncSession, async_sessionmaker, create_async_engine
from sqlalchemy.pool import NullPool

from app.api.v1.deps import get_simulator
from app.core.config import get_settings
from app.core.db import get_session
from app.main import create_app
from app.models import Base, Category, Location, Order, OrderItem, OrderStatus, Product
from app.services.simulator import OrderSimulator

settings = get_settings()
TEST_DB_URL = settings.test_database_url
assert (make_url(TEST_DB_URL).database or "").endswith("_test"), "Tests must never touch the main database"

TZ = settings.tz


def local(value: str) -> datetime:
    """Almaty wall-clock time, e.g. local("2026-03-09 08:15")."""
    return datetime.fromisoformat(value).replace(tzinfo=TZ)


@pytest.fixture(scope="session")
async def engine() -> AsyncIterator[AsyncEngine]:
    engine = create_async_engine(TEST_DB_URL, poolclass=NullPool)
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)
        await conn.run_sync(Base.metadata.create_all)
    yield engine
    await engine.dispose()


@pytest.fixture
async def session_factory(engine: AsyncEngine) -> async_sessionmaker[AsyncSession]:
    async with engine.begin() as conn:
        await conn.execute(
            text("TRUNCATE order_items, orders, products, categories, locations RESTART IDENTITY CASCADE")
        )
    return async_sessionmaker(engine, expire_on_commit=False)


# Thursday lunchtime right after the dataset below: every location is open.
SIMULATOR_NOW = local("2026-03-12 13:10")


@pytest.fixture
async def simulator(session_factory: async_sessionmaker[AsyncSession]) -> AsyncIterator[OrderSimulator]:
    """Fast simulator on the test database with a frozen clock."""
    simulator = OrderSimulator(
        session_factory, TZ, interval=(0.01, 0.02), clock=lambda: SIMULATOR_NOW, rng=random.Random(7)
    )
    yield simulator
    await simulator.stop()


@pytest.fixture
async def client(
    session_factory: async_sessionmaker[AsyncSession], simulator: OrderSimulator
) -> AsyncIterator[AsyncClient]:
    async def override_session() -> AsyncIterator[AsyncSession]:
        async with session_factory() as session:
            yield session

    app = create_app()
    app.dependency_overrides[get_session] = override_session
    app.dependency_overrides[get_simulator] = lambda: simulator
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        yield ac


# Orders: (location_id, local time, status, [(product_id, quantity)])
# Products: 1 Капучино 1500, 2 Латте 1600 (Кофе); 3 Чизкейк 2300 (Десерты).
# Current period 2026-03-09 (Mon) .. 2026-03-10 (Tue), previous 2026-03-07 .. 2026-03-08.
ORDERS: list[tuple[int, str, OrderStatus, list[tuple[int, int]]]] = [
    (1, "2026-03-07 12:00", OrderStatus.COMPLETED, [(2, 1)]),  # previous: 1600
    (1, "2026-03-08 09:00", OrderStatus.COMPLETED, [(1, 1)]),  # previous: 1500
    (1, "2026-03-09 08:15", OrderStatus.COMPLETED, [(1, 2)]),  # 3000
    (1, "2026-03-09 08:40", OrderStatus.COMPLETED, [(1, 1), (3, 1)]),  # 3800
    (2, "2026-03-10 13:05", OrderStatus.COMPLETED, [(2, 1)]),  # 1600
    (2, "2026-03-10 13:30", OrderStatus.CANCELLED, [(3, 1)]),  # ignored by analytics
    (1, "2026-03-11 00:30", OrderStatus.COMPLETED, [(2, 1)]),  # still 2026-03-10 in UTC, out of period
]
PRICES = {1: 1500, 2: 1600, 3: 2300}


@pytest.fixture
async def dataset(session_factory: async_sessionmaker[AsyncSession]) -> None:
    async with session_factory() as session:
        await session.execute(
            insert(Location),
            [
                {
                    "name": "Центр",
                    "slug": "center",
                    "address": "ул. 1",
                    "opens_at": time(7),
                    "closes_at": time(22),
                },
                {
                    "name": "Университет",
                    "slug": "university",
                    "address": "ул. 2",
                    "opens_at": time(7),
                    "closes_at": time(22),
                },
            ],
        )
        await session.execute(
            insert(Category),
            [
                {"name": "Кофе", "color": "#E05A2B", "sort_order": 1},
                {"name": "Десерты", "color": "#A2452F", "sort_order": 2},
            ],
        )
        await session.execute(
            insert(Product),
            [
                {"category_id": 1, "name": "Капучино", "price": 1500},
                {"category_id": 1, "name": "Латте", "price": 1600},
                {"category_id": 2, "name": "Чизкейк", "price": 2300},
            ],
        )
        for location_id, created_at, status, lines in ORDERS:
            session.add(
                Order(
                    location_id=location_id,
                    created_at=local(created_at),
                    status=status,
                    total_amount=sum(PRICES[p] * q for p, q in lines),
                    items_count=sum(q for _, q in lines),
                    items=[
                        OrderItem(product_id=p, quantity=q, unit_price=PRICES[p], line_total=PRICES[p] * q)
                        for p, q in lines
                    ],
                )
            )
        await session.commit()
