from fastapi import APIRouter, Depends, Query
from app.core.database import get_db
from app.services.order_service import OrderService
from app.schemas.order import OrderCreate, OrderResponse

router = APIRouter(prefix="/orders", tags=["Orders"])


@router.get("", response_model=list[OrderResponse])
def get_all_orders(
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=100),
    db=Depends(get_db),
):
    conn, cursor = db
    service = OrderService(conn, cursor)
    return service.get_all_orders(skip=skip, limit=limit)


@router.get("/{order_id}", response_model=OrderResponse)
def get_order(order_id: int, db=Depends(get_db)):
    conn, cursor = db
    service = OrderService(conn, cursor)
    return service.get_order_by_id(order_id)


@router.post("", response_model=OrderResponse, status_code=201)
def create_order(data: OrderCreate, db=Depends(get_db)):
    conn, cursor = db
    service = OrderService(conn, cursor)
    return service.create_order(data)


@router.delete("/{order_id}", status_code=204)
def delete_order(order_id: int, db=Depends(get_db)):
    conn, cursor = db
    service = OrderService(conn, cursor)
    service.delete_order(order_id)