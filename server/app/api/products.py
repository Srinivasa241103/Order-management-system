from fastapi import APIRouter, Depends, Query
from app.core.database import get_db
from app.services.product_service import ProductService
from app.schemas.product import ProductCreate, ProductUpdate, ProductResponse

router = APIRouter(prefix="/products", tags=["Products"])


@router.get("", response_model=list[ProductResponse])
def get_all_products(
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=100),
    db=Depends(get_db),
):
    conn, cursor = db
    service = ProductService(conn, cursor)
    return service.get_all_products(skip=skip, limit=limit)


@router.get("/{product_id}", response_model=ProductResponse)
def get_product(product_id: int, db=Depends(get_db)):
    conn, cursor = db
    service = ProductService(conn, cursor)
    return service.get_product_by_id(product_id)


@router.post("", response_model=ProductResponse, status_code=201)
def create_product(data: ProductCreate, db=Depends(get_db)):
    conn, cursor = db
    service = ProductService(conn, cursor)
    return service.create_product(data)


@router.put("/{product_id}", response_model=ProductResponse)
def update_product(product_id: int, data: ProductUpdate, db=Depends(get_db)):
    conn, cursor = db
    service = ProductService(conn, cursor)
    return service.update_product(product_id, data)


@router.delete("/{product_id}", status_code=204)
def delete_product(product_id: int, db=Depends(get_db)):
    conn, cursor = db
    service = ProductService(conn, cursor)
    service.delete_product(product_id)