# Manual Testing Paths

Start the dev server with `npm run dev` and open `http://localhost:3000` in your browser.

## Path 1: Happy Path — Full Asset Lifecycle

1. **Create** — Enter "Premier League Highlights", select `video`, click **Create Asset**
2. **Verify** — Asset appears in the list with `processing` badge
3. **SSE** — Event stream shows `asset.created`
4. **Process** — Select the asset, click **Process (ready)**
5. **Verify** — Badge changes to `ready`, response shows `url` and `duration` assigned
6. **SSE** — Event stream shows `asset.processing.complete`
7. **Publish** — Click **Publish**
8. **Verify** — Badge changes to `published`
9. **SSE** — Event stream shows `asset.published`
10. **Unpublish** — Click **Unpublish**
11. **Verify** — Badge changes to `unpublished`
12. **Re-publish** — Click **Publish** again
13. **Verify** — Badge changes back to `published`
14. **History** — Click **View History**, confirm 5 entries: `created → processing.complete → published → unpublished → published`

## Path 2: Processing Failure

1. **Create** — Enter "Corrupted Upload", select `audio`, click **Create Asset**
2. **Process (fail)** — Select the asset, click **Process (fail)**
3. **Verify** — Badge changes to `failed`
4. **SSE** — Event stream shows `asset.processing.failed`
5. **Try publish** — Click **Publish**
6. **Verify** — Returns `409` error: `Invalid status transition: failed → published`
7. **History** — Click **View History**, confirm 2 entries: `created → processing.failed`

## Path 3: Invalid Status Transitions

1. **Create** — Enter "Test Transitions", select `video`, click **Create Asset**
2. **Try publish directly** — Click **Publish** (asset is still `processing`)
3. **Verify** — Returns `409`: `Invalid status transition: processing → published`
4. **Try unpublish** — Click **Unpublish**
5. **Verify** — Returns `409`: `Invalid status transition: processing → unpublished`
6. **Process** — Click **Process (ready)**
7. **Try unpublish** — Click **Unpublish** (asset is `ready`, not `published`)
8. **Verify** — Returns `409`: `Invalid status transition: ready → unpublished`

## Path 4: Filtering

1. **Create 3 assets:**
   - "Live Match" as `live-stream`
   - "Post-Match Interview" as `video`
   - "Commentary Track" as `audio`
2. **Process** the first two (leave "Commentary Track" in `processing`)
3. **Publish** "Live Match"
4. **Filter by status** — Select `processing` → only "Commentary Track" shows
5. **Filter by status** — Select `published` → only "Live Match" shows
6. **Filter by type** — Select `audio` → only "Commentary Track" shows
7. **Clear filters** — All 3 assets show

## Path 5: Delete

1. **Create** — Enter "Temporary Asset", select `video`
2. **Delete** — Select it, click **Delete**
3. **Verify** — Asset removed from list, response shows `204`
4. **SSE** — Event stream shows `asset.deleted`
5. **Refresh** — Confirm it's gone

## Path 6: Validation Errors (via curl)

```bash
# Missing title
curl -s -X POST http://localhost:3000/assets \
  -H "Content-Type: application/json" \
  -d '{"contentType": "video"}' | python3 -m json.tool

# Invalid content type
curl -s -X POST http://localhost:3000/assets \
  -H "Content-Type: application/json" \
  -d '{"title": "Test", "contentType": "podcast"}' | python3 -m json.tool

# Empty title
curl -s -X POST http://localhost:3000/assets \
  -H "Content-Type: application/json" \
  -d '{"title": "", "contentType": "video"}' | python3 -m json.tool

# Non-existent asset
curl -s http://localhost:3000/assets/does-not-exist | python3 -m json.tool

# Invalid filter value
curl -s "http://localhost:3000/assets?status=banana" | python3 -m json.tool
```

## Path 7: SSE Multi-Client

1. Open `http://localhost:3000` in **two browser tabs**
2. Create an asset in tab 1
3. **Verify** — Both tabs show the `asset.created` event in the SSE panel
4. Process the asset in tab 2
5. **Verify** — Both tabs show `asset.processing.complete`
