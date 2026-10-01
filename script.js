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
});

/* Fecha menu ao clicar em um link */
document.querySelectorAll(".nav-links a").forEach(link => {
    link.addEventListener("click", () => {
        navLinks.classList.remove("open");
    });
});

/* =====================================================
NEWSLETTER
====================================================== */

const newsletterForm = document.getElementById("newsletterForm");

newsletterForm.addEventListener("submit", event => {
    event.preventDefault();

    const email = document.getElementById("email").value.trim();

    if (email) {
        showToast("Inscrição confirmada! Bem-vindo às novidades do SENAI FIRJAN.");
        newsletterForm.reset();
    }
});

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

        botaoTema.textContent = "☀️ Modo Claro";

    } else {

        botaoTema.textContent = "🌙 Modo Escuro";

    }

});