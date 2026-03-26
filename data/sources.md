# Sources

## Mapping Framework

- MapLibre GL JS
  - https://maplibre.org/maplibre-gl-js/docs/

## Map Background

- FlatGeobuf countries background
  - https://raw.githubusercontent.com/flatgeobuf/flatgeobuf/master/test/data/countries.fgb
  - Small FlatGeobuf dataset used as the local background boundary layer

## Bird Migration

- EuroBirdPortal
  - https://www.eurobirdportal.org/ger/de/
  - Public migration viewer for Europe
  - Public page and supporting JavaScript downloaded locally for source inspection
  - The current choropleth extraction uses EuroBirdPortal CARTO torque tiles for `Barn Swallow` (`HIRRUS`) count classes in `2025` and `2026`

- eBird Status and Trends
  - https://science.ebird.org/status-and-trends
  - Official species distribution and abundance product
  - The coarse-grid migration pipeline is designed around the low-resolution `27 km` weekly abundance rasters

- eBird Status and Trends Data Products API
  - https://ebird.github.io/ebirdst/articles/api.html
  - Official API documentation for listing and downloading species data product files

- eBird Status Data Products
  - https://ebird.github.io/ebirdst/articles/status.html
  - Documents that the low-resolution GeoTIFF tier uses an Equal Earth projection and `27 km` cells

- Natural Earth countries
  - https://raw.githubusercontent.com/nvkelso/natural-earth-vector/master/geojson/ne_110m_admin_0_countries.geojson
  - Used for the country-level aggregation join that turns migration grid cells into a choropleth table

## Avian Flu

- FAO: Global Avian Influenza Viruses with Zoonotic Potential
  - https://www.fao.org/animal-health/situation-updates/global-aiv-with-zoonotic-potential/en
  - Official source page with current global situation updates

- ECDC: Avian influenza overview June-September 2025
  - https://www.ecdc.europa.eu/en/publications-data/avian-influenza-overview-june-september-2025
  - Official Europe-focused outbreak overview
