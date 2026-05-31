from fastapi import APIRouter, Depends, Query
from app.core.database import get_db
from app.services.customer_service import CustomerService
from app.schemas.customer import CustomerCreate, CustomerResponse

router = APIRouter(prefix="/customers", tags=["Customers"])


@router.get("", response_model=list[CustomerResponse])
def get_all_customers(
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=100),
    db=Depends(get_db),
):
    conn, cursor = db
    service = CustomerService(conn, cursor)
    return service.get_all_customers(skip=skip, limit=limit)


@router.get("/{customer_id}", response_model=CustomerResponse)
def get_customer(customer_id: int, db=Depends(get_db)):
    conn, cursor = db
    service = CustomerService(conn, cursor)
    return service.get_customer_by_id(customer_id)


@router.post("", response_model=CustomerResponse, status_code=201)
def create_customer(data: CustomerCreate, db=Depends(get_db)):
    conn, cursor = db
    service = CustomerService(conn, cursor)
    return service.create_customer(data)


@router.delete("/{customer_id}", status_code=204)
def delete_customer(customer_id: int, db=Depends(get_db)):
    conn, cursor = db
    service = CustomerService(conn, cursor)
    service.delete_customer(customer_id)