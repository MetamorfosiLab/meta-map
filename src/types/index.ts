import { Selection } from "d3-selection";
import type { Position } from "geojson";

export interface GeoJsonFeature {
  type: "Feature";
  properties: {
    id: string;
  };
  geometry: {
    type: "MultiPolygon";
    coordinates: Position[][][];
  };
}

export interface FeatureCollection {
  type: "FeatureCollection";
  features: GeoJsonFeature[];
}

export interface CountryGradientSettings {
  rotate: number;
  startColor: {
    offset: string;
    color: string;
  };
  endColor: {
    offset: string;
    color: string;
  };
}

export interface Marker {
  long: number;
  lat: number;
  [key: string]: any;
}

interface MarkerShadow {
  color: string;
  radius: number;
  blur: number;
}

interface BaseMarkerStyle {
  width: number;
  height: number;
  shadow: MarkerShadow | null;
}

interface MarkerImageStyle extends BaseMarkerStyle {
  type: "image";
  img: string;
}
interface MarkerPinStyle extends BaseMarkerStyle {
  type: "pin";
  color: string;
  radius: number;
  strokeWidth: number;
  strokeColor: string;
}

export type MarkerStyle = MarkerImageStyle | MarkerPinStyle;

export interface CountryGroup {
  id: string;
  countryList: string[];
}

export interface MapConfig {
  mapPath: string;
  isZoomable: boolean;
  maxZoom: number;
  zoomedCountries: string[];
  zoomDefault: number | null;
  translateDefault: [number, number] | null;
  selectedCountries: string[];
  countryGroups: CountryGroup[];
  selectedGroup: string | null;
  countryStrokeWidth: number;
  countryFillColor: string;
  countryStrokeColor: string;
  accentFillColor: string;
  accentStrokeColor: string;
  groupFillColor: string;
  width: number;
  height: number;
  markers: Marker[];
  markerStyle: MarkerStyle;
  pattern:
    | ((
        defs: Selection<SVGDefsElement, unknown, HTMLElement, any>
      ) => Selection<SVGPatternElement, unknown, HTMLElement, any>)
    | null;
  patternGradient:
    | ((
        defs: Selection<SVGDefsElement, unknown, HTMLElement, any>
      ) => Selection<SVGLinearGradientElement, unknown, HTMLElement, any>)
    | null;
  on: {
    countryClick: Function;
    countryMouseEnter: Function;
    countryMouseLeave: Function;
    markerClick: Function;
    markerMouseEnter: Function;
    markerMouseLeave: Function;
    zoom: Function;
    loaded: Function;
    loadingStart: Function;
  };
}

export default MapConfig;
