-- ==========================================================
-- Inventory & Order Management System — Database Schema
-- Run this file once against your PostgreSQL instance to
-- create all tables.
--
-- Local:      docker exec -i <postgres_container> psql -U admin -d inventory_db < schema.sql
-- Production: run via Render shell or psql connection
-- ==========================================================


-- ----------------------------------------------------------
-- Products Table
-- ----------------------------------------------------------
CREATE TABLE IF NOT EXISTS products (
    id          SERIAL PRIMARY KEY,
    name        VARCHAR(255)    NOT NULL,
    sku         VARCHAR(100)    NOT NULL UNIQUE,
    price       NUMERIC(10, 2)  NOT NULL,
    quantity    INTEGER         NOT NULL DEFAULT 0,
    deleted_at  TIMESTAMP WITH TIME ZONE DEFAULT NULL,

    -- DB level constraints — last line of defense
    CONSTRAINT check_price_non_negative    CHECK (price >= 0),
    CONSTRAINT check_quantity_non_negative CHECK (quantity >= 0)
);

-- Index on sku — queried frequently for uniqueness checks
CREATE INDEX IF NOT EXISTS idx_products_sku ON products(sku);
-- Partial index: only index non-deleted products for faster lookups
CREATE INDEX IF NOT EXISTS idx_products_not_deleted ON products(id) WHERE deleted_at IS NULL;


-- ----------------------------------------------------------
-- Customers Table
-- ----------------------------------------------------------
CREATE TABLE IF NOT EXISTS customers (
    id          SERIAL PRIMARY KEY,
    full_name   VARCHAR(255)    NOT NULL,
    email       VARCHAR(255)    NOT NULL UNIQUE,
    phone       VARCHAR(20)     NOT NULL,
    deleted_at  TIMESTAMP WITH TIME ZONE DEFAULT NULL
);

-- Index on email — queried frequently for uniqueness checks
CREATE INDEX IF NOT EXISTS idx_customers_email ON customers(email);
-- Partial index: only index non-deleted customers
CREATE INDEX IF NOT EXISTS idx_customers_not_deleted ON customers(id) WHERE deleted_at IS NULL;


-- ----------------------------------------------------------
-- Orders Table
-- ----------------------------------------------------------
CREATE TABLE IF NOT EXISTS orders (
    id              SERIAL PRIMARY KEY,
    customer_id     INTEGER         NOT NULL,
    total_amount    NUMERIC(12, 2)  NOT NULL DEFAULT 0,
    status          VARCHAR(20)     NOT NULL DEFAULT 'pending',
    created_at      TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at      TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    deleted_at      TIMESTAMP WITH TIME ZONE DEFAULT NULL,

    -- FK to customers — soft-deleted customers keep their orders intact
    CONSTRAINT fk_orders_customer
        FOREIGN KEY (customer_id)
        REFERENCES customers(id),

    CONSTRAINT check_order_status
        CHECK (status IN ('pending', 'confirmed', 'cancelled'))
);

CREATE INDEX IF NOT EXISTS idx_orders_customer_id ON orders(customer_id);
-- Partial index: only index non-deleted orders
CREATE INDEX IF NOT EXISTS idx_orders_not_deleted ON orders(id) WHERE deleted_at IS NULL;


-- ----------------------------------------------------------
-- Order Items Table (junction between orders and products)
-- ----------------------------------------------------------
CREATE TABLE IF NOT EXISTS order_items (
    id          SERIAL PRIMARY KEY,
    order_id    INTEGER         NOT NULL,
    product_id  INTEGER         NOT NULL,
    quantity    INTEGER         NOT NULL,
    unit_price  NUMERIC(10, 2)  NOT NULL,

    -- CASCADE → delete items if order is deleted
    CONSTRAINT fk_order_items_order
        FOREIGN KEY (order_id)
        REFERENCES orders(id)
        ON DELETE CASCADE,

    -- RESTRICT → prevent deleting a product that exists
    -- in any order — protects order history
    CONSTRAINT fk_order_items_product
        FOREIGN KEY (product_id)
        REFERENCES products(id)
        ON DELETE RESTRICT,

    CONSTRAINT check_item_quantity_positive
        CHECK (quantity > 0),

    CONSTRAINT check_item_price_non_negative
        CHECK (unit_price >= 0)
);

CREATE INDEX IF NOT EXISTS idx_order_items_order_id   ON order_items(order_id);
CREATE INDEX IF NOT EXISTS idx_order_items_product_id ON order_items(product_id);


-- ----------------------------------------------------------
-- Auto-update updated_at on orders
-- This trigger fires on every UPDATE to the orders table
-- and sets updated_at to the current timestamp
-- ----------------------------------------------------------
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE TRIGGER trigger_orders_updated_at
    BEFORE UPDATE ON orders
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();