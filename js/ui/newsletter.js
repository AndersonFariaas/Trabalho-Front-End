import { $ } from "../dom.js";
import { showToast } from "./toast.js";

export function initNewsletter() {
    const form = $("#newsletterForm");
    if (!form) return;

    form.addEventListener("submit", (event) => {
        event.preventDefault();
        if (!form.elements.email.value.trim()) return;

        showToast("Inscrição confirmada! Boas-vindas às novidades da Firjan SENAI.");
        form.reset();
    });
}
