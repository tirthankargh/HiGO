# Run and check HiGO

This guide covers the local application, how to verify it yourself, and what is intentionally still deferred. For the image provenance table and architecture, see [README.md](README.md).

## 1. Start the application

Open a terminal in the repository:

```sh
cd /Users/abhimanyu/Desktop/clean_desktop/HiGO
npm run dev
```

Open **http://127.0.0.1:3000** in your browser. Keep the terminal running; press **Control+C** to stop it.

Dependencies, `.env.local`, and the six-photo seed collection have already been prepared in this workspace. On a fresh checkout, first run:

```sh
npm install
npm run setup
npm run dev
```

Use **Node.js 24 or newer**. Check your version with `node --version`. The application uses SQLite built into Node, so it requires a Node server.

For a production build on your computer:

```sh
npm run build
npm start
```

Stop the development server first; both use port 3000. These commands run locally and do not publish a website.

## 2. Open the main screens

| Screen | Local URL | What to check |
| --- | --- | --- |
| Observatory | http://127.0.0.1:3000 | Featured stories, interactive atlas, two journal links |
| Full atlas | http://127.0.0.1:3000/atlas | Search, region controls, outline selection, glacier detail and photo contribution |
| Drang Drung | http://127.0.0.1:3000/glaciers/drang-drang | Side-by-side image selection, honest date labels, gallery |
| Panchinala | http://127.0.0.1:3000/glaciers/panchinala | Two dated entries, one undated image, three-photo gallery |
| Contribute | http://127.0.0.1:3000/contribute | Select a photo, review metadata, send it for review |
| Sources and approach | http://127.0.0.1:3000/about | Provenance, limitations, and permission explanations |
| Curator desk | http://127.0.0.1:3000/admin | Admin sign-in and observation review |
| Comparison curation | http://127.0.0.1:3000/admin/comparisons | Curator-only crop previews and pair publication |

## Check the new atlas

1. Visit `/atlas`. The count should read **56,149 outlines · 2 regions**. Pan and zoom; pale blue centres resolve into actual glacier outlines. The world button shows the broader geographic context; only the supplied regions contain inventory records.
2. Search **Drang**. Select the result with keyboard or mouse, or click the map’s Drang Drung pin. The panel shows **68.36 km²** and source date **2000-09-04**, explicitly an inventory snapshot. Click **Open photo journal** to reach the existing gallery/comparison catalogue. The association is marked provisional.
3. Copy the selected page URL, open it in a new tab and refresh. The same glacier should open. Browser back/forward also restores selections.
4. Try the region selector, **Search this map area**, inventory/journal layer toggles, **World**, **All coverage**, and an unmatched search. Try selecting an outline directly. Most inventory glaciers are unnamed; search their RGI ID instead.
5. Select `RGI2000-v7.0-G-14-00001`. Follow **Contribute to this glacier**, submit a permitted photograph, and check its RGI ID at `/admin`. Approve it without assigning a journal. Reopen that atlas glacier: its reviewed observation should now appear. Unpublishing removes it. This manual check creates real data; the automated browser test uses an isolated observation database instead.
6. At 390 px width, the map, selected record and search list stack vertically. Check touch pan/pinch, keyboard search and selection, and reduced-motion settings. A browser without WebGL should still offer search and record details.
7. Featured stories are above the map on the home page. Switch stories using **01 / 02**. These are field records until suitable curated pairs exist; there are no fabricated retreat claims.

If the inventory is missing, stop the server, run `npm run atlas:import`, then restart. Setup also imports it. New RGI v7 folders can be added and reimported; see the README for regional expansion and polar limits. The derived SQLite catalogue is ignored; originals stay untouched. Browser tests need this local catalogue and use it read-only.

## 3. Sign in as curator

Open `.env.local` in your editor. Copy the value after `ADMIN_PASSWORD=` into the sign-in form at `/admin`.

Do not use `SESSION_SECRET` as the password. Do not share or commit `.env.local`. The setup script generates both values without printing them into terminal logs.

If you change `ADMIN_PASSWORD`, restart the server. Previous admin sessions become invalid. Admin sessions also expire after eight hours.

## 4. Verify a complete contribution

1. Open `/contribute?glacier=panchinala`.
2. Choose a photograph you have permission to share. For a local test, one of the supplied photos works, but it will create an additional observation in your real local collection.
3. Confirm any extracted camera date. Try **Year only**, **Month and year**, or **I don’t know the date**. Unknown dates are allowed.
4. Enter a distinctive caption such as “My local verification upload.” Add photographer credit and an optional contact email.
5. Check the permission box and select **Send for review**.
6. Confirm that a receipt page says the photograph was saved and is awaiting review. Bookmark the receipt URL.
7. Open the glacier journal in a separate private/incognito browser window. The pending photograph should not appear.
8. Sign in at `/admin`, open the pending observation, assign a glacier if needed, select **Approved / published**, and save.
9. Refresh the incognito journal. The approved photograph and its public context should now appear; the contact email should not.
10. Return to the curator screen, select **Pending / unpublished** or **Rejected / private**, and save. Refresh the public journal: the photograph should disappear.
11. Stop and restart the server. The observation and its final review status should persist.

The automated browser test performs this workflow in a temporary database if you prefer not to add test observations to your real collection.

## 5. Verify comparisons and metadata

- Change the left and right photographs in Drang Drung’s viewer. Their dates and credits should follow the selected images.
- Open gallery photographs. Check the date source, attribution, and camera-location description. Press **Escape** to close the image dialog.
- The monochrome Drang Drung photograph and two other seed images have unknown dates. They must not gain invented years or appear as dated timeline entries.
- The initial collection intentionally has **no approved before-and-after pair**. Its images have incomplete chronology or unsuitable differences in framing. Side-by-side viewing is available immediately.
- When you obtain a genuinely comparable pair, review its dates and publish it from `/admin/comparisons`. Choose earlier/later images from the same glacier, adjust the crop percentages, inspect the previews, describe limitations, and confirm comparability.
- The server rejects reversed dates, overlapping date ranges, unknown dates, unapproved images, and pairs from different glaciers.
- A published pair appears in the journal’s **View** selector as **Curated before & after**. Use touch or the keyboard arrows on its slider.
- Editing either source observation returns its pair to draft. Unpublishing either source also prevents public access to the pair’s images.

Do not approve a scientifically unsuitable pair simply to demonstrate the slider. The automated test checks the mechanism with explicitly test-only data in an isolated collection.

## 6. Check mobile, keyboard access, and failures

- Resize your browser to approximately **390 × 844**. Pages should fit without horizontal scrolling; forms and galleries stack vertically.
- Use **Tab** to reach navigation, comparison selectors, photo buttons, and form controls. Focus should be visible.
- Try a file with missing EXIF: the form should let you supply details or keep them unknown.
- Try an unsupported file, an image over **20 MB**, or an image over **40 megapixels**. It should be rejected with a useful message.
- Leave the permission checkbox unchecked: submission should not proceed.
- Enter an impossible capture date or only one camera coordinate: submission should fail without displaying a success receipt.
- Sign out and try a curator URL: the sign-in screen should appear. Original downloads and pending media must not be accessible without a curator session.
- Submission receipts contain a long private token. They show status, not a public download link to the original.

## 7. Run the automated checks

```sh
npm run typecheck
npm test
npm run build
npx playwright install chromium
npm run test:e2e
```

- `typecheck` checks TypeScript without changing your collection.
- `test` checks dates, coordinates, crops, original preservation, metadata stripping, seed idempotence, record privacy, invalid images, storage failures, persistence, and backups.
- `build` creates the production application.
- `playwright install chromium` is a one-time browser download for each machine.
- `test:e2e` runs a production server on **127.0.0.1:3100** with a separate temporary database and files. Keep that port free. The test server stops automatically afterwards.

Browser screenshots are saved to:

- `test-results/home-desktop.png`
- `test-results/home-mobile.png`
- `test-results/atlas-desktop.png`
- `test-results/atlas-selected.png`
- `test-results/atlas-mobile.png`

Failed browser tests also save screenshots and `trace.zip` files beneath `test-results/`. To inspect a trace:

```sh
npx playwright show-trace path/to/trace.zip
```

These outputs are ignored by Git. The temporary test collection does not overwrite `data/` or modify the six supplied originals.

## 8. Back up your work

Stop the app, then run:

```sh
npm run backup
```

The command copies the observation and atlas SQLite databases, originals, optimized images, and comparison images into a timestamped directory under `backups/`. Keep an additional copy elsewhere. Keep `.env.local` separately and privately.

To restore without overwriting existing data, set `HIGO_DATA_DIR` in `.env.local` to the absolute path of a backup directory, then restart. See [README.md](README.md#back-up-and-restore) for details.

## 9. Troubleshooting

| Symptom | Action |
| --- | --- |
| Empty initial collection | Run `npm run setup` from the repository root. |
| `node:sqlite` cannot be imported | Install Node.js 24 or newer. |
| Port 3000 is busy | Stop the other server, or run `npm run dev -- --port 3001` and use that port. |
| Admin access is not configured | Run `npm run setup`, then restart the server. |
| Admin password changed but login fails | Restart the server so it reads the new environment. |
| Too many login attempts | Wait 15 minutes; the local login limiter persists across restarts. |
| A pair cannot be published | Check glacier assignment, approvals, date ranges, crop bounds, and the reviewer confirmation. |
| Browser tests cannot find Chromium | Run `npx playwright install chromium`. |
| Browser tests cannot start | Free port 3100 and run `npm run build` before `npm run test:e2e`. |
| A sandbox blocks local sockets or browser launch | Run the command from your normal local terminal, or approve its narrowly scoped execution request in your coding environment. |

## 10. Delivery status and remaining scope

The implemented local MVP includes the 56,149-outline interactive atlas, featured stories, inventory-linked contributions, the two journals, all six supplied photographs, real persistent submissions, private review, publication/unpublication, private originals, editable metadata/viewpoints, curated comparison crops and slider, seed import, and backup tooling.

Verified on **6 November 2026**, using Node.js **26.5.0**:

| Check | Result |
| --- | --- |
| `npm run typecheck` | Passed |
| `npm test` | **10 passed** |
| `npm run build` | Passed; production routes generated |
| `npm run test:e2e` | **6 passed**, including atlas search/selection, inventory submissions, full submission/review and comparison workflows |
| Desktop and mobile screenshots | Inspected; pages fit at 390 px without horizontal scrolling |
| Dependency audit after patching image library | **0 vulnerabilities reported** |
| Seed import, restart persistence, original preservation, and backup | Verified by automated tests |
| Credentials, data, and generated artifacts excluded from Git | Verified |

Browser testing covers the original journal workflows plus the atlas. Import validation verifies the actual RGI shapefile attribute names and preserves dated inventory values. No known failing checks remain. The test servers have stopped; use `npm run dev` to open the app yourself.

Still intentionally deferred: public hosting, contributor accounts, new-journal administration, automatic measurements, satellite ingestion, full 3D reconstruction, and email notifications. Missing source dates/credits remain explicitly unknown and are documented in [README.md](README.md#initial-photographs-and-unresolved-provenance).
