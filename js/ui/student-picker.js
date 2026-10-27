import { createElement, createIcon } from "../dom.js";

/**
 * Campo de nome do login como lista com busca (padrão "combobox" da WAI-ARIA): tocar no campo
 * abre a lista de alunos e digitar filtra, ignorando acentos e maiúsculas. O foco fica sempre
 * no campo; a opção em destaque é indicada por aria-activedescendant.
 * Se a lista não carregar, o campo continua aceitando o nome digitado.
 */

const OPTION_ID_PREFIX = "aluno-opcao-";

/** "Ândérson" → "anderson": compara nomes sem acento nem maiúsculas. */
const normalize = (text) =>
    text
        .normalize("NFD")
        .replace(/\p{Diacritic}/gu, "")
        .toLowerCase()
        .replace(/\s+/g, " ")
        .trim();

/** A busca casa com o começo de qualquer palavra: "and" acha "Anderson", mas não "Fernandes". */
const matchesQuery = (name, query) => {
    const normalized = normalize(name);
    return normalized.startsWith(query) || normalized.includes(` ${query}`);
};

/**
 * @param {object} options
 * @param {HTMLInputElement} options.input campo com role="combobox"
 * @param {HTMLUListElement} options.list lista com role="listbox"
 * @param {HTMLButtonElement} options.toggle seta que abre e fecha a lista
 * @param {() => Promise<string[]>} options.loadNames nomes da turma ([] se indisponível)
 * @param {() => void} options.onPick depois de escolher um nome (ex.: ir para a senha)
 */
export function initStudentPicker({ input, list, toggle, loadNames, onPick }) {
    /** @type {"idle" | "loading" | "ready" | "failed"} */
    let status = "idle";
    let names = [];
    let visible = []; // nomes na lista com o filtro atual
    let activeIndex = -1;
    let escapeHandled = false;

    const isOpen = () => !list.hidden;

    async function ensureNames() {
        if (status === "loading" || status === "ready") return;
        status = "loading";
        names = await loadNames();
        status = names.length > 0 ? "ready" : "failed"; // falhou: tenta de novo na próxima vez
        if (isOpen()) render();
    }

    function message(text) {
        return createElement("li", {
            className: "combobox__message",
            text,
            attrs: { role: "option", "aria-disabled": "true" },
        });
    }

    function renderOption(name, index) {
        const isSelected = name === input.value;
        const option = createElement(
            "li",
            {
                className: "combobox__option",
                attrs: { role: "option", id: `${OPTION_ID_PREFIX}${index}`, "aria-selected": String(isSelected) },
            },
            [createElement("span", { text: name }), ...(isSelected ? [createIcon("check")] : [])],
        );
        option.dataset.name = name;
        return option;
    }

    function render() {
        if (status !== "ready") {
            visible = [];
            list.replaceChildren(
                message(
                    status === "failed"
                        ? "Não foi possível carregar a lista. Digite seu nome completo."
                        : "Carregando alunos…",
                ),
            );
            setActive(-1);
            return;
        }

        // Com um nome já escolhido, mostra a lista inteira: tocar de novo serve para trocar
        const query = normalize(input.value);
        const hasPickedName = names.includes(input.value);
        visible = query && !hasPickedName ? names.filter((name) => matchesQuery(name, query)) : names;

        list.replaceChildren(
            ...(visible.length > 0 ? visible.map(renderOption) : [message("Nenhum aluno encontrado com esse nome.")]),
        );
        setActive(hasPickedName ? names.indexOf(input.value) : -1);
    }

    function setActive(index) {
        list.querySelector(".is-active")?.classList.remove("is-active");
        activeIndex = index;
        const option = index >= 0 ? list.querySelector(`#${OPTION_ID_PREFIX}${index}`) : null;
        if (!option) {
            input.removeAttribute("aria-activedescendant");
            return;
        }
        option.classList.add("is-active");
        input.setAttribute("aria-activedescendant", option.id);
        option.scrollIntoView({ block: "nearest" });
    }

    function open() {
        if (!isOpen()) {
            list.hidden = false;
            input.setAttribute("aria-expanded", "true");
        }
        render();
        void ensureNames();
    }

    function close() {
        if (!isOpen()) return;
        list.hidden = true;
        input.setAttribute("aria-expanded", "false");
        setActive(-1);
    }

    function pick(name) {
        input.value = name;
        close();
        onPick();
    }

    function moveActive(step) {
        if (!isOpen()) {
            open();
            return;
        }
        if (visible.length === 0) return;
        const next = activeIndex === -1 && step < 0 ? visible.length - 1 : activeIndex + step;
        setActive((next + visible.length) % visible.length); // dá a volta nas pontas
    }

    function handleKeydown(event) {
        switch (event.key) {
            case "ArrowDown":
            case "ArrowUp":
                event.preventDefault();
                moveActive(event.key === "ArrowDown" ? 1 : -1);
                break;
            case "Enter":
                // Com um nome em destaque, Enter escolhe; sem destaque, envia o formulário
                if (isOpen() && activeIndex >= 0) {
                    event.preventDefault();
                    pick(visible[activeIndex]);
                }
                break;
            case "Escape":
                // O primeiro Esc fecha só a lista, não o modal do login
                if (isOpen()) {
                    event.preventDefault();
                    escapeHandled = true;
                    setTimeout(() => (escapeHandled = false));
                    close();
                }
                break;
            case "Tab":
                close();
                break;
        }
    }

    input.addEventListener("focus", () => void ensureNames()); // já busca os nomes antes do toque
    input.addEventListener("click", open);
    input.addEventListener("input", () => {
        open();
        setActive(input.value.trim() && visible.length > 0 ? 0 : -1);
    });
    input.addEventListener("keydown", handleKeydown);
    input.closest("dialog")?.addEventListener("cancel", (event) => {
        if (escapeHandled) event.preventDefault();
    });

    // A seta e as opções não roubam o foco do campo (senão a lista fecharia antes do clique)
    toggle.addEventListener("pointerdown", (event) => event.preventDefault());
    toggle.addEventListener("click", () => {
        if (isOpen()) {
            close();
            return;
        }
        input.focus();
        open();
    });
    list.addEventListener("pointerdown", (event) => event.preventDefault());
    list.addEventListener("click", (event) => {
        const option = event.target.closest(".combobox__option");
        if (option) pick(option.dataset.name);
    });

    // Fecha ao tocar fora. Não usa "blur": no iPhone, tocar numa opção pode tirar o foco do
    // campo antes do clique, e a lista sumiria sem escolher o nome.
    const root = input.closest(".combobox");
    document.addEventListener("pointerdown", (event) => {
        if (isOpen() && !root.contains(event.target)) close();
    });

    return { close };
}
