from typing import Annotated

from fastapi import APIRouter, Query

from app.api.v1.deps import AnalyticsParamsDep, SessionDep
from app.schemas.analytics import (
    CategoryShare,
    HeatmapCell,
    Kpi,
    LocationCompareItem,
    RevenueDailyPoint,
    TopProduct,
)
from app.services import analytics as service

router = APIRouter(prefix="/analytics", tags=["analytics"])


@router.get("/kpi")
async def kpi(params: AnalyticsParamsDep, session: SessionDep) -> Kpi:
    return await service.get_kpi(session, params.period, params.location_id)


@router.get("/revenue-daily")
async def revenue_daily(params: AnalyticsParamsDep, session: SessionDep) -> list[RevenueDailyPoint]:
    return await service.get_revenue_daily(session, params.period, params.location_id)


@router.get("/top-products")
async def top_products(
    params: AnalyticsParamsDep, session: SessionDep, limit: Annotated[int, Query(ge=1, le=50)] = 10
) -> list[TopProduct]:
    return await service.get_top_products(session, params.period, params.location_id, limit)


@router.get("/category-share")
async def category_share(params: AnalyticsParamsDep, session: SessionDep) -> CategoryShare:
    return await service.get_category_share(session, params.period, params.location_id)


@router.get("/heatmap")
async def heatmap(params: AnalyticsParamsDep, session: SessionDep) -> list[HeatmapCell]:
    return await service.get_heatmap(session, params.period, params.location_id)


@router.get("/locations-compare")
async def locations_compare(params: AnalyticsParamsDep, session: SessionDep) -> list[LocationCompareItem]:
    """Compares all locations; `locationId` is ignored."""
    return await service.get_locations_compare(session, params.period)
