/**
 * "Meu nível": emblemas conquistados pelas moedas ganhas (as mesmas do ranking).
 * Comprar na loja não faz o aluno cair de nível. Compartilhado: o servidor calcula o nível
 * do aluno com levelOf, e a tela usa a lista para mostrar as regras dos níveis.
 */
export const LEVELS = Object.freeze([
    { id: "aspirante", nome: "Aspirante a programador", moedas: 251 },
    { id: "explorador", nome: "Explorador de Códigos", moedas: 2003 },
    { id: "sagaz", nome: "Programador sagaz", moedas: 4500 },
    { id: "mestre", nome: "Mestre de programação", moedas: 8413 },
    { id: "hacker", nome: "Hacker", moedas: 15413 },
    { id: "lendario", nome: "Programador Lendário", moedas: 30000 },
]);

/**
 * @typedef {{ id: string, nome: string }} LevelRef
 * @typedef {{ atual: LevelRef | null, proximo: (LevelRef & { faltam: number }) | null, progresso: number }} LevelInfo
 * progresso: de 0 a 1, dentro da faixa entre o nível atual e o próximo (1 no nível máximo).
 */

/**
 * @param {number} earnedCoins moedas ganhas pelo aluno
 * @returns {LevelInfo}
 */
export function levelOf(earnedCoins) {
    const current = LEVELS.findLast((level) => earnedCoins >= level.moedas) ?? null;
    const next = LEVELS.find((level) => earnedCoins < level.moedas) ?? null;
    const bandStart = current?.moedas ?? 0;

    return {
        atual: current && { id: current.id, nome: current.nome },
        proximo: next && { id: next.id, nome: next.nome, faltam: next.moedas - earnedCoins },
        progresso: next ? Math.round(((earnedCoins - bandStart) / (next.moedas - bandStart)) * 1000) / 1000 : 1,
    };
}
