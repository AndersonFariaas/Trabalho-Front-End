import { CAROUSEL_INTERVAL_MS, CAROUSEL_MAX_SLIDES } from "../config.js";
import { $, createElement, createProductImage, createStateMessage } from "../dom.js";
import { formatPrice } from "../format.js";

/** Carrossel de destaques da hero. Pausa com o mouse/foco em cima e com a aba em segundo plano. */
export function createCarousel() {
    const root = $("#heroCarousel");
    const track = $("#carouselTrack");
    const indicatorsContainer = $("#carouselIndicators");

    let slides = [];
    let indicators = [];
    let currentSlide = 0;
    let timer = null;

    function goTo(index) {
        if (slides.length === 0) return;
        currentSlide = (index + slides.length) % slides.length;

        slides.forEach((slide, i) => {
            const isActive = i === currentSlide;
            slide.classList.toggle("is-active", isActive);
            slide.setAttribute("aria-hidden", String(!isActive));
        });
        indicators.forEach((indicator, i) => indicator.setAttribute("aria-current", String(i === currentSlide)));
    }

    function stop() {
        clearInterval(timer);
        timer = null;
    }

    function start() {
        stop();
        if (slides.length > 1 && !document.hidden) {
            timer = setInterval(() => goTo(currentSlide + 1), CAROUSEL_INTERVAL_MS);
        }
    }

    function createSlide(product, index, total) {
        return createElement(
            "div",
            {
                className: "carousel__slide",
                attrs: { role: "group", "aria-roledescription": "slide", "aria-label": `${index + 1} de ${total}` },
            },
            [
                createProductImage(product.imagem, product.nome, "carousel__image"),
                createElement("div", { className: "carousel__caption" }, [
                    createElement("h4", { className: "carousel__title", text: product.nome }),
                    createElement("p", { className: "carousel__price", text: formatPrice(product.preco) }),
                ]),
            ],
        );
    }

    function createIndicator(product, index) {
        const indicator = createElement("button", {
            className: "carousel__dot",
            attrs: { type: "button", "aria-label": `Mostrar ${product.nome}` },
        });
        indicator.addEventListener("click", () => {
            goTo(index);
            start(); // reinicia a contagem para não trocar logo após o clique
        });
        return indicator;
    }

    /** @param {import("../../shared/products.js").Product[]} products */
    function render(products) {
        const highlights = products.slice(0, CAROUSEL_MAX_SLIDES);
        if (highlights.length === 0) return;

        slides = highlights.map((product, i) => createSlide(product, i, highlights.length));
        indicators = highlights.map(createIndicator);
        track.replaceChildren(...slides);
        indicatorsContainer.replaceChildren(...indicators);

        goTo(0);
        start();
    }

    function showMessage(message) {
        if (slides.length > 0) return; // mantém os destaques já exibidos
        track.replaceChildren(
            createElement("div", { className: "carousel__slide is-active" }, [createStateMessage(message)]),
        );
    }

    root.addEventListener("mouseenter", stop);
    root.addEventListener("mouseleave", start);
    root.addEventListener("focusin", stop);
    root.addEventListener("focusout", start);
    document.addEventListener("visibilitychange", () => (document.hidden ? stop() : start()));

    return { render, showMessage };
}
