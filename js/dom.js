/** Atalhos de DOM e criação segura de elementos (sem innerHTML, evitando injeção de HTML). */

export const $ = (selector, root = document) => root.querySelector(selector);
export const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];

// Imagem local usada quando a foto do produto não carrega (não depende de serviços externos).
const FALLBACK_IMAGE = `data:image/svg+xml,${encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 300">
        <rect width="400" height="300" fill="#e2e8f0"/>
        <path d="M150 190l35-45 25 30 20-22 40 37z" fill="#94a3b8"/>
        <circle cx="245" cy="120" r="14" fill="#94a3b8"/>
        <text x="200" y="240" font-family="sans-serif" font-size="16" fill="#64748b" text-anchor="middle">Imagem indisponível</text>
    </svg>`,
)}`;

/**
 * @param {string} tag
 * @param {{ className?: string, text?: string, attrs?: Record<string, string> }} [options]
 * @param {(Node | string)[]} [children]
 * @returns {HTMLElement}
 */
export function createElement(tag, { className, text, attrs = {} } = {}, children = []) {
    const element = document.createElement(tag);
    if (className) element.className = className;
    if (text !== undefined) element.textContent = text;
    for (const [name, value] of Object.entries(attrs)) element.setAttribute(name, value);
    element.append(...children);
    return element;
}

/** Ícone do sprite SVG declarado no index.html (ex.: "cart" usa #i-cart). */
export function createIcon(name) {
    const svgNS = "http://www.w3.org/2000/svg";
    const svg = document.createElementNS(svgNS, "svg");
    svg.setAttribute("class", "icon");
    svg.setAttribute("aria-hidden", "true");
    const use = document.createElementNS(svgNS, "use");
    use.setAttribute("href", `#i-${name}`);
    svg.append(use);
    return svg;
}

/**
 * @param {string} label
 * @param {"primary" | "ghost"} variant
 * @param {() => void} onClick
 */
export function createButton(label, variant, onClick) {
    const button = createElement("button", {
        className: `btn btn--${variant} btn--sm`,
        text: label,
        attrs: { type: "button" },
    });
    button.addEventListener("click", onClick);
    return button;
}

export function createStateMessage(message) {
    return createElement("p", { className: "state-msg", text: message });
}

export function createProductImage(src, alt, className = "") {
    const img = createElement("img", {
        className,
        attrs: { src: src || FALLBACK_IMAGE, alt, loading: "lazy", decoding: "async" },
    });
    // { once: true } evita loop infinito caso o fallback também falhe
    img.addEventListener("error", () => (img.src = FALLBACK_IMAGE), { once: true });
    return img;
}
