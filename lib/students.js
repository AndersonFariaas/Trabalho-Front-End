import bcrypt from "bcryptjs";
import { createHash, timingSafeEqual } from "node:crypto";
import { HttpError } from "./http.js";
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
 * @property {number} coins
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

/** Compara nomes ignorando acentos, maiúsculas e espaços extras. */
export function normalizeName(name) {
    return String(name ?? "")
        .normalize("NFD")
        .replace(/\p{Diacritic}/gu, "")
        .toLowerCase()
        .replace(/\s+/g, " ")
        .trim();
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
export async function passwordMatches(password, storedPassword) {
    const stored = String(storedPassword ?? "");
    if (BCRYPT_HASH.test(stored)) return bcrypt.compare(password, stored);
    if (!stored) return false;
    return timingSafeEqual(sha256(password), sha256(stored));
}

/**
 * Valida nome + senha no cadastro da turma, com a mesma mensagem para nome inexistente
 * e senha errada, para não revelar quem está cadastrado.
 *
 * @returns {Promise<Student>}
 */
export async function authenticate(name, password) {
    const student = findStudentByName(await getCoinsData(), name);

    if (!student) {
        await bcrypt.compare(password, DUMMY_HASH);
        throw new HttpError(401, "Nome ou senha incorretos.");
    }
    if (!(await passwordMatches(password, student.senha))) {
        throw new HttpError(401, "Nome ou senha incorretos.");
    }
    return student;
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

/** @param {Student} student */
export function readCoins(student) {
    const coins = Number(student?.coins);
    if (!Number.isFinite(coins) || coins < 0) {
        throw new HttpError(502, "O saldo da conta está em um formato inválido.");
    }
    return coins;
}

/**
 * Dados seguros para o navegador: nunca inclui a senha.
 *
 * @param {Student} student
 */
export function toPublicProfile(student) {
    return {
        id: Number(student.id),
        nome: String(student.nome ?? "Aluno"),
        moedas: readCoins(student),
        inventario: normalizeInventory(student.inventario),
    };
}
