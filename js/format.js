const currencyFormatter = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });
const integerFormatter = new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 0 });

export function formatPrice(value) {
    return currencyFormatter.format(Number(value) || 0);
}

export function formatCoins(value) {
    return `${integerFormatter.format(value)} moedas`;
}
