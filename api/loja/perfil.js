import { createHandler } from "../../lib/http.js";
import { clearSessionCookie, hasSessionCookie, readSession } from "../../lib/session.js";
import { requireStudent, toPublicProfile } from "../../lib/students.js";

// Visitante sem sessão recebe `null` (200): é um estado normal, não um erro.
// Cookie vencido ou adulterado é apagado, para o navegador parar de reenviá-lo.
// Sessão válida de um aluno que não existe mais (ou trocou a senha) recebe 401.
export default createHandler("GET", async (req, res) => {
    if (!readSession(req)) {
        if (hasSessionCookie(req)) clearSessionCookie(res);
        return null;
    }

    try {
        const { data, student } = await requireStudent(req);
        return await toPublicProfile(student, data);
    } catch (error) {
        if (error.status === 401) clearSessionCookie(res);
        throw error;
    }
});
