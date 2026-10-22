import { createHandler } from "../../lib/http.js";
import { clearSessionCookie } from "../../lib/session.js";

export default createHandler("POST", async (req, res) => {
    clearSessionCookie(res);
    return { ok: true };
});
