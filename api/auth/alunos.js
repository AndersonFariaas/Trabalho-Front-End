import { createHandler } from "../../lib/http.js";
import { getCoinsData, listStudentNames } from "../../lib/students.js";

// Só os nomes (para o autocompletar do login); senhas e saldos nunca saem do servidor.
export default createHandler("GET", async () => ({ alunos: listStudentNames(await getCoinsData()) }));
