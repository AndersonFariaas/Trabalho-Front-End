import { describe, expect, it } from "vitest";
import { addToInventory, mergeCartItems, normalizeInventory, priceCart } from "../lib/shop.js";
import { checkoutSchema, loginSchema } from "../lib/schemas.js";

const catalog = new Map([
    ["TECLADO", { id: "TECLADO", nome: "TECLADO", precoMoedas: 700 }],
    ["SEM PRECO", { id: "SEM PRECO", nome: "SEM PRECO", precoMoedas: null }],
]);

describe("mergeCartItems", () => {
    it("soma linhas repetidas do mesmo produto", () => {
        expect(
            mergeCartItems([
                { id: "A", quantidade: 2 },
                { id: "A", quantidade: 3 },
            ]),
        ).toEqual([{ id: "A", quantidade: 5 }]);
    });

    it("barra a soma acima de 99 unidades", () => {
        expect(() =>
            mergeCartItems([
                { id: "A", quantidade: 60 },
                { id: "A", quantidade: 60 },
            ]),
        ).toThrow(/99 unidades/);
    });
});

describe("priceCart", () => {
    it("calcula o total com o preço do catálogo do servidor", () => {
        const { lines, total } = priceCart([{ id: "TECLADO", quantidade: 2 }], catalog);
        expect(total).toBe(1400);
        expect(lines).toEqual([{ id: "TECLADO", nome: "TECLADO", quantidade: 2, preco_moedas: 700 }]);
    });

    it("recusa produto inexistente ou sem preço", () => {
        expect(() => priceCart([{ id: "HACK", quantidade: 1 }], catalog)).toThrow(/não está mais disponível/);
        expect(() => priceCart([{ id: "SEM PRECO", quantidade: 1 }], catalog)).toThrow(/sem preço/);
    });
});

describe("inventário", () => {
    it("soma ao item existente e adiciona os novos, sem alterar o original", () => {
        const original = [{ id: "TECLADO", nome: "TECLADO", quantidade: 1, preco_moedas: 700 }];
        const updated = addToInventory(original, [
            { id: "TECLADO", nome: "TECLADO", quantidade: 2, preco_moedas: 650 },
            { id: "MOUSE", nome: "MOUSE", quantidade: 1, preco_moedas: 100 },
        ]);

        expect(updated).toEqual([
            { id: "TECLADO", nome: "TECLADO", quantidade: 3, preco_moedas: 650 },
            { id: "MOUSE", nome: "MOUSE", quantidade: 1, preco_moedas: 100 },
        ]);
        expect(original[0].quantidade).toBe(1);
    });

    it("descarta entradas malformadas do cadastro", () => {
        expect(normalizeInventory("lixo")).toEqual([]);
        expect(normalizeInventory([{ id: 5 }, { id: "A", quantidade: 0 }, { id: "B", quantidade: 1 }])).toHaveLength(1);
    });
});

describe("esquemas de entrada", () => {
    it("exige nome e senha", () => {
        expect(loginSchema.safeParse({ nome: "  ", senha: "x" }).success).toBe(false);
        expect(loginSchema.safeParse({ nome: "Ana", senha: "" }).success).toBe(false);
        expect(loginSchema.parse({ nome: "  Ana  ", senha: "x" }).nome).toBe("Ana");
    });

    it("valida itens e identificador da compra", () => {
        const requestId = "33333333-3333-4333-8333-333333333333";
        expect(checkoutSchema.safeParse({ itens: [{ id: "A", quantidade: 1 }], requestId }).success).toBe(true);
        expect(checkoutSchema.safeParse({ itens: [{ id: "A", quantidade: -1 }], requestId }).success).toBe(false);
        expect(checkoutSchema.safeParse({ itens: [{ id: "A", quantidade: 1.5 }], requestId }).success).toBe(false);
        expect(checkoutSchema.safeParse({ itens: [], requestId }).success).toBe(false);
        expect(checkoutSchema.safeParse({ itens: [{ id: "A", quantidade: 1 }], requestId: "x" }).success).toBe(false);
    });
});
