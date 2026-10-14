from app.schemas.base import CamelModel


class CategoryRead(CamelModel):
    id: int
    name: str
    color: str
    sort_order: int
