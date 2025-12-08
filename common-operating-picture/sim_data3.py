import asyncio
import time
import uuid
import psycopg2
import httpx
from shapely.geometry import Point
import random

# Run attached requirements.txt to install dependencies.
# pip install -r requirements.txt

# Credit:
# Using the The OpenSky Network, https://opensky-network.org for the Live Data
# Api guide: https://openskynetwork.github.io/opensky-api/
# This script uses the REST API via HTTPX instead of the python_opensky library

# --- Configs ---
DB_NAME = "postgres"
DB_USER = "postgres"
DB_PASSWORD = "changeme"
DB_HOST = "localhost"
DB_PORT = 15432
TABLE_NAME = "tdf_objects"

# OpenSky Network API credentials
OS_USER = "AddYourCreds"
OS_PASS = "AddYourPass"

# OpenSky REST API Endpoint
BASE_URL = "https://opensky-network.org/api/states/all"

# Script parameters
NUM_ENTITIES = 50
UPDATE_INTERVAL_SECONDS = 1

# Bounding box to limit querying for credit savings
# Format: lamin, lomin, lamax, lomax
BOUNDING_BOX = {
    'lamin': -55.0,
    'lomin': -160.0,
    'lamax': 55.0,
    'lomax': 160.0
}

# --- Track UUID:ICAO24 Associations ---
# Map the DB UUID to flight ICAO24 addresses from OpenSky to track database entry to live plane
UUID_TO_FLIGHT = {}

FAKE_FLIGHT_POSITIONS = {}

async def fake_initialize_associations(uuids):
    """
    Fakes the initial API call by assigning UUIDs to fake ICAO24s
    and giving them an initial position within the bounding box.
    """
    if not uuids:
        print("No UUIDs to associate. Exiting initialization.")
        return

    # Define bounds for random initial position
    lamin, lomin = BOUNDING_BOX['lamin'], BOUNDING_BOX['lomin']
    lamax, lomax = BOUNDING_BOX['lamax'], BOUNDING_BOX['lomax']

    # Create the association and initial positions
    for i, uuid_obj in enumerate(uuids):
        # Create a deterministic fake ICAO24 address
        icao24 = f"FAKE{i:03d}"

        # Pick a random starting point within the defined box
        initial_lat = random.uniform(lamin, lamax)
        initial_lon = random.uniform(lomin, lomax)

        # Store association and position
        UUID_TO_FLIGHT[uuid_obj] = icao24
        FAKE_FLIGHT_POSITIONS[icao24] = {
            "latitude": initial_lat,
            "longitude": initial_lon,
            # Add a random direction/speed for the update loop
            "lat_change": random.uniform(-0.5, 0.5),
            "lon_change": random.uniform(-0.5, 0.5)
        }

    print(f"Successfully initialized {len(UUID_TO_FLIGHT)} fake flight associations.")

async def fake_update_data(conn_params):
    """
    Fakes the API update call by simulating small movements for all tracked flights.
    """
    if not UUID_TO_FLIGHT:
        print("No UUIDs are associated with flights.")
        return

    updates = []

    # Simulate new positions for all tracked flights
    for uuid_obj, icao24 in UUID_TO_FLIGHT.items():
        current_pos = FAKE_FLIGHT_POSITIONS.get(icao24)

        if not current_pos:
            continue

        # Simulate movement
        new_lat = current_pos["latitude"] + current_pos["lat_change"]
        new_lon = current_pos["longitude"] + current_pos["lon_change"]

        # Stay within the bounding box
        lamin, lomin = BOUNDING_BOX['lamin'], BOUNDING_BOX['lomin']
        lamax, lomax = BOUNDING_BOX['lamax'], BOUNDING_BOX['lomax']

        if not lamin < new_lat < lamax:
            current_pos["lat_change"] *= -1
            new_lat = current_pos["latitude"]

        if not lomin < new_lon < lomax:
            current_pos["lon_change"] *= -1
            new_lon = current_pos["longitude"]

        # Update the stored position
        current_pos["latitude"] = new_lat
        current_pos["longitude"] = new_lon

        # Prepare data for DB update
        geos_wkb = lat_lon_to_wkb(new_lat, new_lon)
        updates.append((geos_wkb, uuid_obj))

    # Perform the bulk update on the database
    if not updates:
        print("No valid position updates to commit to the database.")
        return

    conn = None
    try:
        conn = psycopg2.connect(**conn_params)
        cursor = conn.cursor()

        update_query = f"""
        UPDATE {TABLE_NAME} AS t
        SET
            geo = ST_SetSRID(ST_GeomFromWKB(src.wkb_geos), 4326)
        FROM
            (SELECT unnest(%s) as wkb_geos, unnest(%s) as entity_uuid) AS src
        WHERE
            t.id = src.entity_uuid::uuid;
        """

        wkb_list = [item[0] for item in updates]
        uuid_list = [item[1] for item in updates]

        cursor.execute(update_query, (wkb_list, uuid_list))
        conn.commit()
        print(f"Successfully updated {cursor.rowcount} records.")

    except Exception as e:
        print(f"Database update failed: {e}")
        if conn:
            conn.rollback()
    finally:
        if conn:

            conn.close()

# --- Helper Functions ---
def get_db_uuids(conn_params, num_entities):
    """Fetches a set of UUIDs from the database to be tracked."""
    conn = None
    uuids = []
    try:
        conn = psycopg2.connect(**conn_params)
        cursor = conn.cursor()
        # Fetch the UUIDs
        cursor.execute(f"SELECT id FROM {TABLE_NAME} WHERE src_type = 'vehicles' LIMIT %s;", (num_entities,))
        uuids = [row[0] for row in cursor.fetchall()]
        print(f"Found {len(uuids)} UUIDs for tracking.")
    except Exception as e:
        print(f"Database error: {e}")
    finally:
        if conn:
            conn.close()

    # Warning if not enough are found.
    if len(uuids) < num_entities:
         print(f"WARNING: Not enough UUIDs in the database. Please ensure your table has at least {num_entities} 'vehicles' entries.")
         return

    return uuids


def lat_lon_to_wkb(latitude, longitude):
    """ Converts a latitude and longitude into expected WKB """
    if latitude is not None and longitude is not None:
        point = Point(longitude, latitude)
        # Convert to WKB and return as a byte string for psycopg2
        return point.wkb
    return None

# --- REST API Data Structures ---
class StateVector:
    def __init__(self, data):
        self.icao24 = data[0]
        # data[5] is longitude, data[6] is latitude
        self.longitude = data[5]
        self.latitude = data[6]

async def main():
    print("Starting Live Data Updater...")

    # Connection parameters
    conn_params = {
        "dbname": DB_NAME,
        "user": DB_USER,
        "password": DB_PASSWORD,
        "host": DB_HOST,
        "port": DB_PORT
    }

    # Initialize API and Fetch UUIDs
    async with httpx.AsyncClient(auth=(OS_USER, OS_PASS), timeout=30.0) as client:
        uuids_to_track = get_db_uuids(conn_params, NUM_ENTITIES)

        # Makes associations
        #await initialize_flight_associations(client, uuids_to_track)
        await fake_initialize_associations(uuids_to_track)

        if not UUID_TO_FLIGHT:
            print("Initial association failed. Cannot start update loop.")
            return

        # Start the continuous update loop
        print("\n--- Starting Live Update Loop ---")
        try:
            while True:
                start_time = time.time()
                print(f"\n[{time.strftime('%Y-%m-%d %H:%M:%S', time.localtime())}] Fetching and updating data...")

                #await update_flight_data(client, conn_params)
                await fake_update_data(conn_params)

                # Wait
                elapsed = time.time() - start_time
                wait_time = max(0, UPDATE_INTERVAL_SECONDS - elapsed)
                print(f"Cycle completed in {elapsed:.2f}s. Waiting for {wait_time:.2f}s...")
                time.sleep(wait_time)

        except KeyboardInterrupt:
            print("\nScript Terminiated. Bye Byes!")
        except Exception as e:
            print(f"\nFatal error: {e}")

if __name__ == "__main__":
    asyncio.run(main())