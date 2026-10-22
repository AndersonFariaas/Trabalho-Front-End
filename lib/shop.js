import { HttpError } from "./http.js";
import { MAX_QUANTITY_PER_PRODUCT } from "./schemas.js";

/**
 * Regras puras da loja (sem rede): fáceis de testar e de reaproveitar.
 *
 * @typedef {{ id: string, quantidade: number }} CartItem
 * @typedef {{ id: string, nome: string, quantidade: number, preco_moedas: number }} InventoryItem
 */

/**
 * Soma linhas repetidas do mesmo produto, respeitando o limite por produto.
 *
 * @param {CartItem[]} items
 * @returns {CartItem[]}
 */
export function mergeCartItems(items) {
    const quantities = new Map();
    for (const { id, quantidade } of items) {
        const total = (quantities.get(id) ?? 0) + quantidade;
        if (total > MAX_QUANTITY_PER_PRODUCT) {
            throw new HttpError(400, `O limite é ${MAX_QUANTITY_PER_PRODUCT} unidades por produto.`);
        }
        quantities.set(id, total);
    }
    return [...quantities].map(([id, quantidade]) => ({ id, quantidade }));
}

/**
 * Calcula o total com os preços do catálogo do servidor, nunca com valores do navegador.
 *
 * @param {CartItem[]} items
 * @param {Map<string, import("../shared/products.js").Product>} catalog
 * @returns {{ lines: InventoryItem[], total: number }}
 */
export function priceCart(items, catalog) {
    let total = 0;
    const lines = items.map(({ id, quantidade }) => {
        const product = catalog.get(id);
        if (!product) throw new HttpError(409, "Um produto do carrinho não está mais disponível.");
        if (product.precoMoedas === null) {
            throw new HttpError(409, `O produto "${product.nome}" está sem preço em moedas.`);
        }
        total += product.precoMoedas * quantidade;
        return { id, nome: product.nome, quantidade, preco_moedas: product.precoMoedas };
    });

    if (!Number.isSafeInteger(total)) throw new HttpError(400, "O total da compra excede o limite permitido.");
    return { lines, total };
}

/**
 * Lê o inventário salvo no cadastro, descartando entradas malformadas.
 *
 * @param {unknown} inventory
 * @returns {InventoryItem[]}
 */
export function normalizeInventory(inventory) {
    if (!Array.isArray(inventory)) return [];
    return inventory
        .filter((item) => item && typeof item.id === "string" && Number(item.quantidade) > 0)
        .map((item) => ({
            id: item.id,
            nome: String(item.nome ?? item.id),
            quantidade: Number(item.quantidade),
            preco_moedas: Number(item.preco_moedas) || 0,
        }));
}

/**
 * Soma os itens comprados ao inventário, sem alterar o array original.
 *
 * @param {unknown} inventory
 * @param {InventoryItem[]} lines
 * @returns {InventoryItem[]}
 */
export function addToInventory(inventory, lines) {
    const updated = normalizeInventory(inventory);
    for (const line of lines) {
        const owned = updated.find((item) => item.id === line.id);
        if (owned) {
            owned.quantidade += line.quantidade;
            owned.preco_moedas = line.preco_moedas;
        } else {
            updated.push({ ...line });
        }
    }
    return updated;
}
