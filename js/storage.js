/** Acesso ao localStorage tolerante a dados corrompidos ou armazenamento bloqueado (aba anônima). */
export const storage = {
    read(key, fallback) {
        try {
            const raw = localStorage.getItem(key);
            return raw ? JSON.parse(raw) : fallback;
        } catch {
            return fallback;
        }
    },

    write(key, value) {
        try {
            localStorage.setItem(key, JSON.stringify(value));
        } catch (error) {
            console.warn("Não foi possível salvar no localStorage:", error);
        }
    },

    writeText(key, value) {
        try {
            localStorage.setItem(key, value);
        } catch {
            // armazenamento indisponível: a preferência só não é lembrada
        }
    },
};
