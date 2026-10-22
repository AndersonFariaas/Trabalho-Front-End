# SENAI Shop Tech

Loja da Firjan SENAI ligada ao **sistema de moedas da turma**. O aluno entra com o mesmo nome e senha do SENAI Coins, compra produtos com as próprias moedas e vê os itens comprados no perfil.

Projeto do curso Técnico em Desenvolvimento de Sistemas.

## Funcionalidades

- **Catálogo** lido da API da turma, com destaques aleatórios girando e 9 categorias.
- **Login** com o nome e a senha do sistema de moedas, validado no servidor (com limite de tentativas).
- **Carrinho** em painel próprio e **compra** que desconta do saldo, sem cobrança dupla.
- **Painel do aluno** com foto (do cadastro da turma), saldo, posição no ranking e inventário.
- **Ranking preservado:** comprar desconta só do saldo; a pontuação do ranking não muda.
- Tema claro/escuro, responsivo, acessível e com animações que respeitam quem prefere menos movimento.

## Como testar no seu computador

Precisa só do Node.js 20 ou mais novo.

```bash
npm install
npm start
```

Abra **http://localhost:3000** e entre com seu nome e sua senha do sistema de moedas.

- Na primeira vez, crie o arquivo `.env` copiando o `.env.example` e preencha o `SESSION_SECRET` com um texto aleatório de 32+ caracteres.
- **As compras feitas aqui são reais:** descontam moedas de verdade.
- Abrir o `index.html` direto ou pelo Live Server mostra o site, mas o login não funciona: ele precisa do `npm start`.

## Como funciona (3 partes)

```text
 Navegador (o site)          Servidor da loja (api/)            Dados da turma
 index.html, style.css,  →   confere a senha, calcula o    →    moedas e cadastro
 pasta js/                   preço e faz a compra               (FreeOnlineStorage)
```

1. **O site** mostra os produtos, o carrinho e o perfil. Ele **nunca** decide preço nem saldo.
2. **O servidor da loja** (pasta `api/`) é quem confere a senha, verifica se há moedas suficientes, desconta o valor e guarda o item no inventário do aluno.
3. **Os dados da turma** ficam no mesmo lugar que o painel do professor usa.

Assim, ninguém consegue mudar o preço ou o próprio saldo pelo navegador.

## Onde fica cada coisa

| Pasta / arquivo             | O que tem                                                        |
| --------------------------- | ---------------------------------------------------------------- |
| `index.html`, `style.css`   | A página e o visual                                              |
| `js/main.js`                | Começo do JavaScript do site: liga todas as partes               |
| `js/ui/`                    | Partes da tela: menu, modais, carrossel, catálogo, login, perfil |
| `js/features/`              | Regras do site: conta do aluno e carrinho                        |
| `js/services/`              | Conversa com o servidor e com a API de produtos                  |
| `shared/products.js`        | Regra do preço em moedas, usada pelo site **e** pelo servidor    |
| `api/`                      | As rotas do servidor: login, sair, perfil e compra               |
| `lib/`                      | Código de apoio do servidor: senha, sessão, saldo, inventário    |
| `tests/`                    | Testes automáticos                                               |
| `scripts/servidor-local.js` | O que roda quando você usa `npm start`                           |
| `vercel.json`               | Configurações de segurança do site publicado                     |
| `API-COMERCIO-SEGURA.md`    | Detalhes de segurança e riscos conhecidos                        |

## Comandos

| Comando          | O que faz                                                 |
| ---------------- | --------------------------------------------------------- |
| `npm start`      | Abre a loja em http://localhost:3000                      |
| `npm test`       | Roda os testes automáticos                                |
| `npm run check`  | Confere tudo (erros, formatação e testes) antes de enviar |
| `npm run format` | Arruma a formatação do código                             |

## Publicar na Vercel

O projeto `senai_shop` na Vercel publica sozinho a partir do GitHub. Antes, configure em **Settings → Environment Variables**:

| Variável           | Obrigatória | Para que serve                                                                    |
| ------------------ | ----------- | --------------------------------------------------------------------------------- |
| `SESSION_SECRET`   | Sim         | Texto aleatório (32+ caracteres) que protege o login.                             |
| `COINS_ADMIN_AUTH` | Talvez      | Senha `ADMIN_AUTH` do painel do professor, se o armazenamento exigir para gravar. |
