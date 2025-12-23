import asyncio
import time
import json
import uuid
import random
import psycopg2
from shapely.geometry import Point

# --- Configs ---
DB_NAME = "postgres"
DB_USER = "postgres"
DB_PASSWORD = "changeme"
DB_HOST = "localhost"
DB_PORT = 15432
TABLE_NAME = "tdf_objects"

# Script parameters
NUM_ENTITIES = 50
UPDATE_INTERVAL_SECONDS = 1

# Bounding Box
BOUNDING_BOX = {
    'lamin': -55.0,
    'lomin': -160.0,
    'lamax': 55.0,
    'lomax': 160.0
}

# --- State Management ---
# Map the DB UUID to fake ICAO24 addresses
UUID_TO_FLIGHT = {}
# Store simulation state (pos, speed, heading) for each fake ICAO
FAKE_FLIGHT_STATE = {}

# --- Helper Functions ---
def get_db_uuids(conn_params, num_entities):
    """Fetches a set of UUIDs from the database to be tracked."""
    conn = None
    uuids = []
    try:
        conn = psycopg2.connect(**conn_params)
        cursor = conn.cursor()
        cursor.execute(f"SELECT id FROM {TABLE_NAME} WHERE src_type = 'vehicles' LIMIT %s;", (num_entities,))
        uuids = [row[0] for row in cursor.fetchall()]
        print(f"Found {len(uuids)} UUIDs for tracking.")
    except Exception as e:
        print(f"Database error: {e}")
    finally:
        if conn: conn.close()
    return uuids

def lat_lon_to_wkb(latitude, longitude):
    """ Converts a latitude and longitude into expected WKB """
    if latitude is not None and longitude is not None:
        point = Point(longitude, latitude)
        return point.wkb
    return None

# --- Mock API Functions ---

async def fake_initialize_associations(uuids):
    """ Assigns UUIDs to fake ICAO24s """
    if not uuids:
        print("No UUIDs to associate.")
        return

    lamin, lomin = BOUNDING_BOX['lamin'], BOUNDING_BOX['lomin']
    lamax, lomax = BOUNDING_BOX['lamax'], BOUNDING_BOX['lomax']

    for i, uuid_obj in enumerate(uuids):
        icao24 = f"FAKE{i:03d}"

        # Initial State
        initial_lat = random.uniform(lamin, lamax)
        initial_lon = random.uniform(lomin, lomax)

        UUID_TO_FLIGHT[uuid_obj] = icao24
        FAKE_FLIGHT_STATE[icao24] = {
            "latitude": initial_lat,
            "longitude": initial_lon,
            "lat_change": random.uniform(-0.1, 0.1),
            "lon_change": random.uniform(-0.1, 0.1),
            "velocity": random.uniform(150, 250),
            "altitude": random.uniform(5000, 11000),
            "heading": random.uniform(0, 360)
        }

    print(f"✅ Successfully initialized {len(UUID_TO_FLIGHT)} fake flight associations.")

async def fake_update_flight_data(conn_params):
    """ Simulates movement with both Geo and Metadata."""
    if not UUID_TO_FLIGHT:
        return

    updates = []

    for uuid_obj, icao24 in UUID_TO_FLIGHT.items():
        state = FAKE_FLIGHT_STATE.get(icao24)
        if not state: continue

        # Simulate Movement
        state["latitude"] += state["lat_change"]
        state["longitude"] += state["lon_change"]

        # Simple bounce-back logic for bounding box
        if not (BOUNDING_BOX['lamin'] < state["latitude"] < BOUNDING_BOX['lamax']):
            state["lat_change"] *= -1
        if not (BOUNDING_BOX['lomin'] < state["longitude"] < BOUNDING_BOX['lomax']):
            state["lon_change"] *= -1

        # Prepare Data
        geos_wkb = lat_lon_to_wkb(state["latitude"], state["longitude"])

        metadata = json.dumps({
            "speed": f"{round(state['velocity'] * 3.6)} km/h",
            "altitude": f"{round(state['altitude'])} m",
            "heading": f"{round(state['heading'])}",
            "source": "offline_sim"
        })

        updates.append((geos_wkb, uuid_obj, metadata))

    # Perform Bulk Update
    if not updates: return

    conn = None
    try:
        conn = psycopg2.connect(**conn_params)
        cursor = conn.cursor()

        update_query = f"""
        UPDATE {TABLE_NAME} AS t
        SET
            geo = ST_SetSRID(ST_GeomFromWKB(src.wkb_geos), 4326),
            metadata = COALESCE(t.metadata, '{{}}'::jsonb) || src.metadata::jsonb
        FROM
            (SELECT unnest(%s) as wkb_geos, unnest(%s) as entity_uuid, unnest(%s) as metadata) AS src
        WHERE
            t.id = src.entity_uuid::uuid;
        """

        wkb_list = [item[0] for item in updates]
        uuid_list = [item[1] for item in updates]
        meta_list = [item[2] for item in updates]

        cursor.execute(update_query, (wkb_list, uuid_list, meta_list))
        conn.commit()
        print(f"Updated {cursor.rowcount} records (Simulated).")

    except Exception as e:
        print(f"Database update failed: {e}")
        if conn: conn.rollback()
    finally:
        if conn: conn.close()

# --- Main Entry ---
async def main():
    print("Starting Offline Simulation (Mirroring Online API Structure)...")

    conn_params = {
        "dbname": DB_NAME, "user": DB_USER, "password": DB_PASSWORD,
        "host": DB_HOST, "port": DB_PORT
    }

    # Fetch targets
    uuids_to_track = get_db_uuids(conn_params, NUM_ENTITIES)

    # Initialize fake state
    await fake_initialize_associations(uuids_to_track)

    if not UUID_TO_FLIGHT:
        print("Initialization failed.")
        return

    print("\n--- Starting Simulation Loop ---")
    try:
        while True:
            start_time = time.time()

            # Run simulation update
            await fake_update_flight_data(conn_params)

            # Control loop speed
            elapsed = time.time() - start_time
            wait_time = max(0, UPDATE_INTERVAL_SECONDS - elapsed)
            await asyncio.sleep(wait_time)

    except KeyboardInterrupt:
        print("\nSimulation stopped.")

if __name__ == "__main__":
    asyncio.run(main())