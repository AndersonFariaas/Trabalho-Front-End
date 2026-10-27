import { $, createButton, createElement, createIcon } from "../dom.js";
import * as Account from "../features/account.js";
import { createBalance, initBalance } from "./balance.js";
import { addToCartWithAnimation, flightOrigin, initCartButton } from "./cart-button.js";
import { initCartView } from "./cart-view.js";
import { closeModal } from "./modal.js";
import { initProfileView, openProfile } from "./profile-view.js";
import { initStudentPicker } from "./student-picker.js";
import { showToast } from "./toast.js";

/**
 * View da conta no cabeçalho (saudação, saldo, botões) e formulário de login.
 * Os painéis ficam em cart-view.js (carrinho) e profile-view.js (perfil e inventário); o ícone do
 * carrinho no topo, em cart-button.js. Tudo é redesenhado a partir do estado da conta.
 */

const PRODUCT_MODAL = "produto-modal";
const ADDED_FEEDBACK_MS = 1400;

const elements = {
    authArea: $("#auth-area"),
    form: $("#auth-form"),
    submit: $("#auth-submit-btn"),
    name: $("#auth-username"),
    password: $("#auth-password"),
};

/* ---------- Cabeçalho ---------- */

function renderHeader({ profile }) {
    if (!profile) {
        elements.authArea.replaceChildren(createButton("Acesso do aluno", "primary", Account.openLogin));
        return;
    }

    elements.authArea.replaceChildren(
        createElement("span", { className: "auth-area__greeting", text: "Olá, " }, [
            createElement("strong", { text: profile.nome }),
        ]),
        createBalance(profile, { className: "auth-area__balance", label: "Saldo: " }),
        createButton("Meu perfil", "primary", () => openProfile()),
        createButton("Sair", "ghost", Account.logout),
    );
}

/* ---------- Adicionar ao carrinho ---------- */

const addedFeedbackTimers = new WeakMap();

/** O botão confirma por um instante ("✓ Adicionado") e volta ao texto original. */
function showAddedFeedback(button) {
    if (!addedFeedbackTimers.has(button)) {
        const original = [...button.childNodes];
        const restore = () => {
            addedFeedbackTimers.delete(button);
            button.classList.remove("is-added");
            button.replaceChildren(...original);
        };
        addedFeedbackTimers.set(button, { restore });
        button.classList.add("is-added");
        button.replaceChildren(createIcon("check"), "Adicionado");
    }
    const feedback = addedFeedbackTimers.get(button);
    clearTimeout(feedback.timer);
    feedback.timer = setTimeout(feedback.restore, ADDED_FEEDBACK_MS);
}

function handleAddToCart(addButton) {
    const productId = addButton.dataset.addToCart;
    const image = addButton.closest(".product-card, .product-detail")?.querySelector("img");
    const origin = flightOrigin(image); // antes de fechar o modal, enquanto a foto está na tela

    // No detalhe do produto, adicionar fecha o modal; mais unidades se ajustam no carrinho
    const isProductDetail = Boolean(addButton.closest(`#${PRODUCT_MODAL}`));
    if (isProductDetail) closeModal(PRODUCT_MODAL);

    const status = addToCartWithAnimation(productId, origin);
    if (status === "added" && !isProductDetail) showAddedFeedback(addButton);
}

/* ---------- Login ---------- */

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
    initBalance();
    Account.accountStore.subscribe(renderHeader);
    renderHeader(Account.accountStore.getState());
    initCartButton();
    initCartView();
    initProfileView();

    elements.form.addEventListener("submit", handleLoginSubmit);
    // Nome escolhido na lista de alunos: o foco segue para a senha
    const studentPicker = initStudentPicker({
        input: elements.name,
        list: $("#alunos-lista"),
        toggle: $(".combobox__toggle"),
        loadNames: Account.getStudentNames,
        onPick: () => elements.password.focus(),
    });
    // O login pode abrir pelo topo ou por "Adicionar ao carrinho": o formulário (com a senha)
    // é limpo sempre que o modal fecha.
    $("#auth-modal").addEventListener("close", () => {
        studentPicker.close();
        elements.form.reset();
        Account.forgetProductWaitingForLogin();
    });

    // Delegação: os cartões de produto são recriados a cada atualização da API.
    document.addEventListener("click", (event) => {
        const addButton = event.target.closest("[data-add-to-cart]");
        if (addButton) handleAddToCart(addButton);
    });
}
