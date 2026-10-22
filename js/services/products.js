import { PRODUCTS_TIMEOUT_MS, PRODUCTS_URL } from "../config.js";
import { normalizeProducts } from "../../shared/products.js";

/** O catálogo é público: o navegador lê direto da API da turma (o preço é revalidado no servidor). */
export async function fetchProducts() {
    const response = await fetch(PRODUCTS_URL, {
        cache: "no-store",
        signal: AbortSignal.timeout(PRODUCTS_TIMEOUT_MS),
    });
    if (!response.ok) throw new Error(`Erro de comunicação com a API de produtos (HTTP ${response.status})`);

    const { value } = await response.json();
    return normalizeProducts(value);
}
