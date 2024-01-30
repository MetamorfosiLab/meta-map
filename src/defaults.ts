import MapConfig, { MarkerStyle } from "./types";

export const defaultOn = {
  loadingStart: () => {},
  loaded: () => {},
  countryClick: () => {},
  countryMouseEnter: () => {},
  countryMouseLeave: () => {},
  markerClick: () => {},
  markerMouseEnter: () => {},
  markerMouseLeave: () => {},
  zoom: () => {},
};

export const defaultMarkerStyle: MarkerStyle = {
  type: "pin",
  color: "blue",
  width: 20,
  height: 20,
  radius: 2,
  strokeWidth: 0,
  strokeColor: "transparent",
  shadow: null,
};

export const configDefault: MapConfig = {
  mapPath: `./public/map.geo.json`,

  selectedCountries: [],
  countryGroups: [],
  selectedGroup: null,

  isZoomable: false,
  zoomedCountries: [],
  maxZoom: 20,
  zoomDefault: null,
  translateDefault: null,

  markers: [],
  markerStyle: defaultMarkerStyle,

  countryStrokeWidth: 0.25,
  accentFillColor: "red",
  accentStrokeColor: "#ffffff",
  countryFillColor: "#cccccc",
  countryStrokeColor: "#ffffff",
  groupFillColor: "green",

  width: 900,
  height: 600,

  pattern: null,
  patternGradient: null,

  on: defaultOn,
};
