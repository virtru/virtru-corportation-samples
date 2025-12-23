//import React from 'react';
import { LayerGroup } from 'react-leaflet';
import { VehicleMarker } from './Vehicle';
import { TdfObject } from '@/proto/tdf_object/v1/tdf_object_pb';

interface VehicleDataItem {
  id: string;
  pos: { lat: number; lng: number };
  rawObject: TdfObject;
  data?: {
    vehicleName?: string | undefined;
    callsign?: string;
    origin?: string;
    destination?: string;
    speed?: string;
    altitude?: string;
    heading?: string;
    aircraft_type?: string;
    attrClassification?: string | string[];
    attrNeedToKnow?: string[];
    attrRelTo?: string[];
  };
}

interface VehicleLayerProps {
  onMarkerClick: (vehicle: VehicleDataItem) => void;  // The function from Index.tsx
  vehicleData: VehicleDataItem[];
}

export function VehicleLayer({ vehicleData, onMarkerClick }: VehicleLayerProps) {
  return (
    <LayerGroup>
      {vehicleData.map((data) => (
        <VehicleMarker
          key={data.id}
          markerId={data.id}
          Position={data.pos}
          data={data.data}
          rawObject={data.rawObject}
          onClick={() => onMarkerClick(data)}
        />
      ))}
    </LayerGroup>
  );
}