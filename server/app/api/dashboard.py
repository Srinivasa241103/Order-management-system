from fastapi import APIRouter, Depends
from app.core.database import get_db
from app.services.product_service import ProductService
from app.services.customer_service import CustomerService
from app.services.order_service import OrderService

router = APIRouter(prefix="/dashboard", tags=["Dashboard"])


@router.get("")
def get_dashboard_stats(db=Depends(get_db)):
    conn, cursor = db

    product_service = ProductService(conn, cursor)
    customer_service = CustomerService(conn, cursor)
    order_service = OrderService(conn, cursor)

    low_stock = product_service.get_low_stock_products()
    recent_orders = order_service.get_all_orders(skip=0, limit=5)

    return {
        "total_products": product_service.get_product_count(),
        "total_customers": customer_service.get_customer_count(),
        "total_orders": order_service.get_order_count(),
        "low_stock_count": len(low_stock),
        "low_stock_products": low_stock,
        "recent_orders": recent_orders,
    }