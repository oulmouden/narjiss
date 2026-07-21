import { createHash } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import http from "node:http";
import https from "node:https";
import { extname, join } from "node:path";

const START_URL = "https://narjissimmobiliere.com/";
const OUT_DIR = "old-site-images";
const MAX_PAGES = 500;

const imageExtensions = new Set([
  ".avif",
  ".bmp",
  ".gif",
  ".ico",
  ".jpeg",
  ".jpg",
  ".png",
  ".svg",
  ".webp",
]);

const visitedPages = new Set();
const queuedPages = [new URL(START_URL)];
const imageUrls = new Map();
const dataImages = [];
const dataImageHashes = new Set();

function normalizeUrl(value, baseUrl) {
  if (!value) return null;
  const trimmed = value.trim().replace(/^['"]|['"]$/g, "");
  if (!trimmed || /^(mailto|tel|javascript):/i.test(trimmed)) return null;
  try {
    const url = new URL(trimmed, baseUrl);
    url.hash = "";
    return url;
  } catch {
    return null;
  }
}

function isSameSite(url) {
  return url.hostname.replace(/^www\./, "") === "narjissimmobiliere.com";
}

function isImageUrl(url) {
  return imageExtensions.has(extname(url.pathname).toLowerCase());
}

function safePathForUrl(url) {
  const cleanPath = decodeURIComponent(url.pathname)
    .replace(/^\/+/, "")
    .replace(/[<>:"|?*\\]/g, "_")
    .replace(/\.\./g, "_");
  const path = cleanPath || "index";
  if (extname(path)) return path;
  return `${path}.bin`;
}

function collectDataImage(value) {
  const match = value.match(/^data:(image\/[a-zA-Z0-9.+-]+);base64,([a-zA-Z0-9+/=]+)$/);
  if (!match) return;
  const [, mime, base64] = match;
  const hash = createHash("sha256").update(base64).digest("hex");
  if (dataImageHashes.has(hash)) return;
  dataImageHashes.add(hash);
  dataImages.push({ mime, base64 });
}

function collectCandidate(value, baseUrl) {
  if (!value) return;
  const trimmed = value.trim();
  if (trimmed.startsWith("data:image/")) {
    collectDataImage(trimmed);
    return;
  }
  const url = normalizeUrl(trimmed, baseUrl);
  if (url && isImageUrl(url)) imageUrls.set(url.href, url);
}

function collectSrcset(value, baseUrl) {
  if (!value) return;
  for (const part of value.split(",")) {
    collectCandidate(part.trim().split(/\s+/)[0], baseUrl);
  }
}

function collectFromHtml(html, baseUrl) {
  const dataImagePattern = /data:(image\/[a-zA-Z0-9.+-]+);base64,([a-zA-Z0-9+/=]+)/g;
  let match;
  while ((match = dataImagePattern.exec(html))) {
    collectDataImage(`data:${match[1]};base64,${match[2]}`);
  }

  const attrPattern = /\b(?:src|href|content|data-src|data-lazy-src|data-original)=["']([^"']+)["']/gi;
  while ((match = attrPattern.exec(html))) collectCandidate(match[1], baseUrl);

  const srcsetPattern = /\b(?:srcset|data-srcset)=["']([^"']+)["']/gi;
  while ((match = srcsetPattern.exec(html))) collectSrcset(match[1], baseUrl);

  const styleUrlPattern = /url\(([^)]+)\)/gi;
  while ((match = styleUrlPattern.exec(html))) collectCandidate(match[1], baseUrl);

  const anchorPattern = /\bhref=["']([^"']+)["']/gi;
  while ((match = anchorPattern.exec(html))) {
    const url = normalizeUrl(match[1], baseUrl);
    if (!url || !isSameSite(url) || isImageUrl(url)) continue;
    if (/\.(css|js|json|pdf|zip|rar|mp4|webm|mov|mp3|wav)$/i.test(url.pathname)) continue;
    if (!visitedPages.has(url.href) && queuedPages.length + visitedPages.size < MAX_PAGES) {
      queuedPages.push(url);
    }
  }

  const cssPattern = /\bhref=["']([^"']+\.css(?:\?[^"']*)?)["']/gi;
  while ((match = cssPattern.exec(html))) {
    const url = normalizeUrl(match[1], baseUrl);
    if (url && isSameSite(url)) queuedPages.push(url);
  }
}

function requestBuffer(url, redirects = 0) {
  return new Promise((resolve, reject) => {
    const client = url.protocol === "http:" ? http : https;
    const request = client.get(
      url,
      {
        headers: {
          "User-Agent": "Mozilla/5.0 image-extractor",
        },
      },
      (response) => {
        const status = response.statusCode || 0;
        const location = response.headers.location;
        if (status >= 300 && status < 400 && location && redirects < 10) {
          response.resume();
          resolve(requestBuffer(new URL(location, url), redirects + 1));
          return;
        }
        if (status < 200 || status >= 300) {
          response.resume();
          reject(new Error(`${status} ${response.statusMessage || ""}`.trim()));
          return;
        }
        const chunks = [];
        response.on("data", (chunk) => chunks.push(chunk));
        response.on("end", () =>
          resolve({
            contentType: response.headers["content-type"] || "",
            buffer: Buffer.concat(chunks),
          }),
        );
      },
    );
    request.on("error", reject);
    request.setTimeout(30000, () => {
      request.destroy(new Error("Request timed out"));
    });
  });
}

async function fetchText(url) {
  const { contentType, buffer } = await requestBuffer(url);
  return {
    contentType,
    text: buffer.toString("utf8"),
  };
}

async function crawl() {
  while (queuedPages.length && visitedPages.size < MAX_PAGES) {
    const pageUrl = queuedPages.shift();
    if (!pageUrl || visitedPages.has(pageUrl.href) || !isSameSite(pageUrl)) continue;
    visitedPages.add(pageUrl.href);
    try {
      const { contentType, text } = await fetchText(pageUrl);
      if (contentType.includes("text/css")) {
        const cssUrlPattern = /url\(([^)]+)\)/gi;
        let match;
        while ((match = cssUrlPattern.exec(text))) collectCandidate(match[1], pageUrl);
      } else if (contentType.includes("text/html") || !contentType) {
        collectFromHtml(text, pageUrl);
      }
      console.log(`Crawled ${pageUrl.href}`);
    } catch (error) {
      console.warn(`Skipped ${pageUrl.href}: ${error.message}`);
    }
  }
}

async function downloadImages() {
  await mkdir(OUT_DIR, { recursive: true });
  let downloaded = 0;
  let failed = 0;

  for (const url of imageUrls.values()) {
    const target = join(OUT_DIR, safePathForUrl(url));
    try {
      const { buffer: bytes } = await requestBuffer(url);
      await mkdir(join(target, ".."), { recursive: true });
      await writeFile(target, bytes);
      downloaded += 1;
      console.log(`Saved ${target}`);
    } catch (error) {
      failed += 1;
      console.warn(`Failed ${url.href}: ${error.message}`);
    }
  }

  let dataIndex = 0;
  for (const dataImage of dataImages) {
    const extension = dataImage.mime.split("/")[1].replace("svg+xml", "svg");
    const target = join(OUT_DIR, `embedded-${String(++dataIndex).padStart(3, "0")}.${extension}`);
    await writeFile(target, Buffer.from(dataImage.base64, "base64"));
    downloaded += 1;
    console.log(`Saved ${target}`);
  }

  return { downloaded, failed };
}

await crawl();
const result = await downloadImages();
console.log(
  JSON.stringify(
    {
      pagesCrawled: visitedPages.size,
      remoteImagesFound: imageUrls.size,
      embeddedImagesFound: dataImages.length,
      ...result,
      outputDirectory: OUT_DIR,
    },
    null,
    2,
  ),
);
