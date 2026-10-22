import { HttpError } from "./http.js";
import { normalizeName } from "./names.js";

/**
 * Limite de tentativas de login erradas, por endereço de rede + nome do aluno.
 * Combinar os dois evita que alguém bloqueie o login de outro aluno de propósito.
 *
 * Fica na memória da função da Vercel: é uma proteção de melhor esforço (cada instância
 * conta separado), suficiente para frear tentativas automáticas de adivinhar senhas.
 */
const MAX_FAILURES = 8;
const WINDOW_MS = 10 * 60_000;
const MAX_TRACKED_KEYS = 5_000;

/** @type {Map<string, { count: number, resetAt: number }>} */
const failures = new Map();

/** Limpa o registro (usado pelos testes). */
export function clearLoginAttempts() {
    failures.clear();
}

function clientAddress(req) {
    const forwarded = String(req.headers["x-forwarded-for"] ?? "")
        .split(",")[0]
        .trim();
    return forwarded || req.socket?.remoteAddress || "desconhecido";
}

export function loginAttemptKey(req, name) {
    return `${clientAddress(req)}|${normalizeName(name)}`;
}

function activeEntry(key) {
    const entry = failures.get(key);
    if (entry && entry.resetAt <= Date.now()) {
        failures.delete(key);
        return undefined;
    }
    return entry;
}

export function assertLoginAllowed(key) {
    if ((activeEntry(key)?.count ?? 0) >= MAX_FAILURES) {
        throw new HttpError(429, "Muitas tentativas de login. Aguarde alguns minutos e tente de novo.");
    }
}

export function registerLoginFailure(key) {
    // Não deixa o registro crescer sem limite se houver muitas tentativas diferentes
    if (failures.size >= MAX_TRACKED_KEYS) failures.delete(failures.keys().next().value);

    const entry = activeEntry(key) ?? { count: 0, resetAt: Date.now() + WINDOW_MS };
    entry.count += 1;
    failures.set(key, entry);
}

export function clearLoginFailures(key) {
    failures.delete(key);
}
