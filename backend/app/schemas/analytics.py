from datetime import date

from app.schemas.base import CamelModel


class Metric(CamelModel):
    value: int
    previous: int
    delta_pct: float | None


class BestProduct(CamelModel):
    id: int
    name: str
    quantity: int
    order_share_pct: float
    delta_pct: float | None


class Kpi(CamelModel):
    revenue: Metric
    orders_count: Metric
    avg_check: Metric
    best_product: BestProduct | None


class RevenueDailyPoint(CamelModel):
    date: date
    revenue: int
    orders_count: int
    previous_revenue: int


class TopProduct(CamelModel):
    product_id: int
    name: str
    category_id: int
    category_color: str
    quantity: int
    revenue: int


class CategoryShareItem(CamelModel):
    category_id: int
    name: str
    color: str
    revenue: int
    share_pct: float


class CategoryShare(CamelModel):
    total_revenue: int
    items: list[CategoryShareItem]


class HeatmapCell(CamelModel):
    weekday: int
    hour: int
    avg_orders: float


class LocationCompareItem(CamelModel):
    location_id: int
    name: str
    revenue: int
    orders_count: int
    avg_check: int
    delta_pct: float | None
