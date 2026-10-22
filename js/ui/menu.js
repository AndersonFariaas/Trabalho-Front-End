import { DESKTOP_MEDIA_QUERY } from "../config.js";
import { $ } from "../dom.js";

export function initMobileMenu() {
    const panel = $("#navLinks");
    const toggle = $("#menuBtn");
    const isOpen = () => panel.classList.contains("open");

    function setOpen(open) {
        panel.classList.toggle("open", open);
        toggle.setAttribute("aria-expanded", String(open));
        toggle.setAttribute("aria-label", open ? "Fechar menu" : "Abrir menu");
    }

    toggle.addEventListener("click", () => setOpen(!isOpen()));

    // Fecha ao escolher um link ou um botão de conta
    panel.addEventListener("click", (event) => {
        if (event.target.closest("a, button")) setOpen(false);
    });

    document.addEventListener("keydown", (event) => {
        if (event.key !== "Escape" || !isOpen()) return;
        setOpen(false);
        toggle.focus();
    });

    window.matchMedia(DESKTOP_MEDIA_QUERY).addEventListener("change", (event) => {
        if (event.matches) setOpen(false);
    });
}
