from fastapi import APIRouter

from app.api.v1 import analytics, categories, health, locations, orders, products, simulator

api_router = APIRouter(prefix="/api/v1")
api_router.include_router(health.router)
api_router.include_router(locations.router)
api_router.include_router(categories.router)
api_router.include_router(products.router)
api_router.include_router(orders.router)
api_router.include_router(analytics.router)
api_router.include_router(simulator.router)
