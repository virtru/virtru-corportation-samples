import { useEffect, useMemo, useState, useRef } from 'react';
import { MapContainer, TileLayer } from 'react-leaflet';
import { Map, LeafletMouseEvent, Marker, LatLng } from 'leaflet';
import { config } from '@/config';

interface Props {
  width?: string;
  height?: string;
  center?: LatLng;
  zoom?: number;
  value?: LatLng;
  onChange: (e: LatLng) => void;
}

export function MapPicker({ 
  width = '100%',
  height = '80vh',
  center = new LatLng(0, 0),
  zoom = 3,
  value,
  onChange,
}: Props) {
  const [map, setMap] = useState<Map | null>(null);
  const marker = useRef<Marker | null>(null);

  const handleMapClick = (e: LeafletMouseEvent) => {
    if (!map) {
      return;
    }

    onChange(e.latlng);
  };

  useEffect(() => {
    if (!map) {
      return;
    }

    map.on('click', handleMapClick);

    return () => {
      map.off('click', handleMapClick);
    };
  }, [map]);

  useEffect(() => {
    if (!map) {
      return;
    }

    if (!value) {
      if (marker.current) {
        marker.current.remove();
        marker.current = null;
      }
      return;
    }

    if (marker.current) {
      marker.current.setLatLng(value);
    } else {
      marker.current = new Marker(value);
      marker.current.addTo(map);
    }

    map.flyTo(value, map.getZoom());
  }, [value]);

  const MapDisplay = useMemo(() => (
    <MapContainer style={{ width, height }} center={center} zoom={zoom} ref={setMap}>
      <TileLayer url={config.tileServerUrl} />
    </MapContainer>
  ), []);
  
  return (
    <>
      { MapDisplay }
    </>
  );
}
