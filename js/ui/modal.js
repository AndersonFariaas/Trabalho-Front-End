import { $$ } from "../dom.js";
import { bringToastToFront } from "./toast.js";

/** Modais com <dialog> nativo: foco, tecla Esc e empilhamento já vêm do navegador. */

export function openModal(modalId) {
    const modal = document.getElementById(modalId);
    if (!(modal instanceof HTMLDialogElement) || modal.open) return;
    modal.showModal();
    bringToastToFront();
}

export function closeModal(modalId) {
    document.getElementById(modalId)?.close();
}

export function isModalOpen(modalId) {
    return Boolean(document.getElementById(modalId)?.open);
}

export function initModals() {
    document.addEventListener("click", (event) => {
        const opener = event.target.closest("[data-open-modal]");
        if (opener) {
            openModal(opener.dataset.openModal);
            return;
        }
        event.target.closest("[data-close-modal]")?.closest("dialog")?.close();
    });

    // Fecha ao clicar no fundo escurecido (o clique cai no próprio <dialog>, fora do painel)
    for (const modal of $$("dialog.modal")) {
        modal.addEventListener("click", (event) => {
            if (event.target === modal) modal.close();
        });
    }
}
