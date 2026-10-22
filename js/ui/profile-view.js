import { $, createButton, createElement, createIcon, createProductImage } from "../dom.js";
import { formatCoins, formatPrice } from "../format.js";
import * as Account from "../features/account.js";
import * as Cart from "../features/cart.js";
import { closeModal, isModalOpen, openModal } from "./modal.js";

/**
 * Painel lateral do aluno: cartão com avatar e saldo, abas Carrinho / Inventário
 * e rodapé fixo com o resumo da compra. Redesenhado a partir do estado da conta.
 */

const PROFILE_MODAL = "perfil-modal";
const TABS = Object.freeze({ cart: "carrinho", inventory: "inventario" });

const content = $("#perfil-conteudo");
let activeTab = TABS.cart;

/* ---------- Peças pequenas ---------- */

/** Iniciais do primeiro e do último nome (ex.: "Anderson Farias" → "AF"). */
function initials(name) {
    const words = name.trim().split(/\s+/).filter(Boolean);
    const letters = words.length > 1 ? [words[0], words.at(-1)] : words;
    return letters
        .map((word) => word[0])
        .join("")
        .toUpperCase();
}

function coinsLabel(value) {
    return createElement("span", { className: "coins" }, [createIcon("coin"), formatCoins(value)]);
}

function iconButton(icon, ariaLabel, focusKey, onClick) {
    const button = createElement("button", {
        className: "icon-btn icon-btn--sm",
        attrs: { type: "button", "aria-label": ariaLabel },
    });
    button.append(createIcon(icon));
    button.dataset.focusKey = focusKey;
    button.addEventListener("click", onClick);
    return button;
}

// Imagem decorativa: o nome do produto já aparece ao lado
function thumbnail(product) {
    return createElement("span", { className: "line__thumb" }, [
        createProductImage(product?.imagem, "", "line__image"),
    ]);
}

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

function emptyState(icon, message) {
    const explore = createButton("Explorar catálogo", "ghost", () => {
        closeModal(PROFILE_MODAL);
        document.getElementById("produtos")?.scrollIntoView();
    });
    return createElement("div", { className: "empty-state" }, [
        createElement("span", { className: "empty-state__icon" }, [createIcon(icon)]),
        createElement("p", { text: message }),
        explore,
    ]);
}

/* ---------- Seções ---------- */

function renderProfileCard(profile) {
    return createElement("div", { className: "profile-card" }, [
        createElement("span", {
            className: "profile-card__avatar",
            text: initials(profile.nome),
            attrs: { "aria-hidden": "true" },
        }),
        createElement("div", { className: "profile-card__info" }, [
            createElement("span", { className: "profile-card__eyebrow", text: "Perfil do aluno" }),
            createElement("strong", { className: "profile-card__name", text: profile.nome }),
        ]),
        createElement("div", { className: "profile-card__balance" }, [
            createElement("span", { text: "Saldo de moedas" }),
            createElement("strong", {}, [createIcon("coin"), formatCoins(profile.moedas)]),
        ]),
    ]);
}

function selectTab(tab) {
    activeTab = tab;
    renderProfile(Account.accountStore.getState());
}

function renderTabs(cartCount, inventoryCount) {
    const tabs = [
        { id: TABS.cart, label: "Carrinho", count: cartCount },
        { id: TABS.inventory, label: "Inventário", count: inventoryCount },
    ];

    const list = createElement(
        "div",
        { className: "tabs", attrs: { role: "tablist", "aria-label": "Seções do perfil" } },
        tabs.map(({ id, label, count }) => {
            const isActive = id === activeTab;
            const tab = createElement(
                "button",
                {
                    className: "tabs__tab",
                    attrs: {
                        type: "button",
                        role: "tab",
                        id: `perfil-aba-${id}`,
                        "aria-selected": String(isActive),
                        "aria-controls": "perfil-painel",
                        tabindex: isActive ? "0" : "-1",
                    },
                },
                [label, createElement("span", { className: "tabs__count", text: String(count) })],
            );
            tab.dataset.focusKey = `aba-${id}`;
            tab.addEventListener("click", () => selectTab(id));
            return tab;
        }),
    );

    // Setas do teclado trocam de aba (padrão de acessibilidade para abas)
    list.addEventListener("keydown", (event) => {
        if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") return;
        selectTab(activeTab === TABS.cart ? TABS.inventory : TABS.cart);
        content.querySelector(`[data-focus-key="aba-${activeTab}"]`)?.focus();
    });
    return list;
}

/** @param {import("../features/cart.js").CartLine} line */
function renderCartLine({ id, quantity, product }) {
    const unitPrice = product.precoMoedas === null ? "Sem preço em moedas" : formatCoins(product.precoMoedas);
    return createElement("li", { className: "line" }, [
        thumbnail(product),
        createElement("div", { className: "line__info" }, [
            createElement("strong", { className: "line__title", text: product.nome }),
            createElement("span", {
                className: "line__meta",
                text: `${unitPrice} · ${formatPrice(product.preco)} por unidade`,
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
        iconButton("trash", `Remover ${product.nome} do carrinho`, `remover-${id}`, () => Account.removeFromCart(id)),
    ]);
}

function renderInventoryLine(item, products) {
    const product = products.get(item.id);
    return createElement("li", { className: "line" }, [
        thumbnail(product),
        createElement("div", { className: "line__info" }, [
            createElement("strong", { className: "line__title", text: item.nome }),
            createElement("span", { className: "line__meta", text: `${item.quantidade} unidade(s)` }),
        ]),
        coinsLabel(item.preco_moedas),
    ]);
}

function renderPanel({ profile, products }, lines) {
    const panel = createElement("div", {
        className: "drawer__panel",
        attrs: { id: "perfil-painel", role: "tabpanel", "aria-labelledby": `perfil-aba-${activeTab}` },
    });

    if (activeTab === TABS.cart) {
        panel.append(
            lines.length > 0
                ? createElement("ul", { className: "lines" }, lines.map(renderCartLine))
                : emptyState("cart", "Seu carrinho está vazio."),
        );
        return panel;
    }

    const inventory = [...profile.inventario].sort((a, b) => b.preco_moedas - a.preco_moedas);
    panel.append(
        inventory.length > 0
            ? createElement(
                  "ul",
                  { className: "lines" },
                  inventory.map((item) => renderInventoryLine(item, products)),
              )
            : emptyState("box", "Seu inventário ainda está vazio."),
    );
    return panel;
}

function checkoutHint({ hasMissingPrice, isInsufficient }) {
    if (hasMissingPrice) return "A API de produtos precisa informar o preço de cada item em moedas.";
    if (isInsufficient) return "Seu saldo é insuficiente para este carrinho.";
    return "A confirmação do saldo e o débito são feitos no banco da turma.";
}

async function handleCheckout() {
    // Depois de comprar, mostra o inventário com o item novo
    if (await Account.checkout()) selectTab(TABS.inventory);
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
            summaryRow("Subtotal de referência", formatPrice(Cart.referenceTotal(lines))),
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

/* ---------- Render principal ---------- */

function renderProfile(state) {
    if (!isModalOpen(PROFILE_MODAL)) return;

    if (!state.profile) {
        content.replaceChildren(
            createElement("p", {
                className: "profile__empty",
                text: "Sua sessão não está ativa. Entre novamente para consultar seu saldo e inventário.",
            }),
        );
        return;
    }

    // Redesenhar não pode tirar o foco do teclado nem a posição da rolagem
    const focusKey = content.contains(document.activeElement) ? document.activeElement.dataset.focusKey : null;
    const previousPanel = content.querySelector(".drawer__panel");
    const scrollTop =
        previousPanel?.getAttribute("aria-labelledby") === `perfil-aba-${activeTab}` ? previousPanel.scrollTop : 0;

    const lines = Cart.toCartLines(state.cart, state.products);
    const showFooter = activeTab === TABS.cart && lines.length > 0;
    const panel = renderPanel(state, lines);

    content.replaceChildren(
        renderProfileCard(state.profile),
        renderTabs(Cart.countItems(lines), state.profile.inventario.length),
        panel,
        ...(showFooter ? [renderFooter(state, lines)] : []),
    );

    panel.scrollTop = scrollTop;
    if (focusKey) {
        const target = content.querySelector(`[data-focus-key="${CSS.escape(focusKey)}"]`);
        (target ?? content.querySelector(`[data-focus-key="aba-${activeTab}"]`))?.focus({ preventScroll: true });
    }
}

/**
 * Abre o painel na aba pedida; sem aba, abre o carrinho se tiver itens, senão o inventário.
 *
 * @param {"carrinho" | "inventario"} [tab]
 */
export function openProfile(tab) {
    const { cart, products } = Account.accountStore.getState();
    activeTab = tab ?? (Cart.toCartLines(cart, products).length > 0 ? TABS.cart : TABS.inventory);
    openModal(PROFILE_MODAL);
    renderProfile(Account.accountStore.getState());
    void Account.refreshProfile({ quiet: true });
}

export function initProfileView() {
    Account.accountStore.subscribe(renderProfile);
}
