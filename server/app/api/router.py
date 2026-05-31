from fastapi import APIRouter
from app.api import products, customers, orders, dashboard

api_router = APIRouter()

api_router.include_router(products.router)
api_router.include_router(customers.router)
api_router.include_router(orders.router)
api_router.include_router(dashboard.router)