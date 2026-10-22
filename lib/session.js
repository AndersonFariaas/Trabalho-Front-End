import { createHash, createHmac, timingSafeEqual } from "node:crypto";
import { HttpError, requireEnv } from "./http.js";

const SESSION_COOKIE = "senai_shop_session";
const SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 7;
const MIN_SECRET_LENGTH = 32;

function sessionSecret() {
    const secret = requireEnv("SESSION_SECRET");
    if (secret.length < MIN_SECRET_LENGTH) {
        console.error(`SESSION_SECRET precisa ter pelo menos ${MIN_SECRET_LENGTH} caracteres.`);
        throw new HttpError(503, "A loja ainda não foi configurada no servidor.");
    }
    return secret;
}

function sign(payload) {
    return createHmac("sha256", sessionSecret()).update(payload).digest("base64url");
}

/**
 * Impressão digital da senha armazenada: se o aluno trocar a senha no sistema
 * da turma, as sessões abertas com a senha antiga deixam de valer.
 */
export function passwordVersion(storedPassword) {
    return createHash("sha256")
        .update(String(storedPassword ?? ""))
        .digest("hex")
        .slice(0, 16);
}

function parseCookies(header = "") {
    return Object.fromEntries(
        header
            .split(";")
            .map((part) => part.trim().split("="))
            .filter(([name]) => name)
            .map(([name, ...rest]) => [name, rest.join("=")]),
    );
}

function cookie(value, maxAge) {
    return `${SESSION_COOKIE}=${value}; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=${maxAge}`;
}

export function setSessionCookie(res, student) {
    const payload = Buffer.from(
        JSON.stringify({
            uid: Number(student.id),
            ver: passwordVersion(student.senha),
            exp: Math.floor(Date.now() / 1000) + SESSION_MAX_AGE_SECONDS,
        }),
    ).toString("base64url");
    res.setHeader("Set-Cookie", cookie(`${payload}.${sign(payload)}`, SESSION_MAX_AGE_SECONDS));
}

export function clearSessionCookie(res) {
    res.setHeader("Set-Cookie", cookie("", 0));
}

/** Retorna { uid, ver } se o cookie for autêntico e estiver dentro da validade; senão, null. */
export function readSession(req) {
    const token = parseCookies(req.headers.cookie)[SESSION_COOKIE];
    if (!token) return null;

    const [payload, signature] = token.split(".");
    if (!payload || !signature) return null;

    const expected = Buffer.from(sign(payload));
    const received = Buffer.from(signature);
    if (expected.length !== received.length || !timingSafeEqual(expected, received)) return null;

    try {
        const session = JSON.parse(Buffer.from(payload, "base64url").toString("utf8"));
        const isValid =
            Number.isSafeInteger(session.uid) && typeof session.ver === "string" && session.exp > Date.now() / 1000;
        return isValid ? session : null;
    } catch {
        return null;
    }
}
