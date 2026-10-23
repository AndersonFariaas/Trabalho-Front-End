import { beforeEach, describe, expect, it, vi } from "vitest";

// A conta do aluno no navegador, sem DOM nem rede: a API e os avisos são simulados.
const shopApi = vi.hoisted(() => ({ login: vi.fn(), logout: vi.fn(), getProfile: vi.fn(), checkout: vi.fn() }));
vi.mock("../js/services/shop-api.js", () => ({ shopApi }));
vi.mock("../js/ui/modal.js", () => ({ openModal: vi.fn(), closeModal: vi.fn() }));
vi.mock("../js/ui/toast.js", () => ({ showToast: vi.fn() }));

const PRODUCT = { id: "CABO HDMI", nome: "CABO HDMI", precoMoedas: 200, imagem: "", categoria: 1 };
const BEFORE_PURCHASE = { id: 4, nome: "Aluno Teste", foto: null, moedas: 2055, ranking: null, inventario: [] };
const AFTER_PURCHASE = {
    ...BEFORE_PURCHASE,
    moedas: 1855,
    inventario: [{ id: PRODUCT.id, nome: PRODUCT.nome, quantidade: 1, preco_moedas: 200 }],
};

/** Promessa que o teste resolve quando quiser: simula uma resposta que demora a chegar. */
function deferred() {
    let resolve;
    const promise = new Promise((done) => (resolve = done));
    return { promise, resolve };
}

let Account;

beforeEach(async () => {
    vi.resetModules();
    vi.clearAllMocks();
    vi.spyOn(console, "warn").mockImplementation(() => {}); // sem localStorage no Node
    Account = await import("../js/features/account.js");
});

describe("perfil do aluno com respostas fora de ordem", () => {
    it("a leitura que sai antes da compra e chega depois não traz o saldo antigo de volta", async () => {
        shopApi.login.mockResolvedValue(BEFORE_PURCHASE);
        await Account.login("Aluno Teste", "senha");
        Account.setProducts([PRODUCT]);
        Account.addToCart(PRODUCT.id);

        // Abrir o carrinho dispara uma leitura do perfil que demora (servidor "frio")
        const slowRead = deferred();
        shopApi.getProfile.mockReturnValue(slowRead.promise);
        const reading = Account.refreshProfile({ quiet: true });

        shopApi.checkout.mockResolvedValue(AFTER_PURCHASE);
        expect(await Account.checkout()).toBe(true);

        slowRead.resolve(BEFORE_PURCHASE); // chega por último, com os dados de antes da compra
        await reading;

        const { profile } = Account.accountStore.getState();
        expect(profile.moedas).toBe(1855);
        expect(profile.inventario).toHaveLength(1);
    });

    it("uma leitura de visitante feita antes do login não desconecta o aluno", async () => {
        const slowRead = deferred();
        shopApi.getProfile.mockReturnValue(slowRead.promise);
        const reading = Account.refreshProfile({ quiet: true }); // carregamento da página

        shopApi.login.mockResolvedValue(BEFORE_PURCHASE);
        await Account.login("Aluno Teste", "senha");

        slowRead.resolve(null); // "visitante", mas de antes do login
        await reading;

        expect(Account.accountStore.getState().profile?.id).toBe(BEFORE_PURCHASE.id);
    });

    it("a leitura mais recente continua atualizando o saldo normalmente", async () => {
        shopApi.login.mockResolvedValue(BEFORE_PURCHASE);
        await Account.login("Aluno Teste", "senha");

        shopApi.getProfile.mockResolvedValue({ ...BEFORE_PURCHASE, moedas: 3055 }); // professor deu moedas
        await Account.refreshProfile({ quiet: true });

        expect(Account.accountStore.getState().profile.moedas).toBe(3055);
    });
});
