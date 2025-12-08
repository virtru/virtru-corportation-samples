import asyncio
import time
import uuid
import psycopg2
import httpx
from shapely.geometry import Point

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
NUM_ENTITIES = 5
UPDATE_INTERVAL_SECONDS = 20

# Bounding box to limit querying for credit savings
# Format: lamin, lomin, lamax, lomax
BOUNDING_BOX = {
    'lamin': 25.0,
    'lomin': -100.0,
    'lamax': 45.0,
    'lomax': -70.0
}

# --- Track UUID:ICAO24 Associations ---
# Map the DB UUID to flight ICAO24 addresses from OpenSky to track database entry to live plane
UUID_TO_FLIGHT = {}

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


async def initialize_flight_associations(client, uuids):
    """
    Fetches initial live flights and creates a fixed association
    between UUIDs and flight ICAO24 addresses using the REST API.
    """
    if not uuids:
        print("No UUIDs to associate. Exiting initialization.")
        return

    try:
        # Limit Scope with bounding box
        params = BOUNDING_BOX
        # Make the API Call to get all states
        response = await client.get(BASE_URL, params=params)
        response.raise_for_status() # Raise error for bad responses
        data = response.json()

        # Extract and parse the state vectors
        states_data = data.get('states', [])

        # Convert raw list data into our simplified StateVector objects
        states = [StateVector(s) for s in states_data]

        if not states:
            print("No flights found.")
            return

        # Use a list of ICAO24 addresses from the fetched flights
        available_flights = [s.icao24 for s in states if s.longitude is not None and s.latitude is not None][:len(uuids)]

        if not available_flights:
            print("No flights with valid coordinates found.")
            return

        # Create the association
        for i, uuid_obj in enumerate(uuids):
            icao24 = available_flights[i % len(available_flights)]
            UUID_TO_FLIGHT[uuid_obj] = icao24

        print(f"Successfully associated {len(UUID_TO_FLIGHT)} UUIDs with ICAO24 addresses.")

    except httpx.HTTPStatusError as e:
        print(f"HTTP Error initializing OpenSky data: {e}")
    except Exception as e:
        print(f"Error initializing OpenSky data: {e}")


async def update_flight_data(client, conn_params):
    """
    Loop for pulling new flight data and update the database using the REST API.
    """
    if not UUID_TO_FLIGHT:
        print("No UUIDs are associated with flights.")
        return

    # Get the list of ICAO24 addresses
    tracked_icao24s = list(UUID_TO_FLIGHT.values())

    # Pass icao24 as query parameters for filtering
    params = {'icao24': tracked_icao24s}

    # Query OpenSky
    try:
        # Make the API Call
        response = await client.get(BASE_URL, params=params)
        response.raise_for_status()
        data = response.json()

        # Extract and parse the state vectors
        states_data = data.get('states', [])
        states = [StateVector(s) for s in states_data]

    except httpx.HTTPStatusError as e:
        print(f"HTTP Error fetching OpenSky data: {e}")
        return
    except Exception as e:
        print(f"Error fetching OpenSky data: {e}")
        return

    if not states:
        print("No state data returned for the tracked flights.")
        return

    # Map ICAO24 to its state object for quick lookup
    flight_data_map = {s.icao24: s for s in states}

    # Prepare data for bulk update (uuid, geos_wkb)
    updates = []

    for uuid_obj, icao24 in UUID_TO_FLIGHT.items():
        flight = flight_data_map.get(icao24)

        # Check if we got an update for this specific flight
        if flight and flight.latitude is not None and flight.longitude is not None:
            # Convert Lat/Lon to WKB format
            geos_wkb = lat_lon_to_wkb(flight.latitude, flight.longitude)

            # Append as (geos_wkb, uuid) for the UPDATE query
            updates.append((geos_wkb, uuid_obj))

    if not updates:
        print("No valid position updates to commit to the database.")
        return

    # Perform the bulk update on the database
    conn = None
    try:
        conn = psycopg2.connect(**conn_params)
        cursor = conn.cursor()

        # Tested this update in a test file and it works
        update_query = f"""
        UPDATE {TABLE_NAME} AS t
        SET
            geos = ST_SetSRID(ST_GeomFromWKB(src.wkb_geos), 4326)
        FROM
            (SELECT unnest(%s) as wkb_geos, unnest(%s) as entity_uuid) AS src
        WHERE
            t.id = src.entity_uuid::uuid;
        """

        wkb_list = [item[0] for item in updates]
        uuid_list = [item[1] for item in updates]

        # Execute the update
        cursor.execute(update_query, (wkb_list, uuid_list))

        # Commit updates
        conn.commit()
        print(f"Successfully updated {cursor.rowcount} records.")

    except Exception as e:
        print(f"Database update failed: {e}")
        if conn:
            conn.rollback()
    finally:
        if conn:
            conn.close()


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
        await initialize_flight_associations(client, uuids_to_track)

        if not UUID_TO_FLIGHT:
            print("Initial association failed. Cannot start update loop.")
            return

        # Start the continuous update loop
        print("\n--- Starting Live Update Loop ---")
        try:
            while True:
                start_time = time.time()
                print(f"\n[{time.strftime('%Y-%m-%d %H:%M:%S', time.localtime())}] Fetching and updating data...")

                await update_flight_data(client, conn_params)

                # Wait
                elapsed = time.time() - start_time
                wait_time = max(0, UPDATE_INTERVAL_SECONDS - elapsed)
                print(f"Cycle completed in {elapsed:.2f}s. Waiting for {wait_time:.2f}s...")
                time.sleep(wait_time)

        except KeyboardInterrupt:
            print("\nBye byes.")
        except Exception as e:
            print(f"\nFatal error: {e}")

if __name__ == "__main__":
    asyncio.run(main())