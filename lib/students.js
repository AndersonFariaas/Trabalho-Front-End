import bcrypt from "bcryptjs";
import { createHash, timingSafeEqual } from "node:crypto";
import { HttpError } from "./http.js";
import { normalizeName } from "./names.js";
import { findStudentPhoto } from "./photos.js";
import { passwordVersion, readSession } from "./session.js";
import { normalizeInventory } from "./shop.js";
import { readKey, writeKey } from "./storage-api.js";

/**
 * Cadastro de alunos do sistema de moedas da turma (chave `senai/coinsnew`).
 *
 * @typedef {object} Student
 * @property {number} id
 * @property {string} nome
 * @property {string} senha        Hash bcrypt ou, em cadastros antigos, texto puro.
 * @property {number} coins           Total de moedas ganhas: é a pontuação do ranking (só o professor altera).
 * @property {number} [moedas_gastas]  Total gasto na loja (só a loja altera).
 * @property {unknown} [inventario]
 * @property {string} [ultima_compra_id]
 *
 * @typedef {{ usuarios: Student[] }} CoinsData
 */

const COINS_KEY = "coinsnew";
const BCRYPT_HASH = /^\$2[aby]\$\d{2}\$/;

// Hash de uma senha aleatória: usado quando o nome não existe, para que a resposta
// demore o mesmo tempo e não revele quais alunos estão cadastrados.
const DUMMY_HASH = "$2a$10$tW/dJ3yJfmo6jcnSshIfh.f5iVCx.PjCLI36eERcTAjwdqAKX/Xue";

/** @returns {Promise<CoinsData>} */
export async function getCoinsData() {
    const value = /** @type {CoinsData} */ (await readKey(COINS_KEY));
    if (!Array.isArray(value?.usuarios)) {
        throw new HttpError(502, "O formato do cadastro de moedas não é reconhecido.");
    }
    return value;
}

/** @param {CoinsData} data */
export function saveCoinsData(data) {
    return writeKey(COINS_KEY, data);
}

/** @param {CoinsData} data */
export function listStudentNames(data) {
    return data.usuarios
        .map((student) => String(student?.nome ?? "").trim())
        .filter(Boolean)
        .sort((a, b) => a.localeCompare(b, "pt-BR"));
}

/** @param {CoinsData} data @param {number} id */
export function findStudentById(data, id) {
    return data.usuarios.find((student) => Number(student?.id) === id);
}

function findStudentByName(data, name) {
    const target = normalizeName(name);
    const matches = data.usuarios.filter((student) => normalizeName(student?.nome) === target);
    if (matches.length > 1) throw new HttpError(409, "Há mais de um aluno com este nome. Procure o professor.");
    return matches[0];
}

function sha256(value) {
    return createHash("sha256").update(value).digest();
}

/**
 * Alguns alunos ainda têm senha em texto puro no cadastro; os demais usam bcrypt.
 *
 * @param {string} password
 * @param {unknown} storedPassword
 */
async function passwordMatches(password, storedPassword) {
    const stored = String(storedPassword ?? "");
    if (BCRYPT_HASH.test(stored)) return bcrypt.compare(password, stored);
    if (!stored) return false;
    return timingSafeEqual(sha256(password), sha256(stored));
}

/**
 * Valida nome + senha no cadastro da turma, com a mesma mensagem para nome inexistente
 * e senha errada, para não revelar quem está cadastrado.
 *
 * @returns {Promise<{ data: CoinsData, student: Student }>}
 */
export async function authenticate(name, password) {
    const data = await getCoinsData();
    const student = findStudentByName(data, name);

    if (!student) {
        await bcrypt.compare(password, DUMMY_HASH);
        throw new HttpError(401, "Nome ou senha incorretos.");
    }
    if (!(await passwordMatches(password, student.senha))) {
        throw new HttpError(401, "Nome ou senha incorretos.");
    }
    return { data, student };
}

/**
 * Recupera o aluno da sessão a partir de dados recém-lidos da turma (fonte da verdade).
 *
 * @returns {Promise<{ data: CoinsData, index: number, student: Student }>}
 */
export async function requireStudent(req) {
    const session = readSession(req);
    if (!session) throw new HttpError(401, "Faça login para continuar.");

    const data = await getCoinsData();
    const index = data.usuarios.findIndex((student) => Number(student?.id) === session.uid);
    const student = data.usuarios[index];

    if (!student || passwordVersion(student.senha) !== session.ver) {
        throw new HttpError(401, "Sua sessão expirou. Entre novamente.");
    }
    return { data, index, student };
}

/**
 * Moedas ganhas (campo `coins`): a pontuação do ranking. A loja nunca diminui esse valor.
 *
 * @param {Student} student
 */
function readEarnedCoins(student) {
    const coins = Number(student?.coins);
    if (!Number.isFinite(coins) || coins < 0) {
        throw new HttpError(502, "O saldo da conta está em um formato inválido.");
    }
    return coins;
}

/** Moedas já gastas na loja (campo `moedas_gastas`; ausente = nada gasto). @param {Student} student */
export function readSpentCoins(student) {
    const spent = Number(student?.moedas_gastas ?? 0);
    return Number.isFinite(spent) && spent > 0 ? spent : 0;
}

/**
 * Saldo para compras = ganho − gasto. Nunca negativo: se o professor zerar um aluno
 * que já comprou, o saldo fica 0 em vez de "devendo".
 *
 * @param {Student} student
 */
export function availableCoins(student) {
    return Math.max(0, readEarnedCoins(student) - readSpentCoins(student));
}

/**
 * Posição no ranking pelas moedas ganhas (empates dividem a mesma posição).
 *
 * @param {CoinsData} data
 * @param {Student} student
 */
function rankingOf(data, student) {
    const earned = readEarnedCoins(student);
    const ahead = data.usuarios.filter((other) => (Number(other?.coins) || 0) > earned).length;
    return { posicao: ahead + 1, total: data.usuarios.length };
}

/**
 * Dados seguros para o navegador: nunca inclui a senha.
 * A foto vem do cadastro da turma no Supabase; sem ela, o painel mostra as iniciais.
 *
 * @param {Student} student
 * @param {CoinsData} data Cadastro da turma, para calcular a posição no ranking.
 */
export async function toPublicProfile(student, data) {
    return {
        id: Number(student.id),
        nome: String(student.nome ?? "Aluno"),
        foto: await findStudentPhoto(student.nome),
        moedas: availableCoins(student),
        ranking: rankingOf(data, student),
        inventario: normalizeInventory(student.inventario),
    };
}
