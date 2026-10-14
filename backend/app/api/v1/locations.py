from collections.abc import Sequence

from fastapi import APIRouter, status

from app.api.v1.deps import SessionDep
from app.models import Location
from app.schemas.location import LocationCreate, LocationRead, LocationUpdate
from app.services import locations as service

router = APIRouter(prefix="/locations", tags=["locations"])


@router.get("", response_model=list[LocationRead])
async def list_locations(session: SessionDep) -> Sequence[Location]:
    return await service.list_locations(session)


@router.get("/{location_id}", response_model=LocationRead)
async def get_location(location_id: int, session: SessionDep) -> Location:
    return await service.get_location(session, location_id)


@router.post("", response_model=LocationRead, status_code=status.HTTP_201_CREATED)
async def create_location(data: LocationCreate, session: SessionDep) -> Location:
    return await service.create_location(session, data)


@router.patch("/{location_id}", response_model=LocationRead)
async def update_location(location_id: int, data: LocationUpdate, session: SessionDep) -> Location:
    return await service.update_location(session, location_id, data)


@router.delete("/{location_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_location(location_id: int, session: SessionDep) -> None:
    await service.delete_location(session, location_id)
