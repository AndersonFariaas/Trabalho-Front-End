import { TOAST_DURATION_MS } from "../config.js";
import { $ } from "../dom.js";

/** Toast como popover na top layer: aparece acima dos modais (<dialog>). */
const element = $("#toast");
const supportsPopover = typeof element.showPopover === "function";
let hideTimer;

const isOpen = () => supportsPopover && element.matches(":popover-open");

function hide() {
    element.classList.remove("is-visible");
    if (isOpen()) element.hidePopover();
}

/** Reabrir o popover o coloca no topo da top layer, acima de um modal aberto depois dele. */
export function bringToastToFront() {
    if (!isOpen()) return;
    element.hidePopover();
    element.showPopover();
}

export function showToast(message) {
    clearTimeout(hideTimer);
    element.textContent = message;

    if (supportsPopover && !isOpen()) element.showPopover();
    bringToastToFront();
    element.classList.add("is-visible");

    hideTimer = setTimeout(hide, TOAST_DURATION_MS);
}
