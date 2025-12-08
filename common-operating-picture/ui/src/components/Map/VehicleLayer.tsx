//import React from 'react';
import { LayerGroup } from 'react-leaflet';
import { VehicleMarker } from './Vehicle';

interface VehicleDataItem {
  id: string;
  pos: { lat: number; lng: number };
  data? : {
    attrClassification: string;
    attrNeedToKnow: string[];
    attrRelTo: string[];
    vehicleName: string;
  };
}

interface VehicleLayerProps {
  vehicleData: VehicleDataItem[];
}

export function VehicleLayer({ vehicleData }: VehicleLayerProps) {
  return (
    <LayerGroup>
      {vehicleData.map((data) => (
        <VehicleMarker
          key={data.id}
          markerId={data.id}
          Position={data.pos}
          data={data.data}
        />
      ))}
    </LayerGroup>
  );
}