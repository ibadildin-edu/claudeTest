from collections.abc import Sequence

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models import Category


async def list_categories(session: AsyncSession) -> Sequence[Category]:
    result = await session.scalars(select(Category).order_by(Category.sort_order, Category.id))
    return result.all()
