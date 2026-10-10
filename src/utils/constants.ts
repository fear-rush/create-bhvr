import path from "node:path";
import { fileURLToPath } from "node:url";

export const DEFAULT_REPO = "fear-rush/bhvr";

// Resolve EXTRAS_DIR relative to this file's location
// We need to handle both development and production cases:
// - Development: running from src/ directory
// - Production: bundled into dist/index.js
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Bundling places this module in dist/index.js. Parent directory names are irrelevant.
const isProduction = path.basename(__filename) !== "constants.ts";
const templatesPath = isProduction
	? path.resolve(__dirname, "templates", "extras") // dist/index.js -> dist/templates/extras
	: path.resolve(__dirname, "..", "templates", "extras"); // src/utils -> src/templates/extras

export const EXTRAS_DIR = templatesPath;
export const BASE_DIR = path.resolve(EXTRAS_DIR, "..", "base");
export const ADDONS_DIR = path.resolve(EXTRAS_DIR, "..", "addons");
