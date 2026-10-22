import { z } from "zod";

export const MAX_CART_LINES = 30;
export const MAX_QUANTITY_PER_PRODUCT = 99;
const MAX_NAME_LENGTH = 120;
const MAX_PASSWORD_LENGTH = 72; // o bcrypt ignora o que passar disso

const CREDENTIALS_MESSAGE = "Informe seu nome e sua senha.";

export const loginSchema = z.object({
    nome: z
        .string({ message: CREDENTIALS_MESSAGE })
        .trim()
        .min(1, CREDENTIALS_MESSAGE)
        .max(MAX_NAME_LENGTH, CREDENTIALS_MESSAGE),
    senha: z
        .string({ message: CREDENTIALS_MESSAGE })
        .min(1, CREDENTIALS_MESSAGE)
        .max(MAX_PASSWORD_LENGTH, CREDENTIALS_MESSAGE),
});

const INVALID_ITEM = "Há um produto ou quantidade inválida no carrinho.";

const cartItemSchema = z.object({
    id: z.string({ message: INVALID_ITEM }).trim().min(1, INVALID_ITEM).max(160, INVALID_ITEM),
    quantidade: z
        .number({ message: INVALID_ITEM })
        .int(INVALID_ITEM)
        .min(1, INVALID_ITEM)
        .max(MAX_QUANTITY_PER_PRODUCT, INVALID_ITEM),
});

const CART_SIZE_MESSAGE = `O carrinho deve ter de 1 a ${MAX_CART_LINES} produtos.`;
const INVALID_REQUEST_ID = "Identificador da compra inválido. Atualize a página e tente novamente.";

export const checkoutSchema = z.object({
    itens: z
        .array(cartItemSchema, { message: CART_SIZE_MESSAGE })
        .min(1, CART_SIZE_MESSAGE)
        .max(MAX_CART_LINES, CART_SIZE_MESSAGE),
    requestId: z.string({ message: INVALID_REQUEST_ID }).uuid(INVALID_REQUEST_ID),
});
