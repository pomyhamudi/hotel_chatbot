/*
# Create reviews table for menu item ratings and feedback

1. New Tables
- `reviews`: stores customer reviews and star ratings for individual menu items.
  Columns: id, menu_item_id (fk -> menu_items), author_name, rating (1-5 integer),
  comment, created_at.
2. Security
- Enable RLS on `reviews`.
- Grant SELECT to anon + authenticated (anyone can see reviews).
- Grant INSERT to anon + authenticated (anyone can leave a review).
- No UPDATE or DELETE from the client side.
3. Notes
- Single-tenant app, no auth/login required.
- Reviews are public — anyone can read them and submit one.
- menu_item_id has a foreign key to menu_items with ON DELETE CASCADE so
  reviews are removed if a menu item is deleted.
- Rating is constrained to integers 1 through 5.
- An index on menu_item_id speeds up lookups when loading reviews per dish.
*/

CREATE TABLE IF NOT EXISTS reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  menu_item_id uuid NOT NULL REFERENCES menu_items(id) ON DELETE CASCADE,
  author_name text NOT NULL,
  rating integer NOT NULL CHECK (rating >= 1 AND rating <= 5),
  comment text NOT NULL DEFAULT '',
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_reviews_menu_item_id ON reviews(menu_item_id);

ALTER TABLE reviews ENABLE ROW LEVEL SECURITY;

GRANT SELECT, INSERT ON reviews TO anon, authenticated;

DROP POLICY IF EXISTS "public_read_reviews" ON reviews;
CREATE POLICY "public_read_reviews" ON reviews FOR SELECT
TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "public_insert_reviews" ON reviews;
CREATE POLICY "public_insert_reviews" ON reviews FOR INSERT
TO anon, authenticated WITH CHECK (true);
