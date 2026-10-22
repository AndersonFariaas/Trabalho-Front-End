import { getCatalog } from "../../lib/catalog.js";
import { createHandler, HttpError, parseBody } from "../../lib/http.js";
import { checkoutSchema } from "../../lib/schemas.js";
import { addToInventory, mergeCartItems, priceCart } from "../../lib/shop.js";
import {
    availableCoins,
    findStudentById,
    getCoinsData,
    readSpentCoins,
    requireStudent,
    saveCoinsData,
    toPublicProfile,
} from "../../lib/students.js";

export default createHandler("POST", async (req) => {
    const { itens, requestId } = parseBody(checkoutSchema, req.body);
    const items = mergeCartItems(itens);

    const [{ data, index, student }, catalog] = await Promise.all([requireStudent(req), getCatalog()]);

    // Repetição da mesma compra (duplo clique ou nova tentativa após timeout): não cobra de novo.
    if (student.ultima_compra_id === requestId) return toPublicProfile(student, data);

    const { lines, total } = priceCart(items, catalog);
    if (availableCoins(student) < total) throw new HttpError(409, "Saldo insuficiente para concluir a compra.");

    // A compra soma em `moedas_gastas` e não mexe em `coins` (a pontuação do ranking).
    // Débito e inventário vão juntos numa única gravação: nunca fica moeda descontada sem produto.
    const usuarios = data.usuarios.with(index, {
        ...student,
        moedas_gastas: readSpentCoins(student) + total,
        inventario: addToInventory(student.inventario, lines),
        ultima_compra_id: requestId,
    });
    await saveCoinsData({ ...data, usuarios });

    // O armazenamento não tem transações: relê para confirmar que nenhuma gravação
    // simultânea (painel do professor ou outra compra) sobrescreveu esta.
    const savedData = await getCoinsData();
    const saved = findStudentById(savedData, Number(student.id));
    if (saved?.ultima_compra_id !== requestId) {
        throw new HttpError(
            409,
            "Seu saldo foi alterado ao mesmo tempo por outra operação. Confira seu perfil e tente de novo.",
        );
    }
    return toPublicProfile(saved, savedData);
});
