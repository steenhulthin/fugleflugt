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
