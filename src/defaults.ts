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

  countryStrokeWidth: 0.25,
  selectedCountries: [],
  zoomedCountries: [],
  maxZoom: 20,

  markers: [],
  markerStyle: defaultMarkerStyle,

  accentFillColor: "red",
  accentStrokeColor: "#ffffff",
  countryFillColor: "#cccccc",
  countryStrokeColor: "#ffffff",

  width: 900,
  height: 900,

  on: defaultOn,
};
