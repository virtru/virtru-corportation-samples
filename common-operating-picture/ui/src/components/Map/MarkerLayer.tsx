import { LayerGroup, LayersControl, Marker, Popup } from 'react-leaflet';
import L from 'leaflet';
import { TdfObjectResponse } from '@/hooks/useRpcClient';
import { Box, Stack, Typography } from '@mui/material';
import { useSourceType } from '@/pages/SourceTypes/SourceTypeContext';
import { formatDateTime } from '@/utils/format';
import { mapColors, mapIcons, mapStringToColor, mapStringToSvgPath } from '@/pages/SourceTypes/helpers/markers';
import { propertyOf } from 'lodash';
import ms from 'milsymbol';

type Props = {
  tdfObjects: TdfObjectResponse[];
  isCluster?: boolean;
  layerName: string;
};

L.Icon.Default.prototype.options.iconUrl = '/img/marker-icon.png';
L.Icon.Default.prototype.options.iconRetinaUrl = '/img/marker-icon-2x.png';
L.Icon.Default.prototype.options.shadowUrl = '/img/marker-shadow.png';
L.Icon.Default.imagePath = '';

export function MarkerLayer({ tdfObjects = [], isCluster = false, layerName = 'unnamed-layer' }: Props) {
  const { id, displayFields, mapFields, getFieldTitle } = useSourceType();

  if (!tdfObjects.length) {
      return null;
  }

  // note: render logic below is duplicated from SearchResults component due to
  // differences in component structure between map markers and accordion results display
  // todo: refactor to avoid duplication

  const renderHeader = (o: TdfObjectResponse) => {
    let formattedDateTime = 'Time Not Recorded';
    
    if (o.tdfObject.ts) {
      formattedDateTime = formatDateTime(o.tdfObject.ts.toDate().toISOString());
    }
  
    const value = propertyOf(o.decryptedData)(displayFields?.header || 'id');

    return (
      <Stack direction="column" gap={0} spacing={0} mb={2}>
        <Typography variant="h6" sx={{ wordBreak: 'break-all' }}>
          {getFieldTitle(displayFields?.header)}: {value}
        </Typography>
        <Typography variant="body1" sx={{ color: '#000' }}>
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

  const tdfObjectToDynamicIcon = (tdfObject: TdfObjectResponse) => {
    const oa = propertyOf(tdfObject.decryptedData);
    
    let iconSvgPath = '';
    let iconColor = '';

    // Use Leaflet default if there is no srcType.metadata.mapFields
    if (!mapFields) {
      return L.icon({
        iconUrl: '/img/marker-icon.png',
        iconRetinaUrl: '/img/marker-icon-2x.png',
        shadowUrl: '/img/marker-shadow.png',
      });
    }

    // Handle the dynamic icon
    if (!mapFields.iconConfig || mapFields.iconConfig.length < 1){
      iconSvgPath = mapIcons[mapFields.iconDefault];
    } else {
      for(let i = 0; i<mapFields.iconConfig.length; i++){
        // which field drives the icon?
        const iconConfigField = mapFields.iconConfig[i].field;
        const iconConfigValueMap = mapFields.iconConfig[i].valueMap;

        // what is the value of that field from the data object?
        let objectConfigValueIcon = oa(iconConfigField);
        
        // Handle for type Array (ie: attrNeedToKnow, attrRelTo)
        if (Array.isArray(objectConfigValueIcon)) {
          // fixme: currently using the first index
          objectConfigValueIcon = objectConfigValueIcon[0];
        }

        // Map the value to the valueMap if there is a matching key, else return self
        objectConfigValueIcon = iconConfigValueMap[objectConfigValueIcon] || objectConfigValueIcon;
        
        // Go to the next iconConfig if the data is null or empty string
        if(!objectConfigValueIcon || objectConfigValueIcon == '') continue;
        
        // If valueMap contains a isMilSymbol key and the value is "true", create MilSymbol
        if(!!iconConfigValueMap.isMilSymbol && iconConfigValueMap.isMilSymbol.toLowerCase() === 'true'){
          return renderMilSymbolIcon(objectConfigValueIcon);
        }

        // Get the SVG path and break out of the loop
        iconSvgPath = mapStringToSvgPath(objectConfigValueIcon);
        if(iconSvgPath && iconSvgPath != '') break;
      }

      // If mapFields is avaiable, the computed value might still be null or empty; use default
      if(iconSvgPath == '') iconSvgPath = mapIcons[mapFields.iconDefault] || '';
    }

    // handle the dynamic color
    if (!mapFields.colorConfig || Object.keys(mapFields.colorConfig).length < 1){
      iconColor = mapColors[mapFields.colorDefault];
    } else {
      // which field drives the color?
      const iconColorField = mapFields.colorConfig[0].field;
    
      // what is the value of that field from the data object?
      let objectConfigValueColor = oa(iconColorField);
      
      // Handle for type Array (ie: attrNeedToKnow, attrRelTo)
      if (Array.isArray(objectConfigValueColor)) {
        // fixme: currently using the first index
        objectConfigValueColor = objectConfigValueColor[0];
      }
      objectConfigValueColor = objectConfigValueColor.toLowerCase();

      iconColor = mapStringToColor(objectConfigValueColor);
    }

    if (!iconColor){
      iconColor = mapColors.default;
    }
    if (!iconSvgPath){
      iconSvgPath = mapIcons.default;
    }

    return renderDynamicIcon(iconSvgPath, iconColor);
  };

  const renderMilSymbolIcon = (milSymbol: string) => {
    const dpi = window.devicePixelRatio || 1;
    const size = 12 * dpi;

    const symbol = new ms.Symbol(milSymbol, { size: size });
    const canvas = symbol.asCanvas();
    const ctx = canvas.getContext('2d');

    if (ctx) {
      ctx.scale(dpi, dpi);
    } else {
      console.error('Error creating icon');
    }

    return L.icon({
      iconUrl: canvas.toDataURL(),
      // iconSize: [size, size],
      iconAnchor: new L.Point(symbol.getAnchor().x, symbol.getAnchor().y),
    });
  };

  const renderDynamicIcon = (iconSvgPath: string, iconColor: string) => {
    const canvas = document.createElement('canvas');
    const dpi = window.devicePixelRatio || 1;
    const size = 32 * dpi;
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d');

    if (ctx) {
      ctx.scale(dpi, dpi);
      // NOTE: iconColor can be a string or hex code: '#3898ec' or 'blue'
      ctx.fillStyle = iconColor; 
      const path = new Path2D(iconSvgPath); 
      ctx.fill(path);
    }
    else {
      console.error('Error creating icon');
    }
  
    return L.icon({
      iconUrl: canvas.toDataURL(),
      iconSize: [size, size],
      iconAnchor: [size / 2, size / 2],
    });
  };

  const renderMarker = (tdfObject: TdfObjectResponse) => {
      // NOTE: tdfObject provides coordinates as long/lat, but Leaflet expects coordinates as lat/long
      const coordinates = JSON.parse(tdfObject.tdfObject.geo).coordinates;
      const dynamicTdfIcon = tdfObjectToDynamicIcon(tdfObject);

      return (
        <Marker position={{ lat: coordinates[1], lng: coordinates[0] }} key={tdfObject.tdfObject.id} icon={dynamicTdfIcon}>
          <Popup>
            {renderHeader(tdfObject)}
            {renderDetails(tdfObject)}
          </Popup>
        </Marker>
      );
  };

  if (isCluster) {
    return (
      <>
        {tdfObjects.map(o => renderMarker(o))}
      </>
    );
  } else {
    return (
        // NOTE: LayersControl is not rendered here becuase it is the parent element for ALL layers
      <LayersControl.Overlay checked name={layerName} key={id}>
        <LayerGroup>
          {tdfObjects.map(o => renderMarker(o))}
        </LayerGroup>
      </LayersControl.Overlay>
    );
  }
}
