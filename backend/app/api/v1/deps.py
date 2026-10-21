from dataclasses import dataclass
from datetime import date
from typing import Annotated

from fastapi import Depends, HTTPException, Query, Request, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import Settings, get_settings
from app.core.db import get_session
from app.services.periods import Period
from app.services.simulator import OrderSimulator

SessionDep = Annotated[AsyncSession, Depends(get_session)]
SettingsDep = Annotated[Settings, Depends(get_settings)]


def get_simulator(request: Request) -> OrderSimulator:
    """The app-wide simulator created in the lifespan of `app.main`."""
    simulator: OrderSimulator = request.app.state.simulator
    return simulator


SimulatorDep = Annotated[OrderSimulator, Depends(get_simulator)]

MAX_PERIOD_DAYS = 366


@dataclass(frozen=True)
class AnalyticsParams:
    period: Period
    location_id: int | None


def get_analytics_params(
    settings: SettingsDep,
    date_from: Annotated[date | None, Query(alias="dateFrom", description="YYYY-MM-DD, включительно")] = None,
    date_to: Annotated[date | None, Query(alias="dateTo", description="YYYY-MM-DD, включительно")] = None,
    location_id: Annotated[int | None, Query(alias="locationId", ge=1)] = None,
) -> AnalyticsParams:
    period = Period.resolve(date_from, date_to, settings.tz)
    if period.date_from > period.date_to:
        raise HTTPException(status.HTTP_422_UNPROCESSABLE_CONTENT, "dateFrom must not be later than dateTo")
    if period.days > MAX_PERIOD_DAYS:
        raise HTTPException(
            status.HTTP_422_UNPROCESSABLE_CONTENT, f"Period is longer than {MAX_PERIOD_DAYS} days"
        )
    return AnalyticsParams(period=period, location_id=location_id)


AnalyticsParamsDep = Annotated[AnalyticsParams, Depends(get_analytics_params)]
