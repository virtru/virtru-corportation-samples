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
NUM_RECORDS = 5
BATCH_SIZE = 1

FIXED_SRC_TYPE = 'vehicles'

FIXED_SEARCH_JSONB = json.dumps({
    "attrRelTo": [],
    "attrNeedToKnow": [],
    "attrClassification": ["https://demo.com/attr/classification/value/unclassified"], 
    "speed": "0 km/h",
    "altitude": "0 m",
    "heading": "0"
})

# --- STATIC IDENTITY DATA (Reference) ---
# This is what should be inside your HEX_STRING_TDF_BLOB.
# Kept here for reference so you know what fields the frontend expects.
VEHICLE_DATA = {
    "vehicleName": "UA-747",
    "callsign": "UA-747",
    "origin": "JFK",
    "destination": "LHR",
    "aircraft_type": "Boeing 747"
}

# Paste your valid TDF Hex String here
# (This hex string should contain the encrypted version of VEHICLE_DATA above)
HEX_STRING_TDF_BLOB = '4c314c111d6c6f63616c2d6473702e7669727472752e636f6d3a383038302f6b6173653100010201d9aaa15baa0d9f20caddf3da77c000f30d02a1dd62e4033038644b366f6ae85b309b5586cadf1b4f362e2b0b864ad4f80f6ababc506150fc8cfe41c143adbc9b3c9959ef11cf34f04ee003ec9d5bd6485886406e6d20dbe6b9c1574aca80260fb60717cdfc9f3f1464e4cfc9530e3ff21322aac99ba3a53021ad2149e54a1eb5eee5bdb842bfd847b169f5812c5dd6ac231c59a6c45d9725507d9992e3db0e44485991dc65b62c41fa6f0e53fa09d3f19cfd5c676705ab54ccbc07413c732b0f8dbfe1d3acf3ec465c26df51628539c2bd0b6bd1a4079c91a63a63959ee2c9d91f3a8c482fda03df17d530e365790ace9c83571a59d2caf96f9831d8e63ab358b0504c57d433ee423e889e9648abb0f3c7c02f2e0cc6be5fd34d37bd436da2e127738b08a31c7093f3c57180d40b4639116129fb0c552bd2d8b4b99a5942258bfc001c0f1e631341a0afb0fe8ab130c91badbbab8acc0bc9bdafb5483443344ddc4a1d39f65477d19304d0123f8df0ba7a6ea8b8dab0f3f011e93f5734afc305203ce48efd842333fc7507812c8412844f969c1a2ac8d91cdae1d633dd2fc361fbf2fb2f8e69c16df5f2ab7d48338a710763c8a84358babb115eb2a478c7efa4a71590507f4eb5f3dcce3e8c47fade5e6c4224c9b0c91ffff645992b3604e00e8ca1034e4ced1ee05acedd858c6d0ce540ce1b0795fb7d99ce0f7f270ec77b72bc17cc0000ee00000134f3183e7a6052384587a8b2cdecbbada127167a28a915760a03baba099491435fcea5f3ca19ad647c4d3cc50123241d8c694f2315458ee5f51ed465430029d419db0659e5485c0a0808f478a9d9bdfbb4488ccba6bc27600ceabd6a64b60b041446decb4e9f2659ef3f30821acceef87ac420fc53e12e4b5141cee22effb674938cd7b9ac0c10bea3dcf1d6adf3e411ca2255dc4878f45d0b788724897e8f884ba531986e60aa4b2fa1704b59b9a7f5f9c42e50dbb3b7ffdd6069f6e470c40b5999d4adf653536b4aa2e01ab9013dcd9b8ae1c55bad10f274ae5cdbf18be3a7ced1532a83af2953dc4251'

if HEX_STRING_TDF_BLOB:
    FIXED_TDF_BLOB_BYTEA = bytes.fromhex(HEX_STRING_TDF_BLOB.strip())
else:
    # Fallback to empty if no blob provided (Map will show marker but no static data)
    FIXED_TDF_BLOB_BYTEA = None 

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