import { $, createElement, createIcon } from "../dom.js";
import { formatCoins } from "../format.js";
import { LEVELS } from "../../shared/levels.js";
import { openModal } from "./modal.js";

/**
 * "Meu nível" no cartão do aluno: emblema no avatar, selo com o nome do nível e a barra de
 * progresso até o próximo. Tocar no selo ou na barra abre as regras dos níveis.
 * O servidor calcula o nível (shared/levels.js); aqui só se escolhe o ícone, e a cor vem
 * da classe level--{id} no CSS.
 *
 * @typedef {import("../../shared/levels.js").LevelInfo} LevelInfo
 * @typedef {import("../../shared/levels.js").LevelRef} LevelRef
 */

const LEVELS_MODAL = "niveis-modal";
const modalContent = $("#niveis-conteudo");

const LEVEL_ICONS = Object.freeze({
    aspirante: "terminal",
    explorador: "compass",
    sagaz: "bulb",
    mestre: "school",
    hacker: "shield",
    lendario: "crown",
});

// Nível criado no servidor antes de ganhar ícone próprio usa o troféu
const iconOf = (levelId) => LEVEL_ICONS[levelId] ?? "trophy";

/**
 * Emblema hexagonal do nível. Decorativo para leitores de tela: o nome do nível
 * sempre aparece em texto ao lado.
 *
 * @param {LevelRef} level
 */
export function renderLevelEmblem({ id, nome }) {
    return createElement(
        "span",
        { className: `level-emblem level--${id}`, attrs: { "aria-hidden": "true", title: nome } },
        [createElement("span", { className: "level-emblem__core" }, [createIcon(iconOf(id))])],
    );
}

/** @param {LevelInfo} level */
function progressBar({ proximo, progresso }) {
    const bar = createElement(
        "span",
        {
            className: "level-progress__bar",
            attrs: {
                role: "progressbar",
                "aria-valuemin": "0",
                "aria-valuemax": "100",
                "aria-valuenow": String(Math.round(progresso * 100)),
                "aria-label": proximo ? `Progresso até ${proximo.nome}` : "Nível máximo alcançado",
            },
        },
        [createElement("span", { className: "level-progress__fill" })],
    );
    bar.style.setProperty("--progress", String(progresso));
    return bar;
}

/** "Faltam 2.345 moedas para Programador sagaz". @param {LevelInfo} level */
function progressCaption({ proximo }) {
    return createElement("span", {
        className: "level-progress__caption",
        text: proximo ? `Faltam ${formatCoins(proximo.faltam)} para ${proximo.nome}` : "Nível máximo alcançado",
    });
}

/** Botão que abre as regras dos níveis. */
function levelsButton(className, children, level) {
    const button = createElement(
        "button",
        { className, attrs: { type: "button", "aria-haspopup": "dialog" } },
        children,
    );
    button.addEventListener("click", () => openLevelsModal(level));
    return button;
}

/** Selo com o nome do nível atual (só existe a partir do primeiro nível). @param {LevelInfo} level */
export function renderLevelBadge(level) {
    const { id, nome } = level.atual;
    return levelsButton(`profile-badge level-badge level--${id}`, [createIcon(iconOf(id)), nome], level);
}

/** Barra até o próximo nível, no fim do cartão. @param {LevelInfo} level */
export function renderLevelProgress(level) {
    const levelClass = level.atual ? `level--${level.atual.id}` : "";
    return levelsButton(
        `level-progress ${levelClass}`.trim(),
        [
            createElement("span", { className: "level-progress__head" }, [
                createElement("span", { className: "level-progress__label", text: "Meu nível" }),
                createElement("span", { className: "level-progress__more" }, [
                    "Ver níveis",
                    createIcon("chevron-right"),
                ]),
            ]),
            progressBar(level),
            progressCaption(level),
        ],
        level,
    );
}

/* ---------- Modal com as regras dos níveis ---------- */

/** @param {LevelInfo} level */
function renderCurrentLevel(level) {
    const { atual } = level;
    return createElement("div", { className: `levels-modal__current ${atual ? `level--${atual.id}` : ""}`.trim() }, [
        createElement("div", { className: "levels-modal__current-head" }, [
            ...(atual ? [renderLevelEmblem(atual)] : []),
            createElement("div", { className: "levels-modal__current-text" }, [
                createElement("span", { className: "levels-modal__eyebrow", text: "Seu nível" }),
                createElement("strong", {
                    className: "levels-modal__current-name",
                    text: atual?.nome ?? "Ainda sem emblema",
                }),
            ]),
        ]),
        progressBar(level),
        progressCaption(level),
    ]);
}

/** Marca à direita do nível: conquistado (✓) ou bloqueado (cadeado). */
function stateMark(state) {
    if (state === "achieved") {
        return [
            createElement("span", { className: "profile-badge level-badge levels-list__mark" }, [
                createIcon("check"),
                createElement("span", { className: "levels-list__mark-text", text: "Conquistado" }),
            ]),
        ];
    }
    if (state === "locked") {
        return [
            createElement("span", { className: "levels-list__lock" }, [
                createIcon("lock"),
                createElement("span", { className: "sr-only", text: "Bloqueado" }),
            ]),
        ];
    }
    return [];
}

/**
 * @param {(typeof LEVELS)[number]} level
 * @param {"achieved" | "current" | "locked"} state
 */
function renderLevelItem(level, state) {
    return createElement("li", { className: `levels-list__item level--${level.id} is-${state}` }, [
        renderLevelEmblem(level),
        createElement("div", { className: "levels-list__text" }, [
            createElement("strong", { className: "levels-list__name", text: level.nome }),
            createElement("span", { className: "levels-list__min", text: `a partir de ${formatCoins(level.moedas)}` }),
            ...(state === "current"
                ? [createElement("span", { className: "profile-badge level-badge", text: "Você está aqui" })]
                : []),
        ]),
        ...stateMark(state),
    ]);
}

/** @param {LevelInfo} level */
function openLevelsModal(level) {
    const currentIndex = level.atual ? LEVELS.findIndex(({ id }) => id === level.atual.id) : -1;
    const stateOf = (index) => {
        if (index < currentIndex) return "achieved";
        return index === currentIndex ? "current" : "locked";
    };

    modalContent.replaceChildren(
        createElement("p", { className: "levels-modal__intro" }, [
            "Seu nível sobe com as moedas que você ganha nas aulas (as mesmas do ranking). Comprar na loja ",
            createElement("strong", { text: "não" }),
            " tira o seu nível.",
        ]),
        renderCurrentLevel(level),
        createElement(
            "ol",
            { className: "levels-list", attrs: { "aria-label": "Todos os níveis" } },
            LEVELS.map((item, index) => renderLevelItem(item, stateOf(index))),
        ),
    );
    openModal(LEVELS_MODAL);
}
