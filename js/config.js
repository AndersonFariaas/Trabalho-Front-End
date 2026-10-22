export const PRODUCTS_URL = "https://onlinestorage.you.tec.br/api/getkey/senai/produtos";
export const PRODUCTS_TIMEOUT_MS = 10_000;
export const PRODUCTS_REFRESH_MS = 30_000;

/** Quantos produtos aleatórios entram na faixa de destaques. */
export const FEATURED_COUNT = 12;
export const TOAST_DURATION_MS = 2_800;

export const TOTAL_CATEGORIES = 9;
export const MAX_QUANTITY_PER_PRODUCT = 99;

/** Breakpoint em que o menu deixa de ser o painel mobile (mesmo valor do CSS). */
export const DESKTOP_MEDIA_QUERY = "(min-width: 901px)";

export const STORAGE_KEYS = Object.freeze({
    theme: "tema",
    cartPrefix: "senaiShopCart:",
});

export const THEME_COLORS = Object.freeze({ dark: "#060a14", light: "#f5f7fb" });

export const MESSAGES = Object.freeze({
    emptyStore: "A loja ainda não possui produtos cadastrados.",
    apiError: "Falha ao ler os produtos da API.",
    emptyCategory: "Em breve novos produtos nesta categoria!",
});
