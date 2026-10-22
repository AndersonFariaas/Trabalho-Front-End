const integerFormatter = new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 0 });

export function formatCoins(value) {
    return `${integerFormatter.format(value)} moedas`;
}
