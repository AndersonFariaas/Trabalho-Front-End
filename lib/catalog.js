import { normalizeProducts } from "../shared/products.js";
import { HttpError } from "./http.js";
import { readKey } from "./storage-api.js";

const PRODUCTS_KEY = "produtos";

/**
 * Catálogo oficial lido no servidor, indexado pelo mesmo id usado no navegador.
 *
 * @returns {Promise<Map<string, import("../shared/products.js").Product>>}
 */
export async function getCatalog() {
    const products = normalizeProducts(await readKey(PRODUCTS_KEY));
    if (products.length === 0) throw new HttpError(502, "O catálogo de produtos da turma está indisponível.");
    return new Map(products.map((product) => [product.id, product]));
}
