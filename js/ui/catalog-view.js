import { MESSAGES, TOTAL_CATEGORIES } from "../config.js";
import { createElement, createProductImage, createStateMessage } from "../dom.js";
import { formatCoins, formatPrice } from "../format.js";
import { DEFAULT_CATEGORY } from "../../shared/products.js";

const gridFor = (categoryId) => document.getElementById(`grid-${categoryId}`);

/** @param {import("../../shared/products.js").Product} product */
function createProductCard(product) {
    const addButton = createElement("button", {
        className: "btn btn--primary btn--sm btn--block",
        text: "Adicionar ao carrinho",
        attrs: { type: "button", "aria-label": `Adicionar ${product.nome} ao carrinho` },
    });
    addButton.dataset.addToCart = product.id;

    return createElement("article", { className: "product-card" }, [
        createElement("div", { className: "product-card__media" }, [createProductImage(product.imagem, product.nome)]),
        createElement("div", { className: "product-card__body" }, [
            createElement("h4", { className: "product-card__title", text: product.nome }),
            createElement("p", { className: "product-card__price", text: formatPrice(product.preco) }),
            createElement("p", {
                className: "product-card__coin-price",
                text: product.precoMoedas === null ? "Moedas: preço indisponível" : formatCoins(product.precoMoedas),
            }),
            addButton,
        ]),
    ]);
}

/** Distribui os cartões nos modais de categoria; categoria desconhecida vai para a padrão. */
export function renderProducts(products) {
    // reduce em vez de Map.groupBy: este só existe a partir do iOS 17.4
    const cardsByCategory = products.reduce((groups, product) => {
        const categoryId = gridFor(product.categoria) ? product.categoria : DEFAULT_CATEGORY;
        groups.set(categoryId, [...(groups.get(categoryId) ?? []), createProductCard(product)]);
        return groups;
    }, new Map());

    for (let id = 1; id <= TOTAL_CATEGORIES; id++) {
        const cards = cardsByCategory.get(id) ?? [createStateMessage(MESSAGES.emptyCategory)];
        gridFor(id)?.replaceChildren(...cards);
    }
}

/** Exibe a mensagem só nas categorias que ainda não têm produtos carregados. */
export function showMessageInEmptyGrids(message) {
    for (let id = 1; id <= TOTAL_CATEGORIES; id++) {
        const grid = gridFor(id);
        if (grid && !grid.querySelector(".product-card")) grid.replaceChildren(createStateMessage(message));
    }
}
