import { $, createButton, createElement, createIcon } from "../dom.js";
import { formatCoins } from "../format.js";
import * as Account from "../features/account.js";
import * as Cart from "../features/cart.js";
import {
    coinsLabel,
    emptyState,
    renderStudentCard,
    replaceDrawerContent,
    sectionHeading,
    sessionExpiredMessage,
    thumbnail,
} from "./drawer.js";
import { holdBalance, releaseBalance } from "./balance.js";
import { closeModal, isModalOpen, openModal } from "./modal.js";
import { openProfile } from "./profile-view.js";
import { renderPurchaseSuccess } from "./purchase-success.js";

/**
 * Painel do carrinho: nome e saldo do aluno, itens com quantidade e o resumo da compra.
 * Redesenhado a partir do estado da conta.
 */

const CART_MODAL = "carrinho-modal";
const SUCCESS_SCREEN_MS = 2400;
const BALANCE_COUNT_DELAY_MS = 300; // espera o painel do perfil terminar de entrar
const content = $("#carrinho-conteudo");

// Enquanto a tela de compra confirmada aparece, o painel não é redesenhado pelo estado
let successTimer = null;

function stepperButton(label, ariaLabel, focusKey, onClick) {
    const button = createElement("button", {
        className: "stepper__button",
        text: label,
        attrs: { type: "button", "aria-label": ariaLabel },
    });
    button.dataset.focusKey = focusKey;
    button.addEventListener("click", onClick);
    return button;
}

function removeButton(product, id) {
    const button = createElement("button", {
        className: "icon-btn icon-btn--sm",
        attrs: { type: "button", "aria-label": `Remover ${product.nome} do carrinho` },
    });
    button.append(createIcon("trash"));
    button.dataset.focusKey = `remover-${id}`;
    button.addEventListener("click", () => Account.removeFromCart(id));
    return button;
}

/** @param {import("../features/cart.js").CartLine} line */
function renderLine({ id, quantity, product }) {
    const unitPrice = product.precoMoedas === null ? "Sem preço em moedas" : formatCoins(product.precoMoedas);
    return createElement("li", { className: "line" }, [
        thumbnail(product),
        createElement("div", { className: "line__info" }, [
            createElement("strong", { className: "line__title", text: product.nome }),
            createElement("span", {
                className: "line__meta",
                text: `${unitPrice} por unidade`,
            }),
        ]),
        createElement("div", { className: "stepper" }, [
            stepperButton("−", `Diminuir quantidade de ${product.nome}`, `menos-${id}`, () =>
                Account.changeQuantity(id, -1),
            ),
            createElement("span", {
                className: "stepper__value",
                text: String(quantity),
                attrs: { "aria-live": "polite" },
            }),
            stepperButton("+", `Aumentar quantidade de ${product.nome}`, `mais-${id}`, () =>
                Account.changeQuantity(id, 1),
            ),
        ]),
        removeButton(product, id),
    ]);
}

function checkoutHint({ hasMissingPrice, isInsufficient }) {
    if (hasMissingPrice) return "A API de produtos precisa informar o preço de cada item em moedas.";
    if (isInsufficient) return "Seu saldo é insuficiente para este carrinho.";
    return "A confirmação do saldo e o débito são feitos no banco da turma.";
}

/** Sai da tela de confirmação; com goToProfile, abre o inventário com os itens novos em destaque. */
function finishSuccessScreen(purchased, { goToProfile }) {
    clearTimeout(successTimer);
    successTimer = null;
    if (goToProfile) {
        closeModal(CART_MODAL);
        openProfile({ highlight: new Map(purchased.map(({ id, quantity }) => [id, quantity])) });
        setTimeout(releaseBalance, BALANCE_COUNT_DELAY_MS);
        return;
    }
    releaseBalance();
}

function showSuccessScreen(purchased) {
    content.replaceChildren(
        renderPurchaseSuccess({
            itemCount: Cart.countItems(purchased),
            total: Cart.coinTotal(purchased),
            durationMs: SUCCESS_SCREEN_MS,
        }),
    );
    successTimer = setTimeout(() => finishSuccessScreen(purchased, { goToProfile: true }), SUCCESS_SCREEN_MS);
    // Fechou o painel antes do tempo: o saldo conta no topo e o inventário não abre sozinho
    $(`#${CART_MODAL}`).addEventListener(
        "close",
        () => {
            if (successTimer) finishSuccessScreen(purchased, { goToProfile: false });
        },
        { once: true },
    );
}

async function handleCheckout() {
    const { cart, products } = Account.accountStore.getState();
    const purchased = Cart.toCartLines(cart, products);

    // O saldo novo chega com a resposta, mas só conta depois da confirmação na tela
    holdBalance();
    if (await Account.checkout()) showSuccessScreen(purchased);
    else releaseBalance();
}

function summaryRow(label, value, className = "") {
    return createElement("div", { className: `summary__row ${className}`.trim() }, [
        createElement("dt", { text: label }),
        createElement("dd", {}, [value]),
    ]);
}

function renderFooter({ profile, isCheckingOut }, lines) {
    const total = Cart.coinTotal(lines);
    const hasMissingPrice = total === null;
    const remaining = hasMissingPrice ? null : profile.moedas - total;
    const isInsufficient = remaining !== null && remaining < 0;

    const checkoutButton = createButton(
        isCheckingOut ? "Processando compra..." : "Finalizar compra",
        "primary",
        handleCheckout,
    );
    checkoutButton.classList.add("btn--lg", "btn--block");
    checkoutButton.dataset.focusKey = "finalizar";
    checkoutButton.disabled = hasMissingPrice || isInsufficient || isCheckingOut;

    return createElement("div", { className: "drawer__footer" }, [
        createElement("dl", { className: "summary" }, [
            summaryRow("Total em moedas", hasMissingPrice ? "—" : coinsLabel(total), "summary__row--total"),
            summaryRow(
                "Saldo após a compra",
                remaining === null ? "—" : formatCoins(remaining),
                isInsufficient ? "summary__row--negative" : "",
            ),
        ]),
        checkoutButton,
        createElement("p", { className: "drawer__hint", text: checkoutHint({ hasMissingPrice, isInsufficient }) }),
    ]);
}

function renderCart(state) {
    if (!isModalOpen(CART_MODAL) || successTimer) return;
    if (!state.profile) {
        content.replaceChildren(sessionExpiredMessage());
        return;
    }

    const lines = Cart.toCartLines(state.cart, state.products);
    const panel = createElement("div", { className: "drawer__panel" }, [
        lines.length > 0
            ? createElement(
                  "ul",
                  { className: "lines", attrs: { "aria-label": "Itens do carrinho" } },
                  lines.map(renderLine),
              )
            : emptyState("cart", "Seu carrinho está vazio.", CART_MODAL),
    ]);

    replaceDrawerContent(content, [
        renderStudentCard(state.profile),
        sectionHeading("Carrinho", Cart.countItems(lines)),
        panel,
        ...(lines.length > 0 ? [renderFooter(state, lines)] : []),
    ]);
}

export function openCart() {
    content.replaceChildren(); // abre sempre do topo da lista
    openModal(CART_MODAL);
    renderCart(Account.accountStore.getState());
    void Account.refreshProfile({ quiet: true });
}

export function initCartView() {
    Account.accountStore.subscribe(renderCart);
}
