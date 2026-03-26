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
};

const emptyCollection = {
  type: "FeatureCollection",
  features: [],
};

const state = {
  timeline: [],
  migration: emptyCollection,
  outbreaks: emptyCollection,
  currentIndex: 0,
  playing: false,
  timer: null,
};

const monthFormatter = new Intl.DateTimeFormat("en", {
  month: "long",
  year: "numeric",
  timeZone: "UTC",
});

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
  if (!map.getLayer("migration-hotspots")) {
    return;
  }

  map.setLayoutProperty(
    "migration-hotspots",
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

function updateSummary(migrationData, outbreakData) {
  elements.migrationCount.textContent = String(migrationData.features.length);
  elements.outbreakCount.textContent = String(outbreakData.features.length);
}

function updateMonth() {
  const month = state.timeline[state.currentIndex];
  const label = labelFromMonth(month);
  const migrationData = filterByMonth(state.migration, month);
  const outbreakData = filterByMonth(state.outbreaks, month);

  elements.monthLabel.textContent = label;
  elements.mapTitle.textContent = `${label} overview`;
  elements.monthSlider.value = String(state.currentIndex);

  setSourceData("migration", migrationData);
  setSourceData("outbreaks", outbreakData);
  updateSummary(migrationData, outbreakData);
}

function stopPlayback() {
  state.playing = false;
  elements.playToggle.textContent = "Play";
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
  map.addSource("migration", {
    type: "geojson",
    data: emptyCollection,
  });

  map.addSource("outbreaks", {
    type: "geojson",
    data: emptyCollection,
  });

  map.addLayer({
    id: "migration-hotspots",
    type: "circle",
    source: "migration",
    paint: {
      "circle-color": [
        "interpolate",
        ["linear"],
        ["get", "intensity"],
        20,
        "#bde6df",
        60,
        "#3ca89c",
        100,
        "#16625e",
      ],
      "circle-radius": [
        "interpolate",
        ["linear"],
        ["zoom"],
        3,
        ["interpolate", ["linear"], ["get", "intensity"], 20, 6, 100, 20],
        6,
        ["interpolate", ["linear"], ["get", "intensity"], 20, 11, 100, 32],
      ],
      "circle-opacity": 0.82,
      "circle-stroke-width": 1.5,
      "circle-stroke-color": "rgba(12, 46, 44, 0.45)",
    },
  });

  map.addLayer({
    id: "outbreak-points",
    type: "circle",
    source: "outbreaks",
    paint: {
      "circle-color": "#d9633f",
      "circle-radius": [
        "interpolate",
        ["linear"],
        ["zoom"],
        3,
        6,
        6,
        10,
      ],
      "circle-stroke-width": 2,
      "circle-stroke-color": "#fff0eb",
      "circle-opacity": 0.92,
    },
  });

  bindPopup(
    "migration-hotspots",
    (props) => `
      <div class="popup">
        <h3>${props.corridor}</h3>
        <p><strong>Month:</strong> ${labelFromMonth(props.month)}</p>
        <p><strong>Species group:</strong> ${props.species_group}</p>
        <p><strong>Intensity:</strong> ${props.intensity}</p>
      </div>
    `,
  );

  bindPopup(
    "outbreak-points",
    (props) => `
      <div class="popup">
        <h3>${props.country}</h3>
        <p><strong>Month:</strong> ${labelFromMonth(props.month)}</p>
        <p><strong>Subtype:</strong> ${props.subtype}</p>
        <p><strong>Category:</strong> ${props.category}</p>
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
  const [timelineResponse, migrationResponse, outbreaksResponse] =
    await Promise.all([
      fetch("./data/processed/timeline.json"),
      fetch("./data/processed/migration_monthly.geojson"),
      fetch("./data/processed/poultry_outbreaks.geojson"),
    ]);

  const [timelinePayload, migrationPayload, outbreaksPayload] =
    await Promise.all([
      timelineResponse.json(),
      migrationResponse.json(),
      outbreaksResponse.json(),
    ]);

  state.timeline = timelinePayload.months;
  state.migration = migrationPayload;
  state.outbreaks = outbreaksPayload;

  elements.monthSlider.max = String(state.timeline.length - 1);
  elements.monthStart.textContent = labelFromMonth(state.timeline[0]);
  elements.monthEnd.textContent = labelFromMonth(
    state.timeline[state.timeline.length - 1],
  );
}

async function init() {
  wireControls();
  await loadData();

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
  elements.monthLabel.textContent = "Failed to load local data";
  elements.mapTitle.textContent = "Frontend setup needs attention";
});
