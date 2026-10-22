import { readFileSync } from "node:fs";
import { dirname, join, normalize, relative } from "node:path";
import { describe, expect, it } from "vitest";

const ROOT = join(import.meta.dirname, "..");

/** Todos os módulos alcançáveis a partir de js/main.js (caminhos relativos à raiz). */
function moduleGraph(entry, found = new Set()) {
    if (found.has(entry)) return found;
    found.add(entry);
    const source = readFileSync(join(ROOT, entry), "utf8");
    for (const [, specifier] of source.matchAll(/^import [^;]*? from "(\.[^"]+)";/gms)) {
        const resolved = relative(ROOT, normalize(join(ROOT, dirname(entry), specifier))).replaceAll("\\", "/");
        moduleGraph(resolved, found);
    }
    return found;
}

describe("index.html", () => {
    it("pré-carrega exatamente os módulos que o site importa", () => {
        const html = readFileSync(join(ROOT, "index.html"), "utf8");
        const preloaded = [...html.matchAll(/<link rel="modulepreload" href="([^"]+)"/g)].map(([, href]) => href);
        const imported = [...moduleGraph("js/main.js")].filter((path) => path !== "js/main.js");

        expect(preloaded.sort()).toEqual(imported.sort());
    });
});
