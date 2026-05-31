from psycopg2.extensions import connection, cursor
from app.repositories.order_repository import OrderRepository
from app.repositories.product_repository import ProductRepository
from app.repositories.customer_repository import CustomerRepository
from app.schemas.order import OrderCreate
from app.core.exceptions import (
    OrderNotFoundException,
    CustomerNotFoundException,
    ProductNotFoundException,
    InsufficientStockException,
    EmptyOrderException,
)

class OrderService:
    
    def __init__(self, conn: connection, cursor: cursor):
        self.order_repo = OrderRepository(conn, cursor)
        self.product_repo = ProductRepository(conn, cursor)
        self.customer_repo = CustomerRepository(conn, cursor)

    def get_all_orders(self, skip: int=0, limit: int=100) -> list[dict]:
        return self.order_repo.get_all(skip=skip, limit=limit)

    def get_order_by_id(self, order_id: int) -> dict:
        order = self.order_repo.get_by_id(order_id)
        if not order:
            raise OrderNotFoundException(order_id)
        return order
    
    def create_order(self, data: OrderCreate) -> dict:
 
        if not data.items:
            raise EmptyOrderException()
 
        customer = self.customer_repo.get_by_id(data.customer_id)
        if not customer:
            raise CustomerNotFoundException(data.customer_id)
 
        validated_items = []
 
        for item in data.items:
            product = self.product_repo.get_by_id(item.product_id)
            if not product:
                raise ProductNotFoundException(item.product_id)
 
            if product['quantity'] < item.quantity:
                raise InsufficientStockException(
                    product_name=product['name'],
                    requested=item.quantity,
                    available=product['quantity'],
                )
 
            validated_items.append({
                'product': product,
                'quantity': item.quantity,
            })
 
        try:
            total_amount = sum(
                item['product']['price'] * item['quantity']
                for item in validated_items
            )
 
            order = self.order_repo.create(
                customer_id=data.customer_id,
                total_amount=total_amount,
            )
            order_items = []
            for item in validated_items:
                product = item['product']
                quantity = item['quantity']
 
                order_item = self.order_repo.create_order_item(
                    order_id=order['id'],
                    product_id=product['id'],
                    quantity=quantity,
                    unit_price=product['price'],
                )
                # create_order_item RETURNINGs only order_items columns;
                # product_name lives on products, so attach it for the response
                order_item['product_name'] = product['name']
                order_items.append(order_item)
 
                self.product_repo.deduct_stock(
                    product_id=product['id'],
                    quantity=quantity,
                )
 
            self.order_repo.commit()
 
            order['items'] = order_items
            return order
 
        except Exception as e:
            self.order_repo.rollback()
            raise e
    
    def delete_order(self, order_id: int) -> None:
        order = self.order_repo.get_by_id(order_id)
        if not order:
            raise OrderNotFoundException(order_id)
 
        self.order_repo.delete(order_id)

    def get_order_count(self) -> int:
        return self.order_repo.count()