import sharp from "sharp";
import { readFile } from "node:fs/promises";
const svg = await readFile(new URL("../public/favicon.svg", import.meta.url));
for (const [name, size] of [
  ["icon-192.png", 192],
  ["icon-512.png", 512],
  ["apple-touch-icon.png", 180],
  ["icon-maskable-512.png", 512],
]) {
  await sharp(svg)
    .resize(size, size)
    .png()
    .toFile(new URL(`../public/${name}`, import.meta.url).pathname);
}
