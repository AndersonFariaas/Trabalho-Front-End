import { MAX_QUANTITY_PER_PRODUCT } from "../config.js";
import { shopApi } from "../services/shop-api.js";
import { createStore } from "../store.js";
import { closeModal, openModal } from "../ui/modal.js";
import { showToast } from "../ui/toast.js";
import * as Cart from "./cart.js";

/**
 * Conta do aluno: sessão, carrinho e compra. Concentra as regras e o estado;
 * a view (ui/account-view.js) só desenha o que está aqui.
 *
 * @typedef {object} AccountState
 * @property {import("../services/shop-api.js").Profile | null} profile
 * @property {Map<string, import("../../shared/products.js").Product>} products
 * @property {import("./cart.js").CartEntry[]} cart
 * @property {boolean} isCheckingOut
 */

/** @type {ReturnType<typeof createStore<AccountState>>} */
export const accountStore = createStore({
    profile: null,
    products: new Map(),
    cart: [],
    isCheckingOut: false,
});

// Identificador da tentativa de compra em andamento: reenviar o mesmo carrinho
// após uma falha de rede reutiliza o id, e o servidor não cobra duas vezes.
let pendingCheckout = null;

const getState = () => accountStore.getState();

function updateCart(cart) {
    const { profile } = getState();
    if (profile) Cart.saveCart(profile.id, cart);
    accountStore.setState({ cart });
}

function startSession(profile) {
    pendingCheckout = null;
    accountStore.setState({ profile, cart: Cart.loadCart(profile.id) });
}

function endSession() {
    pendingCheckout = null;
    accountStore.setState({ profile: null, cart: [], isCheckingOut: false });
}

export function openLogin() {
    openModal("auth-modal");
}

let studentNamesRequest = null;

/** Nomes para o autocompletar do login (buscados uma vez; falha não impede o login). */
export function getStudentNames() {
    studentNamesRequest ??= shopApi.listStudents().then(({ alunos }) => alunos);
    return studentNamesRequest.catch((error) => {
        studentNamesRequest = null; // permite tentar de novo na próxima vez
        console.warn("Lista de alunos indisponível; o login continua funcionando digitando o nome:", error);
        return [];
    });
}

/** @param {import("../../shared/products.js").Product[]} products */
export function setProducts(products) {
    const productsById = new Map(products.map((product) => [product.id, product]));
    const available = getState().cart.filter((entry) => productsById.has(entry.id));
    accountStore.setState({ products: productsById });
    if (available.length !== getState().cart.length) updateCart(available);
}

/** Restaura a sessão (cookie HttpOnly) e atualiza saldo e inventário. */
export async function refreshProfile({ quiet = false } = {}) {
    try {
        const profile = await shopApi.getProfile();
        if (!profile) {
            endSession(); // visitante sem login
            return false;
        }
        if (getState().profile?.id === profile.id) accountStore.setState({ profile });
        else startSession(profile);
        return true;
    } catch (error) {
        // 401 = sessão expirada: o aluno precisa entrar de novo.
        if (error.status === 401) {
            endSession();
            return false;
        }
        // Falha de rede ou do servidor: mantém o aluno logado com os dados que já tem.
        console.error("Não foi possível atualizar o perfil do aluno:", error);
        if (!quiet) showToast("Não foi possível consultar o saldo da turma.");
        return false;
    }
}

/** @returns {Promise<boolean>} true se entrou */
export async function login(nome, senha) {
    try {
        const profile = await shopApi.login(nome, senha);
        startSession(profile);

        const pendingProduct = productWaitingForLogin;
        productWaitingForLogin = null;
        const result = pendingProduct ? putInCart(pendingProduct) : null;

        closeModal("auth-modal");
        showToast(
            result?.added
                ? `Boas-vindas, ${profile.nome}! "${result.nome}" foi adicionado ao carrinho.`
                : `Boas-vindas, ${profile.nome}!`,
        );
        return true;
    } catch (error) {
        showToast(error.message || "Não foi possível entrar. Tente novamente.");
        return false;
    }
}

export async function logout() {
    try {
        await shopApi.logout();
    } catch (error) {
        console.error("Não foi possível encerrar a sessão no servidor:", error);
        showToast("Não foi possível sair agora. Tente novamente.");
        return;
    }
    endSession();
    closeModal("perfil-modal");
    showToast("Você saiu da conta.");
}

// Produto que o visitante tentou adicionar antes de entrar: vai para o carrinho logo após o login
let productWaitingForLogin = null;

/** Esquece o produto pendente (o visitante fechou o login sem entrar). */
export function forgetProductWaitingForLogin() {
    productWaitingForLogin = null;
}

/** @returns {{ added: true, nome: string } | { added: false, message: string }} */
function putInCart(productId) {
    const { products, cart } = getState();
    const product = products.get(productId);
    if (!product) return { added: false, message: "Este produto não está disponível no momento." };
    if (Cart.quantityOf(cart, productId) >= MAX_QUANTITY_PER_PRODUCT) {
        return { added: false, message: `O limite por produto no carrinho é ${MAX_QUANTITY_PER_PRODUCT} unidades.` };
    }
    updateCart(Cart.addItem(cart, productId));
    return { added: true, nome: product.nome };
}

/**
 * Recusas e o pedido de login viram aviso aqui; a confirmação de "adicionado" fica com a tela
 * (animação do carrinho em ui/cart-button.js).
 *
 * @returns {"added" | "needs-login" | "rejected"}
 */
export function addToCart(productId) {
    if (!getState().profile) {
        productWaitingForLogin = productId;
        showToast("Entre na sua conta para adicionar produtos ao carrinho.");
        openLogin();
        return "needs-login";
    }

    const result = putInCart(productId);
    if (!result.added) {
        showToast(result.message);
        return "rejected";
    }
    return "added";
}

export function changeQuantity(productId, delta) {
    updateCart(Cart.changeQuantity(getState().cart, productId, delta));
}

export function removeFromCart(productId) {
    updateCart(Cart.removeItem(getState().cart, productId));
}

function checkoutRequestId(itens) {
    const signature = JSON.stringify(itens);
    if (pendingCheckout?.signature !== signature) {
        pendingCheckout = { requestId: crypto.randomUUID(), signature };
    }
    return pendingCheckout.requestId;
}

/** @returns {Promise<boolean>} true se a compra foi confirmada */
export async function checkout() {
    const { profile, products, cart, isCheckingOut } = getState();
    const lines = Cart.toCartLines(cart, products);
    if (isCheckingOut) return false;

    if (!profile || lines.length === 0) {
        showToast("Entre na sua conta e atualize o perfil para concluir a compra.");
        return false;
    }
    if (Cart.coinTotal(lines) === null) {
        showToast("O preço em moedas não está disponível para todos os produtos.");
        return false;
    }
    if (!globalThis.crypto?.randomUUID) {
        showToast("Este navegador não oferece suporte seguro para confirmar compras.");
        return false;
    }

    const itens = lines.map(({ id, quantity }) => ({ id, quantidade: quantity }));
    accountStore.setState({ isCheckingOut: true });
    try {
        const updatedProfile = await shopApi.checkout(itens, checkoutRequestId(itens));
        pendingCheckout = null;
        accountStore.setState({ profile: updatedProfile });
        updateCart([]);
        return true; // a confirmação visual fica com a tela (animação de compra)
    } catch (error) {
        console.error("Erro ao finalizar a compra:", error);
        showToast(error.message || "Não foi possível concluir a compra.");
        // Erro de regra (saldo, carrinho) gera nova tentativa; erro de rede/servidor reaproveita o id.
        if (error.status && error.status < 500) pendingCheckout = null;
        if (error.status === 401) endSession();
        return false;
    } finally {
        accountStore.setState({ isCheckingOut: false });
    }
}
