import { createHandler, parseBody } from "../../lib/http.js";
import { loginSchema } from "../../lib/schemas.js";
import { setSessionCookie } from "../../lib/session.js";
import { authenticate, toPublicProfile } from "../../lib/students.js";

export default createHandler("POST", async (req, res) => {
    const { nome, senha } = parseBody(loginSchema, req.body);
    const student = await authenticate(nome, senha);
    setSessionCookie(res, student);
    return toPublicProfile(student);
});
