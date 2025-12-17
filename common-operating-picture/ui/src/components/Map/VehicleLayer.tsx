//import React from 'react';
import { LayerGroup } from 'react-leaflet';
import { VehicleMarker } from './Vehicle';

interface VehicleDataItem {
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