import sqlite3
import random
from datetime import datetime, timedelta
import os

# Get the directory where the Python script is located
script_dir = os.path.dirname(os.path.abspath(__file__))

# Create full path for the database file
db_path = os.path.join(script_dir, "inventory_system.db")

# Connect to database
conn = sqlite3.connect(db_path)
cursor = conn.cursor()

# -----------------------------
# 1. Insert Stores
# -----------------------------
stores = [
("Store Bucharest", "Bucharest", "Promenada Bucuresti, Calea Floreasca 246B, 014476 București"),
("Store Cluj", "Cluj-Napoca", "Iulius Mall Cluj, Strada Alexandru Vaida Voevod 53B, 400436 Cluj-Napoca"),
("Store Timisoara", "Timisoara", "Iulius Town, Piața Consiliul Europei 2, Timișoara"),
("Store Iasi", "Iasi", "Palas Iasi, Strada Palas 7A, 700259 Iași"),
("Store Constanta", "Constanta", "City Park Mall, Bulevardul Alexandru Lăpușneanu 116C, 900419 Constanța"),
("Store Brasov", "Brasov", "AFI Brașov, Bulevardul 15 Noiembrie 78, 500097 Brașov"),
("Store Sibiu", "Sibiu", "Promenada Sibiu, Strada Lector 1-3A, Sibiu"),
("Store Craiova", "Craiova", "Electroputere Mall, Calea București 80, Craiova"),
("Store Oradea", "Oradea", "Lotus Center, Str. Nufărului 30, 410583 Oradea"),
("Store Arad", "Arad", "Atrium Mall, Calea Aurel Vlaicu 10-12, 310141 Arad")
]

cursor.executemany(
    "INSERT INTO stores (name, city, address) VALUES (?, ?, ?)",
    stores
)

# -----------------------------
# 2. Insert Products
# -----------------------------
products = [
("Basic White T-Shirt", "T-Shirts", "Men", 59.99, "https://xcdn.next.co.uk/common/items/default/default/itemimages/3_4Ratio/product/lge/C83639s5.jpg?im=Resize,width=750"),
("Basic Black T-Shirt", "T-Shirts", "Men", 59.99, "https://xcdn.next.co.uk/common/items/default/default/itemimages/3_4Ratio/product/lge/E13884s6.jpg?im=Resize,width=750"),
("Oversized T-Shirt", "T-Shirts", "Men", 79.99, "https://cdn-images.farfetch-contents.com/22/87/27/07/22872707_52938662_1000.jpg"),
("Blue Denim Jeans", "Jeans", "Men", 219.99, "https://www.mangooutlet.com/assets/rcs/pics/static/T5/fotos/S/57074404_TO_B.jpg?imwidth=2048&imdensity=1&ts=1697454200178"),
("Slim Fit Jeans", "Jeans", "Men", 239.99, "https://www.mangooutlet.com/assets/rcs/pics/static/T7/fotos/S/77050594_TM.jpg?imwidth=2048&imdensity=1&ts=1715269240341"),
("Black Skinny Jeans", "Jeans", "Women", 229.99, "https://img01.ztat.net/article/spp-media-p1/5e63887f5cfe4f678c896f3c10852d49/85bc57b8ba3c428ab7f2dcd6c8361c1e.jpg?imwidth=1800"),
("Grey Hoodie", "Hoodies", "Men", 179.99, "https://hourscollection.com/cdn/shop/files/DropShoulderHoodie-Grey-productphoto_1_800x.png?v=1762197948"),
("Black Hoodie", "Hoodies", "Men", 179.99, "https://perplex.store/cdn/shop/files/ArmorHoodieBlack_01.jpg?v=1746525564"),
("Zip Hoodie", "Hoodies", "Women", 199.99, "https://xcdn.next.co.uk/common/items/default/default/itemimages/3_4Ratio/product/lge/AA9640s.jpg?im=Resize,width=750"),
("Red Summer Dress", "Dresses", "Women", 249.99, "https://media.remixshop.com/files/07-2026/Roklya-H-M-135550270b.jpg"),
("Floral Dress", "Dresses", "Women", 279.99, "https://img01.ztat.net/article/spp-media-p1/44262404866b400a9a2e8af4a4db522e/e5579d9699444c9392f278b077a3fc07.jpg?imwidth=1800&filter=packshot"),
("Black Evening Dress", "Dresses", "Women", 349.99, "https://img01.ztat.net/article/spp-media-p1/a5c392769a5e494d93245bdbcc60ecc1/1a1a9f46380b4db79cc5820a3775f409.jpg?imwidth=1800&filter=packshot"),
("Winter Jacket", "Jackets", "Men", 499.99, "https://sportano.ro/img/986c30c27a3d26a3ee16c136f92f4ff5/4/0/4067652808466_40-jpg/geaca-izolata-pentru-barba-i-bogner-fire-ice-yaron-d-black-1724010.jpg"),
("Leather Jacket", "Jackets", "Women", 699.99, "https://img01.ztat.net/article/spp-media-p1/78d7a171027c4784b4cab4178040892f/4633c63e26e24e9f9a72b0793271dc9b.jpg?imwidth=1800&filter=packshot"),
("Puffer Jacket", "Jackets", "Women", 449.99, "https://img01.ztat.net/article/spp-media-p1/3c716f7e165646129064b4d647ba419a/00af7ae0d6a14e7c8d52de451c82bdbe.jpg?imwidth=1800&filter=packshot"),
("Classic Cardigan", "Sweaters", "Women", 189.99, "https://img01.ztat.net/article/spp-media-p1/10ec9378b05c44119ec4b3134472f43c/7fd4d1d3738d473cb884df955d12ca64.jpg?imwidth=1800&filter=packshot"),
("Elegant Blouse", "Blouses", "Women", 159.99, "https://img01.ztat.net/article/spp-media-p1/965a20d45a524d82a16ea1984501c2d0/fa703a6c8b454e7483b549f380217575.jpg?imwidth=1800&filter=packshot"),
("Polo Shirt", "Shirts", "Men", 139.99, "https://img01.ztat.net/article/spp-media-p1/c4351ef8ccc346f09f5dacd9d8010d87/cace72cac7664f30958f6a029a2c5a11.jpg?imwidth=1800&filter=packshot"),
("Grey Sweater", "Sweaters", "Women", 149.99, "https://img01.ztat.net/article/spp-media-p1/4c0c5391a1b441b687f98b0e3c03418c/7eb8d5ac25c4434caaffea78a6df862f.jpg?imwidth=1800&filter=packshot"),
("Wool Sweater", "Sweaters", "Women", 199.99, "https://img01.ztat.net/article/spp-media-p1/3c6730e0db4b400a9629bc7cc11aa3c1/cb7979b5aa1645e5a11072911ca70f5e.jpg?imwidth=1800&filter=packshot"),
("V-Neck Sweater", "Sweaters", "Women", 169.99, "https://img01.ztat.net/article/spp-media-p1/b6bc74b4574f4a41b600c05ba3fc0e3d/aa524e2c9a264a419898c6409ecfefe0.png?imwidth=1800&filter=packshot"),
("Casual Shorts", "Shorts", "Men", 119.99, "hhttps://img01.ztat.net/article/spp-media-p1/788dc5ac00444aac87712a0e51c4dd3b/a18e3b5d731244a3b98277cc875fccff.jpg?imwidth=1800&filter=packshot"),
("Denim Shorts", "Shorts", "Women", 139.99, "https://img01.ztat.net/article/spp-media-p1/0a5efa403cbf4734bf96d7279946d5f9/32c1c8f1f74b42f595a2a280107ce93c.jpg?imwidth=1800&filter=packshot"),
("Sports Shorts", "Activewear", "Women", 99.99, "https://img01.ztat.net/article/spp-media-p1/eb241bac872449548f99d607d414ca03/186c7fc7035d443d91e82690792d0235.jpg?imwidth=1800&filter=packshot"),
("Formal Shirt", "Shirts", "Men", 219.99, "https://img01.ztat.net/article/spp-media-p1/a193768869304efea71be26766756a66/4a4b588b9fb7482ca1b95c067ae9f245.jpg?imwidth=1800&filter=packshot"),
("Linen Shirt", "Shirts", "Men", 199.99, "https://img01.ztat.net/article/spp-media-p1/ab5e685155ec4fb3bc0b82195785fcbb/5b2cc9f8fd84464191be061717b75579.jpg?imwidth=1800&filter=packshot"),
("Chinos Pants", "Pants", "Men", 229.99, "https://img01.ztat.net/article/spp-media-p1/d13b699efa3249d7b9a81a6c4f6d4ef5/71f1e8e0afb34e9d866e027d55af720d.jpg?imwidth=1800&filter=packshot"),
("Cargo Pants", "Pants", "Men", 249.99, "https://img01.ztat.net/article/spp-media-p1/e03154335f9d4e8e97fdff9487f06f37/96d2b1431aa5478db258bbbca2bb37ca.jpg?imwidth=1800&filter=packshot"),
("Jogger Pants", "Pants", "Men", 189.99, "https://img01.ztat.net/article/spp-media-p1/f17211bfd9e945db85411551aae48cb5/b46ac8ac72cd40afaebb2725acf1c16d.jpg?imwidth=1800&filter=packshot"),
("Sports Jacket", "Activewear", "Women", 399.99, "https://img01.ztat.net/article/spp-media-p1/3db1ff672cb6409185bf7492381ba7c7/4cdcf233173c4d45ad298121ad5d6ef5.jpg?imwidth=1800&filter=packshot"),
("Rain Jacket", "Jackets", "Men", 319.99, "https://img01.ztat.net/article/spp-media-p1/18c14380760b423480bac836515bf4f1/02ac74c9078e4f90b2fc4b833c4a10f6.jpg?imwidth=1800&filter=packshot"),
("Tank Top", "T-Shirts", "Men", 49.99, "https://img01.ztat.net/article/spp-media-p1/96a16bfaaeb449f682b41660bf35bc0c/01c0fd5ebbdc46b5a50d955c96b99ad8.png?imwidth=1800&filter=packshot"),
("Tank Top", "T-Shirts", "Women", 49.99, "https://img01.ztat.net/article/spp-media-p1/145583aeb2c24ee3b1481293288be60c/edfb3d3139474710aa14c1c1d38f0002.jpg?imwidth=1800&filter=packshot"),
("Graphic Tee", "T-Shirts", "Women", 89.99, "https://img01.ztat.net/article/spp-media-p1/7bbea5bfdd4d454ca0c69a046edab04b/b0f794e396d84c52af5608b095a55b99.jpg?imwidth=1800&filter=packshot"),
("Denim Jacket", "Jackets", "Men", 349.99, "https://img01.ztat.net/article/spp-media-p1/119fea4104994ab490d4fc475552d5ec/e7c7819629cf4991b5444cce4b82e2a4.jpg?imwidth=1800&filter=packshot"),
("Sport Leggings", "Activewear", "Women", 189.99, "https://img01.ztat.net/article/spp-media-p1/090acdd54a79447cbf7fe6f6080067df/95c956ecd4a44ef8b6b8e3dfd2eef65c.jpg?imwidth=1800&filter=packshot"),
("Sports Bra", "Activewear", "Women", 129.99, "https://img01.ztat.net/article/spp-media-p1/e68bfa94ce1a4b46a158ff248eed20ee/53b9cfd5615046b8b8e9d5205bf72b6a.jpg?imwidth=1800&filter=packshot"),
("Cropped T-Shirt", "Shirts", "Women", 89.99, "https://img01.ztat.net/article/spp-media-p1/14c1ae08e7434a6eb0dfb1226b7ea550/9b022d6edc2041e2bc1606647ed83de4.jpg?imwidth=1800&filter=packshot"),
("Blazer Jacket", "Blazers", "Women", 349.99, "https://img01.ztat.net/article/spp-media-p1/ac61fc429cac4dc89ffba07462a860f1/4b99b9143aa64ae69ad8c2f37e612fdf.jpg?imwidth=1800&filter=packshot"),
("Business Suit", "Suits", "Men", 799.99, "https://img01.ztat.net/article/spp-media-p1/161d4a2fda23409aa790656bcf374c35/a7c5444d6f3a4620863955bfcd3d6931.jpg?imwidth=1800"),
("Formal Trousers", "Pants", "Men", 259.99, "https://img01.ztat.net/article/spp-media-p1/8efd2e586c454713abaa9583d98fd03a/57eeee295d7e482b9731abcb5da6261d.jpg?imwidth=1800"),
("Denim Skirt", "Skirts", "Women", 129.99, "https://img01.ztat.net/article/spp-media-p1/3cb240c429854e01b26c6137bf54cf2a/13b46847c8114081b577356e3f4adc3d.jpg?imwidth=1800&filter=packshot"),
("Pleated Skirt", "Skirts", "Women", 139.99, "https://img01.ztat.net/article/spp-media-p1/bbf76ec7eaae4600ab1aa13ee36a17ac/2e0dc1f90f734248be30cbfeba0734ad.jpg?imwidth=1800&filter=packshot")
]

cursor.executemany(
    "INSERT INTO products (name, category, gender, unit_price, image_url) VALUES (?, ?, ?, ?, ?)",
    products
)


# -----------------------------
# 3. Generate Product Sizes
# -----------------------------
sizes = ["XS", "S", "M", "L", "XL"]

cursor.execute("SELECT product_id FROM products")
product_ids = [row[0] for row in cursor.fetchall()]

size_rows = []

for product in product_ids:
    for size in sizes:
        size_rows.append((product, size))

cursor.executemany(
    "INSERT INTO product_sizes (product_id, size) VALUES (?, ?)",
    size_rows
)


# -----------------------------
# 4. Populate Inventory
# -----------------------------
cursor.execute("SELECT store_id FROM stores")
store_ids = [row[0] for row in cursor.fetchall()]

cursor.execute("SELECT size_id FROM product_sizes")
size_ids = [row[0] for row in cursor.fetchall()]

inventory_data = []

for store in store_ids:
    for size in size_ids:
        quantity = random.randint(0, 20)
        inventory_data.append((store, size, quantity))

cursor.executemany(
    "INSERT INTO inventory (store_id, size_id, quantity) VALUES (?, ?, ?)",
    inventory_data
)

# -----------------------------
# Compute stuff
# -----------------------------

# Sales volume per store (bigger cities sell more)
store_sales_volume = {
    1: (120, 200),  # Bucharest
    2: (80, 150),   # Cluj
    3: (70, 140),   # Timisoara
    4: (60, 120),   # Iasi
    5: (60, 120),
    6: (50, 110),
    7: (50, 100),
    8: (50, 100),
    9: (40, 90),
    10: (40, 90)
}

sizes_weighted = ["XS","S","S","M","M","M","M","L","L","XL"]
cursor.execute("SELECT size_id, size FROM product_sizes")
size_rows = cursor.fetchall()

size_map = {}

for size_id, size in size_rows:
    if size not in size_map:
        size_map[size] = []
    size_map[size].append(size_id)

# -----------------------------
# 5. Generate Sales Data
# -----------------------------
start_date = datetime.now() - timedelta(days=120)

sales_data = []

for day in range(120):

    current_day = start_date + timedelta(days=day)

    for store in store_ids:

        # Get store-specific sales range
        low, high = store_sales_volume[store]
        daily_sales = random.randint(low, high)

        for _ in range(daily_sales):

            size_label = random.choice(sizes_weighted)
            size = random.choice(size_map[size_label])
            quantity = random.randint(1, 3)

            sales_data.append(
                (store, size, quantity, current_day.date())
            )

cursor.executemany(
    "INSERT INTO sales (store_id, size_id, quantity, sale_date) VALUES (?, ?, ?, ?)",
    sales_data
)






# -----------------------------
# 6. Generate Alerts (LAST 7 DAYS)
# -----------------------------
alerts = []

end_date = datetime.now()
start_date = end_date - timedelta(days=7)

current_day = start_date

while current_day <= end_date:

    # --- Inventory snapshot (same as current, or you can simulate changes)
    cursor.execute("""
    SELECT store_id, size_id, quantity
    FROM inventory
    """)
    inventory_rows = cursor.fetchall()

    inventory_map = {(r[0], r[1]): r[2] for r in inventory_rows}

    # --- SALES in last 30 days from THAT DAY
    cursor.execute("""
    SELECT store_id, size_id, SUM(quantity)
    FROM sales
    WHERE sale_date BETWEEN date(?) - 30 AND date(?)
    GROUP BY store_id, size_id
    """, (current_day.date(), current_day.date()))

    sales_30d = cursor.fetchall()

    sales_map = {(r[0], r[1]): r[2] for r in sales_30d}

    # --- SALES spike calc
    cursor.execute("""
    SELECT store_id, size_id,
    SUM(CASE WHEN sale_date BETWEEN date(?) - 7 AND date(?) THEN quantity ELSE 0 END),
    SUM(CASE WHEN sale_date BETWEEN date(?) - 37 AND date(?) - 8 THEN quantity ELSE 0 END)
    FROM sales
    GROUP BY store_id, size_id
    """, (current_day.date(), current_day.date(),
          current_day.date(), current_day.date()))

    spike_data = cursor.fetchall()

    # -----------------------------
    # 1. LOW STOCK
    # -----------------------------
    for store_id, size_id, quantity in inventory_rows:
        if quantity <= 2:
            alerts.append((
                current_day,
                "Low Stock",
                "High" if quantity < 1 else "Medium",
                f"SizeID {size_id} low stock ({quantity})",
                store_id,
                "Ongoing",
                "Restock Requested",
                "Pending",
                None
            ))

    # -----------------------------
    # 2. STOCKOUT RISK
    # -----------------------------
    for (store_id, size_id), total_sales in sales_map.items():

        avg_daily_sales = total_sales / 30 if total_sales else 0
        stock = inventory_map.get((store_id, size_id), 0)

        if avg_daily_sales > 0:
            days_left = stock / avg_daily_sales

            if days_left < 3:
                alerts.append((
                    current_day,
                    "Stockout Risk",
                    "Critical" if days_left < 1 else "High",
                    f"SizeID {size_id} risk: {days_left:.1f} days left",
                    store_id,
                    "Short-term",
                    "Expedite Reorder",
                    "Pending",
                    None
                ))

    # -----------------------------
    # 3. DEMAND SPIKE
    # -----------------------------
    for store_id, size_id, last_7, prev_30 in spike_data:

        if prev_30 > 0:
            avg_prev = prev_30 / 30
            avg_recent = last_7 / 7

            if avg_recent > avg_prev * 1.5:
                alerts.append((
                    current_day,
                    "Freight Spike",
                    "Medium",
                    f"SizeID {size_id} demand spike",
                    store_id,
                    "Short-term",
                    "Monitor",
                    "Pending",
                    None
                ))

    current_day += timedelta(days=1)

# -----------------------------
# Insert alerts
# -----------------------------
cursor.executemany("""
INSERT INTO alerts_history (
    timestamp,
    alert_type,
    severity,
    trigger_subject,
    store_id,
    duration,
    action_taken,
    result,
    resolved_at
)
VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
""", alerts)

conn.commit()

print(f"{len(alerts)} alerts generated over last 7 days.")


conn.commit()
conn.close()

print("Database populated successfully.")