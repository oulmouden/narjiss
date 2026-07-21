import fs from "node:fs/promises";
import { FileBlob, SpreadsheetFile, Workbook } from "@oai/artifact-tool";

const inputPath = "C:/Users/33612/OneDrive/_Cessions_New/liste actionnaires 2026.xlsx";
const outputDir = "C:/xampp/htdocs/narjiss/outputs/feuille_presence_ago_2026";
const outputPath = `${outputDir}/feuille_presence_AGO_SA_2026.xlsx`;

function normalizeHeader(value) {
  return String(value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[\s_'’.-]/g, "")
    .toLowerCase();
}

function toNumber(value) {
  if (typeof value === "number") return value;
  const cleaned = String(value ?? "").replace(/\s/g, "").replace(",", ".");
  const number = Number(cleaned);
  return Number.isFinite(number) ? number : null;
}

await fs.mkdir(outputDir, { recursive: true });

const sourceBlob = await FileBlob.load(inputPath);
const sourceWorkbook = await SpreadsheetFile.importXlsx(sourceBlob);
const sourceSheet = sourceWorkbook.worksheets.getItemAt(0);
const used = sourceSheet.getUsedRange(true);
const values = used.values;

if (!values || values.length < 2) {
  throw new Error("Le fichier source ne contient pas de tableau lisible.");
}

const headerRowIndex = values.findIndex((row) => {
  const normalized = row.map(normalizeHeader);
  return normalized.includes("nomcedant") && normalized.includes("adresse") && normalized.includes("nombreactions");
});

if (headerRowIndex === -1) {
  throw new Error("Colonnes requises introuvables: NomCédant, Adresse, NombreActions.");
}

const headers = values[headerRowIndex].map(normalizeHeader);
const nomIndex = headers.indexOf("nomcedant");
const adresseIndex = headers.indexOf("adresse");
const actionsIndex = headers.indexOf("nombreactions");

const shareholders = values
  .slice(headerRowIndex + 1)
  .map((row) => ({
    nom: String(row[nomIndex] ?? "").trim(),
    adresse: String(row[adresseIndex] ?? "").trim(),
    actions: toNumber(row[actionsIndex]),
  }))
  .filter((item) => item.nom || item.adresse || item.actions !== null);

const workbook = Workbook.create();
const sheet = workbook.worksheets.add("Feuille de presence");
sheet.showGridLines = false;

sheet.getRange("A1:E1").merge();
sheet.getRange("A1").values = [["FEUILLE DE PRÉSENCE - ASSEMBLÉE GÉNÉRALE ORDINAIRE"]];
sheet.getRange("A2:E2").merge();
sheet.getRange("A2").values = [["Société Anonyme - Exercice 2026"]];
sheet.getRange("A4:E4").values = [[
  "N°",
  "ASSOCIÉS",
  "NOMBRE D’ACTIONS",
  "VOIX",
  "NOM DU MANDATAIRE ÉVENTUEL - SIGNATURE",
]];

const body = shareholders.map((item, index) => [
  index + 1,
  [item.nom, item.adresse].filter(Boolean).join("\n"),
  item.actions,
  "",
  "",
]);

if (body.length > 0) {
  sheet.getRangeByIndexes(4, 0, body.length, 5).values = body;
}

const totalRow = 5 + body.length;
sheet.getRange(`A${totalRow}:B${totalRow}`).merge();
sheet.getRange(`A${totalRow}:E${totalRow}`).values = [["TOTAL", null, body.length ? `=SUM(C5:C${totalRow - 1})` : 0, "", ""]];

sheet.getRange("A1:E2").format = {
  font: { bold: true, color: "#1F2937" },
  fill: "#F3F4F6",
};
sheet.getRange("A1").format.font.size = 15;
sheet.getRange("A2").format.font.size = 11;
sheet.getRange("A1:E2").format.horizontalAlignment = "center";
sheet.getRange("A1:E2").format.verticalAlignment = "center";

sheet.getRange("A4:E4").format = {
  fill: "#D9E2F3",
  font: { bold: true, color: "#111827" },
  borders: { preset: "all", style: "thin", color: "#6B7280" },
};
sheet.getRange("A4:E4").format.horizontalAlignment = "center";
sheet.getRange("A4:E4").format.verticalAlignment = "center";
sheet.getRange("A4:E4").format.wrapText = true;

if (body.length > 0) {
  const tableRange = sheet.getRange(`A5:E${totalRow - 1}`);
  tableRange.format.borders = { preset: "all", style: "thin", color: "#9CA3AF" };
  tableRange.format.verticalAlignment = "center";
  tableRange.format.wrapText = true;
  sheet.getRange(`A5:A${totalRow - 1}`).format.horizontalAlignment = "center";
  sheet.getRange(`C5:D${totalRow - 1}`).format.horizontalAlignment = "center";
  sheet.getRange(`C5:C${totalRow - 1}`).format.numberFormat = "#,##0";
}

sheet.getRange(`A${totalRow}:E${totalRow}`).format = {
  fill: "#F9FAFB",
  font: { bold: true, color: "#111827" },
  borders: { preset: "all", style: "medium", color: "#6B7280" },
};
sheet.getRange(`C${totalRow}`).format.numberFormat = "#,##0";
sheet.getRange(`A${totalRow}:E${totalRow}`).format.verticalAlignment = "center";

sheet.getRange("A:A").format.columnWidth = 8;
sheet.getRange("B:B").format.columnWidth = 42;
sheet.getRange("C:C").format.columnWidth = 18;
sheet.getRange("D:D").format.columnWidth = 12;
sheet.getRange("E:E").format.columnWidth = 44;
sheet.getRange("A1:E2").format.rowHeight = 28;
sheet.getRange("A4:E4").format.rowHeight = 36;
if (body.length > 0) {
  sheet.getRange(`A5:E${totalRow - 1}`).format.rowHeight = 56;
}
sheet.getRange(`A${totalRow}:E${totalRow}`).format.rowHeight = 24;

sheet.freezePanes.freezeRows(4);

const inspect = await workbook.inspect({
  kind: "table",
  range: `A1:E${Math.min(totalRow, 20)}`,
  include: "values,formulas",
  tableMaxRows: 20,
  tableMaxCols: 5,
});
console.log(inspect.ndjson);

const errors = await workbook.inspect({
  kind: "match",
  searchTerm: "#REF!|#DIV/0!|#VALUE!|#NAME\\?|#N/A",
  options: { useRegex: true, maxResults: 100 },
  summary: "final formula error scan",
});
console.log(errors.ndjson);

const preview = await workbook.render({
  sheetName: "Feuille de presence",
  range: `A1:E${Math.min(totalRow, 25)}`,
  scale: 1,
  format: "png",
});
await fs.writeFile(`${outputDir}/feuille_presence_preview.png`, new Uint8Array(await preview.arrayBuffer()));

const output = await SpreadsheetFile.exportXlsx(workbook);
await output.save(outputPath);
console.log(JSON.stringify({ outputPath, rowCount: shareholders.length, totalRow }));
