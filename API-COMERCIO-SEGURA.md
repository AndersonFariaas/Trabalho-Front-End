# Loja integrada ao sistema de moedas da turma

## Como funciona

O aluno entra com o **mesmo nome e senha do sistema de moedas da turma** (chave `senai/coinsnew` no FreeOnlineStorage). Toda a validação acontece em funções serverless da Vercel. O navegador nunca recebe senhas, hashes nem os saldos de outros alunos.

| Rota                      | Função                                                                                                                            |
| ------------------------- | --------------------------------------------------------------------------------------------------------------------------------- |
| `GET /api/auth/alunos`    | Lista só os nomes, para o autocompletar do login.                                                                                 |
| `POST /api/auth/login`    | Recebe `{ nome, senha }`, confere a senha (bcrypt ou texto puro legado) e cria a sessão em cookie `HttpOnly`.                     |
| `POST /api/auth/logout`   | Encerra a sessão.                                                                                                                 |
| `GET /api/loja/perfil`    | Devolve `{ id, nome, foto, moedas, ranking, inventario }` do aluno logado, ou `null` para visitante sem login.                    |
| `POST /api/loja/checkout` | Recebe `{ itens: [{ id, quantidade }], requestId }`, recalcula os preços, confere o saldo, registra o gasto e grava o inventário. |

### Regras da compra

- **O servidor é a fonte da verdade:** o preço vem do catálogo `senai/produtos` lido no servidor, nunca do navegador.
- **Preço em moedas:** usa `preco_moedas` (ou `moedas`) quando o produto tiver; senão, **1 moeda = R$ 1** (`preco`), arredondando para cima.
- **Ranking separado do saldo:** o campo `coins` é o total de moedas **ganhas** e só o painel do professor o altera; é a pontuação do ranking. A loja soma cada compra em `moedas_gastas` e nunca mexe em `coins`. O saldo para compras é `coins − moedas_gastas` (nunca negativo: se o professor zerar um aluno que já comprou, o saldo fica 0). O perfil devolve `moedas` (saldo) e `ranking: { posicao, total }`, com empates dividindo a mesma posição.
- **Foto do aluno:** vem da tabela `aluno` do Supabase da turma (a mesma do site de currículos), ligada ao cadastro de moedas pelo nome sem acentos, com a chave publicável e cache de 5 minutos. Se o Supabase falhar ou a foto não carregar, o painel mostra as iniciais; login e compra não dependem dela.
- **Inventário no cadastro do aluno:** fica no campo `inventario` do próprio registro em `coinsnew`, no formato `[{ id, nome, quantidade, preco_moedas }]`. O débito e o item novo entram na **mesma gravação**, então nunca fica moeda descontada sem produto.
- **Sem cobrança dupla:** cada compra tem um `requestId` (UUID gerado no navegador). O servidor guarda o último em `ultima_compra_id`, e uma repetição (duplo clique ou nova tentativa após timeout) devolve o perfil sem cobrar de novo.
- **Conferência pós-gravação:** como o armazenamento não tem transações, o servidor relê o cadastro depois de gravar. Se outra gravação simultânea sobrescreveu a compra, o aluno recebe um erro e nada é cobrado.

### Segurança

- Sessão assinada com HMAC-SHA256 (`SESSION_SECRET`), válida por 7 dias, em cookie `HttpOnly; Secure; SameSite=Lax`.
- Se a senha do aluno mudar no sistema da turma, as sessões antigas deixam de valer.
- Rotas que alteram dados recusam requisições de outras origens (proteção contra CSRF).
- Nome inexistente e senha errada recebem a mesma mensagem e levam o mesmo tempo, para não revelar quem está cadastrado.
- Respostas da API nunca incluem `senha`.

## Configuração

1. Na Vercel, em **Settings → Environment Variables**, configure (modelo em `.env.example`):
   - `SESSION_SECRET`: valor aleatório com pelo menos 32 caracteres.
   - `COINS_ADMIN_AUTH`: a senha de administrador do FreeOnlineStorage (a mesma `ADMIN_AUTH` do painel do professor), se o bucket `senai` exigir o cabeçalho `admin-auth` para gravar.
2. Publique na Vercel, ou rode localmente com `npm start` (http://localhost:3000). O Live Server não executa as rotas `/api`.

## Riscos que dependem do serviço externo

- **A chave `senai/coinsnew` é pública:** qualquer pessoa consegue ler os hashes de senha (e as senhas em texto puro de alguns alunos) direto da API do FreeOnlineStorage, e a loja não tem como esconder isso. O responsável pelo sistema de moedas deve restringir a leitura e pedir a troca das senhas expostas, principalmente as que estão em texto puro.
- **Gravações simultâneas:** o painel do professor e a loja gravam o objeto inteiro. A conferência pós-gravação detecta quando a compra foi sobrescrita, mas, se o professor alterar um saldo no mesmo instante de uma compra, a alteração do professor pode se perder. Para eliminar esse risco, o serviço de moedas precisaria de uma operação atômica por aluno.
- **Tentativas de senha:** não há limite de tentativas de login, porque a Vercel não guarda estado entre requisições sem um banco de dados. O bcrypt deixa cada tentativa lenta, mas um limitador (ex.: Vercel KV ou Upstash) é recomendado se a loja for aberta ao público.
- **Campos extras no cadastro:** o painel do professor preserva `inventario`, `moedas_gastas` e `ultima_compra_id` (ele copia cada aluno com `{ ...usuario }`). Qualquer outro sistema que regrave `coinsnew` também precisa preservar esses campos, ou os inventários e os gastos se perdem (um aluno que perdesse `moedas_gastas` voltaria a ter as moedas que já gastou).
