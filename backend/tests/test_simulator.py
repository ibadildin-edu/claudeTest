import asyncio
import random
from collections import Counter
from collections.abc import Callable
from datetime import datetime

import pytest
from httpx import AsyncClient
from sqlalchemy import func, select, update
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker

from app.models import Order, OrderStatus, Product
from app.services.demand import DemandStats, draft_order, load_stats
from app.services.simulator import OrderSimulator
from tests.conftest import PRICES, SIMULATOR_NOW, TZ, local

DATASET_ORDERS = 7
WAIT_SECONDS = 5.0


async def wait_until(condition: Callable[[], bool]) -> None:
    async with asyncio.timeout(WAIT_SECONDS):
        while True:
            if condition():
                return
            await asyncio.sleep(0.01)


async def count_orders(
    session_factory: async_sessionmaker[AsyncSession], status: OrderStatus | None = None
) -> int:
    stmt = select(func.count()).select_from(Order).where(Order.id > DATASET_ORDERS)
    if status is not None:
        stmt = stmt.where(Order.status == status)
    async with session_factory() as session:
        return await session.scalar(stmt) or 0


def test_draft_order_follows_location_load_and_product_popularity() -> None:
    stats = DemandStats(
        basket_sizes={1: {2: 50}, 2: {1: 1}},
        quantities={1: {10: 100}},
    )
    menu = {10: 1500, 11: 900}
    rng = random.Random(1)

    drafts = [draft_order(rng, stats, [1, 2], menu) for _ in range(1000)]

    locations = Counter(d.location_id for d in drafts)
    assert locations[1] > 900  # 51 : 2 by orders at this hour (+1 smoothing each)
    busy = [d for d in drafts if d.location_id == 1]
    assert all(sum(line.quantity for line in d.lines) == 2 for d in busy)
    sold = Counter(line.product_id for d in busy for line in d.lines for _ in range(line.quantity))
    assert sold[10] > 0.95 * sum(sold.values())
    lines = [line for d in drafts for line in d.lines]
    assert {line.product_id for line in lines} <= set(menu)
    assert all(line.unit_price == menu[line.product_id] for line in lines)


@pytest.mark.usefixtures("dataset")
@pytest.mark.parametrize(
    ("now", "basket_sizes", "quantities"),
    [
        # Thursday 13h: Tuesday's 13:05 order; the cancelled 13:30 one is ignored.
        ("2026-03-12 13:10", {2: {1: 1}}, {2: {2: 1}}),
        # Thursday 08h: both Monday morning orders, 3 Капучино and 1 Чизкейк.
        ("2026-03-12 08:30", {1: {2: 2}}, {1: {1: 3, 3: 1}}),
        # Weekend hours only learn from weekends: Sunday's 09:00 order.
        ("2026-03-14 09:30", {1: {1: 1}}, {1: {1: 1}}),
        ("2026-03-12 09:30", {}, {}),
        # Today is excluded, so the simulator does not learn from its own orders.
        ("2026-03-10 13:40", {}, {}),
    ],
)
async def test_load_stats_uses_current_hour_and_day_type(
    session_factory: async_sessionmaker[AsyncSession],
    now: str,
    basket_sizes: dict[int, dict[int, int]],
    quantities: dict[int, dict[int, int]],
) -> None:
    async with session_factory() as session:
        stats = await load_stats(session, local(now), TZ)

    assert stats.basket_sizes == basket_sizes
    assert stats.quantities == quantities


@pytest.mark.usefixtures("dataset")
async def test_simulator_lifecycle(
    client: AsyncClient, simulator: OrderSimulator, session_factory: async_sessionmaker[AsyncSession]
) -> None:
    idle = await client.get("/api/v1/simulator/status")
    assert idle.json() == {
        "running": False,
        "startedAt": None,
        "ordersCreated": 0,
        "lastOrderAt": None,
        "idleReason": None,
    }

    started = await client.post("/api/v1/simulator/start")
    assert started.status_code == 200
    assert started.json()["running"] is True
    await wait_until(lambda: simulator.status().orders_created >= 3)

    # Starting again keeps the running simulator and its counters.
    again = (await client.post("/api/v1/simulator/start")).json()
    assert again["running"] is True
    assert again["ordersCreated"] >= 3

    new_orders = (await client.get("/api/v1/orders", params={"status": "preparing"})).json()["items"]
    assert len(new_orders) >= 3
    order = (await client.get(f"/api/v1/orders/{new_orders[0]['id']}")).json()
    assert order["locationId"] in {1, 2}
    assert datetime.fromisoformat(order["createdAt"]) == SIMULATOR_NOW
    assert order["totalAmount"] == sum(item["lineTotal"] for item in order["items"])
    assert all(item["unitPrice"] == PRICES[item["productId"]] for item in order["items"])

    stopped = (await client.post("/api/v1/simulator/stop")).json()
    assert stopped["running"] is False
    assert stopped["ordersCreated"] == simulator.status().orders_created
    assert await count_orders(session_factory, OrderStatus.PREPARING) == 0
    assert await count_orders(session_factory) == stopped["ordersCreated"]


@pytest.mark.usefixtures("dataset")
async def test_simulator_gives_out_orders_after_preparation(
    session_factory: async_sessionmaker[AsyncSession],
) -> None:
    simulator = OrderSimulator(
        session_factory, TZ, interval=(0.01, 0.02), preparation=(0, 0), clock=lambda: SIMULATOR_NOW
    )
    await simulator.start()
    try:
        await wait_until(lambda: simulator.status().orders_created >= 4)
        finished = await count_orders(session_factory) - await count_orders(
            session_factory, OrderStatus.PREPARING
        )
        assert finished >= 3
    finally:
        await simulator.stop()


@pytest.mark.usefixtures("dataset")
@pytest.mark.parametrize(
    ("now", "hide_menu", "reason"),
    [("2026-03-12 22:30", False, "closed"), ("2026-03-12 13:10", True, "no_products")],
)
async def test_simulator_waits_when_it_cannot_create_orders(
    session_factory: async_sessionmaker[AsyncSession], now: str, hide_menu: bool, reason: str
) -> None:
    if hide_menu:
        async with session_factory() as session:
            await session.execute(update(Product).values(is_active=False))
            await session.commit()
    simulator = OrderSimulator(session_factory, TZ, interval=(0.01, 0.02), clock=lambda: local(now))
    await simulator.start()
    try:
        await wait_until(lambda: simulator.status().idle_reason is not None)
        status = simulator.status()
        assert status.running is True
        assert status.idle_reason == reason
        assert status.orders_created == 0
    finally:
        await simulator.stop()
    assert simulator.status().idle_reason is None
