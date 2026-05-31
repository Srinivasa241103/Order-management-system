from psycopg2.extensions import connection, cursor
from app.schemas.customer import CustomerCreate


class CustomerRepository:

    def __init__(self, conn: connection, cursor: cursor):
        self.conn = conn
        self.cursor = cursor

    # ----------------------------------------------------------
    # READ operations
    # ----------------------------------------------------------

    def get_by_id(self, customer_id: int) -> dict | None:
        self.cursor.execute(
            "SELECT * FROM customers WHERE id = %s AND deleted_at IS NULL",
            (customer_id,)
        )
        return self.cursor.fetchone()

    def get_by_email(self, email: str) -> dict | None:
        self.cursor.execute(
            "SELECT * FROM customers WHERE email = %s AND deleted_at IS NULL",
            (email,)
        )
        return self.cursor.fetchone()

    def get_all(self, skip: int = 0, limit: int = 100) -> list[dict]:
        self.cursor.execute(
            "SELECT * FROM customers WHERE deleted_at IS NULL ORDER BY id LIMIT %s OFFSET %s",
            (limit, skip)
        )
        return self.cursor.fetchall()

    def count(self) -> int:
        self.cursor.execute("SELECT COUNT(*) FROM customers WHERE deleted_at IS NULL")
        row = self.cursor.fetchone()
        return row['count']

    # ----------------------------------------------------------
    # WRITE operations
    # ----------------------------------------------------------

    def create(self, data: CustomerCreate) -> dict:
        self.cursor.execute(
            """
            INSERT INTO customers (full_name, email, phone)
            VALUES (%s, %s, %s)
            RETURNING *
            """,
            (data.full_name, data.email, data.phone)
        )
        customer = self.cursor.fetchone()
        self.conn.commit()
        return customer

    def delete(self, customer_id: int) -> None:
        self.cursor.execute(
            "UPDATE customers SET deleted_at = NOW() WHERE id = %s AND deleted_at IS NULL",
            (customer_id,)
        )
        self.conn.commit()