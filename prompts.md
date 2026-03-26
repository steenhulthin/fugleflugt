## Prompt

Okay, let's try a map leaper and start downloading data for the last year.

## Response

MapLibre is now the chosen mapping framework in [tech-stack.md](/mnt/e/prj/dagens_dashboard/fugleflugt/tech-stack.md). I also added a local download scaffold and pulled the first batch of source files into `data/raw/2026-03-26` for the last-year window `2025-03-26` through `2026-03-26`.

The key files are [data/README.md](/mnt/e/prj/dagens_dashboard/fugleflugt/data/README.md), [data/sources.md](/mnt/e/prj/dagens_dashboard/fugleflugt/data/sources.md), [scripts/download_data.sh](/mnt/e/prj/dagens_dashboard/fugleflugt/scripts/download_data.sh), and [prompts.md](/mnt/e/prj/dagens_dashboard/fugleflugt/prompts.md). The raw downloads now include the FAO avian-flu page, the ECDC Europe overview, and the EuroBirdPortal page plus the JS files that define its map layers.

One important caveat: the avian-flu sources are downloaded locally already, but the migration side is still at the “source capture and endpoint discovery” stage. EuroBirdPortal is public and CARTO-backed, so it looks promising, but I have not yet extracted a clean structured last-year migration dataset into GeoJSON or CSV.

I assumed “map leaper” meant `MapLibre`. If you want, I can do the next step now: either build a tiny MapLibre page that loads these local sources, or keep pushing on the migration extraction until we have a first usable monthly dataset.

## Prompt

Go ahead and make it a front end.

## Response

Built a static frontend in [index.html](/mnt/e/prj/dagens_dashboard/fugleflugt/index.html), [app.js](/mnt/e/prj/dagens_dashboard/fugleflugt/assets/app.js), and [styles.css](/mnt/e/prj/dagens_dashboard/fugleflugt/assets/styles.css). It uses MapLibre with a Europe-focused dashboard shell, monthly slider and playback, local migration and outbreak data from [timeline.json](/mnt/e/prj/dagens_dashboard/fugleflugt/data/processed/timeline.json), [migration_monthly.geojson](/mnt/e/prj/dagens_dashboard/fugleflugt/data/processed/migration_monthly.geojson), and [poultry_outbreaks.geojson](/mnt/e/prj/dagens_dashboard/fugleflugt/data/processed/poultry_outbreaks.geojson). The source list is visible in the UI, and the current migration layer is clearly marked as prototype data until we finish the EuroBirdPortal extraction.

I validated the JSON files successfully. I could not fully smoke-test the page in a browser here because `node` is not installed and starting a local HTTP server is blocked by the sandbox, so browser verification is still pending. If you want, I can next replace the prototype migration points with a real extracted monthly dataset and normalize the outbreak layer from the raw official sources.

## Prompt

Find appropriate map background data.Should be in GeoTIF, cloud optimized. Or vector FlatGeobuf. Download it and add it to the map. prefer small datasets.

## Response

Found and downloaded a small FlatGeobuf background dataset at [countries.fgb](/mnt/e/prj/dagens_dashboard/fugleflugt/data/background/countries.fgb). It is about 205 KB and now loads through the local browser bundle [flatgeobuf-geojson.min.js](/mnt/e/prj/dagens_dashboard/fugleflugt/assets/vendor/flatgeobuf-geojson.min.js). I added it to the map in [app.js](/mnt/e/prj/dagens_dashboard/fugleflugt/assets/app.js) and [index.html](/mnt/e/prj/dagens_dashboard/fugleflugt/index.html) as subtle country fill and outline layers under the migration and outbreak overlays, and I updated attribution in [sources.md](/mnt/e/prj/dagens_dashboard/fugleflugt/data/sources.md).

I verified the FlatGeobuf magic header successfully and confirmed that the browser bundle is present locally. I still could not run a full browser smoke test in this sandbox, so the remaining check is visual confirmation in your browser. If you want, I can next replace this world countries layer with an even tighter Europe-only background to cut the dataset down further.
