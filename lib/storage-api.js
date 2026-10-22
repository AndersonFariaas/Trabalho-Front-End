import { HttpError } from "./http.js";

/** A URL pode ser trocada por variável de ambiente para testes com uma API simulada. */
const STORAGE_API = process.env.STORAGE_API_URL || "https://onlinestorage.you.tec.br/api";
const BUCKET = "senai";
const REQUEST_TIMEOUT_MS = 10_000;

/**
 * Lê uma chave do bucket da turma no FreeOnlineStorage.
 *
 * @param {string} key
 * @returns {Promise<unknown>}
 */
export async function readKey(key) {
    const response = await fetch(`${STORAGE_API}/getkey/${BUCKET}/${encodeURIComponent(key)}`, {
        headers: { Accept: "application/json" },
        cache: "no-store",
        signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    });
    if (!response.ok) throw new HttpError(502, "Falha ao comunicar com o serviço de dados da turma.");

    const { value } = await response.json();
    if (typeof value !== "string") return value;
    try {
        return JSON.parse(value);
    } catch {
        throw new HttpError(502, "Os dados recebidos do serviço da turma estão inválidos.");
    }
}

/**
 * Grava uma chave do bucket da turma. Envia `admin-auth` como o painel do professor faz.
 *
 * @param {string} key
 * @param {unknown} value
 */
export async function writeKey(key, value) {
    const adminAuth = process.env.COINS_ADMIN_AUTH;
    const response = await fetch(`${STORAGE_API}/`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            Accept: "application/json",
            ...(adminAuth ? { "admin-auth": adminAuth } : {}),
        },
        body: JSON.stringify({ bucket: BUCKET, key, value }),
        cache: "no-store",
        signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    });
    if (!response.ok) {
        console.error(`Gravação da chave "${key}" recusada pelo armazenamento: HTTP ${response.status}`);
        throw new HttpError(502, "A compra não foi gravada no sistema de moedas. Nenhuma moeda foi descontada.");
    }
}
