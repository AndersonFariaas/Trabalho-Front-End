import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import alunosHandler from "../api/auth/alunos.js";
import loginHandler from "../api/auth/login.js";
import checkoutHandler from "../api/loja/checkout.js";
import perfilHandler from "../api/loja/perfil.js";
import { clearPhotoCache } from "../lib/photos.js";
import { clearLoginAttempts } from "../lib/rate-limit.js";
import {
    createFakeStorage,
    createRequest,
    createResponse,
    ORIGIN_HOST,
    productsFixture,
    sessionCookieFrom,
    studentsFixture,
} from "./helpers.js";

let storage;

async function call(handler, request) {
    const res = createResponse();
    await handler(createRequest(request), res);
    return res;
}

async function loginAs(nome, senha) {
    const res = await call(loginHandler, { body: { nome, senha } });
    expect(res.statusCode).toBe(200);
    return sessionCookieFrom(res);
}

const checkout = (cookie, itens, requestId = crypto.randomUUID()) =>
    call(checkoutHandler, { cookie, body: { itens, requestId } });

beforeEach(() => {
    clearPhotoCache();
    clearLoginAttempts();
    vi.stubEnv("SESSION_SECRET", "segredo-de-teste-com-mais-de-32-caracteres!");
    storage = createFakeStorage({ coinsnew: studentsFixture(), produtos: productsFixture() });
    vi.stubGlobal("fetch", storage.fetchMock);
});

afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
});

describe("login", () => {
    it("aceita o nome sem acento e em minúsculas, e nunca devolve a senha", async () => {
        const res = await call(loginHandler, { body: { nome: "  joao   teste da silva ", senha: "senha123" } });

        expect(res.statusCode).toBe(200);
        expect(res.body).toEqual({
            id: 1,
            nome: "João Teste da Silva",
            foto: null,
            moedas: 1000,
            ranking: { posicao: 1, total: 3 },
            nivel: {
                atual: { id: "aspirante", nome: "Aspirante a programador" },
                proximo: { id: "explorador", nome: "Explorador de Códigos", faltam: 1003 },
                progresso: 0.428,
            },
            inventario: [],
        });
        expect(JSON.stringify(res.body)).not.toContain("senha");
        expect(res.headers["set-cookie"]).toMatch(/HttpOnly; Secure; SameSite=Lax/);
    });

    it("aceita a senha antiga em texto puro", async () => {
        expect((await call(loginHandler, { body: { nome: "Maria Teste", senha: "abc" } })).statusCode).toBe(200);
    });

    it("usa a mesma mensagem para senha errada e nome inexistente", async () => {
        const wrongPassword = await call(loginHandler, { body: { nome: "Maria Teste", senha: "x" } });
        const unknownName = await call(loginHandler, { body: { nome: "Ninguém", senha: "x" } });

        expect(wrongPassword.statusCode).toBe(401);
        expect(unknownName.body).toEqual(wrongPassword.body);
    });

    it("valida o corpo da requisição", async () => {
        const res = await call(loginHandler, { body: { nome: "", senha: 123 } });
        expect(res.statusCode).toBe(400);
        expect(res.body.erro).toBe("Informe seu nome e sua senha.");
    });

    it("rejeita método errado e outra origem", async () => {
        expect((await call(loginHandler, { method: "GET" })).statusCode).toBe(405);
        const crossSite = await call(loginHandler, {
            origin: "https://site-malicioso.com",
            body: { nome: "Maria Teste", senha: "abc" },
        });
        expect(crossSite.statusCode).toBe(403);
    });

    it("responde 503 sem detalhes quando o servidor não está configurado", async () => {
        vi.stubEnv("SESSION_SECRET", "");
        const res = await call(loginHandler, { body: { nome: "Maria Teste", senha: "abc" } });
        expect(res.statusCode).toBe(503);
        expect(res.body.erro).toBe("A loja ainda não foi configurada no servidor.");
    });
});

describe("foto do aluno", () => {
    const FOTO = "https://exemplo.supabase.co/storage/v1/object/public/fotos/joao.jpg";

    function serveTurmaPhotos(rows, status = 200) {
        const storageFetch = storage.fetchMock.getMockImplementation();
        storage.fetchMock.mockImplementation(async (url, options) =>
            String(url).includes("/rest/v1/aluno")
                ? new Response(JSON.stringify(rows), { status })
                : storageFetch(url, options),
        );
    }

    it("traz a foto do cadastro da turma, ligando pelo nome sem acento", async () => {
        serveTurmaPhotos([{ nome: "JOAO teste da silva", foto_url: FOTO }]);
        const res = await call(loginHandler, { body: { nome: "João Teste da Silva", senha: "senha123" } });
        expect(res.body.foto).toBe(FOTO);
    });

    it("ignora endereço de foto que não seja https", async () => {
        serveTurmaPhotos([{ nome: "João Teste da Silva", foto_url: "javascript:alert(1)" }]);
        const res = await call(loginHandler, { body: { nome: "João Teste da Silva", senha: "senha123" } });
        expect(res.body.foto).toBeNull();
    });

    it("depois de uma falha, não volta a esperar pelo Supabase a cada login", async () => {
        serveTurmaPhotos({ message: "fora do ar" }, 500);
        const photoRequests = () =>
            storage.fetchMock.mock.calls.filter(([url]) => String(url).includes("/rest/v1/aluno")).length;

        await call(loginHandler, { body: { nome: "João Teste da Silva", senha: "senha123" } });
        await call(loginHandler, { body: { nome: "Maria Teste", senha: "abc" } });
        expect(photoRequests()).toBe(1);
    });

    it("entra normalmente, sem foto, se o Supabase da turma falhar", async () => {
        serveTurmaPhotos({ message: "fora do ar" }, 500);
        const res = await call(loginHandler, { body: { nome: "João Teste da Silva", senha: "senha123" } });
        expect(res.statusCode).toBe(200);
        expect(res.body.foto).toBeNull();
    });
});

describe("limite de tentativas de login", () => {
    const tryLogin = (senha, ip = "10.0.0.1") =>
        call(loginHandler, { body: { nome: "Maria Teste", senha }, headers: { "x-forwarded-for": ip } });

    it("bloqueia depois de muitas senhas erradas, mesmo com a senha certa", async () => {
        for (let attempt = 0; attempt < 8; attempt++) expect((await tryLogin("errada")).statusCode).toBe(401);

        const blocked = await tryLogin("abc");
        expect(blocked.statusCode).toBe(429);
        expect(blocked.body.erro).toMatch(/Muitas tentativas/);
    });

    it("não bloqueia outro endereço de rede nem quem acertou antes do limite", async () => {
        for (let attempt = 0; attempt < 8; attempt++) await tryLogin("errada");
        expect((await tryLogin("abc", "10.0.0.2")).statusCode).toBe(200);

        for (let attempt = 0; attempt < 7; attempt++) await tryLogin("errada", "10.0.0.3");
        expect((await tryLogin("abc", "10.0.0.3")).statusCode).toBe(200);
        // O acerto zera a contagem
        for (let attempt = 0; attempt < 7; attempt++) await tryLogin("errada", "10.0.0.3");
        expect((await tryLogin("abc", "10.0.0.3")).statusCode).toBe(200);
    });
});

describe("lista de alunos", () => {
    it("expõe só os nomes, em ordem alfabética", async () => {
        const res = await call(alunosHandler, { method: "GET" });
        expect(res.body).toEqual({ alunos: ["João Teste da Silva", "Maria Teste", "Outro Aluno"] });
    });
});

describe("sessão", () => {
    it("trata visitante e cookie adulterado como não logados", async () => {
        const visitor = await call(perfilHandler, { method: "GET" });
        expect(visitor.statusCode).toBe(200);
        expect(visitor.body).toBeNull();

        const cookie = await loginAs("Maria Teste", "abc");
        const [name, value] = cookie.split("=");
        const [payload] = value.split(".");
        const forged = `${name}=${payload}.assinatura-falsa`;
        const forgedRes = await call(perfilHandler, { method: "GET", cookie: forged });
        expect(forgedRes.body).toBeNull();
        expect(forgedRes.headers["set-cookie"]).toMatch(/Max-Age=0/); // apaga o cookie adulterado
    });

    it("exige login para comprar", async () => {
        const res = await checkout(undefined, [{ id: "BRINDE", quantidade: 1 }]);
        expect(res.statusCode).toBe(401);
        expect(storage.writes).toEqual([]);
    });

    it("derruba a sessão quando a senha do aluno muda", async () => {
        const cookie = await loginAs("Maria Teste", "abc");
        storage.keys.coinsnew.usuarios[1].senha = "nova-senha";

        const res = await call(perfilHandler, { method: "GET", cookie });
        expect(res.statusCode).toBe(401);
        expect(res.headers["set-cookie"]).toMatch(/Max-Age=0/);
    });
});

describe("ranking separado do saldo", () => {
    it("a compra desconta do saldo, mas não das moedas do ranking", async () => {
        const cookie = await loginAs("João Teste da Silva", "senha123");
        const res = await checkout(cookie, [{ id: "TECLADO", quantidade: 1 }]);

        const joao = storage.keys.coinsnew.usuarios[0];
        expect(joao.coins).toBe(1000);
        expect(joao.moedas_gastas).toBe(700);
        expect(res.body.moedas).toBe(300);
        expect(res.body.ranking).toEqual({ posicao: 1, total: 3 });
        expect(res.body.nivel.atual.id).toBe("aspirante"); // comprar também não tira o nível
    });

    it("soma os gastos de várias compras e usa o saldo disponível para validar", async () => {
        const cookie = await loginAs("João Teste da Silva", "senha123");
        await checkout(cookie, [{ id: "TECLADO", quantidade: 1 }]);
        await checkout(cookie, [{ id: "CABO HDMI", quantidade: 1 }]);
        expect(storage.keys.coinsnew.usuarios[0].moedas_gastas).toBe(900);

        // Restam 100 moedas: um cabo de 200 não pode ser comprado, mesmo com 1.000 no ranking
        const poor = await checkout(cookie, [{ id: "CABO HDMI", quantidade: 1 }]);
        expect(poor.statusCode).toBe(409);
        expect(storage.keys.coinsnew.usuarios[0].coins).toBe(1000);
    });

    it("calcula a posição pelas moedas ganhas, com empate dividindo a posição", async () => {
        storage.keys.coinsnew.usuarios[2].coins = 1000; // empata com o João
        const cookie = await loginAs("Maria Teste", "abc");
        const res = await call(perfilHandler, { method: "GET", cookie });
        expect(res.body.ranking).toEqual({ posicao: 3, total: 3 });

        const tied = await call(loginHandler, { body: { nome: "Outro Aluno", senha: "outra" } });
        expect(tied.body.ranking.posicao).toBe(1);
    });

    it("não deixa o saldo negativo se o professor zerar um aluno que já comprou", async () => {
        storage.keys.coinsnew.usuarios[1].moedas_gastas = 30;
        storage.keys.coinsnew.usuarios[1].coins = 0;
        const cookie = await loginAs("Maria Teste", "abc");
        const res = await call(perfilHandler, { method: "GET", cookie });
        expect(res.body.moedas).toBe(0);
    });
});

describe("compra", () => {
    it("desconta as moedas e grava o inventário numa única gravação", async () => {
        const cookie = await loginAs("João Teste da Silva", "senha123");
        const res = await checkout(cookie, [{ id: "TECLADO", quantidade: 1 }]);

        expect(res.statusCode).toBe(200);
        expect(res.body.moedas).toBe(300);
        expect(res.body.inventario).toEqual([{ id: "TECLADO", nome: "TECLADO", quantidade: 1, preco_moedas: 700 }]);
        expect(storage.writes).toEqual(["coinsnew"]);
    });

    it("preserva os outros alunos e seus campos extras", async () => {
        const cookie = await loginAs("João Teste da Silva", "senha123");
        await checkout(cookie, [{ id: "CABO HDMI", quantidade: 1 }]);

        const [, maria, outro] = storage.keys.coinsnew.usuarios;
        expect(maria).toEqual(studentsFixture().usuarios[1]);
        expect(outro.extra).toBe("preservar");
        expect(outro.coins).toBe(300);
    });

    it("não cobra duas vezes a mesma compra (duplo clique ou nova tentativa)", async () => {
        const cookie = await loginAs("João Teste da Silva", "senha123");
        const requestId = crypto.randomUUID();
        await checkout(cookie, [{ id: "CABO HDMI", quantidade: 1 }], requestId);
        const retry = await checkout(cookie, [{ id: "CABO HDMI", quantidade: 1 }], requestId);

        expect(retry.body.moedas).toBe(800);
        expect(storage.writes).toHaveLength(1);
    });

    it("usa preco_moedas quando o produto tem", async () => {
        const cookie = await loginAs("Maria Teste", "abc");
        const res = await checkout(cookie, [{ id: "BRINDE", quantidade: 2 }]);
        expect(res.body.moedas).toBe(20);
    });

    it("recusa saldo insuficiente e produto inexistente sem gravar nada", async () => {
        const cookie = await loginAs("João Teste da Silva", "senha123");

        const poor = await checkout(cookie, [{ id: "IATE", quantidade: 1 }]);
        expect(poor.statusCode).toBe(409);
        expect(poor.body.erro).toBe("Saldo insuficiente para concluir a compra.");

        expect((await checkout(cookie, [{ id: "HACK", quantidade: 1 }])).statusCode).toBe(409);
        expect(storage.writes).toEqual([]);
    });

    it("avisa quando outra gravação simultânea sobrescreve a compra", async () => {
        const cookie = await loginAs("João Teste da Silva", "senha123");
        const originalFetch = storage.fetchMock.getMockImplementation();

        // Simula o painel do professor gravando o cadastro antigo logo depois da compra
        storage.fetchMock.mockImplementation(async (url, options = {}) => {
            const response = await originalFetch(url, options);
            if (options.method === "POST") storage.keys.coinsnew = studentsFixture();
            return response;
        });

        const res = await checkout(cookie, [{ id: "CABO HDMI", quantidade: 1 }]);
        expect(res.statusCode).toBe(409);
        expect(res.body.erro).toMatch(/alterado ao mesmo tempo/);
    });

    it("explica quando o armazenamento recusa a gravação", async () => {
        const cookie = await loginAs("João Teste da Silva", "senha123");
        const originalFetch = storage.fetchMock.getMockImplementation();
        storage.fetchMock.mockImplementation(async (url, options = {}) =>
            options.method === "POST" ? new Response("{}", { status: 401 }) : originalFetch(url, options),
        );

        const res = await checkout(cookie, [{ id: "CABO HDMI", quantidade: 1 }]);
        expect(res.statusCode).toBe(502);
        expect(res.body.erro).toMatch(/Nenhuma moeda foi descontada/);
    });

    it("aceita a origem do próprio site", async () => {
        const cookie = await loginAs("Maria Teste", "abc");
        const res = await call(checkoutHandler, {
            cookie,
            origin: `https://${ORIGIN_HOST}`,
            body: { itens: [{ id: "BRINDE", quantidade: 1 }], requestId: crypto.randomUUID() },
        });
        expect(res.statusCode).toBe(200);
    });
});
