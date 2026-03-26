const map = new maplibregl.Map({
  container: "map",
  style: {
    version: 8,
    sources: {},
    layers: [
      {
        id: "background",
        type: "background",
        paint: {
          "background-color": "#eef4ec",
        },
      },
    ],
  },
  center: [13.4, 53.8],
  zoom: 3.3,
  minZoom: 2.6,
  maxZoom: 7,
});

map.addControl(new maplibregl.NavigationControl(), "top-right");

const elements = {
  monthLabel: document.querySelector("#month-label"),
  monthStart: document.querySelector("#month-start"),
  monthEnd: document.querySelector("#month-end"),
  monthSlider: document.querySelector("#month-slider"),
  playToggle: document.querySelector("#play-toggle"),
  migrationToggle: document.querySelector("#toggle-migration"),
  outbreaksToggle: document.querySelector("#toggle-outbreaks"),
  migrationCount: document.querySelector("#migration-count"),
  outbreakCount: document.querySelector("#outbreak-count"),
  mapTitle: document.querySelector("#map-title"),
  mapSubtitle: document.querySelector("#map-subtitle"),
  migrationLow: document.querySelector("#migration-low"),
  migrationMid: document.querySelector("#migration-mid"),
  migrationHigh: document.querySelector("#migration-high"),
  migrationActiveCountries: document.querySelector("#migration-active-countries"),
  migrationRangeWidth: document.querySelector("#migration-range-width"),
  mapLegendNote: document.querySelector("#map-legend-note"),
};

const emptyCollection = {
  type: "FeatureCollection",
  features: [],
};

const state = {
  background: emptyCollection,
  countryPolygons: emptyCollection,
  countryMonthRows: [],
  timeline: [],
  outbreaks: emptyCollection,
  currentIndex: 0,
  playing: false,
  timer: null,
};

const monthFormatter = new Intl.DateTimeFormat("da-DK", {
  month: "long",
  year: "numeric",
  timeZone: "UTC",
});

const outbreakRadius = [
  "interpolate",
  ["linear"],
  ["coalesce", ["get", "birds_affected"], 0],
  0,
  6,
  5000,
  10,
  25000,
  16,
  75000,
  24,
];

function labelFromMonth(month) {
  return monthFormatter.format(new Date(`${month}-01T00:00:00Z`));
}

function featureCollection(features) {
  return {
    type: "FeatureCollection",
    features,
  };
}

function filterByMonth(collection, month) {
  return featureCollection(
    collection.features.filter((feature) => feature.properties.month === month),
  );
}

function syncLayerVisibility() {
  if (!map.getLayer("migration-choropleth")) {
    return;
  }

  map.setLayoutProperty(
    "migration-choropleth",
    "visibility",
    elements.migrationToggle.checked ? "visible" : "none",
  );
  map.setLayoutProperty(
    "migration-choropleth-outline",
    "visibility",
    elements.migrationToggle.checked ? "visible" : "none",
  );
  map.setLayoutProperty(
    "outbreak-points",
    "visibility",
    elements.outbreaksToggle.checked ? "visible" : "none",
  );
}

function setSourceData(sourceId, data) {
  const source = map.getSource(sourceId);
  if (source) {
    source.setData(data);
  }
}

async function loadBackground() {
  const response = await fetch("./data/background/countries.fgb");

  if (!response.ok || !response.body) {
    throw new Error("Kunne ikke indlaese FlatGeobuf-baggrundsdata");
  }

  const features = [];
  for await (const feature of flatgeobuf.deserialize(response.body)) {
    features.push(feature);
  }

  state.background = featureCollection(features);
}

function updateSummary(migrationData, outbreakData) {
  elements.migrationCount.textContent = String(
    migrationData.features.filter((feature) => feature.properties.mean_class !== null)
      .length,
  );
  elements.outbreakCount.textContent = String(outbreakData.features.length);
}

function updateLegendValues(migrationData) {
  const values = migrationData.features
    .map((feature) => feature.properties.mean_class)
    .filter((value) => value !== null);

  if (!values.length) {
    elements.migrationLow.textContent = "Ingen data";
    elements.migrationMid.textContent = "Ingen data";
    elements.migrationHigh.textContent = "Ingen data";
    elements.migrationActiveCountries.textContent = "0 lande";
    elements.migrationRangeWidth.textContent = "spaend 0,0";
    elements.mapLegendNote.textContent =
      "Der er ingen traekvaerdier for landsvale tilgaengelige for denne maaned i det nuvaerende udtraek.";
    return { low: 60, mid: 63, high: 66 };
  }

  const low = Math.min(...values);
  const rawHigh = Math.max(...values);
  const high = rawHigh === low ? low + 1 : rawHigh;
  const mid = (low + high) / 2;
  const rangeWidth = rawHigh - low;

  elements.migrationLow.textContent = low.toFixed(1);
  elements.migrationMid.textContent = mid.toFixed(1);
  elements.migrationHigh.textContent = rawHigh.toFixed(1);
  elements.migrationActiveCountries.textContent = `${values.length} lande`;
  elements.migrationRangeWidth.textContent = `spaend ${rangeWidth.toFixed(1).replace(".", ",")}`;

  if (values.length <= 2 || rangeWidth < 1.5) {
    elements.mapLegendNote.textContent =
      "Farveskiftene er beskedne her, fordi det nuvaerende landsvale-udtraek daekker meget faa lande, og vaerdierne ligger taet.";
  } else {
    elements.mapLegendNote.textContent =
      "Landefarven genberegnes hver maaned ud fra de synlige landsvalevaerdier, saa moerkere lande staar staerkere relativt til den maaned.";
  }

  return { low, mid, high };
}

function updateMigrationStyle(extent) {
  if (!map.getLayer("migration-choropleth")) {
    return;
  }

  map.setPaintProperty("migration-choropleth", "fill-color", [
    "case",
    ["!", ["has", "mean_class"]],
    "rgba(0,0,0,0)",
    [
      "interpolate",
      ["linear"],
      ["coalesce", ["get", "mean_class"], extent.low],
      extent.low,
      "#fff4cf",
      extent.mid,
      "#f2a531",
      extent.high,
      "#843512",
    ],
  ]);
}

function updateMigrationOpacity(migrationData) {
  if (!map.getLayer("migration-choropleth")) {
    return;
  }

  const maxSamples = Math.max(
    1,
    ...migrationData.features.map((feature) => feature.properties.cell_samples || 0),
  );

  map.setPaintProperty("migration-choropleth", "fill-opacity", [
    "case",
    ["!", ["has", "mean_class"]],
    0,
    [
      "interpolate",
      ["linear"],
      ["coalesce", ["get", "cell_samples"], 0],
      0,
      0.34,
      maxSamples,
      0.9,
    ],
  ]);
}

function updateMonth() {
  const month = state.timeline[state.currentIndex];
  const label = labelFromMonth(month);
  const migrationData = featureCollection(
    state.countryPolygons.features.map((feature) => {
      const match = state.countryMonthRows.find(
        (row) =>
          row.month === month && row.iso_a3 === feature.properties.iso_a3,
      );

      return {
        ...feature,
        properties: {
          ...feature.properties,
          mean_class: match?.mean_class ?? null,
          cell_samples: match?.cell_samples ?? 0,
          species_name: match?.species_name ?? "Landsvale",
          month,
        },
      };
    }),
  );
  const outbreakData = filterByMonth(state.outbreaks, month);
  const extent = updateLegendValues(migrationData);

  elements.monthLabel.textContent = label;
  elements.mapTitle.textContent = `${label} overblik`;
  elements.mapSubtitle.textContent =
    `Landsvalens traekintensitet pr. land for ${label} med cirkler for udbrud hos fjerkrae skaleret efter anslaaet stoerrelse.`;
  elements.monthSlider.value = String(state.currentIndex);

  setSourceData("migration", migrationData);
  setSourceData("outbreaks", outbreakData);
  updateMigrationStyle(extent);
  updateMigrationOpacity(migrationData);
  updateSummary(migrationData, outbreakData);
}

function stopPlayback() {
  state.playing = false;
  elements.playToggle.textContent = "Afspil";
  if (state.timer) {
    window.clearInterval(state.timer);
    state.timer = null;
  }
}

function startPlayback() {
  stopPlayback();
  state.playing = true;
  elements.playToggle.textContent = "Pause";
  state.timer = window.setInterval(() => {
    state.currentIndex = (state.currentIndex + 1) % state.timeline.length;
    updateMonth();
  }, 1500);
}

function bindPopup(layerId, renderContent) {
  map.on("click", layerId, (event) => {
    const feature = event.features?.[0];
    if (!feature) {
      return;
    }

    new maplibregl.Popup({ offset: 16 })
      .setLngLat(event.lngLat)
      .setHTML(renderContent(feature.properties))
      .addTo(map);
  });

  map.on("mouseenter", layerId, () => {
    map.getCanvas().style.cursor = "pointer";
  });

  map.on("mouseleave", layerId, () => {
    map.getCanvas().style.cursor = "";
  });
}

function addMapLayers() {
  map.addSource("countries", {
    type: "geojson",
    data: state.background,
  });

  map.addSource("migration", {
    type: "geojson",
    data: state.countryPolygons,
  });

  map.addSource("outbreaks", {
    type: "geojson",
    data: emptyCollection,
  });

  map.addLayer({
    id: "countries-fill",
    type: "fill",
    source: "countries",
    paint: {
      "fill-color": "#dde9df",
      "fill-opacity": 0.86,
    },
  });

  map.addLayer({
    id: "countries-outline",
    type: "line",
    source: "countries",
    paint: {
      "line-color": "rgba(22, 48, 44, 0.22)",
      "line-width": 1,
    },
  });

  map.addLayer({
    id: "migration-choropleth",
    type: "fill",
    source: "migration",
    paint: {
      "fill-color": [
        "interpolate",
        ["linear"],
        ["coalesce", ["get", "mean_class"], 60],
        60,
        "#f7e8b3",
        63,
        "#d59a3a",
        66,
        "#8d4e0f",
      ],
      "fill-opacity": [
        "case",
        ["has", "mean_class"],
        0.78,
        0,
      ],
    },
  });

  map.addLayer({
    id: "migration-choropleth-outline",
    type: "line",
    source: "migration",
    paint: {
      "line-color": "rgba(89, 52, 17, 0.28)",
      "line-width": 0.8,
      "line-opacity": [
        "case",
        ["has", "mean_class"],
        0.9,
        0,
      ],
    },
  });

  map.addLayer({
    id: "outbreak-points",
    type: "circle",
    source: "outbreaks",
    paint: {
      "circle-color": "#d9633f",
      "circle-radius": outbreakRadius,
      "circle-stroke-width": 2,
      "circle-stroke-color": "#fff0eb",
      "circle-opacity": 0.92,
    },
  });

  bindPopup(
    "migration-choropleth",
    (props) => `
      <div class="popup">
        <h3>${props.name}</h3>
        <p><strong>Maaned:</strong> ${labelFromMonth(props.month)}</p>
        <p><strong>Art:</strong> ${props.species_name}</p>
        <p><strong>Maal:</strong> Gennemsnitlig taelleklasse for landsvale</p>
        <p><strong>Gennemsnitlig taelleklasse:</strong> ${props.mean_class ?? "Ingen data"}</p>
        <p><strong>Celleproever:</strong> ${props.cell_samples}</p>
      </div>
    `,
  );

  bindPopup(
    "outbreak-points",
    (props) => `
      <div class="popup">
        <h3>${props.country}</h3>
        <p><strong>Maaned:</strong> ${labelFromMonth(props.month)}</p>
        <p><strong>Undertype:</strong> ${props.subtype}</p>
        <p><strong>Kategori:</strong> ${props.category}</p>
        <p><strong>Anslaget antal beroerte fugle:</strong> ${props.birds_affected.toLocaleString("da-DK")}</p>
      </div>
    `,
  );
}

function wireControls() {
  elements.monthSlider.addEventListener("input", (event) => {
    state.currentIndex = Number(event.target.value);
    updateMonth();
  });

  elements.playToggle.addEventListener("click", () => {
    if (state.playing) {
      stopPlayback();
    } else {
      startPlayback();
    }
  });

  elements.migrationToggle.addEventListener("change", syncLayerVisibility);
  elements.outbreaksToggle.addEventListener("change", syncLayerVisibility);
}

async function loadData() {
  const [
    timelineResponse,
    countryPolygonsResponse,
    countryMonthResponse,
    outbreaksResponse,
  ] =
    await Promise.all([
      fetch("./data/processed/timeline.json"),
      fetch("./data/processed/europe_countries.geojson"),
      fetch("./data/processed/migration_country_month.json"),
      fetch("./data/processed/poultry_outbreaks.geojson"),
    ]);

  const [
    timelinePayload,
    countryPolygonsPayload,
    countryMonthPayload,
    outbreaksPayload,
  ] =
    await Promise.all([
      timelineResponse.json(),
      countryPolygonsResponse.json(),
      countryMonthResponse.json(),
      outbreaksResponse.json(),
    ]);

  state.timeline = timelinePayload.months;
  state.countryPolygons = countryPolygonsPayload;
  state.countryMonthRows = countryMonthPayload.rows;
  state.outbreaks = outbreaksPayload;

  elements.monthSlider.max = String(state.timeline.length - 1);
  elements.monthStart.textContent = labelFromMonth(state.timeline[0]);
  elements.monthEnd.textContent = labelFromMonth(
    state.timeline[state.timeline.length - 1],
  );
}

async function init() {
  wireControls();
  await Promise.all([loadBackground(), loadData()]);

  const mountMap = () => {
    addMapLayers();
    syncLayerVisibility();
    updateMonth();
  };

  if (map.loaded()) {
    mountMap();
  } else {
    map.on("load", mountMap);
  }
}

init().catch((error) => {
  console.error(error);
  elements.monthLabel.textContent = "Kunne ikke indlaese lokale data";
  elements.mapTitle.textContent = "Frontendopsaetningen kraever opmaerksomhed";
});
