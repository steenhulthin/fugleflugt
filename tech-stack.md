# Technical Constraints

Download the project data locally rather than depending on a live backend at runtime.

The product should be delivered as a static HTML application.

Use `MapLibre GL JS` as the mapping framework.

`MapLibre GL JS` is a good fit because it works well in a static site, supports local GeoJSON and tiled data, and gives us enough performance headroom for a Europe-wide time-based map.

For the next migration pipeline, prefer offline preprocessing of eBird Status and Trends low-resolution rasters at about `27 km` resolution. This is close to the desired `30 km` target and keeps the static app lightweight.
