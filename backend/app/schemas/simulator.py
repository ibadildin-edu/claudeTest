from datetime import datetime
from enum import StrEnum

from app.schemas.base import CamelModel


class SimulatorIdleReason(StrEnum):
    """Why a running simulator is not creating orders at the moment."""

    CLOSED = "closed"
    NO_LOCATIONS = "no_locations"
    NO_PRODUCTS = "no_products"
    ERROR = "error"


class SimulatorStatus(CamelModel):
    running: bool
    started_at: datetime | None
    orders_created: int
    last_order_at: datetime | None
    idle_reason: SimulatorIdleReason | None
