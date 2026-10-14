from collections.abc import Sequence

from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from app.models import Category, Product
from app.schemas.product import ProductCreate, ProductUpdate
from app.services.errors import ConflictError, NotFoundError


async def list_products(
    session: AsyncSession,
    *,
    category_id: int | None = None,
    search: str | None = None,
    include_inactive: bool = False,
) -> Sequence[Product]:
    stmt = select(Product).order_by(Product.category_id, Product.name)
    if category_id is not None:
        stmt = stmt.where(Product.category_id == category_id)
    if search:
        stmt = stmt.where(Product.name.icontains(search.strip(), autoescape=True))
    if not include_inactive:
        stmt = stmt.where(Product.is_active.is_(True))
    result = await session.scalars(stmt)
    return result.all()


async def get_product(session: AsyncSession, product_id: int) -> Product:
    product = await session.get(Product, product_id)
    if product is None:
        raise NotFoundError(f"Product {product_id} not found")
    return product


async def create_product(session: AsyncSession, data: ProductCreate) -> Product:
    await _ensure_category(session, data.category_id)
    product = Product(**data.model_dump())
    session.add(product)
    await _commit(session)
    await session.refresh(product)
    return product


async def update_product(session: AsyncSession, product_id: int, data: ProductUpdate) -> Product:
    product = await get_product(session, product_id)
    changes = data.model_dump(exclude_unset=True, exclude_none=True)
    if "category_id" in changes:
        await _ensure_category(session, changes["category_id"])
    for field, value in changes.items():
        setattr(product, field, value)
    await _commit(session)
    await session.refresh(product)
    return product


async def deactivate_product(session: AsyncSession, product_id: int) -> None:
    product = await get_product(session, product_id)
    product.is_active = False
    await session.commit()


async def _ensure_category(session: AsyncSession, category_id: int) -> None:
    if await session.get(Category, category_id) is None:
        raise NotFoundError(f"Category {category_id} not found")


async def _commit(session: AsyncSession) -> None:
    try:
        await session.commit()
    except IntegrityError as exc:
        await session.rollback()
        raise ConflictError("Product with this name already exists") from exc
