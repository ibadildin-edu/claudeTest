from collections.abc import Sequence
from typing import Annotated

from fastapi import APIRouter, Query, status

from app.api.v1.deps import SessionDep
from app.models import Product
from app.schemas.product import ProductCreate, ProductRead, ProductUpdate
from app.services import products as service

router = APIRouter(prefix="/products", tags=["products"])


@router.get("", response_model=list[ProductRead])
async def list_products(
    session: SessionDep,
    category_id: Annotated[int | None, Query(alias="categoryId")] = None,
    search: Annotated[str | None, Query(max_length=100)] = None,
    include_inactive: Annotated[bool, Query(alias="includeInactive")] = False,
) -> Sequence[Product]:
    return await service.list_products(
        session, category_id=category_id, search=search, include_inactive=include_inactive
    )


@router.get("/{product_id}", response_model=ProductRead)
async def get_product(product_id: int, session: SessionDep) -> Product:
    return await service.get_product(session, product_id)


@router.post("", response_model=ProductRead, status_code=status.HTTP_201_CREATED)
async def create_product(data: ProductCreate, session: SessionDep) -> Product:
    return await service.create_product(session, data)


@router.patch("/{product_id}", response_model=ProductRead)
async def update_product(product_id: int, data: ProductUpdate, session: SessionDep) -> Product:
    return await service.update_product(session, product_id, data)


@router.delete("/{product_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_product(product_id: int, session: SessionDep) -> None:
    await service.deactivate_product(session, product_id)
