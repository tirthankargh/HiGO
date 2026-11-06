# HiGO — The Glacier Observatory

A map-led atlas and living photographic record of glaciers, starting in the Himalaya and designed to grow region by region. The first collection contains six supplied images associated with **Drang Drung** and **Panchinala**.

**Start here:** [Run and check HiGO](RUN_AND_CHECK.md) includes a practical walkthrough, admin access, manual checks, and verification results.

## Run locally

Requires **Node.js 24 or newer** and npm. Developed and verified with Node 26.5.0. The application uses Node’s built-in SQLite module; an Edge runtime or static-only host will not work.

```sh
npm install
npm run setup
npm run dev
```

Open [http://127.0.0.1:3000](http://127.0.0.1:3000). These commands bind the application to loopback. Nothing is deployed or publicly shared.

Setup creates an ignored `.env.local` containing a randomly generated `ADMIN_PASSWORD` and `SESSION_SECRET`. Read that file locally to obtain the password, then open `/admin`. Do not commit or share it. Setup also imports available RGI directories, creates the database and optimized image copies; it is safe to rerun and does not overwrite existing observations or curator edits. The supplied original directories remain unchanged.

Production mode:

```sh
npm run build
npm start
```

Stop the development server before starting production on the same port. `npm run setup` must run before using a fresh checkout’s collection.

## Using the observatory

- **Home:** featured photographic stories and the working glacier atlas. Reviewed comparison stories can occupy the featured slots; the seed photos do not imply a verified change.
- **Atlas (`/atlas`):** pan/zoom, world view, inventory polygons, name/ID search, region and viewport filtering, layer controls, shareable glacier selections, inventory details and contribution links.
- **Glacier journals:** photographs, metadata dialogs, dated observations, a separate note for undated images, and a contribution link.
- **Drang Drung comparisons:** selectable side-by-side views. The supplied images have different framing and incomplete chronology, so no seed pair is approved for a before-and-after slider.
- **Contribute:** choose a JPEG, PNG, or WebP, review available EXIF, add optional context, and confirm permission. The original is saved privately and a private receipt URL shows review status. There are no contributor accounts.
- **Curator desk:** approve, reject, or unpublish observations; correct metadata; assign a glacier and optional viewpoint; download private originals; create or unpublish comparison pairs.

An approved observation must have an assigned journal glacier or a valid RGI inventory ID. Atlas contributions preserve their RGI ID separately from camera coordinates and remain private until approved. The curator can correct that ID. Approved observations appear in the selected inventory glacier’s panel even without an existing journal. Contributions with uncertain glacier identification are accepted into the private queue.

## Atlas data, operation and expansion

The two supplied **RGI 7.0** folders contain **56,149 glacier outlines**: 37,562 in South Asia West (14) and 18,587 in South Asia East (15). These are dated inventory snapshots targeting approximately 2000, not live boundaries or a change time series. Areas and elevations are inventory attributes, not newly measured values. Most glaciers have no recorded name; their stable RGI IDs remain searchable. Blank regions of the world mean no imported coverage.

Run `npm run atlas:import` to regenerate the separate `data/atlas.sqlite` catalogue and zoom 0–10 vector tiles. It validates WGS84 input and finite centre/area values, preserves the supplied shapefiles, and atomically replaces the derived database. Stop the server before importing and restart afterwards; runtime connections are read-only and cached. Re-running is idempotent and does not modify observation data. Setup invokes this import automatically when matching folders exist. Allow approximately 60 MB for the current catalogue and tiles, plus working space during import.

MapLibre GL JS draws a **2D atlas** from locally served vector tiles and a bundled Natural Earth world land layer (`public/atlas/land.json`). No API key, external tile requests, satellite imagery, terrain, or fabricated 3D are used. The `predev` and `prebuild` scripts copy the installed MapLibre worker and license into ignored same-origin assets, avoiding bundler-dependent worker URLs. Zoom 10 tiles are overzoomed up to zoom 14; display simplification is not a scientific measurement surface. WebGL is required for the map; the searchable catalogue and record panels remain available without it. Coastlines are deliberately coarse and the map is not for navigation. Arrow keys pan the focused map; plus/minus zoom. Search results and controls also work by keyboard. Flights respect reduced motion.

**Provisional associations:** Drang Drung’s journal is linked as a related record to `RGI2000-v7.0-G-14-26914` (inventory name “IN5Q164F0071 Durung Drong Glacier”; GLIMS `G076303E33741N`). This is a researched lead, not a verified photo-to-polygon assignment. Seed photos have not been automatically assigned RGI IDs. Panchinala remains available as a journal without a map pin: its exact inventory association needs review. No photo GPS was inferred from inventory centres.

To expand, place another unmodified RGI v7 **individual glacier** directory at the repository root with the naming pattern `RGI2000-v7.0-G-NN_name` and its `.shp`, `.dbf`, `.shx`, `.prj` companions, then reimport and restart. The importer discovers regions, the API reports coverage dynamically, and the map accepts global coordinates. The current region fly-to presets and readable region names specialize regions 14/15; additional regions use the overall imported bounds and numeric region names. A complete worldwide import should be profiled for memory, polar projection limits and tile generation before publication. The current Mercator atlas does not show the poles beyond ±85°; a global polar/globe view remains future work.

RGI data: **RGI Consortium (2023), Randolph Glacier Inventory – A Dataset of Global Glacier Outlines, Version 7.0**, Boulder, Colorado USA, NSIDC, [doi:10.5067/F6JMOVY5NAVZ](https://doi.org/10.5067/F6JMOVY5NAVZ), [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/). Map tiles are simplified derivatives; metadata is drawn from the supplied files. See the [RGI user guide and use limitations](https://rgidata.org/user_guide/01_introduction.html). The base land geometry comes from [Natural Earth](https://www.naturalearthdata.com/about/terms-of-use/), public domain, distributed via `world-atlas` (1:110 million scale). `HIGO_ATLAS_PATH` may override the catalogue location; keep it outside `public/`.

## Review and comparisons

For each observation, the curator can set a date with day/month/year precision or leave it unknown. Approximate dates retain their label. Camera coordinates refer to the photographer’s position, not the glacier, and remain private. Viewpoint descriptions appear with approved observations.

To publish a comparison, select two approved photographs of the same glacier, set separate percentage crops, and inspect the previews. Both are fitted to an 8:5 display frame. Confirm matching landmarks, viewpoint, chronology, and seasonal comparability and supply a caption explaining limitations. Date ranges must not overlap. Source photographs remain unchanged; generated crops are stored separately.

The browser slider uses a native range input with keyboard and touch support. Unpublishing a photograph immediately blocks its display images and any dependent comparison. Saving observation metadata changes returns its comparisons to draft: create a newly reviewed pair after rechecking them. Curation is editorial review, not scientific certification or an automated measurement of retreat.

## Data and privacy

Default local layout (all ignored by Git):

```text
data/
  atlas.sqlite               # derived RGI records and vector tiles (read-only at runtime)
  higo.sqlite                # glaciers, observations, viewpoints, comparisons
  higo.sqlite-wal / -shm      # SQLite runtime files, when present
  photos/<observation-id>/
    original                 # exact submitted bytes, private
    display.webp             # oriented, max 2200 px, metadata stripped
    thumb.webp               # oriented, max 800 px, metadata stripped
  comparisons/<pair-id>/
    before.webp
    after.webp
.env.local                   # local admin credentials
```

Use `HIGO_DATA_DIR` in `.env.local` to choose an absolute storage path outside `public/`. Data and media are served through authorized application routes, not a public static directory. Public responses exclude original paths, contacts, exact coordinates, permission records, raw extracted metadata, and receipt tokens. Display-media responses use `no-store` so unpublication is not defeated by browser caching.

Anonymous contributions are pending by default. Files are checked by their decoded content, not just their extensions, and must be single-frame JPEG, PNG, or WebP, at most **20 MiB / 40 million pixels**. Embedded metadata is extracted before display copies are stripped. Form length, dates, coordinates, and origins are validated server-side. Failed database inserts remove the new photo files. Local write rate limits are 60 upload attempts/hour and 10 admin login attempts/15 minutes, shared across this single local instance.

Admin sessions are encrypted, HttpOnly, SameSite=Strict, and expire after eight hours. Changing `ADMIN_PASSWORD` invalidates existing admin sessions. A missing password or short/missing session secret disables admin login. Set `HIGO_HTTPS=true` only when serving over HTTPS to mark the session cookie Secure. Never expose this local installation by simply opening its port; public hosting is a separate milestone requiring persistent hosted storage and deployment-specific identity, transport, and abuse controls.

Contributor permission allows HiGO to preserve and display their photograph after review, with attribution. It **does not grant third-party reuse rights**. Contact details are optional and private. Public permission claims are not inferred from a file’s presence or an EXIF artist tag.

## Initial photographs and unresolved provenance

All glacier associations below come from the supplied folders. They are editable during review. Camera timestamps have no established timezone and are not independently verified; they are displayed as capture dates without invented timezone conversions.

| Supplied file | Capture date | Photographer | Evidence / outstanding context |
| --- | --- | --- | --- |
| `drang drang/IMG_4305.jpg` | 2023-10-02 | `bibek nandi` | EXIF and XMP contain the date and credit. Attribution spelling is preserved. |
| `drang drang/IMG_5042.jpg` | Unknown | Unconfirmed | Older-looking monochrome reproduction; original date, photographer, and source unconfirmed. Appearance alone does not establish its age. |
| `drang drang/image3.jpg` | Unknown | Unconfirmed | No capture date or photographer recovered. Snow cover must not be treated as evidence of glacier growth or retreat. |
| `Panchinala/DSCF1628.jpg` | 2024-06-09 | Unconfirmed | EXIF and XMP camera date; no recovered photographer credit. |
| `Panchinala/DSCF1638.jpg` | 2024-06-10 | Unconfirmed | EXIF and XMP camera date; no recovered photographer credit. |
| `Panchinala/DSCF1629.jpg` | Unknown | Unconfirmed | No EXIF or XMP packet recovered. No date inferred from neighbouring filenames. |

**None of the six files contains GPS metadata.** The three Panchinala images do not establish long-term change. No seed image pair is certified as a repeat-photography comparison. The owner supplied these images for this local demo; original attribution and broader reuse rights remain unresolved where not provided. The repository’s MIT license applies to application code, not a blanket license to contributed photographs.

Metadata inspection and web searches did not establish reliable additional provenance for the undated photographs. Useful research leads (not matches to those files):

- [NSIDC Glacier Photograph Collection](https://nsidc.org/data/glacier_photo/) — archive and repeat-photography methodology.
- [Glacier RePhoto](https://www.glacierrephoto.org/) — repeat-photography station inventory.
- [ICIMOD Cryohub](https://www.icimod.org/initiative/hkh-cryohub-cryo-profile/) — Himalayan monitoring context, including Panchinala in Himachal Pradesh.
- [IIT Bombay UAV study](https://dspace.library.iitb.ac.in/xmlui/handle/100/38668) — research on Panchinala-A; this does not establish which exact sub-glacier appears in the supplied images.
- [Drang Drung imagery on Wikimedia Commons](https://commons.wikimedia.org/wiki/Category:Drang-drung) — a potential future source requiring per-image license and viewpoint checks. No online photographs were substituted into the supplied collection.

Interface inspiration: [CoastSnap](https://www.environment.nsw.gov.au/research-and-publications/your-research/citizen-science/get-involved/coastsnap), [Chronolog](https://www.chronolog.io/), and [iNaturalist’s data quality approach](https://help.inaturalist.org/en/support/solutions/articles/151000169936-what-is-the-data-quality-assessment-and-how-do-observations-qualify-to-become-research-grade-).

## Checks

```sh
npm run typecheck
npm test
npm run build
npx playwright install chromium
npm run test:e2e
```

Unit/integration tests cover partial dates, invalid dates, coordinates, crops, seed idempotence, original preservation, metadata stripping, private/public record separation, unsupported and oversized images, storage failures, and persistence in a fresh process.

Browser tests launch a production server on port 3100 against a separate temporary seeded observation database and the read-only local `data/atlas.sqlite` (run `npm run atlas:import` first). They exercise responsive pages, metadata dialogs, anonymous submission, private pending media, admin authentication, approval/unpublication, bad input, comparison chronology, crop generation, the keyboard slider, atlas rendering/search/deep links, mobile layouts, and inventory-linked contribution approval. Test-only comparisons are never added to your real collection. Screenshots and failure traces are written under ignored `test-results/`.

## Back up and restore

1. Stop the app to keep database and media in sync.
2. Run `npm run backup`. It takes a consistent SQLite backup and copies the derived atlas database plus original, display, and comparison files into a timestamped ignored directory under `backups/`.
3. Store a copy outside this computer. Keep `.env.local` separately and securely; it is intentionally not included in the backup.
4. To restore, stop the app and set `HIGO_DATA_DIR` to an extracted backup directory (or copy its contents into a new data directory). Start the app with the same secrets to retain sessions, or fresh secrets to invalidate them. Confirm image counts and open a photograph before resuming collection.

The observation database migrates additively to SQLite `user_version=2`, adding nullable `rgi_id` without changing existing photos or journal assignments. Future schema changes should use versioned migrations and backups; seed imports only add missing initial records. Source changes alone do not erase data.

## Deliberately deferred

Public hosting, contributor accounts, automatic scientific measurements, satellite ingestion, full 3D reconstruction, new-journal creation, and automated notifications. The six supplied photographs support a journal and observation workflow; they are not sufficient for a trustworthy full glacier reconstruction.
