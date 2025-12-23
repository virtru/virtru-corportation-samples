import { useMemo, useState, useEffect, useRef } from "react";
import { Marker, Tooltip } from "react-leaflet";
import L from "leaflet";
import { Typography, Box, CircularProgress } from "@mui/material";
import TrendingUpIcon from "@mui/icons-material/TrendingUp";
import AltRouteIcon from "@mui/icons-material/AltRoute";
import MyLocationIcon from "@mui/icons-material/MyLocation";
import GpsFixedIcon from "@mui/icons-material/GpsFixed";
import FlightIcon from '@mui/icons-material/Flight';
import { mapStringToColor } from "@/pages/SourceTypes/helpers/markers";
import { useRpcClient } from '@/hooks/useRpcClient';
import { TdfObject } from '@/proto/tdf_object/v1/tdf_object_pb';
import { ObjectBanner } from '@/components/ObjectBanner';
import { extractValues } from '@/contexts/BannerContext';

// Interfaces
interface Coordinate {
  lat: number;
  lng: number;
}

interface VehicleProps {
  markerId: string;
  Position: Coordinate;
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
      onClick: () => void;  // New onClick handler prop
}

interface RotatableIconProps {
  rotationAngle: number;
  color: string;
  iconSize: L.PointExpression;
  iconAnchor: L.PointExpression;
}

function calculateBearing(start: Coordinate, end: Coordinate): number {
  const toRad = (deg: number) => deg * (Math.PI / 180);
  const toDeg = (rad: number) => rad * (180 / Math.PI);

  const startLat = toRad(start.lat);
  const startLng = toRad(start.lng);
  const endLat = toRad(end.lat);
  const endLng = toRad(end.lng);

  const dLng = endLng - startLng;
  const y = Math.sin(dLng) * Math.cos(endLat);
  const x =
    Math.cos(startLat) * Math.sin(endLat) -
    Math.sin(startLat) * Math.cos(endLat) * Math.cos(dLng);

  const bearing = toDeg(Math.atan2(y, x));
  return (bearing + 360) % 360;
}

const RotatableIcon = ({ rotationAngle, color, iconSize, iconAnchor }: RotatableIconProps) => {
  const [width, height] = Array.isArray(iconSize) ? iconSize : ([20, 20] as [number, number]);

  // SVG plane icon that can be colored
  const planeSvg = `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="${width}" height="${height}" style="transform: rotate(${rotationAngle}deg);">
      <path fill="${color}" d="M21 16v-2l-8-5V3.5c0-.83-.67-1.5-1.5-1.5S10 2.67 10 3.5V9l-8 5v2l8-2.5V19l-2 1.5V22l3.5-1 3.5 1v-1.5L13 19v-5.5l8 2.5z"/>
    </svg>
  `;

  const encodedSvg = encodeURIComponent(planeSvg);

  return useMemo(
    () =>
      L.divIcon({
        className: "plane-icon",
        iconSize: iconSize,
        iconAnchor: iconAnchor,
        html: `<img src="data:image/svg+xml,${encodedSvg}" style="width: ${width}px; height: ${height}px; display: block;" />`,
      }),
    [rotationAngle, color, iconSize, iconAnchor, encodedSvg]
  );
};

const ICON_PROPS = {
  size: [24, 24] as L.PointExpression,
  anchor: [12, 12] as L.PointExpression,
};

// Helper function to extract classification color from attribute
const getClassificationColor = (classification?: string | string[]): string => {
  if (!classification) {
    return mapStringToColor('default');
  }
  // Handle both string and array formats - This will be removed once we add METADATA
  const classValue = Array.isArray(classification) ? classification[0] : classification;
  return mapStringToColor(classValue || 'default');
};

// --- Speed Gauge Component ---
const MAX_SPEED_KMH = 1000;
const SpeedGauge = ({ speedString }: { speedString: string | undefined }) => {
  const [value, unit] = speedString?.trim().split(' ') || ['0', 'km/h'];
  const speed = parseInt(value, 10);

  if (isNaN(speed)) {
    return (
      <Box className="speed-gauge-na">
        <Typography variant="caption" color="textSecondary" fontWeight="bold">N/A</Typography>
      </Box>
    );
  }

  const progress = Math.min(100, (speed / MAX_SPEED_KMH) * 100);
  const colorClass = progress > 70 ? 'speed-high' : progress > 40 ? 'speed-medium' : 'speed-low';

  return (
    <Box className="speed-gauge-container">
      <CircularProgress
        variant="determinate"
        value={100}
        size={60}
        thickness={4}
        className="speed-gauge-bg"
        sx={{ color: 'rgba(0, 0, 0, 0.2) !important' }}
      />
      <CircularProgress
        variant="determinate"
        value={progress}
        size={60}
        thickness={4}
        className={`speed-gauge-progress ${colorClass}`}
      />
      <Box className="speed-gauge-content">
        <Typography variant="h6" component="div" className="speed-value">
          {`${speed}`}
        </Typography>
        <Typography variant="caption" component="div" className="speed-unit" color="text.secondary">
          {unit}
        </Typography>
      </Box>
    </Box>
  );
};

// --- Detail Renderer ---
const renderDetail = (Icon: React.ElementType, label: string, value: string | undefined) => (
  <Box className="detail-item">
    <Icon
      fontSize="small"
      className="detail-icon"
      sx={{
        color: '#000 !important',
        fill: '#000 !important'
      }}
    />
    <Typography variant="caption" className="detail-label">
      {label}
    </Typography>
    <Typography variant="caption" className="detail-value">
      {value || "N/A"}
    </Typography>
  </Box>
);

// --- VehicleMarker Component ---
export function VehicleMarker({ markerId, Position, data, rawObject, onClick }: VehicleProps) {
  const { transformTdfObject } = useRpcClient();
  const [isLoading, setIsLoading] = useState(false);
  const [decryptedData, setDecryptedData] = useState<any>(null); // State for decrypted results
  const [currentPos, setCurrentPos] = useState(Position);
  const [rotationAngle, setRotationAngle] = useState(0);
  const markerRef = useRef<L.Marker>(null);

  // Combine static data with decrypted data (decrypted takes priority)
  const displayData = useMemo(() => ({
    ...data,
    ...decryptedData
  }), [data, decryptedData]);

  useEffect(() => {
    // ... (Your existing animation logic remains identical) ...
    const startPos = currentPos;
    const targetPos = Position;
    const duration = 3000;

    if (startPos.lat !== targetPos.lat || startPos.lng !== targetPos.lng) {
      setRotationAngle(calculateBearing(startPos, targetPos));
    }

    let lngDelta = targetPos.lng - startPos.lng;
    if (lngDelta > 180) lngDelta -= 360;
    else if (lngDelta < -180) lngDelta += 360;

    if (Math.abs(lngDelta) > 100 || Math.abs(targetPos.lat - startPos.lat) > 100) {
      markerRef.current?.setLatLng(targetPos);
      setCurrentPos(targetPos);
      return;
    }

    const startTime = Date.now();
    let frameId: number;
    const animate = () => {
      const now = Date.now();
      const progress = Math.min(1, (now - startTime) / duration);
      const newLat = startPos.lat + (targetPos.lat - startPos.lat) * progress;
      let newLng = startPos.lng + lngDelta * progress;
      newLng = ((newLng + 180) % 360) - 180;
      if (newLng <= -180) newLng += 360;

      markerRef.current?.setLatLng({ lat: newLat, lng: newLng });
      setCurrentPos({ lat: newLat, lng: newLng });
      if (progress < 1) frameId = requestAnimationFrame(animate);
    };
    frameId = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(frameId);
  }, [Position]);

  // Decryption handler
  const handleMarkerClick = async () => {
    // Call external onClick if provided
    if (onClick) onClick();

    // Trigger decryption if not already loaded
    if (decryptedData || isLoading) return;

    setIsLoading(true);
    try {
      const result = await transformTdfObject(rawObject);
      setDecryptedData(result.decryptedData);
    } catch (err) {
      console.error("Decryption failed", err);
    } finally {
      setIsLoading(false);
    }
  };

  const icon = RotatableIcon({
    rotationAngle,
    color: getClassificationColor(displayData?.attrClassification),
    iconSize: ICON_PROPS.size,
    iconAnchor: ICON_PROPS.anchor,
  });

  const objClass = useMemo(() =>
    extractValues(displayData?.attrClassification || []).split(', ').filter(Boolean),
    [displayData?.attrClassification]
  );

  const objNTK = useMemo(() =>
    extractValues(displayData?.attrNeedToKnow || []).split(', ').filter(Boolean),
    [displayData?.attrNeedToKnow]
  );

  const objRel = useMemo(() =>
    extractValues(displayData?.attrRelTo || []).split(', ').filter(Boolean),
    [displayData?.attrRelTo]
  );

  const objCaveats = [...objNTK, ...objRel];

  return (
    <Marker
      position={currentPos}
      ref={markerRef}
      icon={icon}
      eventHandlers={{ click: handleMarkerClick }}
    >
      <Tooltip direction="top" permanent={false} sticky className="custom-compact-tooltip">
        <Box className="tooltip-container" sx={{ opacity: isLoading ? 0.6 : 1 }}>
          <ObjectBanner
            objClassification={objClass.length > 0 ? objClass : ['UNCLASSIFIED']}
            objCaveats={objCaveats}
            notes={[]}
          />
          <Box className="tooltip-header">
            <Typography variant="h6" component="div" className="vehicle-name">
              {isLoading ? "Decrypting..." : (displayData?.vehicleName || `ENCRYPTED ID: ${markerId.substring(0, 8)}...`)}
            </Typography>
            <Box className="callsign-container">
              <Typography variant="caption" className="callsign-label">Callsign:</Typography>
              <Typography variant="caption" className="callsign-value">
                {displayData?.callsign || "N/A"}
              </Typography>
            </Box>
          </Box>

          <Box className="tooltip-section">
            <Typography variant="body2" className="section-title">Telemetry</Typography>
            <Box className="telemetry-grid">
              <Box className="speed-gauge-column">
                <SpeedGauge speedString={displayData?.speed} />
              </Box>
              <Box className="telemetry-details-column">
                {renderDetail(TrendingUpIcon, "Altitude: ", displayData?.altitude)}
                {renderDetail(GpsFixedIcon, "Heading: ", displayData?.heading)}
                {renderDetail(FlightIcon, "Type: ", displayData?.aircraft_type)}
              </Box>
            </Box>
          </Box>

          <Box className="tooltip-section">
            <Typography variant="body2" className="section-title">Flight Details</Typography>
            {renderDetail(AltRouteIcon, "Origin: ", displayData?.origin)}
            {renderDetail(AltRouteIcon, "Destination: ", displayData?.destination)}
            {renderDetail(MyLocationIcon, "Coordinates: ", `${currentPos.lat.toFixed(4)}, ${currentPos.lng.toFixed(4)}`)}
          </Box>

          {isLoading && (
            <Box sx={{ display: 'flex', justifyContent: 'center', mt: 1 }}>
              <CircularProgress size={20} />
            </Box>
          )}
        </Box>
      </Tooltip>
    </Marker>
  );
}