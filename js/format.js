const integerFormatter = new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 0 });

/** "1 moeda", "700 moedas", "30.000 moedas". */
export function formatCoins(value) {
    return `${integerFormatter.format(value)} ${Math.abs(value) === 1 ? "moeda" : "moedas"}`;
}

/** "1 unidade", "2 unidades" (plural certo em vez de "unidade(s)"). */
export function formatUnits(quantity) {
    return `${integerFormatter.format(quantity)} ${quantity === 1 ? "unidade" : "unidades"}`;
}
