from collections.abc import Sequence

from sqlalchemy import exists, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from app.models import Location, Order
from app.schemas.location import LocationCreate, LocationUpdate
from app.services.errors import ConflictError, InvalidDataError, NotFoundError


async def list_locations(session: AsyncSession) -> Sequence[Location]:
    result = await session.scalars(select(Location).order_by(Location.id))
    return result.all()


async def get_location(session: AsyncSession, location_id: int) -> Location:
    location = await session.get(Location, location_id)
    if location is None:
        raise NotFoundError(f"Location {location_id} not found")
    return location


async def create_location(session: AsyncSession, data: LocationCreate) -> Location:
    location = Location(**data.model_dump())
    session.add(location)
    await _commit(session, "Location with this name or slug already exists")
    await session.refresh(location)
    return location


async def update_location(session: AsyncSession, location_id: int, data: LocationUpdate) -> Location:
    location = await get_location(session, location_id)
    for field, value in data.model_dump(exclude_unset=True, exclude_none=True).items():
        setattr(location, field, value)
    if location.opens_at >= location.closes_at:
        raise InvalidDataError("opensAt must be earlier than closesAt")
    await _commit(session, "Location with this name or slug already exists")
    await session.refresh(location)
    return location


async def delete_location(session: AsyncSession, location_id: int) -> None:
    location = await get_location(session, location_id)
    has_orders = await session.scalar(select(exists().where(Order.location_id == location_id)))
    if has_orders:
        raise ConflictError("Location has orders and cannot be deleted")
    await session.delete(location)
    await session.commit()


async def _commit(session: AsyncSession, conflict_detail: str) -> None:
    try:
        await session.commit()
    except IntegrityError as exc:
        await session.rollback()
        raise ConflictError(conflict_detail) from exc
