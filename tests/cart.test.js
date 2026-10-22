import { describe, expect, it } from "vitest";
import { addItem, changeQuantity, coinTotal, countItems, removeItem, toCartLines } from "../js/features/cart.js";

const products = new Map([
    ["A", { id: "A", nome: "A", precoMoedas: 10 }],
    ["B", { id: "B", nome: "B", precoMoedas: null }],
]);

describe("carrinho do navegador", () => {
    it("adiciona, incrementa e remove sem alterar a lista original", () => {
        const empty = [];
        const one = addItem(empty, "A");
        const two = addItem(one, "A");

        expect(empty).toEqual([]);
        expect(two).toEqual([{ id: "A", quantity: 2 }]);
        expect(changeQuantity(two, "A", -2)).toEqual([]);
        expect(removeItem(two, "A")).toEqual([]);
    });

    it("limita a 99 unidades por produto", () => {
        expect(changeQuantity([{ id: "A", quantity: 98 }], "A", 5)).toEqual([{ id: "A", quantity: 99 }]);
    });

    it("ignora produtos que saíram do catálogo e soma os totais", () => {
        const lines = toCartLines(
            [
                { id: "A", quantity: 3 },
                { id: "SUMIU", quantity: 1 },
            ],
            products,
        );
        expect(countItems(lines)).toBe(3);
        expect(coinTotal(lines)).toBe(30);
        expect(coinTotal([])).toBe(0);
    });

    it("não calcula total se algum produto estiver sem preço em moedas", () => {
        expect(coinTotal(toCartLines([{ id: "B", quantity: 1 }], products))).toBeNull();
    });
});
