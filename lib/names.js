/** Compara nomes ignorando acentos, maiúsculas e espaços extras ("João  Silva" = "joao silva"). */
export function normalizeName(name) {
    return String(name ?? "")
        .normalize("NFD")
        .replace(/\p{Diacritic}/gu, "")
        .toLowerCase()
        .replace(/\s+/g, " ")
        .trim();
}
