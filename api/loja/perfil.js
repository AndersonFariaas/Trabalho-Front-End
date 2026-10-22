import { createHandler } from "../../lib/http.js";
import { clearSessionCookie, readSession } from "../../lib/session.js";
import { requireStudent, toPublicProfile } from "../../lib/students.js";

// Visitante sem sessão recebe `null` (200): é um estado normal, não um erro.
// Sessão inválida ou expirada recebe 401 e o cookie é apagado.
export default createHandler("GET", async (req, res) => {
    if (!readSession(req)) return null;

    try {
        const { student } = await requireStudent(req);
        return toPublicProfile(student);
    } catch (error) {
        if (error.status === 401) clearSessionCookie(res);
        throw error;
    }
});
