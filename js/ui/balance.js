import { $$, createElement, createIcon } from "../dom.js";
import { formatCoins } from "../format.js";
import { accountStore } from "../features/account.js";

/**
 * Saldo de moedas animado: quando o saldo muda, todos os pontos que o exibem contam até
 * o valor novo e mostram a diferença ("−150 moedas"). Durante a compra o saldo fica
 * "segurado" para a contagem acontecer depois da tela de confirmação, à vista do aluno.
 *
 * As views são redesenhadas a cada mudança do estado, por isso o valor exibido mora aqui,
 * e não no DOM: um elemento criado no meio da contagem já nasce no valor do momento.
 */

const COUNT_MS = 1200;
const DELTA_MS = 2000; // mesma duração da animação .balance[data-delta]::after no CSS
const SELECTOR = "[data-balance]";

const prefersReducedMotion = () => window.matchMedia("(prefers-reduced-motion: reduce)").matches;
const easeOutCubic = (progress) => 1 - (1 - progress) ** 3;

let profileId = null;
let shown = 0; // valor na tela
let target = 0; // saldo real
let isHeld = false;
let tween = null; // { from, to, start }
let delta = null; // { text, direction, start }
let deltaTimer;

function decorate(element) {
    element.querySelector(".balance__value").textContent = formatCoins(shown);
    element.classList.toggle("is-decreasing", tween !== null && tween.to < tween.from);
    element.classList.toggle("is-increasing", tween !== null && tween.to > tween.from);
    if (delta) {
        element.dataset.delta = delta.text;
        element.dataset.deltaDirection = delta.direction;
    } else {
        element.removeAttribute("data-delta");
    }
}

function paint() {
    for (const element of $$(SELECTOR)) decorate(element);
}

function tick(now) {
    if (!tween) return;
    const progress = Math.min(1, Math.max(0, (now - tween.start) / COUNT_MS));
    shown = Math.round(tween.from + (tween.to - tween.from) * easeOutCubic(progress));
    if (progress === 1) tween = null;
    paint();
    if (tween) requestAnimationFrame(tick);
}

function clearDelta() {
    clearTimeout(deltaTimer);
    delta = null;
}

function showDelta(difference) {
    clearDelta();
    delta = {
        text: `${difference < 0 ? "−" : "+"}${formatCoins(Math.abs(difference))}`,
        direction: difference < 0 ? "down" : "up",
        start: performance.now(),
    };
    for (const element of $$(SELECTOR)) {
        // Uma diferença nova recomeça a animação do selo do zero
        element.removeAttribute("data-delta");
        element.style.removeProperty("--delta-elapsed");
        void element.offsetWidth;
    }
    deltaTimer = setTimeout(() => {
        delta = null;
        paint();
    }, DELTA_MS);
}

function animateToTarget() {
    if (shown === target) return;
    if (prefersReducedMotion()) {
        shown = target;
        paint();
        return;
    }
    const isRunning = tween !== null;
    showDelta(target - shown);
    tween = { from: shown, to: target, start: performance.now() };
    paint();
    if (!isRunning) requestAnimationFrame(tick);
}

/** Acompanha o perfil: troca de aluno recomeça sem animar; mudança de saldo anima. */
function syncWith(profile) {
    if (profile?.id !== profileId) {
        profileId = profile?.id ?? null;
        shown = target = profile?.moedas ?? 0;
        tween = null;
        clearDelta();
        return;
    }
    if (!profile || profile.moedas === target) return;
    target = profile.moedas;
    if (!isHeld) animateToTarget();
}

/**
 * Saldo exibido (ícone + valor) que acompanha a animação.
 *
 * @param {import("../services/shop-api.js").Profile} profile
 * @param {{ tag?: string, className?: string, label?: string }} [options] label: texto só para leitores de tela
 */
export function createBalance(profile, { tag = "span", className = "", label } = {}) {
    syncWith(profile); // não depende da ordem em que as views se inscreveram no estado
    const element = createElement(tag, { className: `balance ${className}`.trim() }, [
        ...(label ? [createElement("span", { className: "sr-only", text: label })] : []),
        createIcon("coin"),
        createElement("span", { className: "balance__value" }),
    ]);
    element.dataset.balance = "";
    // Elemento recriado no meio da animação continua do ponto em que ela está
    if (delta) element.style.setProperty("--delta-elapsed", `${Math.round(performance.now() - delta.start)}ms`);
    decorate(element);
    return element;
}

/** Segura a contagem: o saldo novo chega, mas a tela mantém o anterior. */
export function holdBalance() {
    isHeld = true;
}

/** Libera a contagem até o saldo atual. */
export function releaseBalance() {
    isHeld = false;
    animateToTarget();
}

export function initBalance() {
    accountStore.subscribe(({ profile }) => syncWith(profile));
    syncWith(accountStore.getState().profile);
}
