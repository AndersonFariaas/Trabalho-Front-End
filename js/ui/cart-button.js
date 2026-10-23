import { $, createElement } from "../dom.js";
import * as Account from "../features/account.js";
import * as Cart from "../features/cart.js";
import { openCart } from "./cart-view.js";
import { showToast } from "./toast.js";

/**
 * Ícone do carrinho no topo (visível também no celular) e a animação do produto
 * "voando" até ele. O contador só sobe quando o produto chega, e o ícone dá um pulo.
 */

const FLIGHT_MS = 820;
const LIFT_END = 0.14; // fração do voo em que a foto só "descola" do lugar
const MIN_FLYER_SIZE = 56;
const MAX_FLYER_SIZE = 200;
const LANDED_SIZE = 22;
const MAX_BADGE_COUNT = 99;

const button = $("#cartButton");
const badge = $("#cartBadge");
const announcer = $("#cartStatus");
const prefersReducedMotion = () => window.matchMedia("(prefers-reduced-motion: reduce)").matches;

let shownCount = 0;
let flightsInAir = 0;

function currentCount() {
    const { cart, products } = Account.accountStore.getState();
    return Cart.countItems(Cart.toCartLines(cart, products));
}

function showCount(count) {
    shownCount = count;
    badge.textContent = count > MAX_BADGE_COUNT ? `${MAX_BADGE_COUNT}+` : String(count);
    badge.hidden = count === 0;
    button.setAttribute(
        "aria-label",
        count === 0 ? "Carrinho vazio" : `Abrir carrinho com ${count} ${count === 1 ? "item" : "itens"}`,
    );
}

const SPRING = "cubic-bezier(0.34, 1.56, 0.64, 1)";

/** Pulo do ícone, contador que "estoura" e uma onda saindo do botão. */
function celebrateArrival() {
    if (prefersReducedMotion()) return;
    button.animate(
        [
            { transform: "scale(1)" },
            { transform: "scale(1.22) rotate(-12deg)", offset: 0.3 },
            { transform: "scale(0.94) rotate(6deg)", offset: 0.62 },
            { transform: "scale(1)" },
        ],
        { duration: 560, easing: SPRING },
    );
    badge.animate(
        [{ transform: "scale(0.4)" }, { transform: "scale(1.45)", offset: 0.45 }, { transform: "scale(1)" }],
        {
            duration: 460,
            easing: SPRING,
        },
    );
    const ring = createElement("span", { className: "cart-button__ring", attrs: { "aria-hidden": "true" } });
    button.append(ring);
    ring.animate(
        [
            { transform: "scale(0.8)", opacity: 0.8 },
            { transform: "scale(1.9)", opacity: 0 },
        ],
        { duration: 700, easing: "cubic-bezier(0.2, 0.7, 0.2, 1)" },
    ).finished.finally(() => ring.remove());
}

function render({ profile }) {
    button.hidden = !profile;
    if (!profile) {
        flightsInAir = 0;
        showCount(0);
        return;
    }
    // Com produto no ar, o contador espera ele chegar para subir
    const count = currentCount();
    if (flightsInAir > 0 && count > shownCount) return;
    showCount(count);
}

/**
 * Lê de onde o produto sai. Precisa ser chamada antes de fechar o modal da foto:
 * depois de fechado, o navegador pode não ter mais a posição dela.
 *
 * @param {HTMLImageElement | null | undefined} image
 * @returns {{ rect: DOMRect, src: string } | null}
 */
export function flightOrigin(image) {
    if (!image) return null;
    const rect = image.getBoundingClientRect();
    if (rect.width === 0 || rect.height === 0) return null;
    return { rect, src: image.currentSrc || image.src };
}

/**
 * Cópia da foto que faz um arco até o ícone: o eixo horizontal acelera no fim e o vertical
 * no começo, e a soma dos dois desenha a curva.
 */
async function fly({ rect, src }) {
    const size = Math.min(MAX_FLYER_SIZE, Math.max(MIN_FLYER_SIZE, Math.min(rect.width, rect.height)));
    const startX = rect.left + rect.width / 2 - size / 2;
    const startY = rect.top + rect.height / 2 - size / 2;
    const to = button.getBoundingClientRect();
    const deltaX = to.left + to.width / 2 - (startX + size / 2);
    const deltaY = to.top + to.height / 2 - (startY + size / 2);
    const endScale = LANDED_SIZE / size;

    const inner = createElement("span", { className: "cart-flyer__inner" }, [
        createElement("img", { attrs: { src, alt: "" } }),
    ]);
    // popover: fica na camada superior, acima de qualquer modal aberto
    const flyer = createElement(
        "span",
        { className: "cart-flyer", attrs: { popover: "manual", "aria-hidden": "true" } },
        [inner],
    );
    Object.assign(flyer.style, { left: `${startX}px`, top: `${startY}px`, width: `${size}px`, height: `${size}px` });
    document.body.append(flyer);
    flyer.showPopover?.();

    const timing = { duration: FLIGHT_MS, fill: "forwards" };
    const horizontal = flyer.animate(
        [
            { transform: "translateX(0)" },
            { transform: "translateX(0)", offset: LIFT_END, easing: "cubic-bezier(0.5, 0, 0.9, 0.55)" },
            { transform: `translateX(${deltaX}px)` },
        ],
        timing,
    );
    const vertical = inner.animate(
        [
            { transform: "translateY(0) scale(1) rotate(0deg)", borderRadius: "16px", easing: "ease-out" },
            {
                transform: "translateY(-12px) scale(1.06) rotate(-3deg)",
                offset: LIFT_END,
                easing: "cubic-bezier(0.15, 0.55, 0.35, 1)",
            },
            { transform: `translateY(${deltaY}px) scale(${endScale}) rotate(18deg)`, borderRadius: "50%" },
        ],
        timing,
    );
    const fade = inner.animate([{ opacity: 1 }, { opacity: 1, offset: 0.82 }, { opacity: 0.4 }], timing);

    try {
        await Promise.all([horizontal.finished, vertical.finished, fade.finished]);
    } finally {
        flyer.remove();
    }
}

function announce(message) {
    // Limpa antes: a mesma frase repetida (mesmo produto de novo) também é anunciada
    announcer.textContent = "";
    requestAnimationFrame(() => (announcer.textContent = message));
}

function land() {
    flightsInAir = Math.max(0, flightsInAir - 1);
    if (button.hidden) return; // saiu da conta durante o voo
    // Um produto por chegada; o último acerta o número com o carrinho
    showCount(flightsInAir > 0 ? Math.min(shownCount + 1, currentCount()) : currentCount());
    celebrateArrival();
}

/**
 * Adiciona ao carrinho; se deu certo, o produto voa da foto até o ícone do topo.
 *
 * @param {string} productId
 * @param {ReturnType<typeof flightOrigin>} origin
 * @returns {"added" | "needs-login" | "rejected"}
 */
export function addToCartWithAnimation(productId, origin) {
    const canFly = origin !== null && !button.hidden && !prefersReducedMotion();
    if (canFly) flightsInAir += 1; // antes de adicionar, para o contador esperar o voo

    const status = Account.addToCart(productId);
    if (status !== "added") {
        if (canFly) flightsInAir -= 1;
        return status;
    }

    const message = `"${Account.accountStore.getState().products.get(productId)?.nome}" foi adicionado ao carrinho.`;
    if (!canFly) {
        // Sem animação, o aviso visível é a confirmação
        showToast(message);
        celebrateArrival();
        return status;
    }
    // Com animação, o aviso visual cobriria o botão no celular: a confirmação vai só para leitores de tela
    announce(message);
    fly(origin)
        .catch((error) => console.warn("Animação do carrinho interrompida:", error))
        .finally(land);
    return status;
}

export function initCartButton() {
    button.addEventListener("click", openCart);
    Account.accountStore.subscribe(render);
    render(Account.accountStore.getState());
}
