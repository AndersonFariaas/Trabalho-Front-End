import { describe, expect, it } from "vitest";
import { levelOf } from "../shared/levels.js";

describe("Meu nível", () => {
    it("abaixo de 251 moedas ainda não tem emblema e mostra quanto falta para o primeiro", () => {
        expect(levelOf(0)).toEqual({
            atual: null,
            proximo: { id: "aspirante", nome: "Aspirante a programador", faltam: 251 },
            progresso: 0,
        });
        expect(levelOf(250).proximo.faltam).toBe(1);
    });

    it("conquista o nível exatamente no mínimo de moedas", () => {
        expect(levelOf(251).atual.id).toBe("aspirante");
        expect(levelOf(2002).atual.id).toBe("aspirante");
        expect(levelOf(2003).atual.id).toBe("explorador");
        expect(levelOf(4500).atual.id).toBe("sagaz");
        expect(levelOf(8413).atual.id).toBe("mestre");
        expect(levelOf(15413).atual).toEqual({ id: "hacker", nome: "Hacker" });
        expect(levelOf(29999).proximo).toEqual({ id: "lendario", nome: "Programador Lendário", faltam: 1 });
        expect(levelOf(30000).atual.id).toBe("lendario");
    });

    it("mede o progresso só dentro da faixa entre o nível atual e o próximo", () => {
        const explorer = levelOf(2155);
        expect(explorer.proximo).toEqual({ id: "sagaz", nome: "Programador sagaz", faltam: 2345 });
        expect(explorer.progresso).toBeCloseTo((2155 - 2003) / (4500 - 2003), 3);
        expect(levelOf(2003).progresso).toBe(0);
    });

    it("no nível máximo não há próximo e a barra fica cheia", () => {
        const legend = levelOf(1_000_000);
        expect(legend.atual.id).toBe("lendario");
        expect(legend.proximo).toBeNull();
        expect(legend.progresso).toBe(1);
    });
});
