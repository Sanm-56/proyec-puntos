import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const html = fs.readFileSync(path.join(root, "index.html"), "utf8");
const variantsSource = fs.readFileSync(path.join(root, "js/products/variants.js"), "utf8");
const prefixes = { bebidas: "BEB", pasabocas: "PAS", dulceria: "DUL", galletas: "GAL", hogar: "HOG" };
const unavailable = new Set((variantsSource.match(/outOfStockReferences = new Set\(\[([^\]]*)\]\)/)?.[1].match(/"([^"]+)"/g) || []).map(value => value.slice(1, -1)));
const entries = [];
const normalByReference = new Map();
const sectionPattern = /<section[^>]+id="(bebidas|pasabocas|dulceria|galletas|hogar)"[\s\S]*?<\/section>/g;
let section;
while ((section = sectionPattern.exec(html))) {
    const category = section[1];
    const productPattern = /<div class="producto[^"]*">([\s\S]*?)<\/div>/g;
    let product;
    while ((product = productPattern.exec(section[0]))) {
        const button = product[1].match(/data-codigo="([A-Z]{3}-\d{3})" data-nombre="([^"]+)" data-precio="(\d+)"/);
        if (!button) continue;
        const displayName = product[1].match(/<h[34]>([^<]+)<\/h[34]>/)?.[1].trim() || button[2];
        const entry = { code: button[1], reference: button[2], display_name: displayName, category, unit_price: Number(button[3]), active: true, available: !unavailable.has(button[2]) };
        entries.push(entry); normalByReference.set(entry.reference, entry);
    }
}
const galleryPattern = /\{ products: \["([^"]+)"\], flavors: \[([\s\S]*?)\] \}/g;
let gallery;
while ((gallery = galleryPattern.exec(variantsSource))) {
    const parent = normalByReference.get(gallery[1]);
    if (!parent) throw new Error(`Variant family has no normal product: ${gallery[1]}`);
    const flavorPattern = /\["([^"]+)",\s*"[^"]+",\s*"([^"]+)",\s*"([A-Z]{3}-\d{3})"\]/g;
    let flavor;
    while ((flavor = flavorPattern.exec(gallery[2]))) {
        if (flavor[2] === parent.reference) continue;
        entries.push({ code: flavor[3], reference: flavor[2], display_name: `${parent.display_name} - ${flavor[1]}`, category: parent.category, unit_price: parent.unit_price, active: true, available: !unavailable.has(flavor[2]) });
    }
}
entries.sort((a, b) => a.code.localeCompare(b.code));
const codes = new Set(), references = new Set();
for (const entry of entries) {
    if (!/^[A-Z]{3}-\d{3}$/.test(entry.code) || prefixes[entry.category] !== entry.code.slice(0, 3)) throw new Error(`Invalid code/category: ${entry.code}`);
    if (!entry.reference || !entry.display_name || !Number.isInteger(entry.unit_price) || entry.unit_price <= 0 || typeof entry.active !== "boolean" || typeof entry.available !== "boolean") throw new Error(`Invalid entry: ${entry.code}`);
    if (codes.has(entry.code) || references.has(entry.reference)) throw new Error(`Duplicate identity: ${entry.code}/${entry.reference}`);
    codes.add(entry.code); references.add(entry.reference);
}
if (entries.length !== 109) throw new Error(`Expected 109 entries, found ${entries.length}`);
const sqlValue = value => `'${String(value).replace(/'/g, "''")}'`;
const sql = `insert into public.catalog_products\n  (code, reference, display_name, category, unit_price, active, available)\nvalues\n${entries.map(entry => `  (${sqlValue(entry.code)}, ${sqlValue(entry.reference)}, ${sqlValue(entry.display_name)}, ${sqlValue(entry.category)}, ${entry.unit_price}, ${entry.active}, ${entry.available})`).join(",\n")}\n;\n`;
const seeds = path.join(root, "supabase", "seeds");
fs.mkdirSync(seeds, { recursive: true });
fs.writeFileSync(path.join(seeds, "f31_catalog_products.json"), `${JSON.stringify(entries, null, 2)}\n`);
fs.writeFileSync(path.join(seeds, "f31_catalog_products.sql"), sql);
console.log(JSON.stringify({ total: entries.length, categories: Object.fromEntries(Object.keys(prefixes).map(category => [category, entries.filter(entry => entry.category === category).length])), available: entries.filter(entry => entry.available).length, unavailable: entries.filter(entry => !entry.available).length }, null, 2));
