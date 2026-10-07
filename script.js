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

    // Troca o ícone dependendo se está aberto ou fechado
    if (navLinks.classList.contains("open")) {
        menuBtn.innerHTML = "✕";
    } else {
        menuBtn.innerHTML = "☰";
    }
});

/* Fecha o menu ao clicar em qualquer link e restaura o ícone */
document.querySelectorAll(".nav-links a").forEach(link => {
    link.addEventListener("click", () => {
        navLinks.classList.remove("open");
        menuBtn.innerHTML = "☰"; // Volta para o hambúrguer
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
        // Impede a página por trás de rolar enquanto o modal está aberto
        document.body.style.overflow = 'hidden';
    }
}

function closeModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.classList.remove('active');
        // Restaura a rolagem da página
        document.body.style.overflow = 'auto';
    }
}

// Fechar o modal ao clicar fora da caixa branca (no fundo escuro)
document.querySelectorAll('.modal-overlay').forEach(overlay => {
    overlay.addEventListener('click', function (e) {
        if (e.target === this) {
            this.classList.remove('active');
            document.body.style.overflow = 'auto';
        }
    });
});

/* =====================================================
CLARO E ESCURO
====================================================== */

const botaoTema = document.getElementById("botaoTema");

botaoTema.addEventListener("click", function () {

    document.body.classList.toggle("modo-escuro");

    if (document.body.classList.contains("modo-escuro")) {
        botaoTema.textContent = "☀️";
    } else {
        botaoTema.textContent = "🌙";
    }

});

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

        // Verifica e trata o objeto JSON para extrair a lista com base na estrutura da sua base de dados
        if (dadosRaw && dadosRaw.value) {
            let valorTratado = dadosRaw.value;

            // Se vier formatado como texto, converte primeiro
            if (typeof valorTratado === 'string') {
                try { valorTratado = JSON.parse(valorTratado); } catch (e) { }
            }

            // O nome do produto é a chave do objeto (ex: "PS5", "TECLADO")
            if (typeof valorTratado === 'object' && !Array.isArray(valorTratado) && valorTratado !== null) {
                produtos = Object.keys(valorTratado).map(nomeDaChave => {
                    return {
                        nome: nomeDaChave,
                        preco: valorTratado[nomeDaChave].preco,
                        imagem: valorTratado[nomeDaChave].imagem,
                        // Se não existir a categoria no banco de dados, o fallback será a categoria 1
                        categoria: valorTratado[nomeDaChave].categoria || 1
                    };
                });
            } else if (Array.isArray(valorTratado)) {
                produtos = valorTratado;
            }
        }

        if (produtos.length > 0) {
            renderizarNaTela(produtos);
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
    // 1. Limpa todos os 9 grids antes de injetar os novos dados para evitar duplicação
    for (let i = 1; i <= 9; i++) {
        const containerGrid = document.getElementById(`grid-${i}`);
        if (containerGrid) containerGrid.innerHTML = "";
    }

    // 2. Cria os cartões dinamicamente
    produtos.forEach(produto => {
        const card = document.createElement("article");
        card.className = "product-card";

        const nomeProduto = produto.nome || "Produto sem nome";
        const precoProduto = produto.preco || 0;

        // Imagem padrão caso o link venha vazio
        const imagemProduto = produto.imagem || "https://via.placeholder.com/200?text=Sem+Imagem";

        const precoFormatado = Number(precoProduto).toLocaleString('pt-BR', { minimumFractionDigits: 2 });

        card.innerHTML = `
            <div class="card-content">
                <img src="${imagemProduto}" alt="${nomeProduto}" onerror="this.src='https://via.placeholder.com/200?text=Link+Incompatível'">
                <h4>${nomeProduto}</h4>
                <p>¢ ${precoFormatado}</p>
                <button class="btn btn-primary btn-comprar" onclick="comprarProduto('${nomeProduto.replace(/'/g, "\\'")}')">Comprar</button>
            </div>
        `;

        // 3. Distribuição para os modais corretos
        let idCategoria = produto.categoria || 1;
        const gridDestino = document.getElementById(`grid-${idCategoria}`);

        if (gridDestino) {
            gridDestino.appendChild(card);
        } else {
            // Registo de segurança
            document.getElementById("grid-1").appendChild(card);
        }
    });

    // 4. Se alguma categoria ficou vazia (sem produtos), avisa o utilizador
    exibirMensagemVazio("Em breve novos produtos nesta categoria!");
}

function exibirMensagemVazio(mensagem) {
    for (let i = 1; i <= 9; i++) {
        const containerGrid = document.getElementById(`grid-${i}`);
        // Substitui apenas se a grid estiver vazia ou presa no ecrã de "A carregar..."
        if (containerGrid && (containerGrid.innerHTML.trim() === "" || containerGrid.innerHTML.includes("A carregar"))) {
            containerGrid.innerHTML = `<p class="loading-text">${mensagem}</p>`;
        }
    }
}

// Inicia o processo quando a página abre
document.addEventListener("DOMContentLoaded", carregarProdutos);

// Continua a atualizar automaticamente a cada 30 segundos
setInterval(carregarProdutos, 30000);