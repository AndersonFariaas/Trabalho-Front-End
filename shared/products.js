/**
 * Regras de produto compartilhadas entre o navegador e as funções da Vercel.
 * Mantê-las num único arquivo garante que o preço exibido é o mesmo cobrado.
 *
 * @typedef {object} Product
 * @property {string} id          Identificador estável (chave do produto na API).
 * @property {string} nome
 * @property {number} preco       Preço de referência em reais.
 * @property {number | null} precoMoedas  Preço em moedas; null quando não pode ser vendido.
 * @property {string} imagem
 * @property {number} categoria
 */

export const DEFAULT_CATEGORY = 1;

/**
 * Preço em moedas: usa `preco_moedas` (ou `moedas`) quando o produto tiver;
 * senão, converte 1 moeda = R$ 1, arredondando para cima.
 *
 * @param {Record<string, unknown>} data
 * @returns {number | null}
 */
export function coinPriceOf(data) {
    const raw = data.preco_moedas ?? data.moedas ?? data.preco;
    if (raw === null || raw === undefined || raw === "") return null; // Number(null) seria 0: produto grátis

    const price = Math.ceil(Number(raw));
    return Number.isSafeInteger(price) && price >= 0 ? price : null;
}

/**
 * @param {unknown} item
 * @param {string} [fallbackId] Chave do produto quando a API usa o formato de objeto.
 * @returns {Product | null}
 */
export function toProduct(item, fallbackId) {
    if (!item || typeof item !== "object" || Array.isArray(item)) return null;

    const data = /** @type {Record<string, any>} */ (item);
    const nome = String(data.nome || fallbackId || "").trim();
    const id = String(data.id ?? data.codigo ?? fallbackId ?? nome).trim();
    if (!id || !nome) return null;

    return {
        id,
        nome,
        preco: Number(data.preco) || 0,
        precoMoedas: coinPriceOf(data),
        imagem: typeof data.imagem === "string" ? data.imagem : "",
        categoria: Number(data.categoria) || DEFAULT_CATEGORY,
    };
}

/**
 * Converte o formato da API ({ "NOME": { preco, imagem, categoria } }, array ou JSON em texto)
 * em uma lista de produtos válidos.
 *
 * @param {unknown} value
 * @returns {Product[]}
 */
export function normalizeProducts(value) {
    let parsed = value;
    if (typeof parsed === "string") {
        try {
            parsed = JSON.parse(parsed);
        } catch {
            return [];
        }
    }

    const products = Array.isArray(parsed)
        ? parsed.map((item) => toProduct(item))
        : Object.entries(parsed ?? {}).map(([key, item]) => toProduct(item, key));

    return products.filter((product) => product !== null);
}
