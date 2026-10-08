/* =====================================================
TOAST
====================================================== */
const toast = document.getElementById("toast");

function showToast(message) {
    toast.textContent = message;
    toast.classList.add("show");

    clearTimeout(window.toastTimer);

    window.toastTimer = setTimeout(() => {
        toast.classList.remove("show");
    }, 2800);
}

/* =====================================================
MENU MOBILE
====================================================== */
const navLinks = document.getElementById("navLinks");
const menuBtn = document.getElementById("menuBtn");

menuBtn.addEventListener("click", () => {
    navLinks.classList.toggle("open");
    menuBtn.innerHTML = navLinks.classList.contains("open") ? "✕" : "☰";
});

document.querySelectorAll(".nav-links a").forEach(link => {
    link.addEventListener("click", () => {
        navLinks.classList.remove("open");
        menuBtn.innerHTML = "☰";
    });
});

/* =====================================================
NEWSLETTER
====================================================== */
const newsletterForm = document.getElementById("newsletterForm");

if (newsletterForm) {
    newsletterForm.addEventListener("submit", event => {
        event.preventDefault();
        const email = document.getElementById("email").value.trim();
        if (email) {
            showToast("Inscrição confirmada! Bem-vindo às novidades do SENAI FIRJAN.");
            newsletterForm.reset();
        }
    });
}

/* =====================================================
MODAIS DE PRODUTOS
====================================================== */
function openModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.classList.add('active');
        document.body.style.overflow = 'hidden';
    }
}

function closeModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.classList.remove('active');
        document.body.style.overflow = 'auto';
    }
}

document.querySelectorAll('.modal-overlay').forEach(overlay => {
    overlay.addEventListener('click', function (e) {
        if (e.target === this) {
            this.classList.remove('active');
            document.body.style.overflow = 'auto';
        }
    });
});

/* =====================================================
MODO CLARO E ESCURO
====================================================== */
const botaoTema = document.getElementById("botaoTema");

botaoTema.addEventListener("click", function () {
    document.body.classList.toggle("modo-escuro");
    botaoTema.textContent = document.body.classList.contains("modo-escuro") ? "☀️" : "🌙";
});

/* =====================================================
CARROSSEL DE DESTAQUES NA HERO
====================================================== */
let carouselInterval;

function iniciarCarrosselDestaques(produtosDestaque) {
    const track = document.getElementById("carouselTrack");
    const indicatorsContainer = document.getElementById("carouselIndicators");

    if (!track || !indicatorsContainer || produtosDestaque.length === 0) return;

    track.innerHTML = "";
    indicatorsContainer.innerHTML = "";

    // Pega até 5 produtos aleatórios ou os primeiros para o carrossel
    const destaques = produtosDestaque.slice(0, 5);

    destaques.forEach((prod, index) => {
        const precoFmt = Number(prod.preco || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 });
        const imgUrl = prod.imagem || "https://via.placeholder.com/200?text=Sem+Imagem";

        // Cria o slide
        const slide = document.createElement("div");
        slide.className = `carousel-slide ${index === 0 ? 'active' : ''}`;
        slide.innerHTML = `
            <img src="${imgUrl}" alt="${prod.nome}" onerror="this.src='https://via.placeholder.com/200?text=Indisponível'">
            <div>
                <h4>${prod.nome}</h4>
                <p>R$ ${precoFmt}</p>
            </div>
        `;
        track.appendChild(slide);

        // Cria a bolinha indicadora
        const indicator = document.createElement("div");
        indicator.className = `indicator ${index === 0 ? 'active' : ''}`;
        indicator.addEventListener("click", () => mudarSlide(index));
        indicatorsContainer.appendChild(indicator);
    });

    // Inicia rotação automática a cada 4 segundos
    let currentSlide = 0;
    clearInterval(carouselInterval);

    carouselInterval = setInterval(() => {
        currentSlide = (currentSlide + 1) % destaques.length;
        mudarSlide(currentSlide);
    }, 4000);
}

function mudarSlide(index) {
    const slides = document.querySelectorAll(".carousel-slide");
    const indicators = document.querySelectorAll(".indicator");

    slides.forEach((slide, i) => {
        slide.classList.toggle("active", i === index);
    });

    indicators.forEach((ind, i) => {
        ind.classList.toggle("active", i === index);
    });
}

/* =====================================================
INTEGRAÇÃO COM A API - PRODUTOS E CATEGORIAS
====================================================== */
const API_URL = "https://onlinestorage.you.tec.br/api/getkey/senai/produtos";

async function carregarProdutos() {
    try {
        const resposta = await fetch(API_URL);
        if (!resposta.ok) throw new Error("Erro de comunicação com a API");

        const dadosRaw = await resposta.json();
        let produtos = [];

        if (dadosRaw && dadosRaw.value) {
            let valorTratado = dadosRaw.value;

            if (typeof valorTratado === 'string') {
                try { valorTratado = JSON.parse(valorTratado); } catch (e) { }
            }

            if (typeof valorTratado === 'object' && !Array.isArray(valorTratado) && valorTratado !== null) {
                produtos = Object.keys(valorTratado).map(nomeDaChave => {
                    return {
                        nome: nomeDaChave,
                        preco: valorTratado[nomeDaChave].preco,
                        imagem: valorTratado[nomeDaChave].imagem,
                        categoria: valorTratado[nomeDaChave].categoria || 1
                    };
                });
            } else if (Array.isArray(valorTratado)) {
                produtos = valorTratado;
            }
        }

        if (produtos.length > 0) {
            renderizarNaTela(produtos);
            iniciarCarrosselDestaques(produtos);
        } else {
            exibirMensagemVazio("A loja ainda não possui produtos cadastrados.");
        }

    } catch (erro) {
        console.error("ERRO AO LER OS PRODUTOS:", erro);
        exibirMensagemVazio("Falha ao ler os produtos da API.");
    }
}

function renderizarNaTela(produtos) {
    for (let i = 1; i <= 9; i++) {
        const containerGrid = document.getElementById(`grid-${i}`);
        if (containerGrid) containerGrid.innerHTML = "";
    }

    produtos.forEach(produto => {
        const card = document.createElement("article");
        card.className = "product-card";

        const nomeProduto = produto.nome || "Produto sem nome";
        const precoProduto = produto.preco || 0;
        const imagemProduto = produto.imagem || "https://via.placeholder.com/200?text=Sem+Imagem";
        const precoFormatado = Number(precoProduto).toLocaleString('pt-BR', { minimumFractionDigits: 2 });

        card.innerHTML = `
            <div class="card-content">
                <img src="${imagemProduto}" alt="${nomeProduto}" onerror="this.src='https://via.placeholder.com/200?text=Link+Incompatível'">
                <h4>${nomeProduto}</h4>
                <p>R$ ${precoFormatado}</p>
                <button class="btn-comprar" onclick="comprarProduto('${nomeProduto.replace(/'/g, "\\'")}')">Comprar</button>
            </div>
        `;

        let idCategoria = produto.categoria || 1;
        const gridDestino = document.getElementById(`grid-${idCategoria}`);

        if (gridDestino) {
            gridDestino.appendChild(card);
        } else {
            document.getElementById("grid-1").appendChild(card);
        }
    });

    exibirMensagemVazio("Em breve novos produtos nesta categoria!");
}

function exibirMensagemVazio(mensagem) {
    for (let i = 1; i <= 9; i++) {
        const containerGrid = document.getElementById(`grid-${i}`);
        if (containerGrid && (containerGrid.innerHTML.trim() === "" || containerGrid.innerHTML.includes("A carregar"))) {
            containerGrid.innerHTML = `<p class="loading-text">${mensagem}</p>`;
        }
    }
}

// Inicia o processo quando a página abre
document.addEventListener("DOMContentLoaded", carregarProdutos);

// Atualiza automaticamente a cada 30 segundos
setInterval(carregarProdutos, 30000);

/* =====================================================
   SISTEMA DE BANCO DE DADOS (Simulado com LocalStorage) E PERFIL
====================================================== */
// Tenta carregar o usuário atual e o banco de dados geral do navegador
let currentUser = JSON.parse(localStorage.getItem('currentUser')) || null;
let usersDB = JSON.parse(localStorage.getItem('usersDB')) || {};
let isLoginMode = true; // Define se a tela inicial é Login ou Registro

// Elementos da Interface
const authArea = document.getElementById('auth-area');
const authForm = document.getElementById('auth-form');
const authTitle = document.getElementById('auth-title');
const authSubmitBtn = document.getElementById('auth-submit-btn');
const authToggleLink = document.getElementById('auth-toggle-link');
const authSwitchText = document.getElementById('auth-switch-text');
const usernameInput = document.getElementById('auth-username');
const passwordInput = document.getElementById('auth-password');

// Renderiza os botões dinamicamente no cabeçalho
function renderAuthUI() {
    if (!authArea) return;
    if (currentUser) {
        authArea.innerHTML = `
            <span style="font-weight: 700; color: var(--blue); font-size: 14px;">Olá, ${currentUser.username}</span>
            <button class="btn btn-primary" onclick="verPerfil()" style="padding: 6px 12px; font-size: 13px;">Meu Perfil</button>
            <button class="btn btn-secondary" onclick="logout()" style="padding: 6px 12px; font-size: 13px;">Sair</button>
        `;
    } else {
        authArea.innerHTML = `
            <button class="btn btn-secondary" onclick="abrirAuth('login')" style="padding: 6px 12px; font-size: 13px;">Login</button>
            <button class="btn btn-primary" onclick="abrirAuth('register')" style="padding: 6px 12px; font-size: 13px;">Registrar</button>
        `;
    }
}

// Abre o modal de Login ou Registro
function abrirAuth(mode) {
    isLoginMode = mode === 'login';
    atualizarTextosAuth();
    usernameInput.value = '';
    passwordInput.value = '';
    openModal('auth-modal');
}

// Alterna os textos entre Login e Registro
function atualizarTextosAuth() {
    if (isLoginMode) {
        authTitle.innerText = "Login do Aluno";
        authSubmitBtn.innerText = "Entrar";
        authSwitchText.innerText = "Não tem conta?";
        authToggleLink.innerText = "Registre-se";
    } else {
        authTitle.innerText = "Criar Perfil";
        authSubmitBtn.innerText = "Cadastrar";
        authSwitchText.innerText = "Já possui perfil?";
        authToggleLink.innerText = "Faça Login";
    }
}

// Alternar entre tela de Login e Registro clicando no link
if(authToggleLink) {
    authToggleLink.addEventListener('click', (e) => {
        e.preventDefault();
        isLoginMode = !isLoginMode;
        atualizarTextosAuth();
    });
}

// Lógica de envio do formulário (Autenticação e Criação de Conta)
if(authForm) {
    authForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const user = usernameInput.value.trim();
        const pass = passwordInput.value.trim();

        if (isLoginMode) {
            // Verifica Login
            if (usersDB[user] && usersDB[user].password === pass) {
                currentUser = usersDB[user];
                localStorage.setItem('currentUser', JSON.stringify(currentUser));
                showToast(`Bem-vindo de volta, ${user}!`);
                closeModal('auth-modal');
                renderAuthUI();
            } else {
                showToast("Usuário ou senha incorretos!");
            }
        } else {
            // Cria Registro
            if (usersDB[user]) {
                showToast("Esse usuário já está em uso!");
            } else {
                // Cria o usuário com um array vazio de compras
                usersDB[user] = { username: user, password: pass, compras: [] };
                localStorage.setItem('usersDB', JSON.stringify(usersDB));
                
                // Faz o login automático após o registro
                currentUser = usersDB[user];
                localStorage.setItem('currentUser', JSON.stringify(currentUser));
                
                showToast("Perfil criado com sucesso!");
                closeModal('auth-modal');
                renderAuthUI();
            }
        }
    });
}

function logout() {
    currentUser = null;
    localStorage.removeItem('currentUser');
    showToast("Você saiu da conta.");
    renderAuthUI();
}

// Exibe o modal com o perfil e os produtos do usuário
function verPerfil() {
    if (!currentUser) return;
    const perfilConteudo = document.getElementById('perfil-conteudo');
    
    let html = `<p style="margin-bottom: 20px; font-size: 16px;"><strong>Usuário Logado:</strong> <span style="color: var(--blue);">${currentUser.username}</span></p>`;
    html += `<h4 style="margin-bottom: 15px; border-bottom: 1px solid var(--border); padding-bottom: 10px;">Produtos Adquiridos:</h4>`;
    
    if (currentUser.compras && currentUser.compras.length > 0) {
        html += `<ul style="list-style: none; padding: 0;">`;
        // Inverte o array para mostrar as compras mais recentes primeiro
        [...currentUser.compras].reverse().forEach(compra => {
            html += `<li style="margin-bottom: 10px; padding: 10px; background: var(--bg); border-radius: 8px; border: 1px solid var(--border);">🛒 ${compra}</li>`;
        });
        html += `</ul>`;
    } else {
        html += `<p style="color: var(--secondary-text); font-style: italic;">Você ainda não possui produtos salvos no seu perfil.</p>`;
    }
    
    perfilConteudo.innerHTML = html;
    openModal('perfil-modal');
}

/* SUBSTTUA SUA FUNÇÃO comprarProduto() ANTIGA POR ESSA NOVA: */
window.comprarProduto = function(nomeProduto) {
    if (!currentUser) {
        showToast("Faça login ou registre-se para salvar o produto!");
        abrirAuth('login');
        return;
    }

    // Adiciona a compra no perfil do usuário
    if (!currentUser.compras) currentUser.compras = [];
    currentUser.compras.push(nomeProduto);
    
    // Atualiza o banco de dados e a sessão
    usersDB[currentUser.username] = currentUser;
    localStorage.setItem('usersDB', JSON.stringify(usersDB));
    localStorage.setItem('currentUser', JSON.stringify(currentUser));

    showToast(`"${nomeProduto}" foi salvo no seu perfil!`);
};

// Inicia os botões do cabeçalho na abertura da página
document.addEventListener("DOMContentLoaded", renderAuthUI);