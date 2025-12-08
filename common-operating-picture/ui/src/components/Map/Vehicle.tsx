import { useMemo, useState, useEffect, useRef } from 'react';
import { Marker, Popup } from 'react-leaflet';
import L from 'leaflet';
import { Typography } from '@mui/material';

// Define the coordinate interface
interface Coordinate {
    lat: number;
    lng: number;
}

// Define marker
interface VehicleProps {
    markerId: string;
    Position: Coordinate;
    data? : {
        attrClassification: string;
        attrNeedToKnow: string[];
        attrRelTo: string[];
        vehicleName: string;
    };
}

// Define rotating icon
interface RotatableIconProps {
    iconUrl: string;
    iconSize: L.PointExpression;
    iconAnchor: L.PointExpression;
}

// The RotatableIcon component creates a Leaflet divIcon with an image
const RotatableIcon = ({ iconUrl, iconSize, iconAnchor }: RotatableIconProps) => {
    const sizeArray = Array.isArray(iconSize) ? iconSize : [20, 20];
    const width = sizeArray[0];
    const height = sizeArray[1];

    return useMemo(() => L.divIcon({
        className: 'plane-icon',
        iconSize: iconSize,
        iconAnchor: iconAnchor,
        html: `
            <img
                src="${iconUrl}"
                style="
                    width: ${width}px;
                    height: ${height}px;
                    display: block;
                "
            />
        `,
    }), [iconUrl, iconSize, iconAnchor]);
};

// Icon properties
const ICON_PROPS = {
    url: '/img/plane.png',
    size: [20, 20] as L.PointExpression, //  size
    anchor: [10, 10] as L.PointExpression, // Center
};


export function VehicleMarker({ markerId, Position, data }: VehicleProps) {
    const [currentPos, setCurrentPos] = useState(Position);
    const markerRef = useRef<L.Marker>(null);

    useEffect(() => {

        const startPos = currentPos;
        const targetPos = Position;
        const duration = 500;

        // Calculate difference in longitude considering wrap-around
        let lngDelta = targetPos.lng - startPos.lng;

        // Handle wrap-around for shortest path
        if (lngDelta > 180) {
            lngDelta -= 360;
        } else if (lngDelta < -180) {
            lngDelta += 360;
        }

        const isJump = Math.abs(lngDelta) > 100 || Math.abs(targetPos.lat - startPos.lat) > 100;
        const isTeleport = (Math.abs(lngDelta) > 180 && Math.abs(startPos.lng - targetPos.lng) < 180);

        if (isJump || isTeleport) {
            // Teleport when big jump. Otherwise the animation frames cause the vehicle to slide across the whole map and its ugly.
            if (markerRef.current) {
                markerRef.current.setLatLng(targetPos);
            }
            setCurrentPos(targetPos);
            // Return here to skip the animation loop entirely.
            return;
        }

        const startTime = Date.now();
        let animationFrameId: number;

        // The animation loop function
        const animate = () => {
            const elapsedTime = Date.now() - startTime;
            const progress = Math.min(1, elapsedTime / duration); // Progress from 0.0 to 1.0

            // Linear Interpolation for Latitude
            const newLat = startPos.lat + (targetPos.lat - startPos.lat) * progress;

            // Interpolate using the calculated shortest delta
            let newLng = startPos.lng + lngDelta * progress;

            // Final wrap to ensure the marker stays within Leaflet's bounds [-180, 180]
            newLng = ((newLng + 180) % 360) - 180;
            if (newLng <= -180) {
                newLng += 360;
            }

            // Update the marker and local state
            markerRef.current?.setLatLng({ lat: newLat, lng: newLng });
            setCurrentPos({ lat: newLat, lng: newLng });

            if (progress < 1) {
                animationFrameId = window.requestAnimationFrame(animate);
            }
        };

        // Start the animation
        animationFrameId = window.requestAnimationFrame(animate);

        // Cleanup
        return () => window.cancelAnimationFrame(animationFrameId);

    }, [Position]);

    const planeIcon = RotatableIcon({
        iconUrl: ICON_PROPS.url,
        iconSize: ICON_PROPS.size,
        iconAnchor: ICON_PROPS.anchor,
    });

    // Render the Marker
    return (
        <Marker
            position={currentPos}
            ref={markerRef}
            key={`vehicle-id-${markerId}`}
            icon={planeIcon}
        >
            <Popup>
                <Typography variant="h6">
                    {data?.vehicleName || 'UFO'}
                </Typography>
                <Typography variant="body2">
                    Position: {currentPos.lat.toFixed(2)}, {currentPos.lng.toFixed(2)}
                </Typography>
            </Popup>
        </Marker>
    );
}