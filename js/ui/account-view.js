import { $, createButton, createElement } from "../dom.js";
import { formatCoins, formatPrice } from "../format.js";
import * as Account from "../features/account.js";
import * as Cart from "../features/cart.js";
import { isModalOpen, openModal } from "./modal.js";
import { showToast } from "./toast.js";

/**
 * View da conta: cabeçalho (saudação, saldo, botões), formulário de login e modal de perfil.
 * Tudo é redesenhado a partir do estado em features/account.js.
 */

const PROFILE_MODAL = "perfil-modal";

const elements = {
    authArea: $("#auth-area"),
    form: $("#auth-form"),
    submit: $("#auth-submit-btn"),
    name: $("#auth-username"),
    password: $("#auth-password"),
    studentList: $("#alunos-lista"),
    profileContent: $("#perfil-conteudo"),
};

/* ---------- Cabeçalho ---------- */

function renderHeader({ profile, products, cart }) {
    if (!profile) {
        elements.authArea.replaceChildren(createButton("Acesso do aluno", "primary", Account.openLogin));
        return;
    }

    const itemCount = Cart.countItems(Cart.toCartLines(cart, products));
    elements.authArea.replaceChildren(
        createElement("span", { className: "auth-area__greeting", text: "Olá, " }, [
            createElement("strong", { text: profile.nome }),
        ]),
        createElement("span", {
            className: "auth-area__balance",
            text: formatCoins(profile.moedas),
            attrs: { "aria-label": `Saldo: ${formatCoins(profile.moedas)}` },
        }),
        createButton(`Carrinho (${itemCount})`, "ghost", showProfile),
        createButton("Meu Perfil", "primary", showProfile),
        createButton("Sair", "ghost", Account.logout),
    );
}

/* ---------- Login ---------- */

// Preenche o autocompletar do nome (útil no celular: os nomes têm acento).
async function fillStudentNames() {
    if (elements.studentList.childElementCount > 0) return;
    const names = await Account.getStudentNames();
    elements.studentList.replaceChildren(...names.map((nome) => createElement("option", { attrs: { value: nome } })));
}

async function handleLoginSubmit(event) {
    event.preventDefault();
    const nome = elements.name.value.trim();
    const senha = elements.password.value;

    if (!nome || !senha) {
        showToast("Preencha seu nome e sua senha.");
        (nome ? elements.password : elements.name).focus();
        return;
    }

    elements.submit.disabled = true;
    elements.submit.textContent = "Verificando...";
    try {
        if (await Account.login(nome, senha)) elements.form.reset(); // não deixa a senha no formulário
    } finally {
        elements.submit.disabled = false;
        elements.submit.textContent = "Entrar";
    }
}

/* ---------- Perfil, carrinho e inventário ---------- */

function renderSummary(profile) {
    return createElement("div", { className: "profile__summary" }, [
        createElement("div", {}, [
            createElement("span", { className: "profile__eyebrow", text: "Perfil do aluno" }),
            createElement("strong", { className: "profile__name", text: profile.nome }),
        ]),
        createElement("div", { className: "profile__balance" }, [
            createElement("span", { text: "Saldo de moedas" }),
            createElement("strong", { text: formatCoins(profile.moedas) }),
        ]),
    ]);
}

function quantityButton(label, ariaLabel, onClick) {
    const button = createButton(label, "ghost", onClick);
    button.classList.add("cart-quantity__button");
    button.setAttribute("aria-label", ariaLabel);
    return button;
}

/** @param {import("../features/cart.js").CartLine} line */
function renderCartLine({ id, quantity, product }) {
    const remove = createButton("Remover", "ghost", () => Account.removeFromCart(id));
    remove.classList.add("cart-remove");

    return createElement("li", { className: "profile__item cart-item" }, [
        createElement("div", { className: "cart-item__details" }, [
            createElement("strong", { text: product.nome }),
            createElement("span", { text: `${formatPrice(product.preco)} por unidade` }),
        ]),
        createElement("div", { className: "cart-quantity" }, [
            quantityButton("−", `Diminuir quantidade de ${product.nome}`, () => Account.changeQuantity(id, -1)),
            createElement("span", { text: String(quantity), attrs: { "aria-live": "polite" } }),
            quantityButton("+", `Aumentar quantidade de ${product.nome}`, () => Account.changeQuantity(id, 1)),
        ]),
        remove,
    ]);
}

function checkoutStatus({ hasMissingPrice, isInsufficient }) {
    if (hasMissingPrice) return "A API de produtos precisa informar o preço de cada item em moedas.";
    if (isInsufficient) return "Seu saldo é insuficiente para este carrinho.";
    return "A confirmação do saldo e o débito são feitos no banco da turma.";
}

function renderCart({ profile, products, cart, isCheckingOut }) {
    const lines = Cart.toCartLines(cart, products);
    const total = Cart.coinTotal(lines);
    const hasMissingPrice = total === null;
    const isInsufficient = !hasMissingPrice && total > profile.moedas;

    const list = createElement(
        "ul",
        { className: "profile__list profile__cart-list" },
        lines.length > 0
            ? lines.map(renderCartLine)
            : [createElement("li", { className: "profile__empty", text: "Seu carrinho está vazio." })],
    );

    const checkoutButton = createButton(
        isCheckingOut ? "Processando compra..." : "Finalizar compra",
        "primary",
        Account.checkout,
    );
    checkoutButton.classList.add("cart-checkout");
    checkoutButton.disabled = lines.length === 0 || hasMissingPrice || isInsufficient || isCheckingOut;

    return createElement("section", { className: "profile__section", attrs: { "aria-labelledby": "cart-title" } }, [
        createElement("div", { className: "profile__section-heading" }, [
            createElement("h4", { className: "profile__subtitle", text: "Carrinho", attrs: { id: "cart-title" } }),
            createElement("span", { className: "cart-count", text: `${Cart.countItems(lines)} item(ns)` }),
        ]),
        list,
        createElement("div", { className: "cart-summary" }, [
            createElement("p", { text: `Subtotal de referência: ${formatPrice(Cart.referenceTotal(lines))}` }),
            createElement("p", {
                className: "cart-summary__coins",
                text: `Total em moedas: ${hasMissingPrice ? "Preço em moedas não informado pela API de produtos." : formatCoins(total)}`,
            }),
        ]),
        checkoutButton,
        createElement("p", { className: "profile__hint", text: checkoutStatus({ hasMissingPrice, isInsufficient }) }),
    ]);
}

function renderInventory(inventory) {
    const items = [...inventory].sort((a, b) => b.preco_moedas - a.preco_moedas);
    const content =
        items.length > 0
            ? createElement(
                  "ul",
                  { className: "profile__list" },
                  items.map((item) =>
                      createElement("li", { className: "profile__item inventory-item" }, [
                          createElement("div", { className: "cart-item__details" }, [
                              createElement("strong", { text: item.nome }),
                              createElement("span", { text: `${item.quantidade} unidade(s)` }),
                          ]),
                          createElement("span", {
                              className: "inventory-item__price",
                              text: formatCoins(item.preco_moedas),
                          }),
                      ]),
                  ),
              )
            : createElement("p", { className: "profile__empty", text: "Seu inventário ainda está vazio." });

    return createElement(
        "section",
        { className: "profile__section", attrs: { "aria-labelledby": "inventory-title" } },
        [
            createElement("h4", {
                className: "profile__subtitle",
                text: "Inventário",
                attrs: { id: "inventory-title" },
            }),
            content,
        ],
    );
}

function renderProfile(state) {
    if (!isModalOpen(PROFILE_MODAL)) return;

    if (!state.profile) {
        elements.profileContent.replaceChildren(
            createElement("p", {
                className: "profile__empty",
                text: "Sua sessão não está ativa. Entre novamente para consultar seu saldo e inventário.",
            }),
        );
        return;
    }

    elements.profileContent.replaceChildren(
        renderSummary(state.profile),
        renderCart(state),
        renderInventory(state.profile.inventario),
    );
}

function showProfile() {
    openModal(PROFILE_MODAL);
    renderProfile(Account.accountStore.getState());
    void Account.refreshProfile({ quiet: true });
}

/* ---------- Inicialização ---------- */

export function initAccountView() {
    Account.accountStore.subscribe((state) => {
        renderHeader(state);
        renderProfile(state);
    });
    renderHeader(Account.accountStore.getState());

    elements.form.addEventListener("submit", handleLoginSubmit);
    // O login pode abrir pelo topo ou por "Adicionar ao carrinho": os nomes carregam quando o campo
    // recebe foco, e o formulário (com a senha) é limpo sempre que o modal fecha.
    elements.name.addEventListener("focus", () => void fillStudentNames());
    $("#auth-modal").addEventListener("close", () => elements.form.reset());

    // Delegação: os cartões de produto são recriados a cada atualização da API.
    document.addEventListener("click", (event) => {
        const addButton = event.target.closest("[data-add-to-cart]");
        if (addButton) Account.addToCart(addButton.dataset.addToCart);
    });
}
