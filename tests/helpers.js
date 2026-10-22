import bcrypt from "bcryptjs";
import { vi } from "vitest";

export const ORIGIN_HOST = "loja.test";

/** Armazenamento FreeOnlineStorage em memória, servido por um fetch falso. */
export function createFakeStorage(initial) {
    const keys = structuredClone(initial);
    const writes = [];

    const fetchMock = vi.fn(async (url, options = {}) => {
        const json = (status, body) => new Response(JSON.stringify(body), { status });
        const { pathname } = new URL(url);

        const read = pathname.match(/\/getkey\/senai\/(.+)$/);
        if ((options.method ?? "GET") === "GET" && read) {
            const key = decodeURIComponent(read[1]);
            return key in keys ? json(200, { value: structuredClone(keys[key]) }) : json(404, {});
        }

        if (options.method === "POST") {
            const { key, value } = JSON.parse(options.body);
            keys[key] = structuredClone(value);
            writes.push(key);
            return json(200, { ok: true });
        }
        return json(404, {});
    });

    return { keys, writes, fetchMock };
}

export function studentsFixture() {
    return {
        usuarios: [
            { id: 1, nome: "João Teste da Silva", senha: bcrypt.hashSync("senha123", 4), coins: 1000 },
            { id: 2, nome: "Maria Teste", senha: "abc", coins: 50 },
            { id: 3, nome: "Outro Aluno", senha: bcrypt.hashSync("outra", 4), coins: 300, extra: "preservar" },
        ],
    };
}

export function productsFixture() {
    return {
        TECLADO: { preco: 700, categoria: 1 },
        "CABO HDMI": { preco: 200, categoria: 1 },
        IATE: { preco: 30000, categoria: 5 },
        BRINDE: { preco: 0, preco_moedas: 15, categoria: 9 },
    };
}

/** Requisição e resposta no formato que as funções da Vercel recebem. */
export function createRequest({ method = "POST", body, cookie, origin } = {}) {
    return {
        method,
        url: "/api/teste",
        body,
        headers: { host: ORIGIN_HOST, ...(cookie ? { cookie } : {}), ...(origin ? { origin } : {}) },
    };
}

export function createResponse() {
    const res = {
        statusCode: 200,
        headers: {},
        body: undefined,
        setHeader(name, value) {
            res.headers[name.toLowerCase()] = value;
        },
        status(code) {
            res.statusCode = code;
            return res;
        },
        json(payload) {
            res.body = payload;
            return res;
        },
    };
    return res;
}

/** Extrai "nome=valor" do Set-Cookie para reenviar como Cookie. */
export function sessionCookieFrom(res) {
    return String(res.headers["set-cookie"]).split(";")[0];
}
