import { merge } from "lodash";
import { select, selectAll } from "d3-selection";
import { geoMercator, geoPath } from "d3-geo";
import { transition } from "d3-transition";
import { zoom, zoomIdentity } from "d3-zoom";
import { json } from "d3-fetch";

import type {
  GeoGeometryObjects,
  GeoPath,
  GeoPermissibleObjects,
  GeoProjection,
} from "d3-geo";
import type { Selection } from "d3-selection";
import type { ZoomBehavior } from "d3-zoom";
import type { FeatureCollection } from "./types";
import type MapConfig from "./types";

import { configDefault } from "./defaults";

// TODO: need test
select.prototype.transition = transition;
selectAll.prototype.transition = transition;

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

  isLoading: boolean;

  zoomedCountries: string[];
  selectedCountries: string[];
  selectedGroup: string | null;
  countryGroups: Map<string, string[]> | null;
  markers: any[];

  mapInstancePromise: Promise<FeatureCollection | undefined>;
  svg: Selection<SVGSVGElement, unknown, HTMLElement, any>;
  scale: number;
  translate: [number, number];
  projection: GeoProjection;
  g: Selection<SVGGElement, unknown, HTMLElement, any>;
  path: GeoPath<any, GeoPermissibleObjects>;
  zoom: ZoomBehavior<SVGSVGElement, unknown>;
  defs: Selection<SVGDefsElement, unknown, HTMLElement, any>;
  pattern: Selection<SVGPatternElement, unknown, HTMLElement, any> | null;
  patternGradient: Selection<
    SVGLinearGradientElement,
    unknown,
    HTMLElement,
    any
  > | null;
  patternFilter: Selection<SVGRectElement, unknown, HTMLElement, any> | null;
  markerShadow: Selection<SVGFilterElement, unknown, HTMLElement, any> | null;

  constructor(selector: string, config: MapConfig) {
    this.selector = selector;
    this.config = merge(configDefault, config);

    this.isLoading = true;
    this.config.on.loadingStart();

    this.mapInstancePromise = json<FeatureCollection>(this.config.mapPath);

    this.zoomedCountries = this.config.zoomedCountries;

    this.selectedCountries = this.config.selectedCountries;

    this.selectedGroup = this.config.selectedGroup;

    this.countryGroups = this.config.countryGroups
      ? new Map(
          this.config.countryGroups.map((obj) => {
            return [obj.id, obj.countryList];
          })
        )
      : null;

    this.markers = this.config.markers;

    // SVG setup
    this.svg = select(this.selector)
      .append("svg")
      .attr("width", "100%")
      .attr("height", "100%")
      .attr("preserveAspectRatio", "xMinYMin meet")
      .attr("viewBox", `0 0 ${this.config.width} ${this.config.height}`)
      .style("fill", this.config.countryFillColor)
      .style("stroke", this.config.countryStrokeColor)
      .style("stroke-width", `${this.config.countryStrokeWidth}px`);

    // this.scale = (this.config.width / (Math.PI * 2)) * 0.9 * 0.9;
    this.scale = this.config.width / (Math.PI * 2);
    this.translate = [this.config.width / 2, this.config.height / 1.4];
    this.projection = geoMercator()
      .fitSize([500, 500], {} as GeoGeometryObjects)
      .scale(this.scale)
      .translate(this.translate);
    this.path = geoPath(this.projection);
    this.g = this.svg.append("g");

    // Zoom setup
    this.zoom = zoom<SVGSVGElement, unknown>()
      .scaleExtent([1, this.config.maxZoom])
      .translateExtent([
        [0, 0],
        [this.config.width, this.config.height],
      ])
      .on("zoom", (e, data) => {
        zoomed(e, this);

        this.config.on.zoom({ target: e.target, data, metaMap: this });
      });

    function zoomed(e: { transform: number }, metaMap: MetaMap) {
      metaMap.g.attr("transform", e.transform);
    }

    if (this.config.isZoomable) {
      this.svg.call(this.zoom);
    }

    if (this.config.zoomDefault) {
      this.svg.call(this.zoom.scaleBy, this.config.zoomDefault);
    }
    if (this.config.translateDefault) {
      const pos = this.projection(this.config.translateDefault);
      if (pos) this.svg.call(this.zoom.translateTo, pos[0], pos[1]);
    }

    this.defs = this.svg.append("defs");
    this.patternGradient = this.config.patternGradient?.(this.defs) ?? null;

    this.patternFilter = null;

    // Pattern setup
    this.pattern = this.config.pattern?.(this.defs) ?? null;

    if (this.pattern) {
      this.g.style("fill", "url(#pattern)");
      this.g.style("stroke", "url(#pattern)");
    }

    this.markerShadow = null;

    if (this.config.markerStyle.shadow) {
      if (!this.config.markerStyle.shadow.color)
        throw new Error("Shadow color is require!");
      if (!this.config.markerStyle.shadow.blur)
        throw new Error("Shadow blur is require!");
      if (!this.config.markerStyle.shadow.radius)
        throw new Error("Shadow radius is require!");

      this.markerShadow = this.defs
        .append("filter")
        .attr("id", "markerShadow")
        .attr("x", "-100%")
        .attr("y", "-100%")
        .attr("width", "300%")
        .attr("height", "300%")
        .attr("filterUnits", "userSpaceOnUse")
        .attr("color-interpolation-filters", "sRGB");

      this.markerShadow
        .append("feFlood")
        .attr("flood-color", this.config.markerStyle.shadow.color)
        .attr("result", "flood")
        .attr("in", "SourceAlpha");
      this.markerShadow
        .append("feComposite")
        .attr("in2", "SourceAlpha")
        .attr("in", "flood")
        .attr("operator", "atop")
        .attr("result", "color");
      this.markerShadow
        .append("feMorphology")
        .attr("operator", "dilate")
        .attr("radius", this.config.markerStyle.shadow.radius)
        .attr("result", "spread")
        .attr("in", "color");
      this.markerShadow
        .append("feGaussianBlur")
        .attr("in", "spread")
        .attr("stdDeviation", this.config.markerStyle.shadow.blur)
        .attr("result", "shadow");
      this.markerShadow
        .append("feOffset")
        .attr("dx", 0)
        .attr("dy", 0)
        .attr("in", "shadow")
        .attr("result", "offset");

      const feMerge = this.markerShadow
        .append("feMerge")
        .attr("result", "merge");

      feMerge.append("feMergeNode").attr("in", "offset");
      feMerge.append("feMergeNode").attr("in", "SourceGraphic");
    }

    // Countries data setup
    this.mapInstancePromise.then((data) => {
      if (data)
        this.g
          .selectAll("path")
          .data(data.features)
          .enter()
          .append("path")
          .attr("class", "country")
          .attr("id", (d) => d.properties.id)
          .attr("d", this.path);

      if (this.patternGradient) {
        this.patternFilter = this.g
          .append("rect")
          .attr("id", "patternFilter")
          .attr("x", 0)
          .attr("y", 0)
          .attr("width", "100%")
          .attr("height", "100%")
          .style("fill", "url(#patternGradient)")
          .style("mix-blend-mode", "color")
          .style("pointer-events", "none");
      }

      if (this.g.node()?.childNodes[0] === this.g.select(".markers").node())
        this.g.append("use").attr("xlink:href", "#markers");

      this.isLoading = false;
      this.config.on.loaded();
    });

    // Country groups setup
    this.mapInstancePromise.then(() => {
      this.countryGroups?.forEach((countryList, key) => {
        const groupedCountriesSelector = countryList
          .map((item) => `#${item}`)
          .join(",");

        selectAll(groupedCountriesSelector)
          .attr("class", () => `country ${key}`)
          .transition()
          .style("fill", this.config.groupFillColor)
          .style("stroke", this.config.countryStrokeColor);
      });
    });

    this.selectCountryList(this.selectedCountries);

    this.zoomCountries(this.zoomedCountries);

    this.#setupCountryListeners();

    // Markers setup
    setTimeout(() => {
      this.#markersRender();
      this.#setupMarkerListeners();
    });
  }

  #markersRender() {
    this.mapInstancePromise.then(() => {
      const markerGroup = this.g
        .append("g")
        .attr("class", "markers")
        .attr("id", "markers");
      const markers = markerGroup
        .selectAll(".marker")
        .data(this.markers)
        .enter();
      if (this.config.markerStyle.type === "image") {
        markers
          .append("svg:image")
          .attr("x", (d) => {
            const xPosition = this.projection([d.long, d.lat])?.[0] ?? null;

            return xPosition;
          })
          .attr("class", "marker")
          .attr("y", (d) => {
            const yPosition = this.projection([d.long, d.lat])?.[1];

            if (yPosition) return yPosition - this.config.markerStyle.height;

            return null;
          })
          .attr("width", this.config.markerStyle.width)
          .attr("height", this.config.markerStyle.height)
          .attr("xlink:href", this.config.markerStyle.img)
          .attr("filter", "url(#markerShadow)");
      } else {
        markers
          .append("circle")
          .attr("class", "marker")
          .attr("r", this.config.markerStyle.radius)
          .attr("cx", (d) => this.projection([d.long, d.lat])?.[0] ?? null)
          .attr("cy", (d) => this.projection([d.long, d.lat])?.[1] ?? null)
          .style("fill", this.config.markerStyle.color)
          .style("stroke-width", this.config.markerStyle.strokeWidth + "px")
          .style("stroke", this.config.markerStyle.strokeColor)
          .attr("filter", "url(#markerShadow)");
      }
    });
  }

  #setupCountryListeners() {
    this.mapInstancePromise.then(() => {
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
    this.mapInstancePromise.then(() => {
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

    this.mapInstancePromise.then(() => {
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

    this.mapInstancePromise.then(() => {
      idList.forEach((id) => {
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

    this.mapInstancePromise.then(() => {
      selectAll(selector)
        .transition()
        .style("fill", this.config.countryFillColor)
        .style("stroke", this.config.countryStrokeColor);
    });
  }

  /**
   * @description Select country group by  group id
   * @param {string} groupId - group id
   */
  selectGroup(groupId: string) {
    if (!groupId) throw new Error("groupId is required!");

    this.selectedGroup = groupId;

    const groupedCountriesSelector = this.countryGroups
      ?.get(groupId)
      ?.map((item) => `#${item}`)
      .join(",");

    if (groupedCountriesSelector)
      this.mapInstancePromise.then(() => {
        selectAll(groupedCountriesSelector)
          .transition()
          .style("fill", this.config.accentFillColor)
          .style("stroke", this.config.accentStrokeColor);
      });
  }

  /**
   * @description Select country group by  group id
   * @param {string} groupId - group id
   */
  unselectAllGroups() {
    const groupedCountriesSelector = this.selectedGroup
      ? this.countryGroups
          ?.get(this.selectedGroup)
          ?.map((item) => `#${item}`)
          .join(",")
      : null;

    if (groupedCountriesSelector)
      this.mapInstancePromise.then(() => {
        selectAll(groupedCountriesSelector)
          .transition()
          .style("fill", this.config.groupFillColor)
          .style("stroke", this.config.countryStrokeColor);
      });

    this.selectedGroup = null;
  }

  moveToCountry(id: string, metaMap = this) {
    if (!id) throw new Error("id is required!");

    this.mapInstancePromise.then(() => {
      const [d] = select(`#${id}`).data();
      const bounds = metaMap.path.bounds(d as GeoPermissibleObjects);
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
    if (!idList || !Array.isArray(idList)) {
      throw new Error(
        "idList is required and must be an array of country ids!"
      );
    }

    this.mapInstancePromise.then(() => {
      const [firstD] = select(`#${idList[0]}`).data();
      const resBounds = metaMap.path.bounds(firstD as GeoPermissibleObjects);
      idList.forEach((id) => {
        const [d] = select(`#${id}`).data();
        const bounds = metaMap.path.bounds(d as GeoPermissibleObjects);
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

  zoomCountries(idList: string[] | string) {
    if (!idList)
      throw new Error('id "string" or idList "array of strings" is required!');

    this.mapInstancePromise.then(() => {
      if (typeof idList === "string") {
        const [d] = select(`#${idList}`).data();
        const bounds = this.path.bounds(d as GeoPermissibleObjects);
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
        this.svg
          .transition()
          .call(
            this.zoom.transform,
            zoomIdentity.translate(translate[0], translate[1]).scale(scale)
          );
      }
      if (Array.isArray(idList) && idList.length > 0) {
        const [firstD] = select(`#${idList[0]}`).data();
        const resBounds = this.path.bounds(firstD as GeoPermissibleObjects);
        idList.forEach((id) => {
          const [d] = select(`#${id}`).data();
          const bounds = this.path.bounds(d as GeoPermissibleObjects);
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

        this.svg
          .transition()
          .call(
            this.zoom.transform,
            zoomIdentity.translate(translate[0], translate[1]).scale(scale)
          );
      }
    });
  }
}
