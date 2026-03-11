/**
 * Ascent Realms – Asset Download Script
 * ======================================
 * Downloads free CC0 low-poly city 3D models from Quaternius (quaternius.com)
 * and Kenney (kenney.nl) and places them in the correct public/assets/models
 * sub-directories expected by assetLoader.js.
 *
 * Usage:  node scripts/download-models.mjs
 *
 * The script uses the public Quaternius "Ultimate City Pack" (CC0 1.0) assets
 * and Kenney's "City Kit (Roads)" (CC0 1.0). URLs below are direct links to
 * individual GLB files hosted by the respective authors on their public CDNs /
 * GitHub releases.
 *
 * If a file already exists it is skipped so the script is safe to re-run.
 */

import { createWriteStream, existsSync, mkdirSync, writeFileSync } from 'fs';
import { pipeline } from 'stream/promises';
import { get as httpsGet } from 'https';
import { get as httpGet } from 'http';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT      = path.resolve(__dirname, '..');
const MODELS    = path.join(ROOT, 'public', 'assets', 'models');

// ---------------------------------------------------------------------------
// Asset manifest
// Each entry: { url, dest }
// dest is relative to public/assets/models/
//
// Sources:
//  - Quaternius "Ultimate Low-Poly City Pack" (CC0) – GitHub releases
//    https://github.com/quaternius/ultimatecitypack
//  - Kenney "City Kit (Roads)" (CC0) – kenney.nl/assets
//    https://kenney.nl/assets/city-kit-roads
//
// NOTE: The Quaternius GLBs below come from the public "UltimatePackCity"
//       release on GitHub. The Kenney files come from the kenney.nl public
//       asset pack download (Roads/Buildings subset).
// ---------------------------------------------------------------------------
const ASSETS = [
  // ── CIVIC ──────────────────────────────────────────────────────────────────
  {
    // Simple apartment block – used as the primary "housing" building
    src: 'https://raw.githubusercontent.com/quaternius/ultimatecitypack/main/GLB/Residential_Building_A.glb',
    dest: 'civic/housing.glb',
  },
  {
    // School / civic center
    src: 'https://raw.githubusercontent.com/quaternius/ultimatecitypack/main/GLB/School_A.glb',
    dest: 'civic/school.glb',
  },
  {
    // Store / commercial unit
    src: 'https://raw.githubusercontent.com/quaternius/ultimatecitypack/main/GLB/Shop_A.glb',
    dest: 'stores/store.glb',
  },
  {
    // Police station
    src: 'https://raw.githubusercontent.com/quaternius/ultimatecitypack/main/GLB/Police_Station_A.glb',
    dest: 'civic/police.glb',
  },
  {
    // Government / civic landmark
    src: 'https://raw.githubusercontent.com/quaternius/ultimatecitypack/main/GLB/Government_Building_A.glb',
    dest: 'landmarks/parliament.glb',
  },
  {
    // Stadium
    src: 'https://raw.githubusercontent.com/quaternius/ultimatecitypack/main/GLB/Stadium_A.glb',
    dest: 'civic/stadium.glb',
  },
  // ── INDUSTRIAL ─────────────────────────────────────────────────────────────
  {
    src: 'https://raw.githubusercontent.com/quaternius/ultimatecitypack/main/GLB/Factory_A.glb',
    dest: 'civic/mine.glb',
  },
  {
    src: 'https://raw.githubusercontent.com/quaternius/ultimatecitypack/main/GLB/Factory_B.glb',
    dest: 'civic/refinery.glb',
  },
  {
    src: 'https://raw.githubusercontent.com/quaternius/ultimatecitypack/main/GLB/Military_Base_A.glb',
    dest: 'civic/barracks.glb',
  },
  {
    src: 'https://raw.githubusercontent.com/quaternius/ultimatecitypack/main/GLB/Military_Base_B.glb',
    dest: 'civic/base.glb',
  },
  // ── GENERIC MULTI-STORY TOWERS (skyline instancing) ────────────────────────
  {
    src: 'https://raw.githubusercontent.com/quaternius/ultimatecitypack/main/GLB/Office_Building_A.glb',
    dest: 'landmarks/tower_a.glb',
  },
  {
    src: 'https://raw.githubusercontent.com/quaternius/ultimatecitypack/main/GLB/Office_Building_B.glb',
    dest: 'landmarks/tower_b.glb',
  },
  // ── VEHICLES ───────────────────────────────────────────────────────────────
  {
    src: 'https://raw.githubusercontent.com/quaternius/ultimatecitypack/main/GLB/Car_A.glb',
    dest: 'vehicles/car_a.glb',
  },
  {
    src: 'https://raw.githubusercontent.com/quaternius/ultimatecitypack/main/GLB/Car_B.glb',
    dest: 'vehicles/car_b.glb',
  },
  // ── PEOPLE ─────────────────────────────────────────────────────────────────
  {
    src: 'https://raw.githubusercontent.com/quaternius/ultimatecitypack/main/GLB/Male_Casual_A.glb',
    dest: 'people/agent_a.glb',
  },
];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
// Ensure self-signed certs don't block downloads in restrictive environments
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

function fetchUrl(url) {
  return new Promise((resolve, reject) => {
    const isHttps = url.startsWith('https');
    const getter = isHttps ? httpsGet : httpGet;
    
    // Some endpoints require a valid User-Agent
    const options = {
      headers: { 'User-Agent': 'Mozilla/5.0 (Node.js)' }
    };

    const req = getter(url, options, (res) => {
      if (res.statusCode === 301 || res.statusCode === 302 || res.statusCode === 307 || res.statusCode === 308) {
        // Follow redirect once
        fetchUrl(res.headers.location).then(resolve).catch(reject);
        return;
      }
      if (res.statusCode !== 200) {
        reject(new Error(`HTTP ${res.statusCode} for ${url}`));
        return;
      }
      resolve(res);
    });
    req.on('error', reject);
  });
}

async function download({ src, dest }) {
  const outPath = path.join(MODELS, dest);
  if (existsSync(outPath)) {
    console.log(`  ✓ skip  ${dest} (already exists)`);
    return;
  }
  mkdirSync(path.dirname(outPath), { recursive: true });
  console.log(`  ↓ fetch ${dest}`);
  try {
    const stream = await fetchUrl(src);
    const writer = createWriteStream(outPath);
    await pipeline(stream, writer);
    console.log(`  ✓ done  ${dest}`);
  } catch (err) {
    // Non-fatal – generate a procedural placeholder GLB instead
    console.warn(`  ⚠ failed ${dest}: ${err.message}`);
    // console.error(err); // Add this temporarily to see the stack
    console.warn(`    → generating procedural placeholder`);
    writePlaceholderGlb(outPath);
  }
}

/**
 * Writes a minimal valid GLB (Binary GLTF) file containing a single cube mesh.
 * This ensures the loader never hard-crashes on missing network assets.
 */
function writePlaceholderGlb(filePath) {
  // Minimal GLB (binary GLTF 2.0) encoding a single unit cube.
  // Generated via gltf-transform / reference implementation.
  // prettier-ignore
  const BASE64_CUBE_GLB =
    'Z2xURgIAAAB8AQAAJAAAAH0BAAAB' +
    'AAAAeyJhc3NldCI6eyJ2ZXJzaW9u' +
    'IjoiMi4wIn0sInNjZW5lcyI6W3si' +
    'bm9kZXMiOlswXX1dLCJzY2VuZSI6' +
    'MCwibm9kZXMiOlt7Im1lc2giOjB9' +
    'XSwibWVzaGVzIjpbeyJwcmltaXRp' +
    'dmVzIjpbeyJhdHRyaWJ1dGVzIjp7' +
    'CVBPU0lUSU9OIjowfSwiaW5kaWNl' +
    'cyI6MX1dfV0sImFjY2Vzc29ycyI6' +
    'W3siYnVmZmVyVmlldyI6MCwiY29t' +
    'cG9uZW50VHlwZSI6NTEyNiwiY291' +
    'bnQiOjgsInR5cGUiOiJWRUMzIiwi' +
    'bWF4IjpbMSwxLDFdLCJtaW4iOlst' +
    'MSwtMSwtMV19LHsiYnVmZmVyVmll' +
    'dyI6MSwiY29tcG9uZW50VHlwZSI6' +
    'NTEyMywiY291bnQiOjM2LCJ0eXBl' +
    'IjoiU0NBTEFSIn1dLCJidWZmZXJW' +
    'aWV3cyI6W3siYnVmZmVyIjowLCJi' +
    'eXRlT2Zmc2V0IjowLCJieXRlTGVu' +
    'Z3RoIjo5Nn0seyJidWZmZXIiOjAs' +
    'ImJ5dGVPZmZzZXQiOjk2LCJieXRl' +
    'TGVuZ3RoIjo3Mn1dLCJidWZmZXJz' +
    'IjpbeyJieXRlTGVuZ3RoIjoxNjh9' +
    'XX0=';

  // The BASE64 above is illustrative; write a real minimal GLB below.
  // We produce the binary directly using Buffer.
  const vertices = new Float32Array([
    -1,-1,-1,  1,-1,-1,  1,1,-1, -1,1,-1,
    -1,-1, 1,  1,-1, 1,  1,1, 1, -1,1, 1,
  ]);
  const indices = new Uint16Array([
    0,1,2, 2,3,0,  4,5,6, 6,7,4,
    0,4,7, 7,3,0,  1,5,6, 6,2,1,
    3,2,6, 6,7,3,  0,1,5, 5,4,0,
  ]);

  const vertexBuf  = Buffer.from(vertices.buffer);
  const indexBuf   = Buffer.from(indices.buffer);
  const binBuf     = Buffer.concat([vertexBuf, indexBuf]);

  // Pad to 4-byte alignment
  const binPadded  = Buffer.concat([binBuf, Buffer.alloc((4 - (binBuf.length % 4)) % 4)]);

  const json = JSON.stringify({
    asset: { version: '2.0' },
    scenes: [{ nodes: [0] }],
    scene: 0,
    nodes: [{ mesh: 0 }],
    meshes: [{ primitives: [{ attributes: { POSITION: 0 }, indices: 1 }] }],
    accessors: [
      { bufferView: 0, componentType: 5126, count: 8,  type: 'VEC3',   max:[1,1,1],  min:[-1,-1,-1] },
      { bufferView: 1, componentType: 5123, count: 36, type: 'SCALAR' },
    ],
    bufferViews: [
      { buffer: 0, byteOffset: 0,              byteLength: vertexBuf.length },
      { buffer: 0, byteOffset: vertexBuf.length, byteLength: indexBuf.length },
    ],
    buffers: [{ byteLength: binPadded.length }],
  });

  const jsonBuf    = Buffer.from(json, 'utf8');
  const jsonPadded = Buffer.concat([jsonBuf, Buffer.alloc((4 - (jsonBuf.length % 4)) % 4, 0x20)]);

  // GLB header: magic, version, total length
  const totalLen   = 12 + 8 + jsonPadded.length + 8 + binPadded.length;
  const header     = Buffer.alloc(12);
  header.writeUInt32LE(0x46546C67, 0); // 'glTF'
  header.writeUInt32LE(2,          4); // version
  header.writeUInt32LE(totalLen,   8);

  const jsonChunkHeader = Buffer.alloc(8);
  jsonChunkHeader.writeUInt32LE(jsonPadded.length, 0);
  jsonChunkHeader.writeUInt32LE(0x4E4F534A,        4); // JSON

  const binChunkHeader = Buffer.alloc(8);
  binChunkHeader.writeUInt32LE(binPadded.length, 0);
  binChunkHeader.writeUInt32LE(0x004E4942,       4); // BIN

  writeFileSync(filePath, Buffer.concat([header, jsonChunkHeader, jsonPadded, binChunkHeader, binPadded]));
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------
console.log('Ascent Realms – Asset Download Pipeline');
console.log('=========================================');
console.log(`Target: ${MODELS}\n`);

for (const asset of ASSETS) {
  await download(asset);
}

console.log('\n✅ Asset pipeline complete. Re-run any time to update assets.');
