"""Live mode: a background task in the API process that keeps creating orders.

While running, it creates one order every 2–3 seconds as «preparing» and completes it
(rarely cancels it) after a short preparation time. The simulator is per process:
run the API with a single worker (`uvicorn --reload` does that).
"""

import asyncio
import heapq
import logging
import random
import time
from collections.abc import Callable
from contextlib import suppress
from dataclasses import dataclass, field
from datetime import UTC, date, datetime
from zoneinfo import ZoneInfo

from sqlalchemy import update
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker

from app.models import Order, OrderItem, OrderStatus
from app.schemas.simulator import SimulatorIdleReason, SimulatorStatus
from app.services import demand
from app.services.demand import DemandStats, OrderDraft

logger = logging.getLogger(__name__)

CANCEL_RATE = 0.015


def utc_now() -> datetime:
    return datetime.now(UTC)


@dataclass(order=True)
class _Pending:
    """An order that is being prepared; `ready_at` is a `time.monotonic()` value."""

    ready_at: float
    order_id: int = field(compare=False)
    final_status: OrderStatus = field(compare=False)


class OrderSimulator:
    def __init__(
        self,
        session_factory: async_sessionmaker[AsyncSession],
        tz: ZoneInfo,
        *,
        interval: tuple[float, float] = (2.0, 3.0),
        preparation: tuple[float, float] = (6.0, 15.0),
        clock: Callable[[], datetime] = utc_now,
        rng: random.Random | None = None,
    ) -> None:
        self._session_factory = session_factory
        self._tz = tz
        self._interval = interval
        self._preparation = preparation
        self._clock = clock
        self._rng = rng or random.Random()

        self._lock = asyncio.Lock()
        self._task: asyncio.Task[None] | None = None
        self._stop_requested = asyncio.Event()
        self._pending: list[_Pending] = []  # heap by ready_at
        self._stats: DemandStats | None = None
        self._stats_key: tuple[date, int] | None = None

        self._started_at: datetime | None = None
        self._orders_created = 0
        self._last_order_at: datetime | None = None
        self._idle_reason: SimulatorIdleReason | None = None

    @property
    def running(self) -> bool:
        return self._task is not None and not self._task.done()

    def status(self) -> SimulatorStatus:
        return SimulatorStatus(
            running=self.running,
            started_at=self._started_at,
            orders_created=self._orders_created,
            last_order_at=self._last_order_at,
            idle_reason=self._idle_reason if self.running else None,
        )

    async def start(self) -> None:
        async with self._lock:
            if self.running:
                return
            # Orders left «preparing» by a previous process that did not stop cleanly.
            await self._finish(complete_all=True)
            self._started_at = self._clock()
            self._orders_created = 0
            self._last_order_at = None
            self._idle_reason = None
            self._stop_requested.clear()
            self._task = asyncio.create_task(self._run(), name="order-simulator")
            logger.info("Order simulator started")

    async def stop(self) -> None:
        async with self._lock:
            task, self._task = self._task, None
            if task is None:
                return
            # Not task.cancel(): the order being created right now is committed and counted.
            self._stop_requested.set()
            await task
            self._started_at = None
            # The kitchen finishes everything that is still being prepared.
            await self._finish(complete_all=True)
            logger.info("Order simulator stopped after %d orders", self._orders_created)

    async def _run(self) -> None:
        while not self._stop_requested.is_set():
            try:
                await self._tick()
            except Exception:
                logger.exception("Order simulator failed to create an order")
                self._idle_reason = SimulatorIdleReason.ERROR
            # Sleep until the next order, waking up early on stop().
            with suppress(TimeoutError):
                await asyncio.wait_for(self._stop_requested.wait(), self._rng.uniform(*self._interval))

    async def _tick(self) -> None:
        await self._finish()
        now = self._clock()
        async with self._session_factory() as session:
            draft = await self._draft(session, now)
            if draft is None:
                return
            order_id = await _create_order(session, draft, now)

        final_status = OrderStatus.CANCELLED if self._rng.random() < CANCEL_RATE else OrderStatus.COMPLETED
        ready_at = time.monotonic() + self._rng.uniform(*self._preparation)
        heapq.heappush(self._pending, _Pending(ready_at, order_id, final_status))
        self._orders_created += 1
        self._last_order_at = now
        self._idle_reason = None

    async def _draft(self, session: AsyncSession, now: datetime) -> OrderDraft | None:
        local_now = now.astimezone(self._tz)
        locations = await demand.load_opening_hours(session)
        open_ids = [hours.location_id for hours in locations if hours.is_open(local_now.time())]
        menu = await demand.load_menu(session)

        if not locations:
            self._idle_reason = SimulatorIdleReason.NO_LOCATIONS
        elif not open_ids:
            self._idle_reason = SimulatorIdleReason.CLOSED
        elif not menu:
            self._idle_reason = SimulatorIdleReason.NO_PRODUCTS
        else:
            # The model depends only on the local date and hour: reload it once an hour.
            stats_key = (local_now.date(), local_now.hour)
            if self._stats is None or self._stats_key != stats_key:
                self._stats = await demand.load_stats(session, now, self._tz)
                self._stats_key = stats_key
            return demand.draft_order(self._rng, self._stats, open_ids, menu)
        return None

    async def _finish(self, *, complete_all: bool = False) -> None:
        """Give out orders whose preparation time is over; all of them with `complete_all`."""
        now = time.monotonic()
        ready: dict[OrderStatus, list[int]] = {}
        while self._pending and (complete_all or self._pending[0].ready_at <= now):
            pending = heapq.heappop(self._pending)
            ready.setdefault(pending.final_status, []).append(pending.order_id)
        if not ready and not complete_all:
            return

        async with self._session_factory() as session:
            for status, order_ids in ready.items():
                await session.execute(
                    update(Order)
                    .where(Order.id.in_(order_ids), Order.status == OrderStatus.PREPARING)
                    .values(status=status)
                )
            if complete_all:
                await session.execute(
                    update(Order)
                    .where(Order.status == OrderStatus.PREPARING)
                    .values(status=OrderStatus.COMPLETED)
                )
            await session.commit()


async def _create_order(session: AsyncSession, draft: OrderDraft, created_at: datetime) -> int:
    order = Order(
        location_id=draft.location_id,
        created_at=created_at,
        status=OrderStatus.PREPARING,
        total_amount=sum(line.quantity * line.unit_price for line in draft.lines),
        items_count=sum(line.quantity for line in draft.lines),
        items=[
            OrderItem(
                product_id=line.product_id,
                quantity=line.quantity,
                unit_price=line.unit_price,
                line_total=line.quantity * line.unit_price,
            )
            for line in draft.lines
        ],
    )
    session.add(order)
    await session.commit()
    return order.id
