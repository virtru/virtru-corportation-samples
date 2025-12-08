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
HEX_STRING_TDF_BLOB = ''
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