import { $, createElement, createIcon } from "../dom.js";
import { formatCoins, formatUnits } from "../format.js";
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
import { isModalOpen, openModal } from "./modal.js";

/**
 * Painel do aluno: nome, saldo e o inventário com os produtos comprados.
 * Redesenhado a partir do estado da conta.
 */

const PROFILE_MODAL = "perfil-modal";
const content = $("#perfil-conteudo");

function renderInventoryLine(item, products) {
    return createElement("li", { className: "line" }, [
        thumbnail(products.get(item.id)),
        createElement("div", { className: "line__info" }, [
            createElement("strong", { className: "line__title", text: item.nome }),
            createElement("span", { className: "line__meta", text: formatUnits(item.quantidade) }),
        ]),
        coinsLabel(item.preco_moedas),
    ]);
}

const PODIUM_SIZE = 3;

function rankingStat(icon, label, value) {
    return createElement("div", { className: "ranking-stat" }, [
        createElement("span", { className: "ranking-stat__icon" }, [createIcon(icon)]),
        createElement("div", { className: "ranking-stat__text" }, [
            createElement("span", { className: "ranking-stat__label", text: label }),
            createElement("strong", { className: "ranking-stat__value", text: value }),
        ]),
    ]);
}

/**
 * Posição e moedas do ranking da turma. As moedas do ranking são as ganhas:
 * compras na loja não descontam daqui (só do saldo).
 */
function renderRanking({ posicao, total, moedas }) {
    const stats = createElement("div", { className: "ranking-stats", attrs: { "aria-label": "Ranking da turma" } }, [
        rankingStat("trophy", "Posição no ranking", `${posicao}º de ${total}`),
        rankingStat("coin", "Moedas no ranking", formatCoins(moedas)),
    ]);
    stats.classList.toggle("ranking-stats--podium", posicao <= PODIUM_SIZE);
    return stats;
}

function renderProfile(state) {
    if (!isModalOpen(PROFILE_MODAL)) return;
    if (!state.profile) {
        content.replaceChildren(sessionExpiredMessage());
        return;
    }

    const inventory = [...state.profile.inventario].sort((a, b) => b.preco_moedas - a.preco_moedas);
    const panel = createElement("div", { className: "drawer__panel" }, [
        inventory.length > 0
            ? createElement(
                  "ul",
                  { className: "lines", attrs: { "aria-label": "Produtos comprados" } },
                  inventory.map((item) => renderInventoryLine(item, state.products)),
              )
            : emptyState("box", "Seu inventário ainda está vazio.", PROFILE_MODAL),
    ]);

    replaceDrawerContent(content, [
        renderStudentCard(state.profile),
        ...(state.profile.ranking ? [renderRanking(state.profile.ranking)] : []),
        sectionHeading("Inventário", inventory.length),
        panel,
    ]);
}

export function openProfile() {
    content.replaceChildren(); // abre sempre do topo da lista
    openModal(PROFILE_MODAL);
    renderProfile(Account.accountStore.getState());
    void Account.refreshProfile({ quiet: true });
}

export function initProfileView() {
    Account.accountStore.subscribe(renderProfile);
}
