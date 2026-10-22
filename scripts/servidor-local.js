/**
 * Servidor para testar a loja no próprio computador, sem conta na Vercel.
 * Serve o site e executa as rotas de /api do mesmo jeito que a Vercel faz.
 *
 * Uso: npm start  →  http://localhost:3000
 */
import { existsSync } from "node:fs";
import { readFile } from "node:fs/promises";
import http from "node:http";
import { extname, join, normalize, sep } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const PORT = 3000;
const ROOT = fileURLToPath(new URL("..", import.meta.url));

if (existsSync(join(ROOT, ".env"))) process.loadEnvFile(join(ROOT, ".env"));

const CONTENT_TYPES = {
    ".html": "text/html; charset=utf-8",
    ".css": "text/css; charset=utf-8",
    ".js": "text/javascript; charset=utf-8",
    ".png": "image/png",
    ".jpg": "image/jpeg",
};

// Só o que o navegador precisa: o código do servidor, as configurações e o .env nunca são servidos.
const PUBLIC_FOLDERS = ["js", "shared"];

function isPublicFile(path) {
    const extension = extname(path);
    if (CONTENT_TYPES[extension] === undefined) return false;
    if (!path.includes("/")) return extension !== ".js"; // na raiz: só página, estilo e imagens
    return PUBLIC_FOLDERS.includes(path.split("/")[0]);
}

const vercelConfig = JSON.parse(await readFile(join(ROOT, "vercel.json"), "utf8"));
const securityHeaders = Object.fromEntries(vercelConfig.headers[0].headers.map(({ key, value }) => [key, value]));

async function readJsonBody(req) {
    let raw = "";
    for await (const chunk of req) raw += chunk;
    if (!raw || !req.headers["content-type"]?.includes("application/json")) return {};
    try {
        return JSON.parse(raw);
    } catch {
        return {};
    }
}

/** Adapta a resposta do Node para o formato das funções da Vercel (res.status().json()). */
function asVercelResponse(res) {
    res.status = (code) => {
        res.statusCode = code;
        return res;
    };
    res.json = (payload) => {
        res.setHeader("Content-Type", "application/json; charset=utf-8");
        res.end(JSON.stringify(payload));
        return res;
    };
    return res;
}

async function handleApi(req, res, pathname) {
    const routeFile = join(ROOT, `${pathname}.js`);
    if (!/^\/api\/[a-z]+\/[a-z]+$/.test(pathname) || !existsSync(routeFile)) {
        res.writeHead(404).end("Rota não encontrada");
        return;
    }
    req.body = await readJsonBody(req);
    const { default: route } = await import(pathToFileURL(routeFile).href);
    await route(req, asVercelResponse(res));
}

async function handleStatic(res, pathname) {
    const path = pathname === "/" ? "index.html" : decodeURIComponent(pathname.slice(1));
    const file = normalize(join(ROOT, path));
    if (!isPublicFile(path) || !file.startsWith(ROOT.replace(/[\\/]$/, "") + sep)) {
        res.writeHead(404).end("Não encontrado");
        return;
    }
    try {
        const content = await readFile(file);
        res.writeHead(200, { ...securityHeaders, "Content-Type": CONTENT_TYPES[extname(file)] });
        res.end(content);
    } catch {
        res.writeHead(404).end("Não encontrado");
    }
}

const server = http.createServer(async (req, res) => {
    const { pathname } = new URL(req.url, `http://localhost:${PORT}`);
    try {
        if (pathname.startsWith("/api/")) await handleApi(req, res, pathname);
        else await handleStatic(res, pathname);
    } catch (error) {
        console.error(error);
        if (!res.headersSent) res.writeHead(500).end("Erro interno");
    }
});

server.on("error", (error) => {
    if (error.code !== "EADDRINUSE") throw error;
    console.error(`\nA porta ${PORT} já está em uso: a loja provavelmente já está aberta em outro terminal.`);
    console.error(`Abra http://localhost:${PORT} ou feche o outro terminal e rode npm start de novo.\n`);
    process.exit(1);
});

server.listen(PORT, () => {
    console.log(`\nLoja rodando em http://localhost:${PORT}`);
    console.log("Atenção: as compras feitas aqui descontam moedas de verdade.\n");
    if (!process.env.SESSION_SECRET) {
        console.warn("Falta o SESSION_SECRET no arquivo .env: o login não vai funcionar.\n");
    }
});
