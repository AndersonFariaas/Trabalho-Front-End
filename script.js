"use strict";

/* =====================================================
CONFIGURAÇÃO
====================================================== */
const API_URL = "https://onlinestorage.you.tec.br/api/getkey/senai/produtos";
const API_TIMEOUT_MS = 10_000;
const REFRESH_INTERVAL_MS = 30_000;
const CAROUSEL_INTERVAL_MS = 4_000;
const CAROUSEL_MAX_SLIDES = 5;
const TOAST_DURATION_MS = 2_800;
const TOTAL_CATEGORIES = 9;
const DEFAULT_CATEGORY = 1;

const STORAGE_KEYS = {
    users: "usersDB",
    session: "currentUser",
    theme: "tema",
};

const MESSAGES = {
    emptyStore: "A loja ainda não possui produtos cadastrados.",
    apiError: "Falha ao ler os produtos da API.",
    emptyCategory: "Em breve novos produtos nesta categoria!",
};

// Imagem local usada quando a foto do produto não carrega (não depende de serviços externos)
const FALLBACK_IMAGE = `data:image/svg+xml,${encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 300">
        <rect width="400" height="300" fill="#e2e8f0"/>
        <path d="M150 190l35-45 25 30 20-22 40 37z" fill="#94a3b8"/>
        <circle cx="245" cy="120" r="14" fill="#94a3b8"/>
        <text x="200" y="240" font-family="sans-serif" font-size="16" fill="#64748b" text-anchor="middle">Imagem indisponível</text>
    </svg>`
)}`;

const currencyFormatter = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });

/* =====================================================
UTILITÁRIOS
====================================================== */
const $ = (selector, root = document) => root.querySelector(selector);
const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];

/**
 * Cria um elemento de forma segura (sem innerHTML), evitando injeção de HTML
 * com dados vindos da API ou digitados pelo usuário.
 */
function createElement(tag, { className, text, attrs = {} } = {}, children = []) {
    const element = document.createElement(tag);
    if (className) element.className = className;
    if (text !== undefined) element.textContent = text;
    Object.entries(attrs).forEach(([name, value]) => element.setAttribute(name, value));
    element.append(...children);
    return element;
}

function createIcon(name) {
    const svgNS = "http://www.w3.org/2000/svg";
    const svg = document.createElementNS(svgNS, "svg");
    svg.setAttribute("class", "icon");
    svg.setAttribute("aria-hidden", "true");
    const use = document.createElementNS(svgNS, "use");
    use.setAttribute("href", `#i-${name}`);
    svg.append(use);
    return svg;
}

function createStateMessage(message) {
    return createElement("p", { className: "state-msg", text: message });
}

function formatPrice(value) {
    return currencyFormatter.format(Number(value) || 0);
}

function createProductImage(src, alt, className = "") {
    const img = createElement("img", {
        className,
        attrs: { src: src || FALLBACK_IMAGE, alt, loading: "lazy", decoding: "async" },
    });
    // { once: true } evita loop infinito caso o fallback também falhe
    img.addEventListener("error", () => { img.src = FALLBACK_IMAGE; }, { once: true });
    return img;
}

/** Acesso ao localStorage tolerante a dados corrompidos ou armazenamento bloqueado. */
const storage = {
    read(key, fallback) {
        try {
            const raw = localStorage.getItem(key);
            return raw ? JSON.parse(raw) : fallback;
        } catch {
            return fallback;
        }
    },
    write(key, value) {
        try {
            localStorage.setItem(key, JSON.stringify(value));
        } catch (erro) {
            console.warn("Não foi possível salvar no localStorage:", erro);
        }
    },
    remove(key) {
        try {
            localStorage.removeItem(key);
        } catch { /* armazenamento indisponível */ }
    },
};

/* =====================================================
TOAST
====================================================== */
const toast = (() => {
    const element = $("#toast");
    const supportsPopover = typeof element.showPopover === "function";
    let hideTimer;

    function hide() {
        element.classList.remove("is-visible");
        if (supportsPopover && element.matches(":popover-open")) element.hidePopover();
    }

    // Reabrir o popover o coloca no topo da top layer, acima de qualquer modal aberto
    function bringToFront() {
        if (!supportsPopover || !element.matches(":popover-open")) return;
        element.hidePopover();
        element.showPopover();
    }

    function show(message) {
        clearTimeout(hideTimer);
        element.textContent = message;

        if (supportsPopover && !element.matches(":popover-open")) element.showPopover();
        bringToFront();
        element.classList.add("is-visible");

        hideTimer = setTimeout(hide, TOAST_DURATION_MS);
    }

    return { show, bringToFront };
})();

const showToast = toast.show;

/* =====================================================
MODAIS (<dialog> nativo: foco, tecla Esc e empilhamento automáticos)
====================================================== */
function openModal(modalId) {
    const modal = document.getElementById(modalId);
    if (!modal || modal.open) return;
    modal.showModal();
    toast.bringToFront();
}

function closeModal(modalId) {
    document.getElementById(modalId)?.close();
}

function initModals() {
    document.addEventListener("click", event => {
        const opener = event.target.closest("[data-open-modal]");
        if (opener) {
            openModal(opener.dataset.openModal);
            return;
        }

        const closer = event.target.closest("[data-close-modal]");
        if (closer) closer.closest("dialog")?.close();
    });

    // Fecha ao clicar fora do conteúdo (no fundo escurecido)
    $$("dialog.modal").forEach(modal => {
        modal.addEventListener("click", event => {
            if (event.target === modal) modal.close();
        });
    });
}

/* =====================================================
MENU MOBILE
====================================================== */
function initMobileMenu() {
    const navLinks = $("#navLinks");
    const menuBtn = $("#menuBtn");
    const desktopQuery = window.matchMedia("(min-width: 901px)");

    function setMenuOpen(isOpen) {
        navLinks.classList.toggle("open", isOpen);
        menuBtn.setAttribute("aria-expanded", String(isOpen));
        menuBtn.setAttribute("aria-label", isOpen ? "Fechar menu" : "Abrir menu");
    }

    menuBtn.addEventListener("click", () => {
        setMenuOpen(!navLinks.classList.contains("open"));
    });

    // Fecha o menu ao escolher um link ou um botão de conta
    navLinks.addEventListener("click", event => {
        if (event.target.closest("a, button")) setMenuOpen(false);
    });

    document.addEventListener("keydown", event => {
        if (event.key === "Escape" && navLinks.classList.contains("open")) {
            setMenuOpen(false);
            menuBtn.focus();
        }
    });

    desktopQuery.addEventListener("change", event => {
        if (event.matches) setMenuOpen(false);
    });
}

/* =====================================================
NEWSLETTER
====================================================== */
function initNewsletter() {
    const newsletterForm = $("#newsletterForm");
    if (!newsletterForm) return;

    newsletterForm.addEventListener("submit", event => {
        event.preventDefault();
        const email = newsletterForm.elements.email.value.trim();
        if (!email) return;

        showToast("Inscrição confirmada! Bem-vindo às novidades do SENAI FIRJAN.");
        newsletterForm.reset();
    });
}

/* =====================================================
MODO CLARO E ESCURO
====================================================== */
function initThemeToggle() {
    const root = document.documentElement;
    const botaoTema = $("#botaoTema");
    const themeColorMeta = $('meta[name="theme-color"]');

    function applyTheme(theme) {
        root.dataset.theme = theme;
        const isDark = theme === "dark";
        botaoTema.setAttribute("aria-label", isDark ? "Ativar modo claro" : "Ativar modo escuro");
        themeColorMeta?.setAttribute("content", isDark ? "#060a14" : "#f5f7fb");
    }

    applyTheme(root.dataset.theme === "light" ? "light" : "dark");

    botaoTema.addEventListener("click", () => {
        const nextTheme = root.dataset.theme === "dark" ? "light" : "dark";
        applyTheme(nextTheme);
        try {
            localStorage.setItem(STORAGE_KEYS.theme, nextTheme);
        } catch { /* armazenamento indisponível */ }
    });
}

/* =====================================================
CARROSSEL DE DESTAQUES NA HERO
====================================================== */
const carousel = (() => {
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

        indicators.forEach((indicator, i) => {
            indicator.setAttribute("aria-current", String(i === currentSlide));
        });
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

    function createSlide(produto, index, total) {
        return createElement("div", {
            className: "carousel__slide",
            attrs: { role: "group", "aria-roledescription": "slide", "aria-label": `${index + 1} de ${total}` },
        }, [
            createProductImage(produto.imagem, produto.nome, "carousel__image"),
            createElement("div", { className: "carousel__caption" }, [
                createElement("h4", { className: "carousel__title", text: produto.nome }),
                createElement("p", { className: "carousel__price", text: formatPrice(produto.preco) }),
            ]),
        ]);
    }

    function createIndicator(produto, index) {
        const indicator = createElement("button", {
            className: "carousel__dot",
            attrs: { type: "button", "aria-label": `Mostrar ${produto.nome}` },
        });
        indicator.addEventListener("click", () => {
            goTo(index);
            start(); // reinicia a contagem para não trocar logo após o clique
        });
        return indicator;
    }

    function render(produtos) {
        const destaques = produtos.slice(0, CAROUSEL_MAX_SLIDES);
        if (destaques.length === 0) return;

        slides = destaques.map((produto, i) => createSlide(produto, i, destaques.length));
        indicators = destaques.map(createIndicator);

        track.replaceChildren(...slides);
        indicatorsContainer.replaceChildren(...indicators);

        goTo(0);
        start();
    }

    function showMessage(message) {
        if (slides.length > 0) return; // mantém os destaques já exibidos
        track.replaceChildren(
            createElement("div", { className: "carousel__slide is-active" }, [createStateMessage(message)])
        );
    }

    // Pausa enquanto o usuário interage ou a aba está em segundo plano
    root.addEventListener("mouseenter", stop);
    root.addEventListener("mouseleave", start);
    root.addEventListener("focusin", stop);
    root.addEventListener("focusout", start);
    document.addEventListener("visibilitychange", () => (document.hidden ? stop() : start()));

    return { render, showMessage };
})();

/* =====================================================
INTEGRAÇÃO COM A API - PRODUTOS E CATEGORIAS
====================================================== */
function getCategoryGrid(categoryId) {
    return document.getElementById(`grid-${categoryId}`);
}

function toProduct(item, nomeFallback) {
    const data = item && typeof item === "object" ? item : {};
    return {
        nome: String(data.nome || nomeFallback || "Produto sem nome"),
        preco: Number(data.preco) || 0,
        imagem: data.imagem || "",
        categoria: data.categoria || DEFAULT_CATEGORY,
    };
}

/** Converte o formato da API ({ "NOME": { preco, imagem, categoria } } ou array) em uma lista. */
function normalizeProducts(value) {
    let parsed = value;

    if (typeof parsed === "string") {
        try {
            parsed = JSON.parse(parsed);
        } catch {
            return [];
        }
    }

    if (Array.isArray(parsed)) return parsed.map(item => toProduct(item));
    if (parsed && typeof parsed === "object") {
        return Object.entries(parsed).map(([nome, item]) => toProduct(item, nome));
    }
    return [];
}

async function fetchProducts() {
    const resposta = await fetch(API_URL, {
        cache: "no-store",
        signal: AbortSignal.timeout(API_TIMEOUT_MS),
    });
    if (!resposta.ok) throw new Error(`Erro de comunicação com a API (HTTP ${resposta.status})`);

    const dadosRaw = await resposta.json();
    return normalizeProducts(dadosRaw?.value);
}

function createProductCard(produto) {
    const buyButton = createElement("button", {
        className: "btn btn--primary btn--sm btn--block",
        text: "Comprar",
        attrs: { type: "button", "aria-label": `Comprar ${produto.nome}` },
    });
    buyButton.dataset.buy = produto.nome;

    return createElement("article", { className: "product-card" }, [
        createElement("div", { className: "product-card__media" }, [
            createProductImage(produto.imagem, produto.nome),
        ]),
        createElement("div", { className: "product-card__body" }, [
            createElement("h4", { className: "product-card__title", text: produto.nome }),
            createElement("p", { className: "product-card__price", text: formatPrice(produto.preco) }),
            buyButton,
        ]),
    ]);
}

function renderProducts(produtos) {
    const cardsByCategory = new Map();

    produtos.forEach(produto => {
        const categoryId = getCategoryGrid(produto.categoria) ? produto.categoria : DEFAULT_CATEGORY;
        if (!cardsByCategory.has(categoryId)) cardsByCategory.set(categoryId, []);
        cardsByCategory.get(categoryId).push(createProductCard(produto));
    });

    for (let id = 1; id <= TOTAL_CATEGORIES; id++) {
        const cards = cardsByCategory.get(id);
        getCategoryGrid(id)?.replaceChildren(...(cards ?? [createStateMessage(MESSAGES.emptyCategory)]));
    }
}

/** Exibe a mensagem somente nas categorias que ainda não têm produtos carregados. */
function showMessageInEmptyGrids(message) {
    for (let id = 1; id <= TOTAL_CATEGORIES; id++) {
        const grid = getCategoryGrid(id);
        if (grid && !grid.querySelector(".product-card")) {
            grid.replaceChildren(createStateMessage(message));
        }
    }
}

const productLoader = (() => {
    let lastSignature = "";
    let isLoading = false;

    async function load() {
        if (isLoading) return;
        isLoading = true;

        try {
            const produtos = await fetchProducts();

            if (produtos.length === 0) {
                showMessageInEmptyGrids(MESSAGES.emptyStore);
                carousel.showMessage(MESSAGES.emptyStore);
                return;
            }

            // Só redesenha se os dados mudaram (evita "piscar" a cada atualização)
            const signature = JSON.stringify(produtos);
            if (signature === lastSignature) return;
            lastSignature = signature;

            renderProducts(produtos);
            carousel.render(produtos);
        } catch (erro) {
            console.error("ERRO AO LER OS PRODUTOS:", erro);
            showMessageInEmptyGrids(MESSAGES.apiError);
            carousel.showMessage(MESSAGES.apiError);
        } finally {
            isLoading = false;
        }
    }

    function startAutoRefresh() {
        // Atualiza automaticamente, mas não consome rede com a aba em segundo plano
        setInterval(() => {
            if (!document.hidden) load();
        }, REFRESH_INTERVAL_MS);
    }

    return { load, startAutoRefresh };
})();

/* =====================================================
SISTEMA DE CONTAS (simulado com localStorage) E PERFIL
====================================================== */
const auth = (() => {
    const usersDB = storage.read(STORAGE_KEYS.users, {});
    let currentUser = null;
    let isLoginMode = true;

    const authArea = $("#auth-area");
    const authForm = $("#auth-form");
    const authTitle = $("#auth-title");
    const authSubmitBtn = $("#auth-submit-btn");
    const authToggleLink = $("#auth-toggle-link");
    const authSwitchText = $("#auth-switch-text");
    const usernameInput = $("#auth-username");
    const passwordInput = $("#auth-password");
    const perfilConteudo = $("#perfil-conteudo");

    function findUser(username) {
        return Object.hasOwn(usersDB, username) ? usersDB[username] : null;
    }

    function saveUsers() {
        storage.write(STORAGE_KEYS.users, usersDB);
    }

    // A sessão guarda só o nome; os dados ficam numa única fonte (usersDB)
    function restoreSession() {
        const session = storage.read(STORAGE_KEYS.session, null);
        currentUser = session?.username ? findUser(session.username) : null;
    }

    function startSession(user) {
        currentUser = user;
        storage.write(STORAGE_KEYS.session, { username: user.username });
        closeModal("auth-modal");
        renderAuthUI();
    }

    function createButton(label, variant, onClick) {
        const button = createElement("button", {
            className: `btn btn--${variant} btn--sm`,
            text: label,
            attrs: { type: "button" },
        });
        button.addEventListener("click", onClick);
        return button;
    }

    // Renderiza os botões dinamicamente no cabeçalho
    function renderAuthUI() {
        if (!authArea) return;

        if (currentUser) {
            const greeting = createElement("span", { className: "auth-area__greeting", text: "Olá, " }, [
                createElement("strong", { text: currentUser.username }),
            ]);
            authArea.replaceChildren(
                greeting,
                createButton("Meu Perfil", "primary", showProfile),
                createButton("Sair", "ghost", logout)
            );
        } else {
            authArea.replaceChildren(
                createButton("Login", "ghost", () => openAuth("login")),
                createButton("Registrar", "primary", () => openAuth("register"))
            );
        }
    }

    // Alterna os textos entre Login e Registro
    function updateAuthTexts() {
        authTitle.textContent = isLoginMode ? "Login do Aluno" : "Criar Perfil";
        authSubmitBtn.textContent = isLoginMode ? "Entrar" : "Cadastrar";
        authSwitchText.textContent = isLoginMode ? "Não tem conta?" : "Já possui perfil?";
        authToggleLink.textContent = isLoginMode ? "Registre-se" : "Faça Login";
        passwordInput.autocomplete = isLoginMode ? "current-password" : "new-password";
    }

    // Abre o modal de Login ou Registro
    function openAuth(mode) {
        isLoginMode = mode === "login";
        updateAuthTexts();
        authForm.reset();
        openModal("auth-modal");
    }

    function login(username, password) {
        const user = findUser(username);
        if (!user || user.password !== password) {
            showToast("Usuário ou senha incorretos!");
            return;
        }
        startSession(user);
        showToast(`Bem-vindo de volta, ${username}!`);
    }

    function register(username, password) {
        if (findUser(username)) {
            showToast("Esse usuário já está em uso!");
            return;
        }
        // Cria o usuário com uma lista vazia de compras e já faz o login
        usersDB[username] = { username, password, compras: [] };
        saveUsers();
        startSession(usersDB[username]);
        showToast("Perfil criado com sucesso!");
    }

    function handleSubmit(event) {
        event.preventDefault();
        const username = usernameInput.value.trim();
        const password = passwordInput.value.trim();

        if (!username || !password) {
            showToast("Preencha usuário e senha.");
            (username ? passwordInput : usernameInput).focus();
            return;
        }

        if (isLoginMode) login(username, password);
        else register(username, password);
    }

    function logout() {
        currentUser = null;
        storage.remove(STORAGE_KEYS.session);
        showToast("Você saiu da conta.");
        renderAuthUI();
    }

    // Exibe o modal com o perfil e os produtos do usuário
    function showProfile() {
        if (!currentUser) return;

        const compras = currentUser.compras ?? [];
        const userInfo = createElement("p", { className: "profile__user" }, [
            createElement("span", { text: "Usuário Logado: " }),
            createElement("strong", { text: currentUser.username }),
        ]);
        const subtitle = createElement("h4", { className: "profile__subtitle", text: "Produtos Adquiridos:" });

        // Mostra as compras mais recentes primeiro
        const content = compras.length > 0
            ? createElement("ul", { className: "profile__list" },
                [...compras].reverse().map(compra =>
                    createElement("li", { className: "profile__item" }, [createIcon("cart"), compra])
                ))
            : createElement("p", {
                className: "profile__empty",
                text: "Você ainda não possui produtos salvos no seu perfil.",
            });

        perfilConteudo.replaceChildren(userInfo, subtitle, content);
        openModal("perfil-modal");
    }

    function buyProduct(nomeProduto) {
        if (!currentUser) {
            showToast("Faça login ou registre-se para salvar o produto!");
            openAuth("login");
            return;
        }

        currentUser.compras ??= [];
        currentUser.compras.push(nomeProduto);
        saveUsers();

        showToast(`"${nomeProduto}" foi salvo no seu perfil!`);
    }

    function init() {
        restoreSession();
        renderAuthUI();

        authForm.addEventListener("submit", handleSubmit);

        // Alternar entre tela de Login e Registro
        authToggleLink.addEventListener("click", () => {
            isLoginMode = !isLoginMode;
            updateAuthTexts();
            usernameInput.focus();
        });

        // Delegação: um único listener atende todos os botões "Comprar"
        document.addEventListener("click", event => {
            const buyButton = event.target.closest("[data-buy]");
            if (buyButton) buyProduct(buyButton.dataset.buy);
        });
    }

    return { init };
})();

/* =====================================================
INICIALIZAÇÃO
====================================================== */
initModals();
initMobileMenu();
initNewsletter();
initThemeToggle();
auth.init();
productLoader.load();
productLoader.startAutoRefresh();
