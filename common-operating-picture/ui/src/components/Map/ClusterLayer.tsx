import { TdfObjectResponse } from '@/hooks/useRpcClient';
import { LayersControl } from 'react-leaflet';
// @ts-expect-error  (Module '"leaflet"' has no exported member 'MarkerCluster')
import L, { MarkerCluster } from 'leaflet'; // ! NOTE: there is an open issue (JUN 30 2024) that causes TS2305 in CI when importing MarkerCluster.  Read more: https://github.com/nuxt-modules/leaflet/issues/15
import MarkerClusterGroup from 'react-leaflet-cluster';
import { MarkerLayer } from '@/components/Map/MarkerLayer';
import chroma from 'chroma-js';
import { mapStringToColor } from '@/pages/SourceTypes/helpers/markers';

type Props = {
  tdfObjects: TdfObjectResponse[];
  layerName: string;
};

L.Icon.Default.prototype.options.iconUrl = '/img/marker-icon.png';
L.Icon.Default.prototype.options.iconRetinaUrl = '/img/marker-icon-2x.png';
L.Icon.Default.prototype.options.shadowUrl = '/img/marker-shadow.png';
L.Icon.Default.imagePath = '';

export function ClusterLayer({ tdfObjects = [], layerName = 'unnamed-cluster-layer' }: Props) {

  if (!tdfObjects.length) {
    return null;
  }

  const renderClusterIcon = (cluster: MarkerCluster) => {
    // const trendColorScale = chroma.scale(['red', 'yellow', 'green']).colors(5); // TODO: determine if we need to calculate trend.
    const clusterContent = cluster.getChildCount();
    const clusterIconSizePx = 40; // TODO: determine if we need to dynamically change the size based $VALUE

    const clusterIconColor = chroma(mapStringToColor(layerName)).alpha(0.7); // TODO: change the color based on a $VALUE
    const clusterIconBorderColor = chroma(clusterIconColor).brighten(3).alpha(0.4);
    // set text color based on contrast
    const clusterIconTextColor = chroma.contrast(clusterIconColor, 'black') >= 4.5 ? 'black' : 'white';

    const iconHtml = () => {
      return `
        <div 
          style="
            width: ${clusterIconSizePx}px; 
            height: ${clusterIconSizePx}px; 
            background-color: ${clusterIconColor}; 
            color: ${clusterIconTextColor}; 
            border: 5px solid ${clusterIconBorderColor}; 
            border-radius: 50%; 
            display: flex; 
            flex-direction: column; 
            justify-content: center; 
            align-items: center;
          "
        >
          ${clusterContent}
        </div>`;
    };

    return L.divIcon({
      html: iconHtml(),
      className: 'custom-marker-cluster',
      iconSize: L.point(clusterIconSizePx, clusterIconSizePx, true),
    });
  };

  return (
    // NOTE: LayersControl is not rendered here becuase it is the parent element for ALL layers
    <LayersControl.Overlay checked name={layerName}>
      <MarkerClusterGroup 
          chunkedLoading
          iconCreateFunction={renderClusterIcon}
          maxClusterRadius={150}
          spiderfyOnMaxZoom={true}
          showCoverageOnHover={true}
          >
        <MarkerLayer tdfObjects={tdfObjects} isCluster={true} layerName={layerName}/>
      </MarkerClusterGroup>
    </LayersControl.Overlay>
  );
}
