from psycopg2.extensions import connection, cursor
from app.repositories.customer_repository import CustomerRepository
from app.schemas.customer import CustomerCreate
from app.core.exceptions import (
    CustomerNotFoundException,
    DuplicateEmailException,
)


class CustomerService:

    def __init__(self, conn: connection, cursor: cursor):
        self.repo = CustomerRepository(conn, cursor)

    # ----------------------------------------------------------
    # GET ALL
    # ----------------------------------------------------------
    def get_all_customers(self, skip: int = 0, limit: int = 100) -> list[dict]:
        return self.repo.get_all(skip=skip, limit=limit)

    # ----------------------------------------------------------
    # GET ONE
    # ----------------------------------------------------------
    def get_customer_by_id(self, customer_id: int) -> dict:
        customer = self.repo.get_by_id(customer_id)
        if not customer:
            raise CustomerNotFoundException(customer_id)
        return customer

    # ----------------------------------------------------------
    # CREATE
    # Business rules:
    #   - email must be unique
    # ----------------------------------------------------------
    def create_customer(self, data: CustomerCreate) -> dict:
        # Rule: check email uniqueness
        existing = self.repo.get_by_email(data.email)
        if existing:
            raise DuplicateEmailException(data.email)

        return self.repo.create(data)

    # ----------------------------------------------------------
    # DELETE
    # ----------------------------------------------------------
    def delete_customer(self, customer_id: int) -> None:
        customer = self.repo.get_by_id(customer_id)
        if not customer:
            raise CustomerNotFoundException(customer_id)

        # CASCADE on FK means all their orders
        # are deleted automatically at DB level
        self.repo.delete(customer_id)

    # ----------------------------------------------------------
    # COUNT — for dashboard
    # ----------------------------------------------------------
    def get_customer_count(self) -> int:
        return self.repo.count()