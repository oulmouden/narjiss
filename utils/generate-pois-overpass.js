const fs = require("fs");
const path = require("path");
const https = require("https");
const vm = require("vm");

const ROOT = path.resolve(__dirname, "..");
const LANGS = ["fr", "en", "ar", "es"];
const RADIUS = Number(process.argv[2] || 1500);
const TARGET = process.argv[3] || "all";
const ENDPOINTS = [
  { hostname: "overpass-api.de", path: "/api/interpreter" },
  { hostname: "overpass.kumi.systems", path: "/api/interpreter" },
  { hostname: "overpass.openstreetmap.ru", path: "/api/interpreter" }
];

const CATEGORY_RULES = [
  { cat: "pharmacie", emoji: "💊", selectors: ['nwr["amenity"="pharmacy"]'] },
  { cat: "magasin", emoji: "🛒", selectors: ['nwr["shop"="supermarket"]', 'nwr["shop"="convenience"]', 'nwr["shop"="grocery"]', 'nwr["shop"="mall"]'] },
  { cat: "mosquee", emoji: "🕌", selectors: ['nwr["amenity"="place_of_worship"]["religion"="muslim"]'] },
  { cat: "cafe", emoji: "☕", selectors: ['nwr["amenity"="cafe"]', 'nwr["amenity"="restaurant"]', 'nwr["amenity"="fast_food"]'] },
  { cat: "banque", emoji: "🏦", selectors: ['nwr["amenity"="bank"]', 'nwr["amenity"="atm"]'] },
  { cat: "sante", emoji: "🏥", selectors: ['nwr["amenity"="hospital"]', 'nwr["amenity"="clinic"]', 'nwr["amenity"="doctors"]', 'nwr["amenity"="dentist"]'] },
  { cat: "ecole", emoji: "🎓", selectors: ['nwr["amenity"="school"]', 'nwr["amenity"="kindergarten"]', 'nwr["amenity"="college"]', 'nwr["amenity"="university"]'] },
  { cat: "admin", emoji: "🏛️", selectors: ['nwr["amenity"="police"]', 'nwr["amenity"="post_office"]', 'nwr["amenity"="townhall"]'] },
  { cat: "loisir", emoji: "🌿", selectors: ['nwr["leisure"="park"]', 'nwr["leisure"="pitch"]', 'nwr["leisure"="sports_centre"]'] },
  { cat: "transport", emoji: "🚌", selectors: ['nwr["highway"="bus_stop"]', 'nwr["amenity"="bus_station"]', 'nwr["railway"="station"]'] }
];

function loadProjects() {
  const menuJs = fs.readFileSync(path.join(ROOT, "shared", "menu.js"), "utf8");
  const context = {};
  vm.createContext(context);
  vm.runInContext(menuJs, context);
  return context.PROJECTS;
}

function csvEscape(value) {
  const text = String(value == null ? "" : value).replace(/\r?\n/g, " ").trim();
  return /[;"\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

function localized(value, lang) {
  if (!value) return "";
  return value[lang] || value.fr || value.en || "";
}

function outputBase(project) {
  if (project.detail_url) {
    const clean = project.detail_url.split("#")[0].split("?")[0];
    const parts = clean.split("/");
    if (parts.length >= 2) {
      return {
        folder: parts[0],
        slug: parts[1].replace(/\.html$/i, "")
      };
    }
  }
  return { folder: project.folder, slug: project.folder };
}

function buildQuery(project) {
  const blocks = [];
  CATEGORY_RULES.forEach((rule) => {
    rule.selectors.forEach((selector) => {
      blocks.push(`${selector}(around:${RADIUS},${project.lat},${project.lng});`);
    });
  });
  return `[out:json][timeout:60];\n(\n${blocks.map((line) => `  ${line}`).join("\n")}\n);\nout center tags;`;
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function postOverpass(query, endpoint) {
  const body = `data=${encodeURIComponent(query)}`;
  const options = {
    hostname: endpoint.hostname,
    path: endpoint.path,
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      "Content-Length": Buffer.byteLength(body),
      "User-Agent": "Narjiss-XAMPP-POI-generator/1.0"
    },
    timeout: 90000
  };

  return new Promise((resolve, reject) => {
    const req = https.request(options, (res) => {
      let data = "";
      res.setEncoding("utf8");
      res.on("data", (chunk) => data += chunk);
      res.on("end", () => {
        if (res.statusCode < 200 || res.statusCode >= 300) {
          reject(new Error(`Overpass HTTP ${res.statusCode}: ${data.slice(0, 300)}`));
          return;
        }
        try {
          resolve(JSON.parse(data));
        } catch (error) {
          reject(error);
        }
      });
    });
    req.on("error", reject);
    req.on("timeout", () => {
      req.destroy(new Error("Overpass timeout"));
    });
    req.write(body);
    req.end();
  });
}

async function fetchOverpass(query) {
  let lastError = null;
  for (let attempt = 0; attempt < 3; attempt++) {
    for (const endpoint of ENDPOINTS) {
      try {
        return await postOverpass(query, endpoint);
      } catch (error) {
        lastError = error;
        if (!/HTTP 429|HTTP 502|HTTP 503|HTTP 504|timeout|ECONNRESET|EAI_AGAIN|ETIMEDOUT/i.test(error.message)) {
          throw error;
        }
        await sleep(4000 + attempt * 4000);
      }
    }
  }
  throw lastError || new Error("Overpass unavailable");
}

function elementLatLng(element) {
  if (typeof element.lat === "number" && typeof element.lon === "number") {
    return { lat: element.lat, lng: element.lon };
  }
  if (element.center && typeof element.center.lat === "number" && typeof element.center.lon === "number") {
    return { lat: element.center.lat, lng: element.center.lon };
  }
  return null;
}

function categoryFor(tags) {
  for (const rule of CATEGORY_RULES) {
    if (rule.cat === "pharmacie" && tags.amenity === "pharmacy") return rule;
    if (rule.cat === "magasin" && ["supermarket", "convenience", "grocery", "mall"].includes(tags.shop)) return rule;
    if (rule.cat === "mosquee" && tags.amenity === "place_of_worship" && tags.religion === "muslim") return rule;
    if (rule.cat === "cafe" && ["cafe", "restaurant", "fast_food"].includes(tags.amenity)) return rule;
    if (rule.cat === "banque" && ["bank", "atm"].includes(tags.amenity)) return rule;
    if (rule.cat === "sante" && ["hospital", "clinic", "doctors", "dentist"].includes(tags.amenity)) return rule;
    if (rule.cat === "ecole" && ["school", "kindergarten", "college", "university"].includes(tags.amenity)) return rule;
    if (rule.cat === "admin" && ["police", "post_office", "townhall"].includes(tags.amenity)) return rule;
    if (rule.cat === "loisir" && ["park", "pitch", "sports_centre"].includes(tags.leisure)) return rule;
    if (rule.cat === "transport" && (tags.highway === "bus_stop" || ["bus_station"].includes(tags.amenity) || tags.railway === "station")) return rule;
  }
  return null;
}

function normalizeElements(elements) {
  const seen = new Set();
  const rows = [];
  elements.forEach((element) => {
    const tags = element.tags || {};
    const rule = categoryFor(tags);
    const point = elementLatLng(element);
    const name = tags.name || tags["name:fr"] || tags["name:en"];
    if (!rule || !point || !name) return;

    const key = `${rule.cat}|${name.toLowerCase()}`;
    if (seen.has(key)) return;
    seen.add(key);

    const address = [
      tags["addr:street"],
      tags["addr:neighbourhood"],
      tags["addr:suburb"],
      tags["addr:city"]
    ].filter(Boolean).join(", ");

    rows.push({
      cat: rule.cat,
      emoji: rule.emoji,
      name,
      address,
      lat: point.lat,
      lng: point.lng,
      phone: tags.phone || tags["contact:phone"] || "",
      hours: tags.opening_hours || ""
    });
  });
  return rows;
}

function csvFor(project, lang, pois) {
  const header = "Catégorie;Emoji;Nom;Adresse;Note;Latitude;Longitude;Nb Avis;Téléphone;Horaires / Notes";
  const home = [
    "home",
    "🏠",
    localized(project.name, lang),
    localized(project.location, lang),
    "",
    project.lat,
    project.lng,
    "",
    "",
    ""
  ].map(csvEscape).join(";");
  const rows = pois.map((poi) => [
    poi.cat,
    poi.emoji,
    poi.name,
    poi.address,
    "",
    poi.lat,
    poi.lng,
    "",
    poi.phone,
    poi.hours
  ].map(csvEscape).join(";"));
  return [header, home].concat(rows).join("\n") + "\n";
}

async function main() {
  const projects = loadProjects().filter((project) => {
    if (project.id === "jawhara") return false;
    const out = outputBase(project);
    return TARGET === "all" || project.id === TARGET || project.folder === TARGET || out.folder === TARGET || out.slug === TARGET;
  });

  for (const project of projects) {
    process.stdout.write(`Fetching ${project.id} (${project.lat}, ${project.lng})... `);
    const data = await fetchOverpass(buildQuery(project));
    const pois = normalizeElements(data.elements || []);
    const out = outputBase(project);
    const dir = path.join(ROOT, out.folder);
    fs.mkdirSync(dir, { recursive: true });
    LANGS.forEach((lang) => {
      fs.writeFileSync(path.join(dir, `${out.slug}_${lang}.csv`), csvFor(project, lang, pois), "utf8");
    });
    console.log(`${pois.length} POI`);
    await sleep(2500);
  }
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
