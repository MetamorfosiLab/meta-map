"use strict";

import MetaMap from "../dist/meta-map.js";

const map = new MetaMap("#map", {
  width: 1300,
  height: 700,
  on: {
    countryClick: (e) => {
      console.log(e);
    },
  },
});
console.log(map);
