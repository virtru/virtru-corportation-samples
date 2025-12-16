import os
import uuid
import json
import random
import psycopg2
from io import BytesIO
from faker import Faker
from datetime import datetime, timedelta
from psycopg2.extras import execute_batch
from otdf_python.sdk_builder import SDKBuilder
from otdf_python.config import NanoTDFConfig, KASInfo

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

# --- Fixed Data for TdfObjects ---
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

# --- TdfBlob Configs ---
PLATFORM_ENDPOINT = "https://local-dsp.virtru.com:8080"
CLIENT_ID = "opentdf"
CLIENT_SECRET = "secret"

# Attributes
ATTRIBUTES = [
    "https://demo.com/attr/classification/value/unclassified"
]

# --- Vehicle Data Structure ---
VEHICLE_DATA = {
    "attrClassification": "https://demo.com/attr/classification/value/unclassified",
    "attrNeedToKnow": [],
    "attrRelTo": [],
    "vehicleName": "UA-747",
}
PLAINTEXT_DATA = json.dumps(VEHICLE_DATA)

# --- DSP Configs ---
OUTPUT_FILENAME = "encrypted_vehicle.tdf"

CA_CERT_PATH = "./dsp-keys/rootCA.pem"
ISSUER_ENDPOINT = "https://local-dsp.virtru.com:8443/auth/realms/opentdf"

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
# Helper functions for tdfblob generation and encryption
def get_sdk_instance(platform_endpoint: str, client_id: str, client_secret: str, ca_cert_path: str, issuer_endpoint: str):
    """Initializes and returns the configured TDF SDK instance."""
    builder = SDKBuilder()
    print(platform_endpoint)
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
    min_lat, max_lat = -90, 90
    min_lon, max_lon = -180, 180

    lat = random.uniform(min_lat, max_lat)
    lon = random.uniform(min_lon, max_lon)

    return f'POINT({lon} {lat})'

# --- Make Records ---
def generate_tdf_records(count, tdf_blob: bytes):
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
            tdf_blob,
            FIXED_TDF_URI,
            random_created_at,
            FIXED_CREATED_BY
        )
        records.append(record)

    return records

# --- Insert Logic ---
def insert_seed_data(tdf_blob: bytes):
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
    encrypted_result = None
    try:
        # Initialize the SDK (Authentication happens here)
        sdk_instance = get_sdk_instance(PLATFORM_ENDPOINT, CLIENT_ID, CLIENT_SECRET, CA_CERT_PATH, ISSUER_ENDPOINT)

        # --- Encryption ---
        encrypted_result = encrypt_data(
            sdk_instance,
            PLAINTEXT_DATA,
            ATTRIBUTES,
        )


    except Exception as e:
        print(f"\nAn error occurred: {e}")

    if encrypted_result:
        #print(f"KAS URL found in TDF: {encrypted_result[0:500].decode('utf-8', 'ignore')}")
        tdf_blob = encrypted_result
        # raw_hex_string = encrypted_result.hex()
        insert_seed_data(tdf_blob)
        #print(tdf_blob)
        #print(tdf_blob.hex())
    else:
        print("Skipping database insertion because TDF encryption failed.")