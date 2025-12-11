import { useEffect, useState, useContext, useCallback } from 'react';
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
import { SrcType } from '@/proto/tdf_object/v1/tdf_object_pb.ts';
import { config } from '@/config';
import { TdfObjectsMapLayer } from '@/components/Map/TdfObjectsMapLayer';
import { BannerContext } from '@/contexts/BannerContext';
import { VehicleLayer } from '@/components/Map/VehicleLayer';
import { TimestampSelector } from '@/proto/tdf_object/v1/tdf_object_pb.ts';
import { Timestamp } from '@bufbuild/protobuf';
import dayjs from 'dayjs';

export interface VehicleDataItem {
    id: string;
    pos: { lat: number; lng: number };
    data? : {
        attrClassification: string;
        attrNeedToKnow: string[];
        attrRelTo: string[];
        vehicleName: string;
    }
  }

export function SourceTypes() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [srcTypeId, setSrcTypeId] = useState<string | null>(null);
  const [selectable, setSelectable] = useState<boolean | null>();

  const [map, setMap] = useState<Map | null>(null);

  const [dialogOpen, setDialogOpen] = useState(false);

  const { getSrcType } = useRpcClient();
  const [srcType, setSrcType] = useState<SrcType>();


  // New tdfobject handling
  const { tdfObjects, setTdfObjects } = useContext(BannerContext);
  const { queryTdfObjects } = useRpcClient();

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

  const [vehicleData, setVehicleData] = useState<VehicleDataItem[]>([]);
  const vehicleSourceTypeId = "vehicles";

  const fetchVehicles = useCallback(async (id: string) => {
    try {
      const tsRange = new TimestampSelector();

      const dayjsStart = dayjs().subtract(24000, 'hour');
      tsRange.greaterOrEqualTo = Timestamp.fromDate(dayjsStart.toDate());

      const response = await queryTdfObjects({
        srcType: id,
        tsRange: tsRange,
      });

      // Transform the TdfObjectResponse into VehicleDataItem[]
      const vehicleData: VehicleDataItem[] = response
        .filter(o => o.tdfObject.geo) // Only include objects with geo data
        .map(o => {
          const geoJson = JSON.parse(o.tdfObject.geo);

          // GeoJSON Point coordinates are [longitude, latitude]
          const [lng, lat] = geoJson.coordinates;

          return {
            id: o.tdfObject.id, // Use the TDF object ID as the marker ID
            // Convert to { lat: number, lng: number }
            pos: { lat, lng },
            data: o.decryptedData, // Include decrypted data if needed
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

    if (vehicleData.length === 0) {
        return;
    }

    const REFRESH_INTERVAL_MS = 1000;

    const intervalId = setInterval(async () => {
      console.log("Refreshing vehicle data...", vehicleSourceTypeId);
      await fetchVehicles(vehicleSourceTypeId);
    }, REFRESH_INTERVAL_MS);

    return () => clearInterval(intervalId);
  }, []);


  useEffect(() => {
    const type = searchParams.get('type');
    const select = searchParams.get('select');
    const mode = searchParams.get('mode');

    setSrcTypeId(type);
    setSelectable(select !== 'false');

    if (!type) {
      setSrcType(undefined);
      return;
    }

    if (type !== srcTypeId) {
      setTdfObjects([]);
      fetchSrcType(type);
    }

    if (mode === 'create') {
      setDialogOpen(true);
    }
  }, [searchParams, fetchSrcType, srcTypeId, setTdfObjects]);

  const searchResultsTdfObjects = srcTypeId === vehicleSourceTypeId
  ? [] // If the selected type is 'vehicles', show an empty list in SearchResults.
  : tdfObjects; // Otherwise, show the actual tdfObjects (from BannerContext).

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
                      {vehicleData.length > 0 && (
                    <LayersControl.Overlay name="Planes" checked>
                      {/* Vehicle Layer */}
                      <VehicleLayer vehicleData={vehicleData} />
                    </LayersControl.Overlay>
                    )}
                      {/* TDF Object Layer */}
                      {tdfObjects.length > 0 && (
                    <LayersControl.Overlay name="TDF Objects" checked>
                        <TdfObjectsMapLayer tdfObjects={tdfObjects} />
                    </LayersControl.Overlay>
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