/**
 * Cliente das rotas da loja (/api). Os cookies de sessão são HttpOnly:
 * o navegador os envia sozinho e o JavaScript nunca os lê.
 *
 * @typedef {{ id: string, nome: string, quantidade: number, preco_moedas: number }} InventoryItem
 * @typedef {{ posicao: number, total: number }} Ranking
 * @typedef {import("../../shared/levels.js").LevelRef} LevelRef
 * @typedef {import("../../shared/levels.js").LevelInfo} LevelInfo
 * @typedef {{ id: number, nome: string, foto: string | null, moedas: number, ranking: Ranking, nivel: LevelInfo, inventario: InventoryItem[] }} Profile
 */

class ApiError extends Error {
    constructor(message, status) {
        super(message);
        this.name = "ApiError";
        this.status = status;
    }
}

async function request(path, { method = "GET", body } = {}) {
    const hasBody = body !== undefined;
    const response = await fetch(path, {
        method,
        credentials: "same-origin",
        cache: "no-store",
        headers: { Accept: "application/json", ...(hasBody ? { "Content-Type": "application/json" } : {}) },
        ...(hasBody ? { body: JSON.stringify(body) } : {}),
    });

    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
        throw new ApiError(data.erro || `Falha na solicitação (HTTP ${response.status}).`, response.status);
    }
    return data;
}

export const shopApi = {
    /** @returns {Promise<Profile>} */
    login: (nome, senha) => request("/api/auth/login", { method: "POST", body: { nome, senha } }),

    logout: () => request("/api/auth/logout", { method: "POST", body: {} }),

    /** @returns {Promise<{ alunos: string[] }>} */
    listStudents: () => request("/api/auth/alunos"),

    /** @returns {Promise<Profile | null>} null quando o visitante não está logado */
    getProfile: () => request("/api/loja/perfil"),

    /** @returns {Promise<Profile>} */
    checkout: (itens, requestId) => request("/api/loja/checkout", { method: "POST", body: { itens, requestId } }),
};
