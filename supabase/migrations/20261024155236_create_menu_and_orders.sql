/*
# Create menu_items and orders tables for Guled Restaurant & Dining

1. New Tables
- `menu_items`: stores the restaurant's food and drink menu. Columns: id, name, description, price, category, image_url, available.
- `orders`: stores customer delivery orders. Columns: id, customer_name, phone, address, items (jsonb), total, status, created_at.
2. Security
- Enable RLS on both tables.
- Grant SELECT on menu_items to anon + authenticated (menu is public).
- Grant INSERT on orders to anon + authenticated (anyone can place an order).
- Grant SELECT on orders to anon + authenticated (order tracking by id).
- No UPDATE/DELETE from the client side.
3. Notes
- Single-tenant app, no auth/login required.
- Menu items are public and read-only from the client.
- Orders can be created and viewed by anyone (tracked by order id).
*/

CREATE TABLE IF NOT EXISTS menu_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text NOT NULL,
  price integer NOT NULL CHECK (price > 0),
  category text NOT NULL DEFAULT 'Food',
  image_url text,
  available boolean NOT NULL DEFAULT true,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE menu_items ENABLE ROW LEVEL SECURITY;

GRANT SELECT ON menu_items TO anon, authenticated;

DROP POLICY IF EXISTS "public_read_menu" ON menu_items;
CREATE POLICY "public_read_menu" ON menu_items FOR SELECT
TO anon, authenticated USING (true);

CREATE TABLE IF NOT EXISTS orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_name text NOT NULL,
  phone text NOT NULL,
  address text NOT NULL,
  items jsonb NOT NULL DEFAULT '[]',
  total integer NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'pending',
  notes text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE orders ENABLE ROW LEVEL SECURITY;

GRANT INSERT ON orders TO anon, authenticated;
GRANT SELECT ON orders TO anon, authenticated;

DROP POLICY IF EXISTS "public_insert_orders" ON orders;
CREATE POLICY "public_insert_orders" ON orders FOR INSERT
TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "public_read_orders" ON orders;
CREATE POLICY "public_read_orders" ON orders FOR SELECT
TO anon, authenticated USING (true);
