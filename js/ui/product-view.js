import { $, createElement, createIcon, createProductImage } from "../dom.js";
import { formatCoins } from "../format.js";
import { accountStore } from "../features/account.js";
import { openModal } from "./modal.js";
import { showToast } from "./toast.js";

const PRODUCT_MODAL = "produto-modal";
const content = $("#produto-conteudo");

// O nome da categoria vem do título do modal dela no HTML (fonte única dos nomes)
const categoryName = (categoryId) => $(`#modal-${categoryId}-title`)?.textContent.trim() ?? "";

/** @param {import("../../shared/products.js").Product} product */
function renderProduct(product) {
    const addButton = createElement("button", {
        className: "btn btn--primary btn--lg btn--block",
        attrs: { type: "button" },
    });
    addButton.append(createIcon("cart"), "Adicionar ao carrinho");
    addButton.dataset.addToCart = product.id; // tratado pela delegação da conta (account-view)

    content.replaceChildren(
        createElement("div", { className: "product-detail__media" }, [
            createProductImage(product.imagem, product.nome, "product-detail__image"),
        ]),
        createElement("div", { className: "product-detail__info" }, [
            createElement("p", { className: "eyebrow", text: categoryName(product.categoria) }),
            createElement("h3", {
                className: "product-detail__title",
                text: product.nome,
                attrs: { id: "produto-title" },
            }),
            createElement("p", { className: "product-detail__coins" }, [
                createIcon("coin"),
                product.precoMoedas === null ? "Preço indisponível" : formatCoins(product.precoMoedas),
            ]),
            addButton,
        ]),
    );
}

/** Abre o detalhe do produto clicado (sem passar pela aba da categoria). */
export function openProductDetail(productId) {
    const product = accountStore.getState().products.get(productId);
    if (!product) {
        showToast("Este produto não está disponível no momento.");
        return;
    }
    renderProduct(product);
    openModal(PRODUCT_MODAL);
}
