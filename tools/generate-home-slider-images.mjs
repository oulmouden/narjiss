import { readdir, writeFile } from "node:fs/promises";
import { extname, join, relative, sep } from "node:path";

const ROOT = "images/slider";
const OUTPUT = "data/home-slider-images.json";
const EXTENSIONS = new Set([".jpg", ".jpeg", ".png", ".webp"]);

async function collectRootImages(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const images = [];

  for (const entry of entries) {
    const fullPath = join(directory, entry.name);
    if (!entry.isFile()) continue;
    if (!EXTENSIONS.has(extname(entry.name).toLowerCase())) continue;

    images.push(relative(".", fullPath).split(sep).join("/"));
  }

  return images;
}

const images = (await collectRootImages(ROOT)).sort((a, b) =>
  a.localeCompare(b, "fr", { numeric: true, sensitivity: "base" }),
);

await writeFile(OUTPUT, `${JSON.stringify(images, null, 2)}\n`, "utf8");
console.log(`Generated ${OUTPUT} with ${images.length} images.`);
