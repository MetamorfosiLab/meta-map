import MapConfig from "./types";

export const defaultOn = {
  countryClick: () => {},
  countryMouseEnter: () => {},
  countryMouseLeave: () => {},
  markerClick: () => {},
  markerMouseEnter: () => {},
  markerMouseLeave: () => {},
};

export const defaultMarkerStyle = {
  color: "blue",
  img: null,
  width: 20,
  height: 20,
  radius: 2,
};

export const configDefault: MapConfig = {
  mapPath: `./public/map.geo.json`,

  selectedCountries: [],
  countryGroups: [],
  selectedGroup: null,

  isZoomable: false,
  zoomedCountries: [],
  maxZoom: 20,

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

  on: defaultOn,
};
