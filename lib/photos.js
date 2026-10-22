import { normalizeName } from "./names.js";

/**
 * Fotos dos alunos, lidas da tabela `aluno` do Supabase da turma (a mesma usada pelo
 * site de currículos e pelo cadastro da turma). A ligação com o cadastro de moedas é
 * pelo nome, porque os ids dos dois sistemas são diferentes.
 *
 * A chave abaixo é a publicável (sb_publishable_…): feita para ficar pública, a mesma que o
 * site de currículos já expõe. As variáveis de ambiente permitem trocar sem mexer no código.
 */
const TURMA_SUPABASE_URL = process.env.TURMA_SUPABASE_URL || "https://eempgprspimlhzlofvjx.supabase.co";
const TURMA_SUPABASE_KEY = process.env.TURMA_SUPABASE_KEY || "sb_publishable_H8eepB7xyJndr_TdsvuiVw_pJbsPC5k";
const CACHE_MS = 5 * 60_000;
const REQUEST_TIMEOUT_MS = 5_000;

/** @type {{ loadedAt: number, photos: Map<string, string> | null }} */
let cache = { loadedAt: 0, photos: null };

/** Limpa o cache (usado pelos testes). */
export function clearPhotoCache() {
    cache = { loadedAt: 0, photos: null };
}

const isHttpsUrl = (value) => typeof value === "string" && /^https:\/\/\S+$/.test(value.trim());

async function loadPhotos() {
    if (cache.photos && Date.now() - cache.loadedAt < CACHE_MS) return cache.photos;

    const response = await fetch(`${TURMA_SUPABASE_URL}/rest/v1/aluno?select=nome,foto_url`, {
        headers: {
            apikey: TURMA_SUPABASE_KEY,
            Authorization: `Bearer ${TURMA_SUPABASE_KEY}`,
            Accept: "application/json",
        },
        cache: "no-store",
        signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    });
    if (!response.ok) throw new Error(`Supabase da turma respondeu HTTP ${response.status}`);

    const rows = await response.json();
    const photos = new Map(
        (Array.isArray(rows) ? rows : [])
            .filter((row) => row?.nome && isHttpsUrl(row.foto_url))
            .map((row) => [normalizeName(row.nome), row.foto_url.trim()]),
    );
    cache = { loadedAt: Date.now(), photos };
    return photos;
}

/**
 * URL da foto do aluno, ou null. Nunca lança erro: sem foto, o painel mostra as iniciais
 * e o login e a compra seguem normalmente.
 *
 * @param {string} name
 * @returns {Promise<string | null>}
 */
export async function findStudentPhoto(name) {
    try {
        return (await loadPhotos()).get(normalizeName(name)) ?? null;
    } catch (error) {
        console.error("Não foi possível carregar as fotos da turma:", error.message);
        return null;
    }
}
