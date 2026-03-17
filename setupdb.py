import sqlite3
import os

# Get the directory where the Python script is located
script_dir = os.path.dirname(os.path.abspath(__file__))

# Create full path for the database file
db_path = os.path.join(script_dir, "inventory_system.db")

# Connect to database
conn = sqlite3.connect(db_path)
cursor = conn.cursor()

# Enable foreign keys
cursor.execute("PRAGMA foreign_keys = ON;")

# -------------------------
# Stores table
# -------------------------
cursor.execute("""
CREATE TABLE IF NOT EXISTS stores (
    store_id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    city TEXT,
    address TEXT
);
""")

# -------------------------
# Products table
# -------------------------
cursor.execute("""
CREATE TABLE IF NOT EXISTS products (
    product_id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    category TEXT,
    gender TEXT,
    unit_price REAL,
    image_url TEXT
);
""")

# -------------------------
# Product Sizes table
# -------------------------
cursor.execute("""
CREATE TABLE IF NOT EXISTS product_sizes (
    size_id INTEGER PRIMARY KEY AUTOINCREMENT,
    product_id INTEGER NOT NULL,
    size TEXT NOT NULL CHECK(size IN ('XS','S','M','L','XL','XXL')),

    FOREIGN KEY (product_id) REFERENCES products(product_id) ON DELETE CASCADE,

    UNIQUE(product_id, size)
);
""")

# -------------------------
# Inventory table
# -------------------------
cursor.execute("""
CREATE TABLE IF NOT EXISTS inventory (
    inventory_id INTEGER PRIMARY KEY AUTOINCREMENT,
    store_id INTEGER NOT NULL,
    size_id INTEGER NOT NULL,
    quantity INTEGER NOT NULL DEFAULT 0,
    last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    UNIQUE(store_id, size_id),

    FOREIGN KEY (store_id) REFERENCES stores(store_id) ON DELETE CASCADE,
    FOREIGN KEY (size_id) REFERENCES product_sizes(size_id) ON DELETE CASCADE
);
""")

# -------------------------
# Sales table
# -------------------------
cursor.execute("""
CREATE TABLE IF NOT EXISTS sales (
    sale_id INTEGER PRIMARY KEY AUTOINCREMENT,
    store_id INTEGER NOT NULL,
    size_id INTEGER NOT NULL,
    quantity INTEGER NOT NULL,
    sale_date DATE NOT NULL,

    FOREIGN KEY (store_id) REFERENCES stores(store_id) ON DELETE CASCADE,
    FOREIGN KEY (size_id) REFERENCES product_sizes(size_id) ON DELETE CASCADE
);
""")

conn.commit()
conn.close()

print(f"Database created at: {db_path}")