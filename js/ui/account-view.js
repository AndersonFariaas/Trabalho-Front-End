import { $, createButton, createElement, createIcon } from "../dom.js";
import { formatCoins } from "../format.js";
import * as Account from "../features/account.js";
import * as Cart from "../features/cart.js";
import { initCartView, openCart } from "./cart-view.js";
import { initProfileView, openProfile } from "./profile-view.js";
import { showToast } from "./toast.js";

/**
 * View da conta no cabeçalho (saudação, saldo, botões) e formulário de login.
 * Os painéis ficam em cart-view.js (carrinho) e profile-view.js (perfil e inventário). Tudo é redesenhado a partir do estado da conta.
 */

const elements = {
    authArea: $("#auth-area"),
    form: $("#auth-form"),
    submit: $("#auth-submit-btn"),
    name: $("#auth-username"),
    password: $("#auth-password"),
    studentList: $("#alunos-lista"),
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
        createElement(
            "span",
            { className: "auth-area__balance", attrs: { "aria-label": `Saldo: ${formatCoins(profile.moedas)}` } },
            [createIcon("coin"), formatCoins(profile.moedas)],
        ),
        createButton(`Carrinho (${itemCount})`, "ghost", openCart),
        createButton("Meu perfil", "primary", openProfile),
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

/* ---------- Inicialização ---------- */

export function initAccountView() {
    Account.accountStore.subscribe(renderHeader);
    renderHeader(Account.accountStore.getState());
    initCartView();
    initProfileView();

    elements.form.addEventListener("submit", handleLoginSubmit);
    // O login pode abrir pelo topo ou por "Adicionar ao carrinho": os nomes carregam quando o campo
    // recebe foco, e o formulário (com a senha) é limpo sempre que o modal fecha.
    elements.name.addEventListener("focus", () => void fillStudentNames());
    $("#auth-modal").addEventListener("close", () => {
        elements.form.reset();
        Account.forgetProductWaitingForLogin();
    });

    // Delegação: os cartões de produto são recriados a cada atualização da API.
    document.addEventListener("click", (event) => {
        const addButton = event.target.closest("[data-add-to-cart]");
        if (addButton) Account.addToCart(addButton.dataset.addToCart);
    });
}
