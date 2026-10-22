import { STORAGE_KEYS, THEME_COLORS } from "../config.js";
import { $ } from "../dom.js";
import { storage } from "../storage.js";

const THEME_TRANSITION_MS = 400;

/** O tema salvo já é aplicado antes da pintura por js/theme-init.js; aqui só fica o botão. */
export function initThemeToggle() {
    const root = document.documentElement;
    const toggle = $("#botaoTema");
    const themeColorMeta = $('meta[name="theme-color"]');

    function applyTheme(theme) {
        root.dataset.theme = theme;
        const isDark = theme === "dark";
        toggle.setAttribute("aria-label", isDark ? "Ativar modo claro" : "Ativar modo escuro");
        themeColorMeta?.setAttribute("content", THEME_COLORS[theme]);
    }

    // As cores mudam com transição suave só durante a troca (não fica pesando o resto do tempo)
    let transitionTimer;
    function animateThemeChange() {
        if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
        root.classList.add("theme-changing");
        clearTimeout(transitionTimer);
        transitionTimer = setTimeout(() => root.classList.remove("theme-changing"), THEME_TRANSITION_MS);
    }

    applyTheme(root.dataset.theme === "light" ? "light" : "dark");

    toggle.addEventListener("click", () => {
        const nextTheme = root.dataset.theme === "dark" ? "light" : "dark";
        animateThemeChange();
        applyTheme(nextTheme);
        storage.writeText(STORAGE_KEYS.theme, nextTheme);
    });
}
