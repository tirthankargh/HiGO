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
7. Featured stories are below the map on the home page. Switch stories using **01 / 02**. These are field records until suitable curated pairs exist; there are no fabricated retreat claims.

If the inventory is missing, stop the server, run `npm run atlas:import`, then restart. Setup also imports it. New RGI v7 folders can be added and reimported; see the README for regional expansion and polar limits. The derived SQLite catalogue is ignored; originals stay untouched. Browser tests need this local catalogue and use it read-only.

## Connect a personal Google Drive

Google Drive is **not connected automatically**. Until you complete this one-time setup, new submissions are saved locally. You will need a Google account, access to [Google Cloud Console](https://console.cloud.google.com/), and this project on your computer. Google may change the names or location of its console menus.

### 1. Enable Google Drive and create credentials

1. Open [Google Cloud Console](https://console.cloud.google.com/) and sign in with the Google account whose Drive should receive the photos. Create a project, or select an existing project from the project selector at the top.
2. Open **APIs & Services → Library**, search for **Google Drive API**, open it and click **Enable**. Make sure your selected project is still correct.
3. Open **APIs & Services → OAuth consent screen** (or **Google Auth Platform**). Set up the app with an app name such as `HiGO`, your support email and contact email. For a personal account, choose **External** if asked for the audience.
4. Under **Audience** or **Test users**, add the same Google account you will use to connect Drive. Leave the app in Testing if this is a personal setup. Save the changes.
5. Open **Clients** or **Credentials**, choose **Create client** / **Create credentials → OAuth client ID**, and choose **Desktop app** as the application type. Name it `HiGO` and create it. Copy the **Client ID** and **Client secret** from the resulting screen (you can open the client later to find them again).

### 2. Connect the account to HiGO

1. Open this project's `.env.local` file in your editor. Keep its existing lines, including the admin password and session secret. Add the following two lines, replacing the placeholders with your own values; if either line already exists, update it instead of adding a duplicate:

   ```env
   GOOGLE_DRIVE_CLIENT_ID=your-client-id
   GOOGLE_DRIVE_CLIENT_SECRET=your-client-secret
   ```

   Save the file. Keep it private: do not commit it or share its contents. If `.env.local` does not exist yet, run `npm run setup` first.
2. In a terminal opened in this project, run:

   ```sh
   npm run drive:connect
   ```

3. Open the Google authorization link printed in the terminal. Sign in with the account added as a test user, review the requested access, and allow it. If Google displays a testing or unverified-app screen, proceed only if it identifies the app you just created. Keep the terminal open during this step.
4. The browser should say **Authorization received**. Return to the terminal and wait for **Google Drive connected**. The script creates a private folder named **HiGO — private original submissions** and saves the necessary connection settings in `.env.local`. You do not need to copy the refresh token or folder ID yourself.
5. If HiGO is already running, stop it with **Control+C** in its terminal. Start it again so it reads the new settings:

   ```sh
   npm run dev
   ```

### 3. Test a photo from the website through to Drive

1. Open [the contribution form](http://127.0.0.1:3000/contribute). Choose a photograph you have permission to use, enter a distinctive note such as `My Drive upload test`, complete the required fields and permission checkbox, and click **Send for review**.
2. Confirm that the website shows a receipt saying the photo was saved and is awaiting review. This is a real submission in your local collection.
3. Open [Google Drive](https://drive.google.com/) in the connected account. Find **HiGO — private original submissions** and check that a new file has appeared. Its name is an internal ID ending in `-original`, not necessarily the name of the file you chose. Open or download it to verify it is your test photo. Keep the folder private.
4. Open [the curator desk](http://127.0.0.1:3000/admin) and sign in with the `ADMIN_PASSWORD` from `.env.local`. Open your test submission. It should be pending; approve and save it when you are ready for it to appear publicly. If it has an inventory or journal association, open that glacier's atlas record or journal to check the approved display copy. You can return it to pending afterwards.

The original goes to Drive when the submission succeeds, **before** approval. HiGO keeps the database and optimized display copies locally; a contributor is not redirected to Google Drive. Existing local originals are not moved. If Drive authentication or upload fails, the form reports an error instead of silently saving the original locally.

### If something goes wrong

- **Access blocked / not a test user:** In the same Google Cloud project, add the Google account you used to the OAuth app's test users, save, and run `npm run drive:connect` again.
- **Missing client ID or secret:** Check the two lines in `.env.local`, save, and rerun the connection command from this project directory. Use a **Desktop app** OAuth client.
- **No new file or a storage error:** Check that the terminal reported a successful connection, restart HiGO, sign in to the same Drive account, and try another permitted photo. Check Drive storage space. If the connection expired or was revoked, reconnect as described below.
- **No photo on the map after approval:** The reviewer must associate the submission with an inventory glacier or mapped journal; a supplied name alone does not place a marker.

For backups, run `npm run backup` and separately back up the Drive folder. The backup contains a manifest of Drive file IDs but **does not contain the Drive originals**. The local database, display copies and Drive originals are all needed for a complete restore.

Google may expire an External Testing app’s refresh token after seven days. If uploads stop with a storage error, run `npm run drive:connect` again using the **same account and OAuth client**; it reuses the existing folder. A revoked/expired connection never silently falls back to local storage. Changing `HIGO_PHOTO_STORAGE=local` affects only new uploads; old Drive originals still require valid credentials for curator access and comparisons. See [Google’s refresh-token documentation](https://developers.google.com/identity/protocols/oauth2#expiration).

The automated tests use a fake Google Drive API; a real upload requires completing these account steps. For a hosted instance, set the same credentials as private server environment variables and keep the SQLite database and display images on persistent storage.

## Contribute a glacier name

In `/contribute`, choose a photo and search **Find a glacier in the inventory** by RGI ID or name. Select a result to attach it, or leave it empty and enter your own glacier name and region. The reviewer sees and can correct these fields and assign a verified inventory ID or existing journal before approval. A name alone does not place a marker: the glacier needs an RGI association or a mapped journal. Camera coordinates refer to the camera, not the glacier.

On the atlas, gold markers and the **Only glaciers with photographs** filter identify records with approved photos. Drang Drung’s inventory link is labeled provisional; Panchinala remains off the map until its association is confirmed. Pending and rejected submissions do not appear in this layer.

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
- `test-results/home-mobile-viewport.png`
- `test-results/about-mobile.png`
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

The command copies the observation and atlas SQLite databases, local originals, optimized images, and comparison images into a timestamped directory under `backups/`. Keep an additional copy elsewhere. Back up the Drive originals separately; the command includes only their IDs. Keep `.env.local` separately and privately.

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

Verified on **10 November 2026**, using Node.js **26.5.0**:

| Check | Result |
| --- | --- |
| `npm run typecheck` | Passed |
| `npm test` | **12 passed** |
| `npm run build` | Passed; production routes generated |
| `npm run test:e2e` | **8 passed**, including atlas search/selection, inventory submissions, full submission/review and comparison workflows |
| Desktop and mobile screenshots | Inspected; pages fit at 390 px without horizontal scrolling |
| Dependency audit after patching image library | **0 vulnerabilities reported** |
| Seed import, restart persistence, original preservation, and backup | Verified by automated tests |
| Credentials, data, and generated artifacts excluded from Git | Verified |

Browser testing covers the original journal workflows plus the atlas. Import validation verifies the actual RGI shapefile attribute names and preserves dated inventory values. No known failing checks remain. The test servers have stopped; use `npm run dev` to open the app yourself.

Still intentionally deferred: public hosting, contributor accounts, new-journal administration, automatic measurements, satellite ingestion, full 3D reconstruction, and email notifications. Missing source dates/credits remain explicitly unknown and are documented in [README.md](README.md#initial-photographs-and-unresolved-provenance).
