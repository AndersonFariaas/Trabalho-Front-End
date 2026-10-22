import { FEATURED_COUNT } from "../config.js";
import { $, createElement, createIcon, createProductImage, createStateMessage } from "../dom.js";
import { formatCoins } from "../format.js";

/**
 * Faixa contínua de destaques (mesmo comportamento do carrossel do Majestic-12):
 * gira sozinha e dá a volta sem emenda (os cartões se repetem o suficiente para cobrir a tela),
 * para com o mouse ou foco em cima e com um modal aberto, arrasta com embalo no celular
 * e tem setas no computador. Move só com transform, num único requestAnimationFrame
 * que dorme quando a faixa está fora da tela.
 */

const SPEED = 32; // px por segundo
const DRAG_THRESHOLD = 6; // px antes de um toque virar arrasto (abaixo disso é clique)
const FRICTION = 4; // quão rápido o embalo do arrasto perde força
const MAX_FLING = 2500; // px/s
const NUDGE_MS = 450;

/** Embaralhamento de Fisher-Yates (cópia, sem alterar a lista original). */
function shuffle(items) {
    const copy = [...items];
    for (let i = copy.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [copy[i], copy[j]] = [copy[j], copy[i]];
    }
    return copy;
}

/** @param {import("../../shared/products.js").Product} product */
function createCard(product, isClone) {
    const image = createProductImage(product.imagem, "", "featured-card__image");
    image.draggable = false; // o arraste nativo de imagem atrapalharia o gesto do carrossel

    const card = createElement(
        "button",
        {
            className: "featured-card",
            attrs: { type: "button", "aria-label": `Ver detalhes de ${product.nome}` },
        },
        [
            createElement("span", { className: "featured-card__media" }, [image]),
            createElement("span", { className: "featured-card__body" }, [
                createElement("span", { className: "featured-card__title", text: product.nome }),
                createElement("span", { className: "featured-card__coins" }, [
                    createIcon("coin"),
                    product.precoMoedas === null ? "Preço indisponível" : formatCoins(product.precoMoedas),
                ]),
            ]),
        ],
    );
    card.dataset.productId = product.id;
    // As cópias só completam a volta visual: ficam fora do leitor de tela e da ordem do Tab
    if (isClone) {
        card.setAttribute("aria-hidden", "true");
        card.tabIndex = -1;
    }
    return card;
}

/** @param {{ onSelect: (productId: string) => void }} options */
export function createFeaturedCarousel({ onSelect }) {
    const viewport = $("#heroCarousel");
    const track = $("#carouselTrack");
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");

    let items = [];
    let copies = 2;
    let offset = 0; // quanto a fileira andou para a esquerda, sempre dentro de [0, setWidth)
    let setWidth = 0; // largura de uma volta completa (todos os cartões uma vez)
    let step = 0; // largura de um cartão + espaço
    let velocity = 0;
    let tween = null;
    let drag = null;
    let suppressClick = false;
    let frame = 0;
    let lastTime = 0;
    let hovering = false;
    let focused = false;

    // O conteúdo se repete a cada setWidth, então "dar a volta" é invisível
    const wrap = (x) => (setWidth ? ((x % setWidth) + setWidth) % setWidth : 0);

    function moveTo(x) {
        offset = wrap(x);
        track.style.transform = `translate3d(${-offset}px, 0, 0)`;
    }

    function renderCards() {
        const cards = Array.from({ length: copies }, (_, copy) =>
            items.map((product) => createCard(product, copy > 0)),
        ).flat();
        track.replaceChildren(...cards);
    }

    function measure() {
        if (items.length === 0 || track.children.length === 0) return;
        const gap = parseFloat(getComputedStyle(track).columnGap) || 0;
        step = track.children[0].offsetWidth + gap;
        setWidth = step * items.length;

        // Uma volta + o que cabe na tela: nunca aparece buraco no fim da fileira
        const needed = Math.max(2, Math.ceil(viewport.clientWidth / setWidth) + 1);
        if (needed !== copies) {
            copies = needed;
            renderCards();
        }
        moveTo(offset);
    }

    const isModalOpen = () => document.querySelector("dialog[open]") !== null;
    const shouldAutoplay = () => !hovering && !focused && !drag && !reducedMotion.matches && !isModalOpen();

    function tick(now) {
        frame = requestAnimationFrame(tick);
        const dt = lastTime ? Math.min((now - lastTime) / 1000, 0.1) : 0;
        lastTime = now;
        if (drag?.active || !setWidth) return;

        if (tween) {
            const progress = Math.min(1, (now - tween.start) / NUDGE_MS);
            moveTo(tween.from + (tween.to - tween.from) * (1 - (1 - progress) ** 3));
            if (progress === 1) tween = null;
            return;
        }

        let next = offset;
        if (velocity) {
            next += velocity * dt;
            velocity = Math.abs(velocity) < 5 ? 0 : velocity * Math.exp(-FRICTION * dt);
        }
        if (shouldAutoplay()) next += SPEED * dt;
        if (next !== offset) moveTo(next);
    }

    function start() {
        if (frame) return;
        lastTime = 0;
        frame = requestAnimationFrame(tick);
    }

    function stop() {
        cancelAnimationFrame(frame);
        frame = 0;
    }

    function slideTo(to) {
        velocity = 0;
        tween = { from: offset, to, start: performance.now() };
    }

    // Setas: alinham o próximo/anterior cartão à borda esquerda
    const next = () => slideTo((Math.floor(offset / step + 0.01) + 1) * step);
    const prev = () => slideTo((Math.ceil(offset / step - 0.01) - 1) * step);

    /* ---------- Arrastar (mouse e toque) ---------- */

    function onPointerDown(event) {
        if (event.button !== 0) return;
        suppressClick = false;
        tween = null;
        velocity = 0;
        drag = {
            id: event.pointerId,
            startX: event.clientX,
            startOffset: offset,
            lastX: event.clientX,
            lastTime: event.timeStamp,
            active: false,
        };
    }

    function onPointerMove(event) {
        if (event.pointerId !== drag?.id) return;
        const deltaX = event.clientX - drag.startX;
        if (!drag.active) {
            if (Math.abs(deltaX) < DRAG_THRESHOLD) return;
            drag.active = true;
            viewport.setPointerCapture(event.pointerId);
        }
        const dt = (event.timeStamp - drag.lastTime) / 1000;
        if (dt > 0) velocity = 0.8 * (-(event.clientX - drag.lastX) / dt) + 0.2 * velocity;
        drag.lastX = event.clientX;
        drag.lastTime = event.timeStamp;
        moveTo(drag.startOffset - deltaX);
    }

    function onPointerUp(event) {
        if (event.pointerId !== drag?.id) return;
        suppressClick = drag.active;
        // Segurou parado antes de soltar (ou foi só um toque): sem embalo
        const stale = event.timeStamp - drag.lastTime > 100;
        velocity = drag.active && !stale ? Math.max(-MAX_FLING, Math.min(MAX_FLING, velocity)) : 0;
        drag = null;
    }

    // O navegador assumiu o gesto (rolagem vertical da página no celular)
    function onPointerCancel() {
        drag = null;
        velocity = 0;
    }

    // Arrastar não pode abrir o cartão onde o dedo/mouse foi solto
    function onClick(event) {
        if (suppressClick) {
            suppressClick = false;
            event.preventDefault();
            return;
        }
        const card = event.target.closest(".featured-card");
        if (card) onSelect(card.dataset.productId);
    }

    // Foco pelo teclado: para o giro e traz o cartão para dentro da tela
    function onFocusIn(event) {
        const card = event.target.closest(".featured-card");
        if (!card?.matches(":focus-visible")) return;
        focused = true;
        const left = card.offsetLeft - offset;
        if (left < 0 || left + card.offsetWidth > viewport.clientWidth) slideTo(card.offsetLeft);
    }

    function onFocusOut(event) {
        if (!viewport.contains(event.relatedTarget)) focused = false;
    }

    viewport.addEventListener("pointerdown", onPointerDown);
    viewport.addEventListener("pointermove", onPointerMove);
    viewport.addEventListener("pointerup", onPointerUp);
    viewport.addEventListener("pointercancel", onPointerCancel);
    viewport.addEventListener("pointerenter", (event) => (hovering = event.pointerType === "mouse"));
    viewport.addEventListener("pointerleave", () => (hovering = false));
    viewport.addEventListener("click", onClick);
    viewport.addEventListener("focusin", onFocusIn);
    viewport.addEventListener("focusout", onFocusOut);
    $(".featured__arrow--prev").addEventListener("click", prev);
    $(".featured__arrow--next").addEventListener("click", next);

    new ResizeObserver(measure).observe(viewport);
    // Fora da tela não gasta processamento
    new IntersectionObserver(([entry]) => (entry.isIntersecting ? start() : stop())).observe(viewport);

    /** Sorteia os destaques entre os produtos com foto. */
    function render(products) {
        const withImage = products.filter((product) => product.imagem);
        items = shuffle(withImage.length > 0 ? withImage : products).slice(0, FEATURED_COUNT);
        if (items.length === 0) return;

        copies = 2;
        offset = 0;
        renderCards();
        measure();
    }

    function showMessage(message) {
        if (items.length > 0) return; // mantém os destaques já exibidos
        track.replaceChildren(createStateMessage(message));
    }

    return { render, showMessage };
}
