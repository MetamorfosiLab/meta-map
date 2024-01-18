import type { Position } from 'geojson'

export interface GeoJsonFeature {
  type: 'Feature'
  properties: {
    id: string
  }
  geometry: {
    type: 'MultiPolygon'
    coordinates: Position[][][]
  }
}

export interface FeatureCollection {
  type: 'FeatureCollection'
  features: GeoJsonFeature[]
}

export interface CountryGradientSettings {
  rotate: number
  startColor: {
    offset: string
    color: string
  }
  endColor: {
    offset: string
    color: string
  }
}

export interface MarkerStyle {
  color: string
  img: string | null
  width: number
  height: number
  radius: number
}

export interface MapConfig {
  mapPath: string | null
  maxZoom: number
  zoomedCountries: string[]
  selectedCountries: string[]
  countryStrokeWidth: number
  countryFillColor: string
  countryStrokeColor: string
  accentFillColor: string
  accentStrokeColor: string
  width: number
  height: number
  markers: any[] // Потрібно визначити тип масиву для маркерів
  markerStyle: MarkerStyle
  on: {
    countryClick: Function
    countryMouseEnter: Function
    countryMouseLeave: Function
    markerClick: Function
    markerMouseEnter: Function
    markerMouseLeave: Function
  }
}

export default MapConfig