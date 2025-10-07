import { LatLng } from 'leaflet';
import { Accordion, AccordionDetails, AccordionSummary, Box, Card, CardContent, Stack, Typography, IconButton } from '@mui/material';
import { ExpandMore, GpsFixed } from '@mui/icons-material';
import { TdfObjectResponse } from '@/hooks/useRpcClient';
import { useSourceType } from './SourceTypeContext';
import { formatDateTime } from '@/utils/format';
import { propertyOf } from 'lodash';

type Props = {
  tdfObjects: TdfObjectResponse[];
  onFlyToClick: (location: LatLng) => void;
};

export function SearchResults({ tdfObjects, onFlyToClick }: Props) {
  const { displayFields, getFieldTitle } = useSourceType();

  const handleFlyToClick = (o: TdfObjectResponse) => {
    const coordinates = JSON.parse(o.tdfObject.geo).coordinates;

    // NOTE: tdfObject provides coordinates as long/lat, but Leaflet expects coordinates as lat/long
    onFlyToClick(new LatLng(coordinates[1], coordinates[0]));
  };

  const renderHeader = (o: TdfObjectResponse) => {
    let formattedDateTime = 'Time Not Recorded';
    
    if (o.tdfObject.ts) {
      formattedDateTime = formatDateTime(o.tdfObject.ts.toDate().toISOString());
    }

    const value = propertyOf(o.decryptedData)(displayFields?.header || 'id');

    return (
      <Stack direction="column">
        <Typography variant="h6" sx={{ wordBreak: 'break-all' }}>
          {getFieldTitle(displayFields?.header)}: {value}
        </Typography>
        <Typography variant="body1">
          {formattedDateTime}
        </Typography>
      </Stack>
    );
  };

  const renderDetails = (o: TdfObjectResponse) => {
    const oa = propertyOf(o.decryptedData);

    const details = (displayFields?.details || []).map(field => {
      const value = oa(field);

      return (
        <Box key={`${o.tdfObject.id}-${field}-details`} sx={{ wordBreak: 'break-all' }}>
          <strong>{getFieldTitle(field)}</strong>: {value}
        </Box>
      );
    });
    
    return details;
  };

  if (!tdfObjects.length) {
    return (
      <Card>
        <CardContent>
          <Typography>No Results</Typography>
        </CardContent>
      </Card>
    );
  }

  return tdfObjects.map((o, idx) => (
    <Accordion key={o.tdfObject.id} sx={{ mb: 2 }} defaultExpanded={idx === 0}>
      <AccordionSummary expandIcon={<ExpandMore />}>
        {renderHeader(o)}
        {/* todo: add attributes chips here? */}
      </AccordionSummary>
      <AccordionDetails>
        {renderDetails(o)}
        <IconButton title="Show on map" sx={{ paddingLeft: 0, paddingBottom: 0 }} onClick={() => handleFlyToClick(o)}>
          <GpsFixed />
        </IconButton>
      </AccordionDetails>
    </Accordion>
  ));
}
