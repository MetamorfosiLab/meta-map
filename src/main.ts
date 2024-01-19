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

  constructor(selector: string, config: MapConfig) {
    this.selector = selector;
    this.config = merge(configDefault, config);

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
      .style("stroke", "#fff")
      .style("stroke-width", `${this.config.countryStrokeWidth}px`);

    this.scale = (this.config.width / (Math.PI * 2)) * 0.9 * 0.9;
    this.translate = [this.config.width / 2, this.config.height / 1.4];
    this.projection = geoMercator()
      .fitSize([500, 500], {} as GeoGeometryObjects)
      .scale(this.scale)
      .translate(this.translate);
    this.path = geoPath(this.projection);
    this.g = this.svg?.append("g");

    // Zoom setup
    this.zoom = zoom<SVGSVGElement, unknown>()
      .scaleExtent([1, 20])
      .translateExtent([
        [0, 0],
        [this.config.width, this.config.height],
      ])
      .on("zoom", (e) => zoomed(e, this));

    function zoomed(e: { transform: number }, metaMap: MetaMap) {
      metaMap.g?.attr("transform", e?.transform);
    }

    if (this.config.isZoomable) {
      this.svg.call(this.zoom);
    }

    // Countries data setup
    this.mapInstancePromise.then((data) => {
      if (data)
        this.g
          ?.selectAll("path")
          .data(data.features)
          .enter()
          .append("path")
          .attr("class", "country")
          .attr("id", (d) => d.properties.id)
          .attr("d", this.path);

      if (this.g?.node()?.childNodes[0] === this.g?.select(".markers").node())
        this.g?.append("use").attr("xlink:href", "#markers");
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
        ?.append("g")
        .attr("class", "markers")
        .attr("id", "markers");
      const markers = markerGroup
        ?.selectAll(".marker")
        .data(this.markers)
        .enter();
      if (this.config.markerStyle.img) {
        markers
          ?.append("svg:image")
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
          .attr("xlink:href", this.config.markerStyle.img);
      } else {
        markers
          ?.append("circle")
          .attr("class", "marker")
          .attr("r", this.config.markerStyle.radius)
          .attr("cx", (d) => this.projection([d.long, d.lat])?.[0] ?? null)
          .attr("cy", (d) => this.projection([d.long, d.lat])?.[1] ?? null)
          .style("fill", this.config.markerStyle.color);
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
      metaMap.svg.transition().duration(750).call(
        metaMap.zoom.transform,
        // metaMap.zoom.transform as unknown as (
        //   transition: Transition<SVGSVGElement, unknown, HTMLElement, any>,
        //   ...args: any[]
        // ) => any,
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
        ?.transition()
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

    this.mapInstancePromise.then(() => {
      if (typeof idList === "string") {
        const [d] = select(`#${idList}`).data();
        const bounds = this.path?.bounds(d as GeoPermissibleObjects);
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
          ?.transition()
          .call(
            this.zoom.transform,
            zoomIdentity.translate(translate[0], translate[1]).scale(scale)
          );
      }
      if (Array.isArray(idList)) {
        const [firstD] = select(`#${idList[0]}`).data();
        const resBounds = this.path?.bounds(firstD as GeoPermissibleObjects);
        idList.forEach((id) => {
          const [d] = select(`#${id}`).data();
          const bounds = this.path?.bounds(d as GeoPermissibleObjects);
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
        if (this.zoom) {
          this.svg
            ?.transition()
            .call(
              this.zoom.transform,
              zoomIdentity.translate(translate[0], translate[1]).scale(scale)
            );
        }
      }
    });
  }
}
