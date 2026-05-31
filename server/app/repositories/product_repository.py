from psycopg2.extensions import connection, cursor
from app.schemas.product import ProductCreate, ProductUpdate


class ProductRepository:
    def __init__(self, conn: connection, cursor: cursor):
        self.conn = conn
        self.cursor = cursor
        
    def get_by_id(self, product_id: int) -> dict | None:
        self.cursor.execute(
            "SELECT * FROM products WHERE id = %s AND deleted_at IS NULL",
            (product_id,)
        )
        return self.cursor.fetchone()

    def get_by_sku(self, sku: str) -> dict | None:
        self.cursor.execute(
            "SELECT * FROM products WHERE sku = %s AND deleted_at IS NULL",
            (sku,)
        )
        return self.cursor.fetchone()

    def get_all(self, skip: int=0, limit: int = 100) -> list[dict]:
        self.cursor.execute(
            "SELECT * FROM products WHERE deleted_at IS NULL ORDER BY id LIMIT %s OFFSET %s",
            (limit, skip)
        )
        return self.cursor.fetchall()

    def get_low_stock(self, threshold: int = 10) -> list[dict]:
        self.cursor.execute(
            "SELECT * FROM products WHERE quantity <= %s AND deleted_at IS NULL ORDER BY quantity ASC",
            (threshold,)
        )
        return self.cursor.fetchall()
 
    def count(self) -> int:
        self.cursor.execute("SELECT COUNT(*) FROM products WHERE deleted_at IS NULL")
        row = self.cursor.fetchone()
        return row['count']

    def create(self, data: ProductCreate) -> dict:
        self.cursor.execute(
            """
            INSERT INTO products (name, sku, price, quantity)
            VALUES (%s, %s, %s, %s)
            RETURNING *
            """,
            (data.name, data.sku, data.price, data.quantity)
        )
        product = self.cursor.fetchone()
        self.conn.commit()
        return product
 
    def update(self, product_id: int, data: ProductUpdate) -> dict:
        update_data = data.model_dump(exclude_unset=True)

        set_clause = ", ".join(
            f"{field} = %s" for field in update_data.keys()
        )
        values = list(update_data.values())
        values.append(product_id)  
 
        self.cursor.execute(
            f"""
            UPDATE products
            SET {set_clause}
            WHERE id = %s
            RETURNING *
            """,
            values
        )
        product = self.cursor.fetchone()
        self.conn.commit()
        return product
 
    def delete(self, product_id: int) -> None:
        self.cursor.execute(
            "UPDATE products SET deleted_at = NOW() WHERE id = %s AND deleted_at IS NULL",
            (product_id,)
        )
        self.conn.commit()
 
    def deduct_stock(self, product_id: int, quantity: int) -> None:
        self.cursor.execute(
            """
            UPDATE products
            SET quantity = quantity - %s
            WHERE id = %s
            """,
            (quantity, product_id)
        )