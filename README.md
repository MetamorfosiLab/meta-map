# MetaMap

![MetaMap Logo](link-to-your-logo.png)

**MetaMap** is a JavaScript library for creating interactive maps of countries with markers. It is built using D3.js and provides a flexible and customizable way to visualize geographic data.

## Installation

You can install MetaMap via pnpm:

```bash
pnpm install @metamorfosilab/meta-map
```

## Configuration Options

| Key                 | Type                | Default               | Description                                       |
| ------------------- | ------------------- | --------------------- | ------------------------------------------------- |
| `mapPath`           | string              | *Required             | Path to topographic map data.                     |
| `maxZoom`           | number              | 20                    | Maximum zoom level for the map.                   |
| `countryStrokeWidth`| string              | "0.25px"              | Stroke width for country borders.                 |
| `countryFillColor`  | string \| object    | "#cccccc"             | Color of countries. Can be a string or a gradient object. |
| `countryStrokeColor`| string              | "#ffffff"             | Color of country borders.                         |
| `accentFillColor`   | string \| object    | "red"                 | Color of selected countries. Can be a string or a gradient object. |
| `accentStrokeColor` | string              | "#ffffff"             | Color of borders for selected countries.         |
| `groupFillColor`    | string              | "yellow"              | Fill color for country groups.                    |
| `width`             | number \| string    | 900                   | Width of the map.                                 |
| `height`            | number \| string    | 600                   | Height of the map.                                |
| `markers`           | array: object       | []                    | Array of markers with longitude, latitude, and optional properties. |
| `markerStyle`       | object              | { color: "blue", img: null, width: 20, height: 20 } | Style configuration for markers, including color, size, and image. |
| `countryGroups`     | array: object       | null                  | Array of country groups.                          |
| `selectedCountries` | array: string       | []                    | Array of selected countries.                     |
| `isZoomable`        | boolean             | false                 | Enable map zooming.                               |
| `zoomedCountries`   | array: string       | []                    | Array of countries to zoom in after initialization. |
| `on`               | object               | {}                    | Object with event listeners.                     |

### Gradient Fill Color

To pass a gradient color, use an object with the following fields:

- `rotate`: Gradient rotation angle.
- `startColor`: Start color of the gradient (extended settings possible).
- `endColor`: End color of the gradient (extended settings possible).

Example:

```
// ...config
countryFillColor: {
rotate: 65,
startColor: { color: "#061654", offset: "0%" },
endColor: { color: "#04143A", offset: "100%" },
},
accentFillColor: {
rotate: 65,
startColor: { color: "#04143A", offset: "20%" },
endColor: { color: "#E4B700", offset: "60%" },
},
```

### Country Groups

- `id`: Unique identifier for the group.
- `countryList`: Array of country IDs in the group.

## Methods

- `map.selectCountry(id)`: Highlight a country on the map.
- `map.selectCountryList(idList)`: Highlight an array of countries on the map.
- `map.unselectCountry(id)`: Remove highlighting from a country.
- `map.unselectAllCountries()`: Remove highlighting from all countries.
- `map.zoomCountries(idList)`: Zoom the map to the specified countries.
- `map.moveToCountries(idList)`: Move the map to
