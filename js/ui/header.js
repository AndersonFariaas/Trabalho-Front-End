import { $, $$ } from "../dom.js";

/**
 * Efeitos do cabeçalho: topo que encolhe ao rolar e sublinhado deslizante nos links,
 * que acompanha o mouse e marca a seção visível da página.
 */

// Histerese: encolhe depois de 64px e só volta abaixo de 16px. Sem ela, o próprio encolhimento
// (que reajusta a rolagem) faria o topo piscar entre os dois estados perto do limite.
const SHRINK_AT = 64;
const EXPAND_AT = 16;

function initHeaderShrink() {
    const header = $(".site-header");
    let isScrolled = false;

    function update() {
        const shouldShrink = isScrolled ? window.scrollY > EXPAND_AT : window.scrollY > SHRINK_AT;
        if (shouldShrink === isScrolled) return;
        isScrolled = shouldShrink;
        header.classList.toggle("is-scrolled", isScrolled);
    }

    window.addEventListener("scroll", update, { passive: true });
    update();
}

function initNavIndicator() {
    const menu = $(".nav__menu");
    const indicator = $(".nav__indicator");
    const links = $$(".nav__link");
    const linkFor = (sectionId) => links.find((link) => link.hash === `#${sectionId}`);

    let activeLink = null;
    let hoveredLink = null;

    // O sublinhado acompanha só o texto do link (sem o espaçamento interno)
    function moveIndicator(link) {
        indicator.classList.toggle("is-visible", Boolean(link));
        if (!link) return;
        const inset = parseFloat(getComputedStyle(link).paddingLeft) || 0;
        indicator.style.setProperty("--indicator-x", `${link.offsetLeft + inset}px`);
        indicator.style.setProperty("--indicator-width", String(link.offsetWidth - inset * 2));
    }

    function setActive(link) {
        if (link === activeLink) return;
        activeLink?.removeAttribute("aria-current");
        activeLink = link;
        activeLink?.setAttribute("aria-current", "true");
        if (!hoveredLink) moveIndicator(activeLink);
    }

    for (const link of links) {
        link.addEventListener("mouseenter", () => moveIndicator((hoveredLink = link)));
        link.addEventListener("focus", () => moveIndicator(link));
        link.addEventListener("blur", () => moveIndicator(hoveredLink ?? activeLink));
    }
    menu.addEventListener("mouseleave", () => {
        hoveredLink = null;
        moveIndicator(activeLink);
    });

    // Seção ativa: a que cruza a faixa central da tela (o hero não tem link, então não marca nada)
    const visible = new Set();
    const sections = links.map((link) => document.getElementById(link.hash.slice(1))).filter(Boolean);
    const observer = new IntersectionObserver(
        (entries) => {
            for (const entry of entries) {
                if (entry.isIntersecting) visible.add(entry.target.id);
                else visible.delete(entry.target.id);
            }
            const current = sections.findLast((section) => visible.has(section.id));
            setActive(current ? linkFor(current.id) : null);
        },
        { rootMargin: "-45% 0px -50% 0px" },
    );
    sections.forEach((section) => observer.observe(section));

    // A largura dos links muda quando a fonte carrega e ao redimensionar a tela
    const realign = () => moveIndicator(hoveredLink ?? activeLink);
    document.fonts?.ready.then(realign);
    window.addEventListener("resize", realign);
}

export function initHeader() {
    initHeaderShrink();
    initNavIndicator();
}
