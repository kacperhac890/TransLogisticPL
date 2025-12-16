import { RouteSegment, RoadType, RouteAnalysisData, DetailedSegment, SpeedConfig } from './types';
import { SPEEDS as DEFAULT_SPEEDS } from './constants';

interface LatLng {
  lat: number;
  lng: number;
}

// Using OpenStreetMap Nominatim for Geocoding
const NOMINATIM_BASE = 'https://nominatim.openstreetmap.org';
// Using OSRM for Route Geometry and Steps
const OSRM_BASE = 'https://router.project-osrm.org/route/v1/driving';

const HEADERS = {
  'User-Agent': 'TruckLogisticsPL/1.0'
};

export const reverseGeocode = async (lat: number, lng: number): Promise<string> => {
  try {
    const response = await fetch(
      `${NOMINATIM_BASE}/reverse?format=json&lat=${lat}&lon=${lng}&addressdetails=1`, 
      { headers: HEADERS }
    );
    const data = await response.json();
    
    const addr = data.address || {};
    const city = addr.city || addr.town || addr.village || addr.municipality;
    const road = addr.road || addr.pedestrian;
    
    if (city && road) return `${road}, ${city}`;
    if (city) return city;
    return data.display_name?.split(',')[0] || "Nieznana lokalizacja";
  } catch (error) {
    console.error("Reverse geocode failed", error);
    return `${lat.toFixed(4)}, ${lng.toFixed(4)}`;
  }
};

export const forwardGeocode = async (query: string): Promise<LatLng | null> => {
  try {
    const response = await fetch(
      `${NOMINATIM_BASE}/search?format=json&q=${encodeURIComponent(query)}&limit=1`, 
      { headers: HEADERS }
    );
    const data = await response.json();
    if (data && data.length > 0) {
      return { lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon) };
    }
    return null;
  } catch (error) {
    console.error("Forward geocode failed", error);
    return null;
  }
};

export const getRouteShape = async (start: LatLng, end: LatLng): Promise<[number, number][]> => {
  try {
    const url = `${OSRM_BASE}/${start.lng},${start.lat};${end.lng},${end.lat}?overview=full&geometries=geojson`;
    const response = await fetch(url);
    const data = await response.json();
    
    if (data.routes && data.routes.length > 0) {
      const coordinates = data.routes[0].geometry.coordinates;
      return coordinates.map((coord: number[]) => [coord[1], coord[0]]);
    }
    return [];
  } catch (error) {
    console.error("Routing failed", error);
    return [];
  }
};

/**
 * Advanced calculation based on OSRM steps.
 * Parses road refs (A1, S8, DK50) to categorize segments.
 */
export const getAdvancedRouteDetails = async (
  start: LatLng, 
  end: LatLng, 
  speeds: SpeedConfig = DEFAULT_SPEEDS
): Promise<{ 
  analysis: RouteAnalysisData | null, 
  shape: [number, number][] 
}> => {
  try {
    // Request steps=true to get road names/refs
    const url = `${OSRM_BASE}/${start.lng},${start.lat};${end.lng},${end.lat}?overview=full&geometries=geojson&steps=true`;
    const response = await fetch(url);
    const data = await response.json();

    if (!data.routes || data.routes.length === 0) {
      return { analysis: null, shape: [] };
    }

    const route = data.routes[0];
    const coordinates = route.geometry.coordinates.map((coord: number[]) => [coord[1], coord[0]]);
    
    // Detailed Segments Construction
    const detailedSegments: DetailedSegment[] = [];
    let currentSegment: { name: string; type: RoadType; distance: number } | null = null;

    route.legs.forEach((leg: any) => {
      leg.steps.forEach((step: any) => {
        const ref = step.ref || ""; 
        const name = ref || step.name || "Droga bez nazwy";
        const distance = step.distance; // meters
        const mode = step.mode || ""; // OSRM mode: driving, ferry, etc.
        const maneuverType = step.maneuver?.type || "";

        let type = RoadType.CITY;
        const upperRef = ref.toUpperCase();
        const upperName = (step.name || "").toUpperCase();

        // Improved Classification Logic
        
        // 0. Ferry: Check mode or maneuver
        if (mode === 'ferry' || maneuverType === 'ferry' || upperName.includes("PROM")) {
            type = RoadType.FERRY;
        }
        // 1. Highways: Check for "A" or "S" followed by digits in REF (e.g. "A2", "S8", "E30; A2")
        //    Also check if NAME starts with "Autostrada" or "Droga Ekspresowa" as fallback
        else if (/\b(A|S)\s?\d+/.test(upperRef) || upperName.includes("AUTOSTRADA") || upperName.includes("DROGA EKSPRESOWA")) {
           type = RoadType.HIGHWAY;
        } 
        // 2. National/Regional: Check for "DK", "DW", "E" in REF, or if REF is just numbers (e.g. "92", "50")
        //    Any non-empty REF usually implies a categorized road higher than city street
        else if (/\b(DK|DW|E)\s?\d+/.test(upperRef) || /\d+/.test(upperRef)) {
           type = RoadType.NATIONAL;
        } 
        // 3. City: No ref, or specific city street names
        else {
           type = RoadType.CITY;
        }

        // Grouping logic: if same name/ref and type, add to current
        if (currentSegment && currentSegment.name === name && currentSegment.type === type) {
          currentSegment.distance += distance;
        } else {
          // Push previous segment
          if (currentSegment) {
            detailedSegments.push(finalizeSegment(currentSegment, speeds));
          }
          // Start new segment
          currentSegment = { name, type, distance };
        }
      });
    });

    // Push last segment
    if (currentSegment) {
      detailedSegments.push(finalizeSegment(currentSegment, speeds));
    }

    // Aggregated stats for the chart/summary
    const highwayDist = detailedSegments
      .filter(s => s.type === RoadType.HIGHWAY)
      .reduce((acc, curr) => acc + curr.distanceKm, 0);
      
    const nationalDist = detailedSegments
      .filter(s => s.type === RoadType.NATIONAL)
      .reduce((acc, curr) => acc + curr.distanceKm, 0);
      
    const cityDist = detailedSegments
      .filter(s => s.type === RoadType.CITY)
      .reduce((acc, curr) => acc + curr.distanceKm, 0);

    const ferryDist = detailedSegments
        .filter(s => s.type === RoadType.FERRY)
        .reduce((acc, curr) => acc + curr.distanceKm, 0);

    const segments: RouteSegment[] = [
      { type: RoadType.HIGHWAY, distanceKm: parseFloat(highwayDist.toFixed(1)) },
      { type: RoadType.NATIONAL, distanceKm: parseFloat(nationalDist.toFixed(1)) },
      { type: RoadType.CITY, distanceKm: parseFloat(cityDist.toFixed(1)) },
      { type: RoadType.FERRY, distanceKm: parseFloat(ferryDist.toFixed(1)) }
    ].filter(s => s.distanceKm > 0);

    const totalDistanceKm = parseFloat((route.distance / 1000).toFixed(1));

    return {
      analysis: {
        segments,
        detailedSegments,
        totalDistanceKm,
        summary: "" // Will be filled by AI later
      },
      shape: coordinates
    };

  } catch (error) {
    console.error("Advanced routing failed", error);
    return { analysis: null, shape: [] };
  }
};

function finalizeSegment(raw: { name: string; type: RoadType; distance: number }, speeds: SpeedConfig): DetailedSegment {
  const distanceKm = parseFloat((raw.distance / 1000).toFixed(1));
  const speed = speeds[raw.type];
  // Avoid division by zero
  const durationMinutes = speed > 0 ? Math.round((distanceKm / speed) * 60) : 0;
  
  return {
    name: raw.name,
    type: raw.type,
    distanceKm,
    durationMinutes
  };
}
