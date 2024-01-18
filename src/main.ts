import { configDefault } from "./defaults";
import { Selection, select, selectAll } from "d3-selection";
import { geoPath, geoMercator } from "d3-geo";
import { zoom, zoomIdentity } from "d3-zoom";
import { json } from "d3-fetch";
import MapConfig from "./types/interfaces";

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

  zoomedCountries: string[];
  selectedCountries: string[];
  markers: any[];

  svg: Selection<SVGSVGElement, unknown, HTMLElement, any> | undefined;
  scale: number | undefined;
  translate: [number, number] | undefined;
  projection: GeoProjection;

  // TODO: make default values object and rest with passed config object
  constructor(selector: string, config: MapConfig) {
    this.selector = selector;
    this.config = { ...configDefault, ...config };

    this.zoomedCountries = this.config.zoomedCountries;

    this.selectedCountries = this.config.selectedCountries;

    this.markers = this.config.markers;

    this.init();
  }
  init() {
    this.#setupSvg();
    this.#setupMap();
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
      .attr("viewBox", `0 0 ${this.config.width} ${this.config.height}`)
      .style("fill", this.config.countryFillColor)
      .style("stroke", "#fff")
      .style("stroke-width", `${this.config.countryStrokeWidth}px`);
  }

  #setupMap() {
    this.scale = (this.config.width / (Math.PI * 2)) * 0.9 * 0.9;
    this.translate = [this.config.width / 2, this.config.height / 1.4];
    this.projection = geoMercator()
      .fitSize([500, 500])
      .scale(this.scale)
      .translate(this.translate);
    this.path = geoPath(this.projection);
    this.g = this.svg.append("g");
  }

  #setupZoom() {
    this.zoom = zoom()
      .scaleExtent([1, 20])
      .translateExtent([
        [0, 0],
        [this.config.width, this.config.height],
      ])
      .on("zoom", (e) => zoomed(e, this));

    function zoomed(e, metaMap) {
      metaMap.g.attr("transform", e.transform);
    }
  }

  #mapAccess(callback: (value: unknown) => unknown) {
    if (!this.config.mapPath) {
      throw new Error("mapPath is required!");
    }

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
          this.config.on.countryClick({
            target,
            data,
            metaMap: this,
          })
        )
        .on("mouseenter", ({ target }, data) =>
          this.config.on.countryMouseEnter({ target, data, metaMap: this })
        )
        .on("mouseleave", ({ target }, data) =>
          this.config.on.countryMouseLeave({ target, data, metaMap: this })
        );
    });
  }

  #setupMarkerListeners() {
    this.#mapAccess(() => {
      selectAll(`.marker`)
        .on("click", ({ target }, data) =>
          this.config.on.markerClick({ target, data, metaMap: this })
        )
        .on("mouseenter", ({ target }, data) =>
          this.config.on.markerMouseEnter({ target, data, metaMap: this })
        )
        .on("mouseleave", ({ target }, data) =>
          this.config.on.markerMouseLeave({ target, data, metaMap: this })
        );
    });
  }

  /**
   * @description Select country by id
   * @param {string} id - country id
   */
  selectCountry(id: string) {
    if (!id) throw new Error("id is required!");

    this.selectedCountries = [...this.selectedCountries, id];

    this.#mapAccess(() => {
      select(`#${id}`)
        .transition()
        .style("fill", this.config.accentFillColor)
        .style("stroke", this.config.accentStrokeColor);
    });
  }

  /**
   * @description Select countries by id.
   * @param {string[]} idList - List of country ids.
   */
  selectCountryList(idList: string[]) {
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
  unselectCountry(id: string) {
    if (!id) throw new Error("id is required!");

    select(`#${id}`)
      .transition()
      .style("fill", this.config.countryFillColor)
      .style("stroke", this.config.countryStrokeColor);
  }

  /**
   * @description Unselect all countries.
   */
  unselectAllCountries() {
    const selector = this.selectedCountries.map((item) => `#${item}`).join(",");

    this.#mapAccess(() => {
      selectAll(selector)
        .transition()
        .style("fill", this.config.countryFillColor)
        .style("stroke", this.config.countryStrokeColor);
    });
  }

  moveToCountry(id: string, metaMap = this) {
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
          0.9 / Math.max(dx / metaMap.config.width, dy / metaMap.config.height)
        )
      );
      const translate = [
        metaMap.config.width / 2 - scale * x,
        metaMap.config.height / 2 - scale * y,
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

  moveToCountries(idList: string[], metaMap = this) {
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
          this.config.maxZoom,
          0.9 / Math.max(dx / metaMap.config.width, dy / metaMap.config.height)
        )
      );
      const translate = [
        metaMap.config.width / 2 - scale * x,
        metaMap.config.height / 2 - scale * y,
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

  zoomCountries(idList: string[]) {
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
            this.config.maxZoom,
            0.9 / Math.max(dx / this.config.width, dy / this.config.height)
          )
        );
        const translate = [
          this.config.width / 2 - scale * x,
          this.config.height / 2 - scale * y,
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
            this.config.maxZoom,
            0.9 / Math.max(dx / this.config.width, dy / this.config.height)
          )
        );
        const translate = [
          this.config.width / 2 - scale * x,
          this.config.height / 2 - scale * y,
        ];
        this.svg.call(
          this.zoom.transform,
          zoomIdentity.translate(...translate).scale(scale)
        );
      }
    });
  }
}
