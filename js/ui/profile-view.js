import { $, createElement, createIcon } from "../dom.js";
import { formatUnits } from "../format.js";
import * as Account from "../features/account.js";
import {
    coinsLabel,
    emptyState,
    renderStudentCard,
    replaceDrawerContent,
    sectionHeading,
    sessionExpiredMessage,
    thumbnail,
} from "./drawer.js";
import { renderLevelBadge, renderLevelEmblem, renderLevelProgress } from "./level-view.js";
import { isModalOpen, openModal } from "./modal.js";

/**
 * Painel do aluno: nome, saldo, ranking, "Meu nível" e o inventário com os produtos comprados.
 * Redesenhado a partir do estado da conta.
 */

const PROFILE_MODAL = "perfil-modal";
const content = $("#perfil-conteudo");

/** Produtos da compra que acabou de ser feita (id → quantidade), em destaque até o painel fechar. */
let justPurchased = new Map();

// O emblema e a barra do nível animam só ao abrir o painel, não a cada atualização do estado
let isOpening = false;

function renderInventoryLine(item, products, highlightOrder) {
    const addedQuantity = justPurchased.get(item.id);
    const line = createElement("li", { className: "line" }, [
        thumbnail(products.get(item.id)),
        createElement("div", { className: "line__info" }, [
            createElement("strong", { className: "line__title", text: item.nome }),
            createElement("span", { className: "line__meta" }, [
                formatUnits(item.quantidade),
                ...(addedQuantity
                    ? [createElement("span", { className: "line__added", text: `+${addedQuantity} agora` })]
                    : []),
            ]),
        ]),
        coinsLabel(item.preco_moedas),
    ]);
    if (addedQuantity) {
        line.classList.add("line--new");
        line.style.setProperty("--highlight-order", String(highlightOrder.next++));
    }
    return line;
}

const PODIUM_SIZE = 3;

/** Selo com a posição no ranking da turma (pelas moedas ganhas: compras na loja não alteram). */
function renderRankingBadge({ posicao, total }) {
    const badge = createElement("span", { className: "profile-badge" }, [
        createIcon("trophy"),
        `${posicao}º de ${total} no ranking`,
    ]);
    badge.classList.toggle("profile-badge--podium", posicao <= PODIUM_SIZE);
    return badge;
}

/** Cartão do aluno com ranking e "Meu nível" (emblema no avatar, selo e progresso). */
function renderProfileCard(profile) {
    const { ranking, nivel } = profile;
    const card = renderStudentCard(profile, {
        badges: [ranking && renderRankingBadge(ranking), nivel?.atual && renderLevelBadge(nivel)].filter(Boolean),
        avatarEmblem: nivel?.atual ? renderLevelEmblem(nivel.atual) : null,
        details: nivel ? renderLevelProgress(nivel) : null,
    });
    card.classList.toggle("is-opening", isOpening);
    isOpening = false;
    return card;
}

function renderProfile(state) {
    if (!isModalOpen(PROFILE_MODAL)) return;
    if (!state.profile) {
        content.replaceChildren(sessionExpiredMessage());
        return;
    }

    const inventory = [...state.profile.inventario].sort((a, b) => b.preco_moedas - a.preco_moedas);
    const highlightOrder = { next: 0 }; // os itens novos brilham um após o outro
    const panel = createElement("div", { className: "drawer__panel" }, [
        inventory.length > 0
            ? createElement(
                  "ul",
                  { className: "lines", attrs: { "aria-label": "Produtos comprados" } },
                  inventory.map((item) => renderInventoryLine(item, state.products, highlightOrder)),
              )
            : emptyState("box", "Seu inventário ainda está vazio.", PROFILE_MODAL),
    ]);

    replaceDrawerContent(content, [
        renderProfileCard(state.profile),
        sectionHeading("Inventário", inventory.length),
        panel,
    ]);
}

/** Rola a lista até o primeiro item novo, se ele estiver fora da área visível. */
function revealFirstNewItem() {
    const panel = content.querySelector(".drawer__panel");
    const line = panel?.querySelector(".line--new");
    if (!line) return;
    // As duas medidas sofrem a mesma transformação da entrada do painel: a diferença é exata
    const lineBox = line.getBoundingClientRect();
    const panelBox = panel.getBoundingClientRect();
    if (lineBox.bottom > panelBox.bottom) panel.scrollTop += lineBox.top - panelBox.top - 12;
}

/**
 * @param {{ highlight?: Map<string, number> }} [options] highlight: itens da compra recém-feita
 * (o perfil acabou de vir do servidor junto com a compra, então não é consultado de novo)
 */
export function openProfile({ highlight } = {}) {
    justPurchased = highlight ?? new Map();
    isOpening = true;
    content.replaceChildren(); // abre sempre do topo da lista
    openModal(PROFILE_MODAL);
    renderProfile(Account.accountStore.getState());
    revealFirstNewItem();
    if (!highlight) void Account.refreshProfile({ quiet: true });
}

export function initProfileView() {
    Account.accountStore.subscribe(renderProfile);
    $(`#${PROFILE_MODAL}`).addEventListener("close", () => (justPurchased = new Map()));
}
