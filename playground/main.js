"use strict";

import MetaMap from "../dist/meta-map.js";

const markers = [
  {
    long: 11.576124,
    lat: 48.137154,
    group: "EU",
    info: {
      country: "Germany",
      city: "Munich",
      description:
        "<p>Lorem ipsum dolor sit amet consectetur. Proin phasellus ut augue faucibus senectus. Neque non congue at augue ultricies odio. Netus porttitor amet molestie tortor. Porttitor enim ullamcorper massa aliquam.</p>",
      address:
        "<p>400 Spectrum Center Dr #1900 <br> Munich <br> CA 92618<br> Germany</p>",
      phone: "+497496236612",
      link: "#",
    },
  },
  {
    long: -2.244644,
    lat: 53.483959,
    group: "UK",
    info: {
      country: "UK",
      city: "Manchester",
      description:
        "<p>Lorem ipsum dolor sit amet consectetur. Proin phasellus ut augue faucibus senectus. Neque non congue at augue ultricies odio. Netus porttitor amet molestie tortor. Porttitor enim ullamcorper massa aliquam.</p>",
      address:
        "<p>400 Spectrum Center Dr #1900 <br> Manchester <br> CA 92618<br> UK</p>",
      phone: "+497496236612",
      link: "#",
    },
  },
  {
    long: -118.243683,
    lat: 34.052235,
    group: "America",
    info: {
      country: "United States",
      city: "Los Angeles",
      description:
        "<p>Lorem ipsum dolor sit amet consectetur. Proin phasellus ut augue faucibus senectus. Neque non congue at augue ultricies odio. Netus porttitor amet molestie tortor. Porttitor enim ullamcorper massa aliquam.</p>",
      address:
        "<p>400 Spectrum Center Dr #1900 <br> Irvine <br> CA 92618<br> USA</p>",
      phone: "+497496236612",
      link: "#",
    },
  },
];
const map = new MetaMap("#map", {
  width: 1300,
  height: 700,
  isZoomable: true,
  on: {
    countryClick: (e) => {
      console.log(e);
    },
  },
});
console.log(map);
