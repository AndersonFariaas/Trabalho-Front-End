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

function comprarProduto(nomeProduto) {
    showToast(`Compra realizada com sucesso para: ${nomeProduto}!`);
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