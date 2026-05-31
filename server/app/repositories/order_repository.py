from psycopg2.extensions import connection, cursor

class OrderRepository:

    def __init__(self, conn: connection, cursor: cursor):
        self.conn = conn
        self.cursor = cursor

    def get_by_id(self, order_id: int) -> dict | None:
        self.cursor.execute(
            "SELECT * FROM orders WHERE id = %s AND deleted_at IS NULL",
            (order_id,)
        )
        order = self.cursor.fetchone()

        if not order:
            return None
        self.cursor.execute(
            """
            SELECT
                oi.id,
                oi.product_id,
                oi.quantity,
                oi.unit_price,
                p.name AS product_name
            FROM order_items oi
            JOIN products p ON p.id = oi.product_id
            WHERE oi.order_id = %s
            """,
            (order_id,)
        )
        items = self.cursor.fetchall()

        order = dict(order)
        order['items'] = [dict(item) for item in items]

        return order

    def get_all(self, skip: int = 0, limit: int = 100) -> list[dict]:
        self.cursor.execute(
            "SELECT * FROM orders WHERE deleted_at IS NULL ORDER BY created_at DESC LIMIT %s OFFSET %s",
            (limit, skip)
        )
        orders = self.cursor.fetchall()

        # Attach items to each order
        result = []
        for order in orders:
            order = dict(order)
            self.cursor.execute(
                """
                SELECT
                    oi.id,
                    oi.product_id,
                    oi.quantity,
                    oi.unit_price,
                    p.name AS product_name
                FROM order_items oi
                JOIN products p ON p.id = oi.product_id
                WHERE oi.order_id = %s
                """,
                (order['id'],)
            )
            order['items'] = [dict(item) for item in self.cursor.fetchall()]
            result.append(order)

        return result

    def count(self) -> int:
        self.cursor.execute("SELECT COUNT(*) FROM orders WHERE deleted_at IS NULL")
        row = self.cursor.fetchone()
        return row['count']

    def create(self, customer_id: int, total_amount: float) -> dict:
        self.cursor.execute(
            """
            INSERT INTO orders (customer_id, total_amount, status)
            VALUES (%s, %s, 'pending')
            RETURNING *
            """,
            (customer_id, total_amount)
        )
        return dict(self.cursor.fetchone())

    def create_order_item(
        self,
        order_id: int,
        product_id: int,
        quantity: int,
        unit_price: float,
    ) -> dict:
        self.cursor.execute(
            """
            INSERT INTO order_items (order_id, product_id, quantity, unit_price)
            VALUES (%s, %s, %s, %s)
            RETURNING *
            """,
            (order_id, product_id, quantity, unit_price)
        )
        return dict(self.cursor.fetchone())

    def commit(self) -> None:
        self.conn.commit()

    def rollback(self) -> None:
        self.conn.rollback()

    def delete(self, order_id: int) -> None:
        self.cursor.execute(
            "UPDATE orders SET deleted_at = NOW() WHERE id = %s AND deleted_at IS NULL",
            (order_id,)
        )
        self.conn.commit()