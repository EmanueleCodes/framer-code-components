# Deploy Depth Globe Data to Cloudflare

This Worker serves binary globe data from R2 for faster load times.

**Note:** Enable R2 in Cloudflare Dashboard first: [R2](https://dash.cloudflare.com/?to=/:account/r2) → Get started.

## 1. Create R2 bucket

```bash
cd next-dev/app/3D-depth-globe/depth-globe-data
npx wrangler r2 bucket create depth-globe-data
```

## 2. Generate binary files

```bash
cd ../scripts
node json-to-binary.js
```

This creates `globe-data/globe_low.bin`, `globe_medium.bin`, `globe_high.bin`.

## 3. Upload to R2

```bash
cd ../depth-globe-data
npm install
node upload.mjs
```

Or manually:

```bash
npx wrangler r2 object put depth-globe-data/globe_low.bin --file=../globe-data/globe_low.bin
npx wrangler r2 object put depth-globe-data/globe_medium.bin --file=../globe-data/globe_medium.bin
npx wrangler r2 object put depth-globe-data/globe_high.bin --file=../globe-data/globe_high.bin
```

## 4. Deploy Worker

```bash
npx wrangler deploy
```

## 5. Update DepthGlobe URL

After deploy, wrangler will print your Worker URL. Copy it (e.g. `https://depth-globe-data.xxx.workers.dev`) and update `GLOBE_DATA_BASE` in `DepthGlobe.tsx` (line ~51).

**Multi-account users:** Add `account_id = "your-account-id"` to `wrangler.toml` before creating the bucket.
