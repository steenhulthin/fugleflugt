# Data Downloads

This folder stores local copies of external data sources used by the project.

## Time Window

The raw-source download window is currently centered on the last year relative
to the project date:

- Start: `2025-03-26`
- End: `2026-03-26`

The migration choropleth extraction now targets calendar years `2024`, `2025`,
and `2026`.

## Source Status

### Avian Flu

We can already download official source pages locally from FAO and ECDC.

These downloads are suitable as raw source material and attribution references.

### Bird Migration

EuroBirdPortal is publicly viewable and appears to use public CARTO-backed map layers, but the raw migration download path still needs verification before we rely on it as a structured source.

For now, we keep local copies of the public page and the JavaScript files that describe how the map is assembled.

We are also preparing an alternative eBird pipeline for coarser spatial output.

The intended eBird path is:

1. Request access to eBird Status and Trends data products.
2. Use the low-resolution weekly abundance raster tier at about `27 km`, which is close to the target `30 km` grid.
3. Export the `52` weekly raster bands to XYZ rows.
4. Aggregate those weekly rows into monthly Europe-only coarse-grid GeoJSON and JSON files.

The pipeline scripts are:

- `scripts/prepare_ebird_status_download.py`
- `scripts/export_ebird_xyz.sh`
- `scripts/aggregate_ebird_weekly_xyz.py`

Store the eBird access key in a local `.env.local` file using `EBIRD_ST_KEY=...`.

Use `.env.local.example` as the template. The real `.env.local` file is git ignored.

Because this workspace does not currently have GDAL or raster Python packages installed, the pipeline is scaffolded but not fully runnable end to end yet.
