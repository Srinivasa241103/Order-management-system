from psycopg2.extensions import connection, cursor
from app.repositories.product_repository import ProductRepository
from app.schemas.product import ProductCreate, ProductUpdate
from app.core.exceptions import (
    ProductNotFoundException,
    DuplicateSKUException,
    NegativeQuantityException,
)


class ProductService:

    def __init__(self, conn: connection, cursor: cursor):
        self.repo = ProductRepository(conn, cursor)
        
    def get_all_products(self, skip: int = 0, limit: int = 100) -> list[dict]:
        return self.repo.get_all(skip=skip, limit=limit)

    def get_product_by_id(self, product_id: int) -> dict:
        product = self.repo.get_by_id(product_id)

        if not product:
            raise ProductNotFoundException(product_id)

        return product

    def create_product(self, data: ProductCreate) -> dict:
        existing = self.repo.get_by_sku(data.sku)
        if existing:
            raise DuplicateSKUException(data.sku)

        if data.quantity < 0:
            raise NegativeQuantityException()

        return self.repo.create(data)

   
    def update_product(self, product_id: int, data: ProductUpdate) -> dict:
        product = self.repo.get_by_id(product_id)
        if not product:
            raise ProductNotFoundException(product_id)

        if data.sku is not None:
            existing = self.repo.get_by_sku(data.sku)
            if existing and existing['id'] != product_id:
                raise DuplicateSKUException(data.sku)

        if data.quantity is not None and data.quantity < 0:
            raise NegativeQuantityException()

        return self.repo.update(product_id, data)

    
    def delete_product(self, product_id: int) -> None:
        product = self.repo.get_by_id(product_id)
        if not product:
            raise ProductNotFoundException(product_id)

        self.repo.delete(product_id)

    def get_low_stock_products(self, threshold: int = 10) -> list[dict]:
        return self.repo.get_low_stock(threshold)

    def get_product_count(self) -> int:
        return self.repo.count()