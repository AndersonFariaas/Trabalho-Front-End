import { $$ } from "../dom.js";

const STAGGER_MS = 70;

/**
 * Seções surgem suavemente quando entram na tela (uma vez só).
 * - [data-reveal]: o próprio elemento aparece.
 * - [data-reveal-stagger]: os filhos aparecem em cascata.
 * Quem pediu menos movimento no sistema vê tudo de imediato, sem animação.
 */
export function initReveal() {
    const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (prefersReducedMotion || !("IntersectionObserver" in window)) return;

    const targets = $$("[data-reveal]");
    for (const group of $$("[data-reveal-stagger]")) {
        [...group.children].forEach((child, index) => {
            child.dataset.reveal = "";
            child.style.setProperty("--reveal-delay", `${index * STAGGER_MS}ms`);
            targets.push(child);
        });
    }

    // A classe só entra com o JavaScript rodando: sem ele, nada fica escondido
    document.documentElement.classList.add("has-reveal");

    const observer = new IntersectionObserver(
        (entries) => {
            for (const entry of entries) {
                if (!entry.isIntersecting) continue;
                entry.target.classList.add("is-revealed");
                observer.unobserve(entry.target);
            }
        },
        { rootMargin: "0px 0px -8% 0px" },
    );
    targets.forEach((target) => observer.observe(target));
}
