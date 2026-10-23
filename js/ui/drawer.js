import { createButton, createElement, createIcon, createProductImage } from "../dom.js";
import { formatCoins } from "../format.js";
import { createBalance } from "./balance.js";
import { closeModal } from "./modal.js";

/** Peças compartilhadas pelos painéis laterais do aluno (perfil e carrinho). */

/** Iniciais do primeiro e do último nome (ex.: "Anderson Farias" → "AF"). */
function initials(name) {
    const words = name.trim().split(/\s+/).filter(Boolean);
    const letters = words.length > 1 ? [words[0], words.at(-1)] : words;
    return letters
        .map((word) => word[0])
        .join("")
        .toUpperCase();
}

export function coinsLabel(value) {
    return createElement("span", { className: "coins" }, [createIcon("coin"), formatCoins(value)]);
}

// Imagem decorativa: o nome do produto já aparece ao lado
export function thumbnail(product) {
    return createElement("span", { className: "line__thumb" }, [
        createProductImage(product?.imagem, "", "line__image"),
    ]);
}

/**
 * Foto do aluno (cadastro da turma) sobre as iniciais: se a foto faltar ou não carregar,
 * as iniciais continuam aparecendo.
 */
function renderAvatar(profile) {
    const avatar = createElement("span", {
        className: "profile-card__avatar",
        text: initials(profile.nome),
        attrs: { "aria-hidden": "true" },
    });
    if (profile.foto) {
        const photo = createElement("img", {
            className: "profile-card__photo",
            attrs: { src: profile.foto, alt: "", decoding: "async" },
        });
        photo.addEventListener("error", () => photo.remove(), { once: true });
        avatar.append(photo);
    }
    return avatar;
}

/**
 * Cartão com avatar, nome e saldo do aluno (topo dos dois painéis).
 *
 * @param {{ badge?: HTMLElement | null }} [options] badge: selo abaixo do nome (ex.: posição no ranking)
 */
export function renderStudentCard(profile, { badge } = {}) {
    return createElement("div", { className: "profile-card" }, [
        renderAvatar(profile),
        createElement("div", { className: "profile-card__info" }, [
            createElement("span", { className: "profile-card__eyebrow", text: "Perfil do aluno" }),
            createElement("strong", { className: "profile-card__name", text: profile.nome }),
            ...(badge ? [badge] : []),
        ]),
        createElement("div", { className: "profile-card__balance" }, [
            createElement("span", { text: "Saldo de moedas" }),
            createBalance(profile, { tag: "strong" }),
        ]),
    ]);
}

export function sectionHeading(title, count) {
    return createElement("div", { className: "drawer__heading" }, [
        createElement("h4", { text: title }),
        createElement("span", { className: "count-badge", text: String(count) }),
    ]);
}

/** Estado vazio com atalho para o catálogo (fecha o painel e rola até os produtos). */
export function emptyState(icon, message, modalId) {
    const explore = createButton("Explorar catálogo", "ghost", () => {
        closeModal(modalId);
        document.getElementById("produtos")?.scrollIntoView();
    });
    return createElement("div", { className: "empty-state" }, [
        createElement("span", { className: "empty-state__icon" }, [createIcon(icon)]),
        createElement("p", { text: message }),
        explore,
    ]);
}

export function sessionExpiredMessage() {
    return createElement("p", {
        className: "profile__empty",
        text: "Sua sessão não está ativa. Entre novamente para consultar seu saldo e inventário.",
    });
}

/**
 * Troca o conteúdo do painel sem tirar o foco do teclado nem a posição da rolagem da lista.
 * Se o elemento focado sumiu (ex.: item removido), o foco vai para o botão de fechar.
 */
export function replaceDrawerContent(container, children) {
    const focusKey = container.contains(document.activeElement) ? document.activeElement.dataset.focusKey : null;
    const scrollTop = container.querySelector(".drawer__panel")?.scrollTop ?? 0;

    container.replaceChildren(...children);

    const panel = container.querySelector(".drawer__panel");
    if (panel) panel.scrollTop = scrollTop;
    if (focusKey) {
        const target =
            container.querySelector(`[data-focus-key="${CSS.escape(focusKey)}"]`) ??
            container.closest("dialog")?.querySelector("[data-close-modal]");
        target?.focus({ preventScroll: true });
    }
}
