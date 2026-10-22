import { MESSAGES, PRODUCTS_REFRESH_MS } from "./config.js";
import * as Account from "./features/account.js";
import { fetchProducts } from "./services/products.js";
import { initAccountView } from "./ui/account-view.js";
import { initBinaryRain } from "./ui/binary-rain.js";
import { createFeaturedCarousel } from "./ui/featured-carousel.js";
import { renderProducts, showMessageInEmptyGrids } from "./ui/catalog-view.js";
import { initHeader } from "./ui/header.js";
import { initMobileMenu } from "./ui/menu.js";
import { initModals } from "./ui/modal.js";
import { initNewsletter } from "./ui/newsletter.js";
import { openProductDetail } from "./ui/product-view.js";
import { initReveal } from "./ui/reveal.js";
import { initThemeToggle } from "./ui/theme.js";

const carousel = createFeaturedCarousel({ onSelect: openProductDetail });
let lastCatalogSignature = "";
let isLoadingProducts = false;

function showCatalogMessage(message) {
    showMessageInEmptyGrids(message);
    carousel.showMessage(message);
}

async function loadProducts() {
    if (isLoadingProducts) return;
    isLoadingProducts = true;

    try {
        const products = await fetchProducts();
        Account.setProducts(products);
        if (products.length === 0) {
            showCatalogMessage(MESSAGES.emptyStore);
            return;
        }

        // Só redesenha se os dados mudaram (evita "piscar" a cada atualização)
        const signature = JSON.stringify(products);
        if (signature === lastCatalogSignature) return;
        lastCatalogSignature = signature;

        renderProducts(products);
        carousel.render(products);
    } catch (error) {
        console.error("Erro ao ler os produtos:", error);
        showCatalogMessage(MESSAGES.apiError);
    } finally {
        isLoadingProducts = false;
    }
}

initModals();
initHeader();
initMobileMenu();
initNewsletter();
initThemeToggle();
initReveal();
initBinaryRain();
initAccountView();

void Account.refreshProfile({ quiet: true });
void loadProducts();

// Atualiza o catálogo periodicamente, sem consumir rede com a aba em segundo plano
setInterval(() => {
    if (!document.hidden) void loadProducts();
}, PRODUCTS_REFRESH_MS);
