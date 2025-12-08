import psycopg2
from psycopg2.extras import execute_batch
from faker import Faker
import random
import uuid
from datetime import datetime, timedelta
import json
# Run attached requirements.txt to install dependencies.
# pip install -r requirements.txt

# --- DB Configs ---
DB_NAME = "postgres"
DB_USER = "postgres"
DB_PASSWORD = "changeme"
DB_HOST = "localhost"
DB_PORT = 15432
NUM_RECORDS = 50 # Number of records to insert
BATCH_SIZE = 10 # Number of records per batch

# --- Fixed Data for Intered TdfObjects ---
FIXED_SRC_TYPE = 'vehicles'
FIXED_SEARCH_JSONB = json.dumps({
    "attrRelTo": [],
    "attrNeedToKnow": [],
    "attrClassification": "https://demo.com/attr/classification/value/unclassified",
})
HEX_STRING_TDF_BLOB = '4c314c111d6c6f63616c2d6473702e7669727472752e636f6d3a383038302f6b6173653100010201d9a9126570ad537a952beb5ac04e5a3b1e12ef786242aa854c4eaa8637b65068dcce0302a61be466549912d03719a77aa8e120d89370cd7b9fc75a7b963b91502852fa4f3b296e848d74d0e9bcde0e68dd321b01323ab87856987f832763b10e0a0e90c9ae8324737fa460943acbcfc13edfa566ffa4606e023879414f6f0e811cd0ee39e5072a703898e4c372ce16a0b0c297328098d593205b3700b59047e8d6d7a1bd2ceedda6269e79dacefd5d724d6b414096b4eca040c097be4d515ff12d42cfae58e17d0fcf21bd0c904e15274880dc3151dfe6cc69bdf66f148ac60579642e04e2c384a8ba7c9624fd3d722322445e27bb8cf1bd518ca5b8a87167cfc99bef11849ba741eaeb00db816ae7710464983c9171cd9b12e7b508976bdaea12a0be71c4f8c41bace3484e2e775ff4f6e3e38bc3937707e2446832641ff5fff76ea8a089ef3bd41b53554ce458bb99bc98c5c2c971023cfdc4d33d37b87c34c15263caaac0f1c02bb29796fbe49117537e3692faca8053f9e4fd70ba60f8e3e09d385734a381ca588b141857a0e61bfe210fc8592f6d49fc5ce73386fd90cc4a371450ec82b701fcf0efdf4ebc9a277c5afefc98ee31dabe76239d108ae6cdc9fccd723c77d3a4317c67ee6888daa0bdc608f713a3aa33a6eeaaf559d42e36ab97021f823d1bbf21f64817d82849928c6257a98246f158882dc7d70cefd5ffd10ce40000a00000010eb28df2c17329cf844c1fc1814bc17f135f7b6783f0a3667586132f52b20d7f68719ffb859942686c7d6ced59777e6783419f57730661e4740c4617aab93a1bdd47a293cc61f1a352348e884280b8b311c5e609212f8cc760394194fb26b4b15281c66b4c147fe81ff235bd128529f80c278398fb1aee971798b44429d83d93fa6651ae214d0b6ece0e7da010e8b338dca25f3acc0dc12e13f5eac14c'
FIXED_TDF_BLOB_BYTEA = bytes.fromhex(HEX_STRING_TDF_BLOB)
FIXED_TDF_URI = None
FIXED_CREATED_BY = 'seed_script'

# --- Insert Statement ---
INSERT_SQL = """
INSERT INTO tdf_objects (
    id,
    ts,
    src_type,
    geo,
    search,
    tdf_blob,
    tdf_uri,
    _created_at,
    _created_by
)
VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s)
"""

# Helper function to generate WKB for GEO data
def generate_random_point_wkb():
    """Generates a random GEO in WKB format."""
    min_lat, max_lat = -90, 90
    min_lon, max_lon = -180, 180

    lat = random.uniform(min_lat, max_lat)
    lon = random.uniform(min_lon, max_lon)

    return f'POINT({lon} {lat})'

# --- Make Records ---
def generate_tdf_records(count):
    """Generates a list of tdf_object records."""
    records = []
    fake = Faker()

    # Start date to be used for random timestamp generation
    start_date = datetime.now() - timedelta(days=30)

    for _ in range(count):

        # Randomized Data Fields
        random_id = str(uuid.uuid4())
        random_ts = fake.date_time_between(start_date=start_date, end_date="now")
        random_geo = generate_random_point_wkb() # WKB format
        random_created_at = random_ts + timedelta(seconds=random.uniform(0.01, 0.1))

        # Build the record
        record = (
            random_id,
            random_ts,
            FIXED_SRC_TYPE,
            random_geo,
            FIXED_SEARCH_JSONB,
            FIXED_TDF_BLOB_BYTEA,
            FIXED_TDF_URI,
            random_created_at,
            FIXED_CREATED_BY
        )
        records.append(record)

    return records

# --- Insert Logic ---
def insert_seed_data():
    conn = None
    records = generate_tdf_records(NUM_RECORDS)

    print(f"Attempting to generate and insert {NUM_RECORDS} records in batches of {BATCH_SIZE}...")

    try:
        # Connection
        conn = psycopg2.connect(
            dbname=DB_NAME,
            user=DB_USER,
            password=DB_PASSWORD,
            host=DB_HOST,
            port=DB_PORT
        )
        cursor = conn.cursor()

        # Batch Chunks Insert
        execute_batch(
            cursor,
            INSERT_SQL,
            records,
            page_size=BATCH_SIZE
        )

        # Commit updates
        conn.commit()
        print(f"Successfully inserted {NUM_RECORDS} records into the tdf_objects table.")

    except psycopg2.OperationalError as e:
        print(f"CONNECTION ERROR: Could not connect to the database.")
        print(f"Details: {e}")
        if conn: conn.rollback()

    except Exception as e:
        print(f"An error occurred during insertion: {e}")
        if conn: conn.rollback()

    finally:
        if conn:
            cursor.close()
            conn.close()

if __name__ == "__main__":
    insert_seed_data()