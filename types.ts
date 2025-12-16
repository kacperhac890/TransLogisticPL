
export enum RoadType {
  HIGHWAY = 'autostrada',
  NATIONAL = 'krajowa',
  CITY = 'miasto',
  FERRY = 'prom'
}

export type ColorConfig = Record<RoadType, string>;
export type SpeedConfig = Record<RoadType, number>;

export interface RouteSegment {
  type: RoadType;
  distanceKm: number;
}

export interface DetailedSegment {
  name: string;
  type: RoadType;
  distanceKm: number;
  durationMinutes: number;
}

export interface RouteAnalysisData {
  segments: RouteSegment[]; // Aggregated for chart
  detailedSegments: DetailedSegment[]; // Chronological list
  totalDistanceKm: number;
  summary: string;
}

export interface GroundingSource {
  title: string;
  uri: string;
}

export interface RouteResult {
  data: RouteAnalysisData | null;
  sources: GroundingSource[];
  rawText: string;
}
