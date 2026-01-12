import os
import uuid
import json
import random
import psycopg2
import argparse
from io import BytesIO
from faker import Faker
from datetime import datetime, timedelta
from psycopg2.extras import execute_batch
from otdf_python.sdk_builder import SDKBuilder
from otdf_python.config import NanoTDFConfig, KASInfo

# --- DB Configs ---
DB_NAME = "postgres"
DB_USER = "postgres"
DB_PASSWORD = "changeme"
DB_HOST = "localhost"
DB_PORT = 15432
NUM_RECORDS = 50
BATCH_SIZE = 10

# --- Fixed Data for TdfObjects ---
FIXED_SRC_TYPE = 'vehicles'
FIXED_TDF_URI = None
FIXED_CREATED_BY = 'seed_script'

# --- TdfBlob Configs ---
PLATFORM_ENDPOINT = "https://local-dsp.virtru.com:8080"
CLIENT_ID = "opentdf"
CLIENT_SECRET = "secret"

CLASSIFICATIONS = ["unclassified", "confidential", "secret", "topsecret"]

# --- DSP Configs ---
CA_CERT_PATH = "./dsp-keys/rootCA.pem"
ISSUER_ENDPOINT = "https://local-dsp.virtru.com:8443/auth/realms/opentdf"

# --- Delete Statement ---
DELETE_SQL = "DELETE FROM tdf_objects WHERE src_type = %s"

# --- Insert Statement ---
INSERT_SQL = """
INSERT INTO tdf_objects (
    id,
    ts,
    src_type,
    geo,
    search,
    metadata,
    tdf_blob,
    tdf_uri,
    _created_at,
    _created_by
)
VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
"""
def get_sdk_instance(platform_endpoint, client_id, client_secret, ca_cert_path, issuer_endpoint):
    builder = SDKBuilder()
    builder.set_platform_endpoint(platform_endpoint)
    builder.client_secret(client_id, client_secret)
    builder.cert_paths = ca_cert_path
    builder.use_insecure_skip_verify(False)
    return builder.build()

def encrypt_data(sdk, plaintext: str , attributes: list[str]) -> bytes:
    """Encrypts a string payload using the TDF SDK."""
    #print(f"Creating TDF configuration with attributes: {attributes}")
    target_kas_url = "https://local-dsp.virtru.com:8080/kas"
    # Create the KASInfo object
    kas_info = KASInfo(url=target_kas_url)

    config = NanoTDFConfig(
        attributes=attributes,
        ecc_mode="secp256r1",
        kas_info_list=[kas_info]
    )

    # Convert the plaintext JSON string to a byte stream
    input_data_stream = BytesIO(plaintext.encode('utf-8'))
    output_stream = BytesIO()

    sdk.create_nano_tdf(
        input_data_stream,
        output_stream,
        config
    )

    return output_stream.getvalue()
# Helper function to generate WKB for GEO data
def generate_random_point_wkb():
    """Generates a random GEO in WKB format."""
    min_lat, max_lat = 25, 45
    min_lon, max_lon = -85, -65

    lat = random.uniform(min_lat, max_lat)
    lon = random.uniform(min_lon, max_lon)

    return f'POINT({lon} {lat})'

# --- Make Records ---
def generate_tdf_records(count, sdk):
    """Generates a list of tdf_object records."""
    records = []
    fake = Faker()

    # Start date to be used for random timestamp generation
    start_date = datetime.now() - timedelta(days=30)

    for i in range(count):
        # 1. Rotate Classifications (one of each)
        cls_type = CLASSIFICATIONS[i % len(CLASSIFICATIONS)]
        attr_url = f"https://demo.com/attr/classification/value/{cls_type}"

        # 2. Randomize Vehicle Data
        vehicle_data = {
            "vehicleName": f"{fake.lexify('??').upper()}-{fake.numerify('###')}",
            "origin": fake.lexify('???').upper(),      # Changed from airport_iata to lexify
            "destination": fake.lexify('???').upper(), # Changed from airport_iata to lexify
            "aircraft_type": random.choice(["Boeing 747", "Airbus A320", "Cessna 172", "F-35", "Global 6000"])
        }

        # Encrypt with specific classification
        tdf_blob = encrypt_data(sdk, json.dumps(vehicle_data), [attr_url])

        # Prepare search JSONB to match classification
        search_jsonb = json.dumps({
            "attrRelTo": [],
            "attrNeedToKnow": [],
            "attrClassification": [attr_url]
        })

        # Prepare metadata JSONB to have dynamic fields
        metadata_jsonb = json.dumps({
            "callsign": fake.bothify('??-####').upper(),
            "speed": f"{random.randint(0, 900)} km/h",
            "altitude": f"{random.randint(0, 40000)} m",
            "heading": str(random.randint(0, 359))
        })

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
            search_jsonb,
            metadata_jsonb,
            tdf_blob,
            FIXED_TDF_URI,
            random_created_at,
            FIXED_CREATED_BY
        )
        records.append(record)

    return records

# --- Insert Logic ---
def insert_seed_data(tdf_blob: bytes, should_delete: bool):
    conn = None
    records = generate_tdf_records(NUM_RECORDS, tdf_blob)

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

        # --- Conditional Delete logic based on flag ---
        if should_delete:
            print(f"Flag --delete detected. Cleaning up records for src_type: {FIXED_SRC_TYPE}")
            cursor.execute(DELETE_SQL, (FIXED_SRC_TYPE,))
            print(f"Successfully deleted {cursor.rowcount} records.")

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
    # --- Argparse setup ---
    parser = argparse.ArgumentParser(description="Seed script for TDF objects.")
    parser.add_argument(
        "--delete",
        action="store_true",
        help="Delete existing records matching the FIXED_SRC_TYPE before inserting new ones."
    )
    args = parser.parse_args()

    try:
        sdk_instance = get_sdk_instance(PLATFORM_ENDPOINT, CLIENT_ID, CLIENT_SECRET, CA_CERT_PATH, ISSUER_ENDPOINT)
        # Pass the flag value to the insert function
        insert_seed_data(sdk_instance, args.delete)
    except Exception as e:
        print(f"An error occurred: {e}")