import psycopg2
from psycopg2.extras import RealDictCursor
from psycopg2 import pool
from app.core.config import settings

connection_pool = pool.SimpleConnectionPool(
    minconn=1,
    maxconn=10,
    dsn=settings.DATABASE_URL
)

def get_db():
    conn = connection_pool.getconn()
    cursor = conn.cursor(cursor_factory=RealDictCursor)
    try:
        yield conn, cursor
    finally:
        cursor.close()
        conn.rollback()
        connection_pool.putconn(conn)
