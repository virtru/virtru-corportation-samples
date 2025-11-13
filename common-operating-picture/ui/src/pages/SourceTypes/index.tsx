import { useEffect, useState, useContext } from 'react';
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
import { SrcType } from '@/proto/tdf_object/v1/tdf_object_pb';
import { config } from '@/config';
import { TdfObjectsMapLayer } from '@/components/Map/TdfObjectsMapLayer';
import { BannerContext } from '@/contexts/BannerContext';

export function SourceTypes() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [srcTypeId, setSrcTypeId] = useState<string | null>(null);
  const [selectable, setSelectable] = useState<boolean | null>();

  const [map, setMap] = useState<Map | null>(null);

  const [dialogOpen, setDialogOpen] = useState(false);

  const { getSrcType } = useRpcClient();
  const [srcType, setSrcType] = useState<SrcType>();

  // New tdfobject handling
  //const [tdfObjects, setTdfObjects] = useState<TdfObjectResponse[]>([]);
  const { tdfObjects, setTdfObjects } = useContext(BannerContext);

  const fetchSrcType = async (id: string) => {
    try {
      const { srcType } = await getSrcType({ srcType: id });
      setSrcType(srcType);
    } catch (err) {
      // getSrcType returns a 500 error when srcType doesn't exist in the database.
      console.warn(`'${id}' is not a valid soure type.`);
      setSrcType(undefined);
      setSearchParams(new URLSearchParams());
    }
  };

  const handleSrcTypeIdChange = (id: string) => {
    const newSearchParams = new URLSearchParams(searchParams);
    newSearchParams.set('type', id);
    if (id !== srcTypeId) {
      newSearchParams.delete('q');
    }
    setSearchParams(newSearchParams);
  };

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

  const handleFlyToClick = ({ lat, lng }: LatLng) => {
    if (!map) {
      return;
    }

    map.flyTo({ lat, lng }, map.getZoom());
  };

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
  }, [searchParams]);

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
              {!tdfObjects.length
                ? null
                : <LayersControl position="topright">
                  <TdfObjectsMapLayer tdfObjects={tdfObjects}/>
                </LayersControl>
              }
            </MapContainer>
          </Grid>
          <Grid item xs={12} md={5}>
            <Box display="flex" gap={1} mb={2}>
              <SearchFilter map={map} />
              <Button variant="contained" color="primary" onClick={handleDialogOpen} startIcon={<AddCircle />}>New</Button>
            </Box>
            <SearchResults tdfObjects={tdfObjects} onFlyToClick={handleFlyToClick} />
          </Grid>
        </Grid>
        <CreateDialog open={dialogOpen} onClose={handleDialogClose} />
      </SourceTypeProvider>
    </>
  );
}

