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