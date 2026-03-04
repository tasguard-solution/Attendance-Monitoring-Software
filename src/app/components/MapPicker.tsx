import { useEffect, useRef } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

const defaultIcon = new L.Icon({
    iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
    iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
    shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
    iconSize: [25, 41],
    iconAnchor: [12, 41],
});

interface MapPickerProps {
    lat: number;
    lng: number;
    onMove: (lat: number, lng: number) => void;
    height?: number;
}

export function MapPicker({ lat, lng, onMove, height = 250 }: MapPickerProps) {
    const containerRef = useRef<HTMLDivElement>(null);
    const mapRef = useRef<L.Map | null>(null);
    const markerRef = useRef<L.Marker | null>(null);
    const onMoveRef = useRef(onMove);
    onMoveRef.current = onMove;

    // Initialize map once
    useEffect(() => {
        if (!containerRef.current || mapRef.current) return;

        const map = L.map(containerRef.current).setView([lat, lng], 15);
        L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
            attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
        }).addTo(map);

        const marker = L.marker([lat, lng], { icon: defaultIcon, draggable: true }).addTo(map);

        marker.on("dragend", () => {
            const pos = marker.getLatLng();
            onMoveRef.current(pos.lat, pos.lng);
        });

        map.on("click", (e: L.LeafletMouseEvent) => {
            marker.setLatLng(e.latlng);
            onMoveRef.current(e.latlng.lat, e.latlng.lng);
        });

        mapRef.current = map;
        markerRef.current = marker;

        // Fix tile rendering after dialog animation
        setTimeout(() => map.invalidateSize(), 300);

        return () => {
            map.remove();
            mapRef.current = null;
            markerRef.current = null;
        };
    }, []); // eslint-disable-line react-hooks/exhaustive-deps

    // Update marker position when props change (but don't re-center map)
    useEffect(() => {
        if (markerRef.current) {
            const currentPos = markerRef.current.getLatLng();
            if (Math.abs(currentPos.lat - lat) > 0.00001 || Math.abs(currentPos.lng - lng) > 0.00001) {
                markerRef.current.setLatLng([lat, lng]);
            }
        }
    }, [lat, lng]);

    return (
        <div
            ref={containerRef}
            className="rounded-lg overflow-hidden border border-gray-200"
            style={{ height, width: "100%" }}
        />
    );
}
