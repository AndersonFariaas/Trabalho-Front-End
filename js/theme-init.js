// Script clássico e bloqueante no <head>: aplica o tema salvo antes da primeira pintura,
// evitando o "piscar" de tema. Fica em arquivo próprio para a CSP não precisar de 'unsafe-inline'.
// Não pode importar módulos: "tema" é a mesma chave de STORAGE_KEYS.theme em js/config.js.
try {
    const savedTheme = localStorage.getItem("tema");
    if (savedTheme === "light" || savedTheme === "dark") {
        document.documentElement.dataset.theme = savedTheme;
    }
} catch {
    // localStorage indisponível: mantém o tema padrão
}
