/** Erro com status HTTP e mensagem segura para exibir ao aluno. */
export class HttpError extends Error {
    /**
     * @param {number} status
     * @param {string} message
     */
    constructor(status, message) {
        super(message);
        this.name = "HttpError";
        this.status = status;
    }
}

/**
 * @param {import("http").ServerResponse & { status: Function, json: Function }} res
 * @param {number} status
 * @param {unknown} payload
 */
export function sendJson(res, status, payload) {
    res.setHeader("Cache-Control", "no-store, max-age=0");
    res.status(status).json(payload);
}

/** Lê uma variável de ambiente obrigatória; sem ela a rota responde 503 em vez de quebrar. */
export function requireEnv(name) {
    const value = process.env[name];
    if (!value) {
        console.error(`Variável de ambiente ausente: ${name}`);
        throw new HttpError(503, "A loja ainda não foi configurada no servidor.");
    }
    return value;
}

/**
 * Valida o corpo da requisição com um esquema Zod. A primeira mensagem do esquema
 * vira a resposta 400, então os esquemas já escrevem mensagens para o aluno.
 *
 * @template T
 * @param {import("zod").ZodType<T>} schema
 * @param {unknown} body
 * @returns {T}
 */
export function parseBody(schema, body) {
    const result = schema.safeParse(body ?? {});
    if (!result.success) throw new HttpError(400, result.error.issues[0]?.message ?? "Dados inválidos.");
    return result.data;
}

// Bloqueia chamadas de outros sites usando o cookie do aluno (proteção contra CSRF).
function assertSameOrigin(req) {
    const { origin } = req.headers;
    if (!origin) return;

    const host = req.headers["x-forwarded-host"] || req.headers.host;
    let originHost = "";
    try {
        originHost = new URL(origin).host;
    } catch {
        // origem malformada: tratada como diferente
    }
    if (!host || originHost !== host) throw new HttpError(403, "Origem da solicitação não permitida.");
}

/**
 * Envolve uma rota com validação de método e origem e com tratamento de erro padronizado,
 * para que nenhum detalhe interno vaze ao navegador.
 *
 * @param {"GET" | "POST"} method
 * @param {(req: any, res: any) => Promise<unknown>} handle
 */
export function createHandler(method, handle) {
    return async function handler(req, res) {
        if (req.method !== method) {
            res.setHeader("Allow", method);
            return sendJson(res, 405, { erro: "Método não permitido." });
        }

        try {
            if (method !== "GET") assertSameOrigin(req);
            sendJson(res, 200, await handle(req, res));
        } catch (error) {
            if (error instanceof HttpError) return sendJson(res, error.status, { erro: error.message });
            console.error(`Falha inesperada em ${req.method} ${req.url}:`, error);
            sendJson(res, 503, { erro: "O serviço está indisponível no momento. Tente novamente." });
        }
    };
}
