import asyncio
import time
import uuid
import httpx
import psycopg2
from python_opensky import OpenSky
from shapely.geometry import Point
# Run attached requirements.txt to install dependencies.
# pip install -r requirements.txt

# Credit:
# Using the The OpenSky Network, https://opensky-network.org for the Live Data
# Api guide: https://openskynetwork.github.io/opensky-api/

# --- Configs ---
DB_NAME = "postgres"
DB_USER = "postgres"
DB_PASSWORD = "changeme"
DB_HOST = "localhost"
DB_PORT = 15432
TABLE_NAME = "tdf_objects"

# OpenSky Network API credentials
OS_USER = None
OS_PASS = None

# Script parameters
NUM_ENTITIES = 5
UPDATE_INTERVAL_SECONDS = 20
# Optional bounding box to limit querying for credit savings but it doesnt work like the docs so idk
#BOUNDING_BOX = [25.0, 45.0, -85.0, -65.0]

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

async def initialize_flight_associations(api, uuids):
    """
    Fetches initial live flights and creates a fixed association
    between UUIDs and flight ICAO24 addresses
    """
    if not uuids:
        print("No UUIDs to associate. Exiting initialization.")
        return

    try:
        # Get live state vectors from OpenSky
        # Documentation: get_states(time_secs=0, icao24=None, bbox=())
        # Seems to be a lie because bbox isnt working when passing it by name or all references
        states = await api.get_states() #0, None, BOUNDING_BOX // bbox=BOUNDING_BOX

        if not states or not states.states:
            print("No flights found in the current area. Retrying later.")
            return

        # Use a list of ICAO24 addresses from the fetched flights
        available_flights = [s.icao24 for s in states.states if s.longitude is not None and s.latitude is not None][:len(uuids)]

        if not available_flights:
            print("No flights with valid coordinates found.")
            return

        # Create the association
        for i, uuid_obj in enumerate(uuids):
            icao24 = available_flights[i % len(available_flights)]
            UUID_TO_FLIGHT[uuid_obj] = icao24

        print(f"Successfully associated {len(UUID_TO_FLIGHT)} UUIDs with ICAO24 addresses.")

    except Exception as e:
        print(f"Error initializing OpenSky data: {e}")


async def update_flight_data(api, conn_params):
    """
    Main loop to pull new flight data and update the database.
    """
    if not UUID_TO_FLIGHT:
        print("No UUIDs are associated with flights. Re-running initialization.")
        return

    # Get the list of ICAO24 addresses
    tracked_icao24s = list(UUID_TO_FLIGHT.values())

    # Query OpenSky
    try:
        # Request states
        states = await api.get_states(icao24=tracked_icao24s)

    except Exception as e:
        print(f"Error fetching OpenSky data: {e}")
        return

    if not states or not states.states:
        print("No state data returned for the tracked flights.")
        return

    # Map ICAO24 to its state object for quick lookup
    flight_data_map = {s.icao24: s for s in states.states}

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
    async with OpenSky(OS_USER, OS_PASS) as api:
        uuids_to_track = get_db_uuids(conn_params, NUM_ENTITIES)

        # Makes associations
        await initialize_flight_associations(api, uuids_to_track)

        if not UUID_TO_FLIGHT:
            print("Initial association failed. Cannot start update loop.")
            return

        # Start the continuous update loop
        print("\n--- Starting Live Update Loop ---")
        try:
            while True:
                start_time = time.time()
                print(f"\n[{time.strftime('%Y-%m-%d %H:%M:%S', time.localtime())}] Fetching and updating data...")

                await update_flight_data(api, conn_params)

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
