import { describe, expect, it } from "vitest";
import { coinPriceOf, normalizeProducts } from "../shared/products.js";

describe("coinPriceOf", () => {
    it("usa preco_moedas quando existe", () => {
        expect(coinPriceOf({ preco: 700, preco_moedas: 15 })).toBe(15);
    });

    it("converte 1 moeda = R$ 1, arredondando para cima", () => {
        expect(coinPriceOf({ preco: 700 })).toBe(700);
        expect(coinPriceOf({ preco: 99.01 })).toBe(100);
    });

    it("não deixa produto sem preço sair de graça", () => {
        expect(coinPriceOf({})).toBeNull();
        expect(coinPriceOf({ preco: null })).toBeNull();
        expect(coinPriceOf({ preco: "" })).toBeNull();
    });

    it("recusa preço negativo ou inválido", () => {
        expect(coinPriceOf({ preco: -5 })).toBeNull();
        expect(coinPriceOf({ preco: "abc" })).toBeNull();
    });
});

describe("normalizeProducts", () => {
    it("lê o formato de objeto da API usando a chave como id e nome", () => {
        const [product] = normalizeProducts({ TECLADO: { preco: 700, imagem: "x.jpg", categoria: 1 } });
        expect(product).toEqual({
            id: "TECLADO",
            nome: "TECLADO",
            preco: 700,
            precoMoedas: 700,
            imagem: "x.jpg",
            categoria: 1,
        });
    });

    it("lê array e JSON em texto, descartando itens inválidos", () => {
        expect(normalizeProducts([{ nome: "A", preco: 1 }, null, "x"])).toHaveLength(1);
        expect(normalizeProducts('{"B":{"preco":2}}')[0].id).toBe("B");
        expect(normalizeProducts("{inválido")).toEqual([]);
    });

    it("usa a categoria padrão quando falta", () => {
        expect(normalizeProducts({ X: { preco: 1 } })[0].categoria).toBe(1);
    });
});
