import { useEffect, useState, useContext, useCallback, useMemo, Dispatch, SetStateAction } from 'react';
import { useSearchParams } from 'react-router-dom';
import { LayersControl, MapContainer, TileLayer } from 'react-leaflet';
import { LatLng, Map } from 'leaflet';
import { Box, Button, Grid } from '@mui/material';
import { AddCircle } from '@mui/icons-material';
import { useRpcClient } from '@/hooks/useRpcClient';
import { PageTitle } from '@/components/PageTitle';
import { SourceTypeProvider } from './SourceTypeProvider';
import { CreateDialog } from './CreateDialog';
import { SourceTypeSelector } from './SourceTypeSelector';
import { SearchFilter } from './SearchFilter';
import { SearchResults } from './SearchResults';
import { SrcType, TdfObject } from '@/proto/tdf_object/v1/tdf_object_pb.ts';
import { config } from '@/config';
import { TdfObjectsMapLayer } from '@/components/Map/TdfObjectsMapLayer';
import { BannerContext } from '@/contexts/BannerContext';
import { VehicleLayer } from '@/components/Map/VehicleLayer';
import { TimestampSelector } from '@/proto/tdf_object/v1/tdf_object_pb.ts';
import { Timestamp } from '@bufbuild/protobuf';
import dayjs from 'dayjs';

// Define TdfObjectResponse structure
export interface TdfObjectResponse {
    tdfObject: TdfObject;
    decryptedData: any; // Use a more specific type if known
}

export interface VehicleDataItem {
  id: string;
  pos: { lat: number; lng: number };
  data? : {
    vehicleName: string;
    callsign?: string;
    origin?: string;
    destination?: string;
    speed?: string;
    altitude?: string;
    aircraft_type?: string;

    attrClassification?: string | string[];
    attrNeedToKnow?: string[];
    attrRelTo?: string[];
    }
  }

export function SourceTypes() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [srcTypeId, setSrcTypeId] = useState<string | null>(null);
  const [selectable, setSelectable] = useState<boolean | null>();

  const [map, setMap] = useState<Map | null>(null);

  const [dialogOpen, setDialogOpen] = useState(false);

  const { getSrcType, queryTdfObjects } = useRpcClient();
  const [srcType, setSrcType] = useState<SrcType>();

  const { activeEntitlements } = useContext(BannerContext);
    // TDF object handling: TdObjectResponse[]
  const { tdfObjects, setTdfObjects } = useContext(BannerContext) as {
      tdfObjects: TdfObjectResponse[];
      setTdfObjects: Dispatch<SetStateAction<TdfObjectResponse[]>>;
  };

  // NEW STATE: To hold the single vehicle added to the search results list on click
  const [selectedVehicleForResults, setSelectedVehicleForResults] = useState<TdfObjectResponse | null>(null);

  const [vehicleData, setVehicleData] = useState<VehicleDataItem[]>([]);
  const vehicleSourceTypeId = "vehicles";

  const filteredVehicleData = useMemo(() => {
    if (!activeEntitlements || activeEntitlements.size === 0 || activeEntitlements.has("NoAccess")) {
      return vehicleData;
    }

    return vehicleData.filter(vehicle => {
      const classification = vehicle.data?.attrClassification;
      if (!classification) return true;

      const classStr = Array.isArray(classification) ? classification[0] : classification;
      if (!classStr) return true;

      return activeEntitlements.has(classStr);
    });
  }, [vehicleData, activeEntitlements]);

  const fetchSrcType = useCallback(async (id: string) => {
    try {
      const { srcType } = await getSrcType({ srcType: id });
      setSrcType(srcType);
    } catch (err) {
      console.warn(`'${id}' is not a valid soure type.`);
      setSrcType(undefined);
      setSearchParams(new URLSearchParams());
    }
  }, [getSrcType, setSearchParams]);

  const fetchTdfObjects = useCallback(async (id: string) => {
    try {
        console.log(`Fetching TDF objects for source type: ${id}`);
        const response: TdfObjectResponse[] = await queryTdfObjects({
            srcType: id,
        });
        setTdfObjects(response);
    } catch (error) {
        console.error('Error fetching TDF objects:', error);
        setTdfObjects([]);
    }
  }, [queryTdfObjects, setTdfObjects]);

  const handleSrcTypeIdChange = useCallback((id: string) => {
    const newSearchParams = new URLSearchParams(searchParams);
    newSearchParams.set('type', id);
    if (id !== srcTypeId) {
      newSearchParams.delete('q');
    }
    setSearchParams(newSearchParams);
  }, [searchParams, srcTypeId, setSearchParams]);

  const handleDialogOpen = () => {
    const newSearchParams = new URLSearchParams(searchParams);
    newSearchParams.set('mode', 'create');
    setSearchParams(newSearchParams);
    setDialogOpen(true);
  };

  const handleDialogClose = () => {
    const newSearchParams = new URLSearchParams(searchParams);
    newSearchParams.delete('mode');
    setSearchParams(newSearchParams);
    setDialogOpen(false);
  };

  const handleFlyToClick = useCallback(({ lat, lng }: LatLng) => {
    if (!map) {
      return;
    }
    map.flyTo({ lat, lng }, map.getZoom());
  }, [map]);

  const handleMarkerClick = useCallback((item: VehicleDataItem) => {

    // Find the full TdfObjectResponse object using the item ID.
    const fullObjectResponse = tdfObjects.find(
        (obj: TdfObjectResponse) => obj.tdfObject.id === item.id
    );

    if (fullObjectResponse) {

      // Set the selected vehicle for the SearchResults list
      if (fullObjectResponse.tdfObject.srcType === vehicleSourceTypeId) {
          setSelectedVehicleForResults(fullObjectResponse);
      } else {
          // If a non-vehicle marker is clicked, clear the vehicle selection
          setSelectedVehicleForResults(null);
      }

      handleFlyToClick(item.pos as LatLng);
    }

  }, [tdfObjects, handleFlyToClick, vehicleSourceTypeId]);
  const fetchVehicles = useCallback(async (id: string) => {
    try {
      const tsRange = new TimestampSelector();

      const dayjsStart = dayjs().subtract(24000, 'hour');
      tsRange.greaterOrEqualTo = Timestamp.fromDate(dayjsStart.toDate());

   const response: TdfObjectResponse[] = await queryTdfObjects({
    srcType: id,
        tsRange: tsRange,
      });

      setTdfObjects((prevTdfObjects: TdfObjectResponse[]) => {
          // Filter out old vehicles from the previous list
          const nonVehicleObjects = prevTdfObjects.filter(
              obj => obj.tdfObject.srcType !== vehicleSourceTypeId
          );
          // Return the old non-vehicle objects merged with the newly fetched vehicles
          return [...nonVehicleObjects, ...response];
      });

      // Transform the TdfObjectResponse into VehicleDataItem[]
      const vehicleData: VehicleDataItem[] = response
        .filter(o => o.tdfObject.geo) // Only include objects with geo data
        .map(o => {
          const geoJson = JSON.parse(o.tdfObject.geo);
          const [lng, lat] = geoJson.coordinates;

          let metadata = {};
          try {
            metadata = typeof o.tdfObject.metadata === 'string'
              ? JSON.parse(o.tdfObject.metadata)
              : (o.tdfObject.metadata || {});
          } catch (e) {
            console.error("Failed to parse metadata", e);
          }

          return {
            id: o.tdfObject.id,
            pos: { lat, lng },
            data: {
              ...o.decryptedData,
              ...metadata
            }
          };
        });

      setVehicleData(vehicleData);
    } catch (error) {
      console.error('Error fetching vehicles:', error);
      setVehicleData([]);
    }
  }, [queryTdfObjects]);

  // New useEffect to fetch the data on component mount
  useEffect(() => {
      fetchVehicles(vehicleSourceTypeId);
  }, []);

  // Refresh vehicle data every so often
  useEffect(() => {

    const REFRESH_INTERVAL_MS = 1000;

    const intervalId = setInterval(async () => {
      console.log("Refreshing vehicle data...", vehicleSourceTypeId);
      await fetchVehicles(vehicleSourceTypeId);
    }, REFRESH_INTERVAL_MS);

    return () => clearInterval(intervalId);
  }, [fetchVehicles, vehicleSourceTypeId]);


  useEffect(() => {
    const type = searchParams.get('type');
    const select = searchParams.get('select');
    const mode = searchParams.get('mode');

    setSrcTypeId(type);
    setSelectable(select !== 'false');

    if (type !== srcTypeId) {
        setSelectedVehicleForResults(null);
    }

    if (!type) {
      setSrcType(undefined);
      return;
    }

    if (type !== srcTypeId) {
      setTdfObjects((prevTdfObjects: TdfObjectResponse[]) => prevTdfObjects.filter(
        obj => obj.tdfObject.srcType === vehicleSourceTypeId
      ));

      fetchSrcType(type);

      // Fetch TDF objects for the newly selected type (if it's not the vehicle type)
      if (type !== vehicleSourceTypeId) {
        fetchTdfObjects(type);
      }
    }

    if (mode === 'create') {
      setDialogOpen(true);
    }
    }, [searchParams, fetchSrcType, srcTypeId, setTdfObjects, fetchTdfObjects, vehicleSourceTypeId]);


  // Filter out vehicle objects from the main tdfObjects list for the generic map layer
  const nonVehicleTdfObjects: TdfObjectResponse[] = tdfObjects.filter(
      (obj) => obj.tdfObject.srcType !== vehicleSourceTypeId
  );


  // Logic to determine what to show in SearchResults
  // Combine non-vehicle TDF objects with the single selected vehicle.
  const searchResultsTdfObjects: TdfObjectResponse[] = [
    // List of non-vehicle TDF objects
    ...nonVehicleTdfObjects,
    // Append the vehicle selected by map-click (if one exists)
    ...(selectedVehicleForResults ? [selectedVehicleForResults] : []),
  ];
  return (
    <>
      <PageTitle
        title="Source Types"
        subContent={selectable ? <SourceTypeSelector value={srcTypeId} onChange={handleSrcTypeIdChange} /> : null} />
      <SourceTypeProvider srcType={srcType}>
        <Grid container spacing={3}>
          <Grid item xs={12} md={7}>
            <MapContainer style={{ width: '100%', height: '80vh' }} center={[0, 0]} zoom={3} ref={setMap}>
              <TileLayer url={config.tileServerUrl} />
                <LayersControl position="topright">
                      {filteredVehicleData.length > 0 && (
                    <LayersControl.Overlay name="Planes" checked>
                      {/* Vehicle Layer - key forces re-render when entitlements change */}
                      <VehicleLayer vehicleData={vehicleData} onMarkerClick={handleMarkerClick} />                    </LayersControl.Overlay>
                    )}
                      {/* TDF Object Layer */}
                      {tdfObjects.length > 0 && (
                    <LayersControl.Overlay name="TDF Objects" checked>
                      <TdfObjectsMapLayer tdfObjects={nonVehicleTdfObjects} />                    </LayersControl.Overlay>
                    )}
                </LayersControl>
            </MapContainer>
          </Grid>
          <Grid item xs={12} md={5}>
            <Box display="flex" gap={1} mb={2}>
              <SearchFilter map={map} />
              <Button variant="contained" color="primary" onClick={handleDialogOpen} startIcon={<AddCircle />}>New</Button>
            </Box>
            <SearchResults tdfObjects={searchResultsTdfObjects} onFlyToClick={handleFlyToClick} />
          </Grid>
        </Grid>
        <CreateDialog open={dialogOpen} onClose={handleDialogClose} />
      </SourceTypeProvider>
    </>
  );
}