import { createHandler, parseBody } from "../../lib/http.js";
import { assertLoginAllowed, clearLoginFailures, loginAttemptKey, registerLoginFailure } from "../../lib/rate-limit.js";
import { loginSchema } from "../../lib/schemas.js";
import { setSessionCookie } from "../../lib/session.js";
import { authenticate, toPublicProfile } from "../../lib/students.js";

export default createHandler("POST", async (req, res) => {
    const { nome, senha } = parseBody(loginSchema, req.body);
    const attemptKey = loginAttemptKey(req, nome);
    assertLoginAllowed(attemptKey);

    try {
        const { data, student } = await authenticate(nome, senha);
        clearLoginFailures(attemptKey);
        setSessionCookie(res, student);
        return await toPublicProfile(student, data);
    } catch (error) {
        if (error.status === 401) registerLoginFailure(attemptKey);
        throw error;
    }
});
