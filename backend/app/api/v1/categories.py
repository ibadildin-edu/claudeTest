from collections.abc import Sequence

from fastapi import APIRouter

from app.api.v1.deps import SessionDep
from app.models import Category
from app.schemas.category import CategoryRead
from app.services import categories as service

router = APIRouter(prefix="/categories", tags=["categories"])


@router.get("", response_model=list[CategoryRead])
async def list_categories(session: SessionDep) -> Sequence[Category]:
    return await service.list_categories(session)
