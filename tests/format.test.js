import { describe, expect, it } from "vitest";
import { formatCoins, formatUnits } from "../js/format.js";

describe("formatação", () => {
    it("formata moedas com separador de milhar", () => {
        expect(formatCoins(30000)).toBe("30.000 moedas");
        expect(formatCoins(1)).toBe("1 moeda");
        expect(formatCoins(-1)).toBe("-1 moeda");
    });

    it("usa singular e plural corretos para unidades", () => {
        expect(formatUnits(1)).toBe("1 unidade");
        expect(formatUnits(2)).toBe("2 unidades");
        expect(formatUnits(1000)).toBe("1.000 unidades");
    });
});
