import { Selection, select, selectAll } from "d3-selection";
import { geoPath, geoMercator } from "d3-geo";
import { zoom, zoomIdentity } from "d3-zoom";
import { json } from "d3-fetch";
import MapConfig, {
  CountryGradientSettings,
  MarkerStyle,
} from "./types/interfaces";

const DEFAULT_MARKERS_STYLE = {
  color: "blue",
  img: null,
  width: 20,
  height: 20,
  radius: 2,
};

const DEFAULT_ON = {
  countryClick: () => {},
  countryMouseEnter: () => {},
  countryMouseLeave: () => {},
  markerClick: () => {},
  markerMouseEnter: () => {},
  markerMouseLeave: () => {},
};

const DEFAULT_CONFIG: MapConfig = {
  maxZoom: 20,
  countryStrokeWidth: "0.25px",
};

/**
 * @class MetaMap
 * @description
 * This class is used to create a map of countries with a set of markers and a set of countries.
 *
 * @param {string} selector - The selector of the element to create the map.
 * @param {object} options - The options of the map.
 */
export default class MetaMap {
  selector: string;
  config: MapConfig;

  maxZoom?: number;
  zoomedCountries?: string[] | null;
  selectedCountries?: string[];
  countryStrokeWidth?: string;
  countryFillColor: string;
  countryStrokeColor?: string;
  accentFillColor: string;
  accentStrokeColor?: string;
  width?: number;
  height?: number;
  markers?: any[]; // Потрібно визначити тип масиву для маркерів
  markerStyle?: MarkerStyle;
  on: {
    countryClick: Function;
    countryMouseEnter: Function;
    countryMouseLeave: Function;
    markerClick: Function;
    markerMouseEnter: Function;
    markerMouseLeave: Function;
  };

  countryFillColorType: "string" | "gradient";
  accentFillColorType: "string" | "gradient";
  countryGradientSettings: CountryGradientSettings | null | string;
  accentGradientSettings: CountryGradientSettings | null | string;
  svg: Selection<SVGSVGElement, unknown, HTMLElement, any> & string;

  // TODO: make default values object and rest with passed config object
  constructor(selector: string, config: MapConfig) {
    this.selector = selector;
    this.config = { ...DEFAULT_CONFIG, ...config };
    const {
      maxZoom = 20,
      zoomedCountries,

      selectedCountries,

      markers,
      markerStyle,

      on,
    } = this.config;

    this.zoomedCountries = zoomedCountries;

    this.selectedCountries = selectedCountries ?? [];

    this.markers = markers ?? [];

    this.markerStyle = {
      ...DEFAULT_MARKERS_STYLE,
      ...markerStyle,
    };

    this.on = { ...DEFAULT_ON, ...on };

    this.init();
  }
  init() {
    this.#setupSvg();
    this.#setupMap();
    this.#setupGradients();
    this.#setupZoom();
    this.#mapRender();

    this.selectCountryList(this.selectedCountries);

    if (this.zoomedCountries) this.zoomCountries(this.zoomedCountries);

    this.#setupCountryListeners();

    // Markers init
    setTimeout(() => {
      this.#markersRender();
      this.#setupMarkerListeners();
    });
  }

  #setupSvg() {
    this.svg = select(this.selector)
      .append("svg")
      .attr("width", "100%")
      .attr("height", "100%")
      .attr("preserveAspectRatio", "xMinYMin meet")
      .attr("viewBox", `0 0 ${this.width} ${this.height}`)
      .style("fill", this.countryFillColor)
      .style("stroke", "#fff")
      .style("stroke-width", this.countryStrokeWidth);
  }

  #setupMap() {
    this.scale = (this.width / (Math.PI * 2)) * 0.9 * 0.9;
    this.translate = [this.width / 2, this.height / 1.4];
    this.projection = geoMercator()
      .fitSize([500, 500])
      .scale(this.scale)
      .translate(this.translate);
    this.path = geoPath(this.projection);
    this.g = this.svg.append("g");
  }

  #setupGradients() {
    this.defs = this.svg.append("defs");

    if (this.accentFillColorType === "gradient") {
      this.accentGradient = this.defs
        .append("linearGradient")
        .attr("id", "accentGradient")
        .attr(
          "gradientTransform",
          `rotate(${this.accentGradientSettings.rotate})`
        );

      this.accentGradient
        .append("stop")
        .attr("offset", this.accentGradientSettings?.startColor?.offset ?? "0%")
        .attr(
          "stop-color",
          this.accentGradientSettings?.startColor?.color ??
            this.accentGradientSettings?.startColor ??
            "#ffffff"
        );
      this.accentGradient
        .append("stop")
        .attr("offset", this.accentGradientSettings?.endColor?.offset ?? "100%")
        .attr(
          "stop-color",
          this.accentGradientSettings?.endColor?.color ??
            this.accentGradientSettings?.endColor ??
            "#000000"
        );
    }
    if (this.countryFillColorType === "gradient") {
      this.countryGradient = this.defs
        .append("linearGradient")
        .attr("id", "countryGradient")
        .attr(
          "gradientTransform",
          `rotate(${this.countryGradientSettings.rotate})`
        );

      this.countryGradient
        .append("stop")
        .attr(
          "offset",
          this.countryGradientSettings?.startColor?.offset ?? "0%"
        )
        .attr(
          "stop-color",
          this.countryGradientSettings?.startColor?.color ??
            this.countryGradientSettings?.startColor ??
            "#ffffff"
        );
      this.countryGradient
        .append("stop")
        .attr(
          "offset",
          this.countryGradientSettings?.endColor?.offset ?? "100%"
        )
        .attr(
          "stop-color",
          this.countryGradientSettings?.endColor?.color ??
            this.countryGradientSettings?.endColor ??
            "#000000"
        );
    }
  }

  #setupZoom() {
    this.zoom = zoom()
      .scaleExtent([1, 20])
      .translateExtent([
        [0, 0],
        [this.width, this.height],
      ])
      .on("zoom", (e) => zoomed(e, this));

    function zoomed(e, metaMap) {
      metaMap.g.attr("transform", e.transform);
    }
  }

  #mapAccess(callback) {
    json(this.config.mapPath).then(callback);
  }

  #mapRender() {
    this.#mapAccess((data) => {
      this.g
        .selectAll("path")
        .data(data.features)
        .enter()
        .append("path")
        .attr("class", "country")
        .attr("id", (d) => d.properties.id)
        .attr("d", this.path);

      if (this.g.node().childNodes[0] === this.g.select(".markers").node()) {
        this.g.append("use").attr("xlink:href", "#markers");
      }
    });
  }

  #markersRender() {
    this.#mapAccess(() => {
      const markerGroup = this.g
        .append("g")
        .attr("class", "markers")
        .attr("id", "markers");
      const markers = markerGroup
        .selectAll(".marker")
        .data(this.markers)
        .enter();
      if (this.markerStyle.img) {
        markers
          .append("svg:image")
          .attr("x", (d) => this.projection([d.long, d.lat])[0])
          .attr("class", "marker")
          .attr(
            "y",
            (d) => this.projection([d.long, d.lat])[1] - this.markerStyle.height
          )
          .attr("width", this.markerStyle.width)
          .attr("height", this.markerStyle.height)
          .attr("xlink:href", this.markerStyle.img);
      } else {
        markers
          .append("circle")
          .attr("class", "marker")
          .attr("r", this.markerStyle.radius)
          .attr("cx", (d) => this.projection([d.long, d.lat])[0])
          .attr("cy", (d) => this.projection([d.long, d.lat])[1])
          .style("fill", this.markerStyle.color);
      }
    });
  }

  #setupCountryListeners() {
    this.#mapAccess(() => {
      selectAll(`.country`)
        .on("click", ({ target }, data) =>
          this.on.countryClick({
            target,
            data,
            metaMap: this,
          })
        )
        .on("mouseenter", ({ target }, data) =>
          this.on.countryMouseEnter({ target, data, metaMap: this })
        )
        .on("mouseleave", ({ target }, data) =>
          this.on.countryMouseLeave({ target, data, metaMap: this })
        );
    });
  }

  #setupMarkerListeners() {
    this.#mapAccess(() => {
      selectAll(`.marker`)
        .on("click", ({ target }, data) =>
          this.on.markerClick({ target, data, metaMap: this })
        )
        .on("mouseenter", ({ target }, data) =>
          this.on.markerMouseEnter({ target, data, metaMap: this })
        )
        .on("mouseleave", ({ target }, data) =>
          this.on.markerMouseLeave({ target, data, metaMap: this })
        );
    });
  }

  /**
   * @description Select country by id
   * @param {string} id - country id
   */
  selectCountry(id) {
    if (!id) throw new Error("id is required!");

    this.selectedCountries = [...this.selectedCountries, id];

    this.#mapAccess(() => {
      select(`#${id}`)
        .transition()
        .style("fill", this.accentFillColor)
        .style("stroke", this.accentStrokeColor);
    });
  }

  /**
   * @description Select countries by id.
   * @param {string[]} idList - List of country ids.
   */
  selectCountryList(idList) {
    if (!idList) throw new Error("idList is required!");

    this.#mapAccess(() => {
      idList?.forEach((id) => {
        this.selectCountry(id);
      });
    });
  }

  /**
   * @description Unselect country by id.
   * @param {string} id - List of country ids.
   */
  unselectCountry(id) {
    if (!id) throw new Error("id is required!");

    select(`#${id}`)
      .transition()
      .style("fill", this.countryFillColor)
      .style("stroke", this.countryStrokeColor);
  }

  /**
   * @description Unselect all countries.
   */
  unselectAllCountries() {
    const selector = this.selectedCountries.map((item) => `#${item}`).join(",");

    this.#mapAccess(() => {
      selectAll(selector)
        .transition()
        .style("fill", this.countryFillColor)
        .style("stroke", this.countryStrokeColor);
    });
  }

  moveToCountry(id, metaMap = this) {
    if (!id) throw new Error("id is required!");

    this.#mapAccess(() => {
      const [d] = select(`#${id}`).data();
      const bounds = metaMap.path.bounds(d);
      const dx = bounds[1][0] - bounds[0][0];
      const dy = bounds[1][1] - bounds[0][1];
      const x = (bounds[0][0] + bounds[1][0]) / 2;
      const y = (bounds[0][1] + bounds[1][1]) / 2;
      const scale = Math.max(
        1,
        Math.min(
          this.config.maxZoom,
          0.9 / Math.max(dx / metaMap.width, dy / metaMap.height)
        )
      );
      const translate = [
        metaMap.width / 2 - scale * x,
        metaMap.height / 2 - scale * y,
      ];
      metaMap.svg
        .transition()
        .duration(750)
        .call(
          metaMap.zoom.transform,
          zoomIdentity.translate(translate[0], translate[1]).scale(scale)
        );
    });
  }

  moveToCountries(idList, metaMap = this) {
    if (!idList || !Array.isArray(idList))
      throw new Error(
        "idList is required and must be an array of country ids!"
      );

    this.#mapAccess(() => {
      const [firstD] = select(`#${idList[0]}`).data();
      const resBounds = metaMap.path.bounds(firstD);
      idList.forEach((id) => {
        const [d] = select(`#${id}`).data();
        const bounds = metaMap.path.bounds(d);
        if (resBounds[0][0] > bounds[0][0]) resBounds[0][0] = bounds[0][0];
        if (resBounds[0][1] > bounds[0][1]) resBounds[0][1] = bounds[0][1];
        if (resBounds[1][0] < bounds[1][0]) resBounds[1][0] = bounds[1][0];
        if (resBounds[1][1] < bounds[1][1]) resBounds[1][1] = bounds[1][1];
      });
      const dx = resBounds[1][0] - resBounds[0][0];
      const dy = resBounds[1][1] - resBounds[0][1];
      const x = (resBounds[0][0] + resBounds[1][0]) / 2;
      const y = (resBounds[0][1] + resBounds[1][1]) / 2;
      const scale = Math.max(
        1,
        Math.min(
          this.maxZoom,
          0.9 / Math.max(dx / metaMap.width, dy / metaMap.height)
        )
      );
      const translate = [
        metaMap.width / 2 - scale * x,
        metaMap.height / 2 - scale * y,
      ];
      metaMap.svg
        .transition()
        .duration(750)
        .call(
          metaMap.zoom.transform,
          zoomIdentity.translate(translate[0], translate[1]).scale(scale)
        );
    });
  }

  zoomCountries(idList) {
    if (!idList)
      throw new Error('id "string" or idList "array of strings" is required!');

    this.#mapAccess(() => {
      if (typeof idList === "string") {
        const [d] = select(`#${idList}`).data();
        const bounds = this.path.bounds(d);
        const dx = bounds[1][0] - bounds[0][0];
        const dy = bounds[1][1] - bounds[0][1];
        const x = (bounds[0][0] + bounds[1][0]) / 2;
        const y = (bounds[0][1] + bounds[1][1]) / 2;
        const scale = Math.max(
          1,
          Math.min(
            this.maxZoom,
            0.9 / Math.max(dx / this.width, dy / this.height)
          )
        );
        const translate = [
          this.width / 2 - scale * x,
          this.height / 2 - scale * y,
        ];
        this.svg.call(
          this.zoom.transform,
          zoomIdentity.translate(translate[0], translate[1]).scale(scale)
        );
      }
      if (Array.isArray(idList)) {
        const [firstD] = select(`#${idList[0]}`).data();
        const resBounds = this.path.bounds(firstD);
        idList.forEach((id) => {
          const [d] = select(`#${id}`).data();
          const bounds = this.path.bounds(d);
          if (resBounds[0][0] > bounds[0][0]) resBounds[0][0] = bounds[0][0];
          if (resBounds[0][1] > bounds[0][1]) resBounds[0][1] = bounds[0][1];
          if (resBounds[1][0] < bounds[1][0]) resBounds[1][0] = bounds[1][0];
          if (resBounds[1][1] < bounds[1][1]) resBounds[1][1] = bounds[1][1];
        });
        const dx = resBounds[1][0] - resBounds[0][0];
        const dy = resBounds[1][1] - resBounds[0][1];
        const x = (resBounds[0][0] + resBounds[1][0]) / 2;
        const y = (resBounds[0][1] + resBounds[1][1]) / 2;
        const scale = Math.max(
          1,
          Math.min(
            this.maxZoom,
            0.9 / Math.max(dx / this.width, dy / this.height)
          )
        );
        const translate = [
          this.width / 2 - scale * x,
          this.height / 2 - scale * y,
        ];
        this.svg.call(
          this.zoom.transform,
          zoomIdentity.translate(...translate).scale(scale)
        );
      }
    });
  }
}
