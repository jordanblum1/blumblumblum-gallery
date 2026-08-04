// Re-encode stored Cloudinary originals as web-sized masters.
//
// Full-resolution masters (6000px, 5-7MB) cost storage and make every
// "fullsize" view a multi-MB transfer. This replaces each original in place
// with a c_limit,w_2560 / q_auto:good / jpg version — same public_id, same
// folder, same URLs. Watermarks are already baked into the originals.
//
// Usage:
//   node --env-file=.env.local scripts/optimize-originals.mjs             # dry run
//   node --env-file=.env.local scripts/optimize-originals.mjs --backup DIR # download originals first
//   node --env-file=.env.local scripts/optimize-originals.mjs --execute [--limit N]
import cloudinary from "cloudinary";
import fs from "node:fs";
import path from "node:path";

const MAX_DIMENSION = 2560;
const MIN_BYTES = 1_000_000; // skip assets already under ~1MB and small enough

cloudinary.v2.config({
  cloud_name: process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
  secure: true,
});

const args = process.argv.slice(2);
const execute = args.includes("--execute");
const backupDir = args.includes("--backup") ? args[args.indexOf("--backup") + 1] : null;
const limitArg = args.includes("--limit") ? Number(args[args.indexOf("--limit") + 1]) : Infinity;

async function listAll() {
  const resources = [];
  let cursor;
  do {
    const q = cloudinary.v2.search
      .expression(`folder:${process.env.CLOUDINARY_FOLDER}/*`)
      .max_results(500);
    if (cursor) q.next_cursor(cursor);
    const r = await q.execute();
    resources.push(...r.resources);
    cursor = r.next_cursor;
  } while (cursor);
  return resources;
}

function needsWork(r) {
  return Math.max(r.width, r.height) > MAX_DIMENSION || r.bytes > MIN_BYTES;
}

function optimizedSourceUrl(r) {
  const cloud = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
  return `https://res.cloudinary.com/${cloud}/image/upload/c_limit,w_${MAX_DIMENSION},q_auto:good/${r.public_id}.jpg`;
}

const mb = (n) => (n / 1e6).toFixed(2) + "MB";

const resources = await listAll();
const targets = resources.filter(needsWork).slice(0, limitArg);
const totalBefore = resources.reduce((s, r) => s + r.bytes, 0);

console.log(`${resources.length} assets, ${mb(totalBefore)} stored; ${targets.length} need optimization`);

if (backupDir) {
  fs.mkdirSync(backupDir, { recursive: true });
  let done = 0;
  for (const r of resources) {
    const name = r.public_id.replace(/\//g, "__") + "." + r.format;
    const dest = path.join(backupDir, name);
    if (fs.existsSync(dest) && fs.statSync(dest).size === r.bytes) {
      done++;
      continue;
    }
    const res = await fetch(r.secure_url);
    if (!res.ok) throw new Error(`backup failed for ${r.public_id}: ${res.status}`);
    fs.writeFileSync(dest, Buffer.from(await res.arrayBuffer()));
    done++;
    if (done % 20 === 0) console.log(`backed up ${done}/${resources.length}`);
  }
  console.log(`backup complete: ${done} originals in ${backupDir}`);
}

if (!execute) {
  console.log("dry run — nothing modified. Pass --execute to re-encode.");
  process.exit(0);
}

async function withRetry(fn, label, attempts = 3) {
  for (let i = 1; ; i++) {
    try {
      return await fn();
    } catch (err) {
      if (i >= attempts) throw err;
      console.log(`retry ${i} for ${label}: ${err.message || err}`);
      await new Promise((resolve) => setTimeout(resolve, 2000 * i));
    }
  }
}

let saved = 0;
let processed = 0;
for (const r of targets) {
  // Cloudinary blocks ingesting from its own delivery URLs, so fetch the
  // optimized bytes here and upload them as a data URI.
  const optimized = await withRetry(async () => {
    const res = await fetch(optimizedSourceUrl(r));
    if (!res.ok) throw new Error(`derive failed: ${res.status}`);
    return Buffer.from(await res.arrayBuffer());
  }, `derive ${r.public_id}`);
  const result = await withRetry(
    () =>
      cloudinary.v2.uploader.upload(
        `data:image/jpeg;base64,${optimized.toString("base64")}`,
        {
          public_id: r.public_id,
          asset_folder: r.asset_folder,
          overwrite: true,
          invalidate: true,
          resource_type: "image",
        },
      ),
    `upload ${r.public_id}`,
  );
  saved += r.bytes - result.bytes;
  processed++;
  console.log(
    `${r.public_id}: ${r.width}x${r.height} ${mb(r.bytes)} -> ${result.width}x${result.height} ${mb(result.bytes)}`,
  );
}

console.log(`done: ${processed} re-encoded, ${mb(saved)} saved`);
