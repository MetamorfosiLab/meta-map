// import geojson from './src/js/json/map.geo.json';
import fs from 'fs';

const countryList = [
  'FI',
  'LU',
  'SE',
  'NO',
  'SK',
  'NL',
  'EE',
  'LV',
  'LT',
  'BY',
  'PL',
  'MD',
  'RO',
  'UA',
  'BG',
  'TR',
  'GR',
  'MK',
  'AL',
  'XK',
  'RS',
  'ME',
  'BA',
  'HR',
  'HU',
  'SI',
  'AT',
  'CZ',
  'DE',
  'DK',
  'BE',
  'GB',
  'IE',
  'FR',
  'CH',
  'IT',
  'ES',
  'PT',
  'IS',
];
fs.readFile('./src/js/json/map.geo.json', 'utf8', (err, data) => {
  console.log(err);
  console.log(data);

  const geojson = JSON.parse(data);

  const filteredGeoJson = geojson.features.filter((item) =>
    countryList.includes(item.properties.iso_a2_eh)
  );

  const resFeatures = filteredGeoJson.map((item) => {
    return {
      ...item,
      properties: {
        id: item.properties.iso_a2_eh,
      },
    };
  });

  const resGeoJson = {
    ...geojson,
    features: resFeatures,
  };

  fs.appendFile(
    './src/js/json/res-map.geo.json',
    JSON.stringify(resGeoJson),
    console.log
  );
});
