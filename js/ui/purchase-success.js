import { createElement, createIcon } from "../dom.js";
import { formatCoins } from "../format.js";

/** Tela de compra confirmada: selo com ✓ desenhado, moedas saltando e o resumo da compra. */

const SVG_NS = "http://www.w3.org/2000/svg";
const BURST_COINS = 12;
const COINS_DELAY_MS = 620; // as moedas saltam quando o selo se completa (animação success-fill no CSS)

const prefersReducedMotion = () => window.matchMedia("(prefers-reduced-motion: reduce)").matches;

function svgElement(tag, attrs) {
    const element = document.createElementNS(SVG_NS, tag);
    for (const [name, value] of Object.entries(attrs)) element.setAttribute(name, value);
    return element;
}

// pathLength="1": o CSS desenha o traço de 0 a 1 sem depender do tamanho real
function checkMark() {
    const svg = svgElement("svg", { class: "purchase-success__check", viewBox: "0 0 52 52", "aria-hidden": "true" });
    svg.append(
        svgElement("circle", { class: "purchase-success__circle", cx: "26", cy: "26", r: "24", pathLength: "1" }),
        svgElement("path", { class: "purchase-success__tick", d: "M15 27.5l7 7 15-15", pathLength: "1" }),
    );
    return svg;
}

/** Moedas que saltam do selo em leque e caem com "gravidade". */
function burstCoins(container) {
    if (prefersReducedMotion()) return;
    for (let index = 0; index < BURST_COINS; index++) {
        const coin = createElement("span", { className: "purchase-success__coin" }, [createIcon("coin")]);
        container.append(coin);

        const spread = (index / (BURST_COINS - 1)) * 2 - 1; // de −1 (esquerda) a 1 (direita)
        const angle = -Math.PI / 2 + spread * 1.25 + (Math.random() - 0.5) * 0.3;
        const distance = 70 + Math.random() * 55;
        const x = Math.cos(angle) * distance;
        const y = Math.sin(angle) * distance;
        const spin = (Math.random() > 0.5 ? 1 : -1) * (200 + Math.random() * 260);

        coin.animate(
            [
                { transform: "translate(0, 0) scale(0.3) rotate(0deg)", opacity: 0 },
                { opacity: 1, offset: 0.12 },
                {
                    transform: `translate(${x}px, ${y}px) scale(1) rotate(${spin / 2}deg)`,
                    offset: 0.5,
                    easing: "cubic-bezier(0.5, 0, 1, 0.6)",
                },
                { transform: `translate(${x * 1.2}px, ${y + 90}px) scale(0.7) rotate(${spin}deg)`, opacity: 0 },
            ],
            {
                duration: 1200 + Math.random() * 300,
                delay: COINS_DELAY_MS + Math.random() * 150,
                easing: "cubic-bezier(0.15, 0.7, 0.3, 1)",
                fill: "both",
            },
        ).finished.finally(() => coin.remove());
    }
}

/**
 * @param {{ itemCount: number, total: number, durationMs: number }} purchase
 * durationMs: tempo até o painel seguir para o inventário (barra de progresso)
 */
export function renderPurchaseSuccess({ itemCount, total, durationMs }) {
    const burst = createElement("span", { className: "purchase-success__burst", attrs: { "aria-hidden": "true" } });
    const progress = createElement("span", {
        className: "purchase-success__progress",
        attrs: { "aria-hidden": "true" },
    });
    progress.style.setProperty("--success-duration", `${durationMs}ms`);

    const screen = createElement("div", { className: "purchase-success", attrs: { role: "status" } }, [
        createElement("div", { className: "purchase-success__badge" }, [checkMark(), burst]),
        createElement("h4", { className: "purchase-success__title", text: "Compra confirmada!" }),
        createElement("p", {
            className: "purchase-success__text",
            text: `${itemCount} ${itemCount === 1 ? "item foi adicionado" : "itens foram adicionados"} ao seu inventário.`,
        }),
        createElement("p", { className: "purchase-success__spent" }, [createIcon("coin"), `−${formatCoins(total)}`]),
        createElement("p", { className: "purchase-success__next", text: "Abrindo seu inventário…" }, [progress]),
    ]);
    // Depois de a tela entrar no documento: animate() num elemento solto não roda
    requestAnimationFrame(() => burstCoins(burst));
    return screen;
}
