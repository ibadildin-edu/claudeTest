from typing import Annotated

from fastapi import APIRouter, Query

from app.api.v1.deps import SessionDep, SettingsDep
from app.schemas.base import Page
from app.schemas.order import OrderFilters, OrderListItem, OrderRead
from app.services import orders as service

router = APIRouter(prefix="/orders", tags=["orders"])


@router.get("")
async def list_orders(
    filters: Annotated[OrderFilters, Query()], session: SessionDep, settings: SettingsDep
) -> Page[OrderListItem]:
    return await service.list_orders(session, filters, settings.tz)


@router.get("/{order_id}")
async def get_order(order_id: int, session: SessionDep) -> OrderRead:
    return await service.get_order(session, order_id)
