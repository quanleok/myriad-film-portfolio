const fs = require("fs/promises");
const path = require("path");
const sharp = require("sharp");

const DEFAULT_ICONS_DIR = path.join(process.cwd(), "public", "icons");
const TARGET = { r: 6, g: 8, b: 7 };
const DISTANCE_THRESHOLD = 25;
const DISTANCE_THRESHOLD_SQUARED = DISTANCE_THRESHOLD * DISTANCE_THRESHOLD;

function isNearTarget(r, g, b) {
  const dr = r - TARGET.r;
  const dg = g - TARGET.g;
  const db = b - TARGET.b;

  return dr * dr + dg * dg + db * db <= DISTANCE_THRESHOLD_SQUARED;
}

async function cleanPng(filePath) {
  const image = sharp(filePath).ensureAlpha();
  const { data, info } = await image.raw().toBuffer({ resolveWithObject: true });

  let modifiedPixels = 0;

  for (let index = 0; index < data.length; index += info.channels) {
    if (isNearTarget(data[index], data[index + 1], data[index + 2])) {
      if (data[index + 3] !== 0) {
        data[index + 3] = 0;
        modifiedPixels += 1;
      }
    }
  }

  await sharp(data, {
    raw: {
      width: info.width,
      height: info.height,
      channels: info.channels,
    },
  })
    .png()
    .toFile(filePath);

  return modifiedPixels;
}

async function collectPngFiles(directory) {
  const entries = await fs.readdir(directory, { withFileTypes: true });
  const nested = await Promise.all(
    entries.map(async (entry) => {
      const entryPath = path.join(directory, entry.name);
      if (entry.isDirectory()) {
        return collectPngFiles(entryPath);
      }
      if (entry.isFile() && path.extname(entry.name).toLowerCase() === ".png") {
        return [entryPath];
      }
      return [];
    }),
  );

  return nested.flat().sort();
}

async function main() {
  const targetArg = process.argv[2];
  const targetDirectory = path.resolve(targetArg ? targetArg : DEFAULT_ICONS_DIR);
  const pngFiles = await collectPngFiles(targetDirectory);

  if (pngFiles.length === 0) {
    console.log(`No PNG files found in ${targetDirectory}`);
    return;
  }

  let totalModifiedPixels = 0;

  for (const filePath of pngFiles) {
    const modifiedPixels = await cleanPng(filePath);
    totalModifiedPixels += modifiedPixels;
    console.log(`${path.basename(filePath)}: ${modifiedPixels} pixels made transparent`);
  }

  console.log(
    `Done. Processed ${pngFiles.length} PNG files in ${targetDirectory}. ${totalModifiedPixels} pixels made transparent in total.`,
  );
}

main().catch((error) => {
  console.error("Failed to clean icons:", error);
  process.exitCode = 1;
});
