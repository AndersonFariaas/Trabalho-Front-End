import { MAX_QUANTITY_PER_PRODUCT, STORAGE_KEYS } from "../config.js";
import { storage } from "../storage.js";

/**
 * Carrinho como funções puras sobre uma lista imutável; a persistência fica separada.
 *
 * @typedef {{ id: string, quantity: number }} CartEntry
 * @typedef {CartEntry & { product: import("../../shared/products.js").Product }} CartLine
 */

const storageKey = (studentId) => `${STORAGE_KEYS.cartPrefix}${encodeURIComponent(studentId)}`;
const clampQuantity = (value) => Math.max(1, Math.min(MAX_QUANTITY_PER_PRODUCT, Number(value) || 1));

/** @returns {CartEntry[]} */
export function loadCart(studentId) {
    const saved = storage.read(storageKey(studentId), []);
    if (!Array.isArray(saved)) return [];
    return saved
        .filter((entry) => entry && typeof entry.id === "string")
        .map((entry) => ({ id: entry.id, quantity: clampQuantity(entry.quantity) }));
}

/** @param {CartEntry[]} cart */
export function saveCart(studentId, cart) {
    storage.write(storageKey(studentId), cart);
}

/** @param {CartEntry[]} cart */
export function quantityOf(cart, productId) {
    return cart.find((entry) => entry.id === productId)?.quantity ?? 0;
}

/** @param {CartEntry[]} cart @returns {CartEntry[]} */
export function addItem(cart, productId) {
    if (quantityOf(cart, productId) === 0) return [...cart, { id: productId, quantity: 1 }];
    return changeQuantity(cart, productId, 1);
}

/** Remove a linha quando a quantidade chega a zero. @returns {CartEntry[]} */
export function changeQuantity(cart, productId, delta) {
    return cart
        .map((entry) =>
            entry.id === productId
                ? { ...entry, quantity: Math.min(MAX_QUANTITY_PER_PRODUCT, entry.quantity + delta) }
                : entry,
        )
        .filter((entry) => entry.quantity > 0);
}

/** @returns {CartEntry[]} */
export function removeItem(cart, productId) {
    return cart.filter((entry) => entry.id !== productId);
}

/**
 * Junta o carrinho ao catálogo atual, descartando produtos que saíram da loja.
 *
 * @param {CartEntry[]} cart
 * @param {Map<string, import("../../shared/products.js").Product>} productsById
 * @returns {CartLine[]}
 */
export function toCartLines(cart, productsById) {
    return cart
        .map((entry) => ({ ...entry, product: productsById.get(entry.id) }))
        .filter((line) => line.product !== undefined);
}

/** @param {CartLine[]} lines */
export function countItems(lines) {
    return lines.reduce((sum, line) => sum + line.quantity, 0);
}

/** Total em moedas; null se algum produto não tiver preço em moedas. @param {CartLine[]} lines */
export function coinTotal(lines) {
    if (lines.some((line) => line.product.precoMoedas === null)) return null;
    return lines.reduce((sum, line) => sum + line.product.precoMoedas * line.quantity, 0);
}
