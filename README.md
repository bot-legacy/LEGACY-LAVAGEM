# LEGACY LAVAGEM · Cidade Brava

Painel financeiro da organização **LEGACY** para controle de lavagens e vendas de itens no servidor GTA RP (FiveM) Cidade Brava.

O site é formado por uma interface em HTML, CSS e JavaScript, e um servidor pequeno (`_worker.js`) que roda na Cloudflare. O servidor faz o login com Discord, confere o cargo do membro, recalcula todas as operações e guarda os dados em um banco D1 (também da Cloudflare, gratuito).

---

## Sumário

1. Como funciona
2. Arquivos do projeto
3. Passo a passo para publicar
4. Permissões por cargo
5. Regras financeiras
6. Testes de cálculo
7. Backup e limpeza de dados
8. Segurança
9. Solução de problemas
10. Atualizações futuras

---

## 1. Como funciona

- O membro entra com a conta do Discord. O servidor confere se ela está no servidor LEGACY e qual é o seu cargo.
- Quem não tem cargo LEGACY não acessa o painel.
- Todas as contas com cargo podem ver o painel. O que cada cargo pode fazer está na seção de permissões.
- Ao registrar uma operação, o servidor recalcula os valores. O navegador não é confiável para isso.
- Cada operação registrada envia uma mensagem para os canais de Discord configurados (webhooks).
- Os dados ficam no banco D1 da Cloudflare, então são compartilhados entre todos os membros autorizados.

---

## 2. Arquivos do projeto

Todos ficam **soltos na raiz** do repositório, sem pastas:

| Arquivo | Função |
|---|---|
| `index.html` | Telas e formulários |
| `style.css` | Visual |
| `script.js` | Interface: formulários, prévias, histórico, relatórios, CSV e backup |
| `_worker.js` | Servidor: login Discord, cálculos, banco e webhooks |
| `wrangler.toml` | Configuração da Cloudflare (nome do Worker, banco D1, arquivos do site) |
| `.assetsignore` | Lista de arquivos que **não** podem ser publicados (código do servidor e configuração) |
| `README.md` | Este arquivo |
| `*.webp` | Logos e imagens usadas no `index.html` (`coroa.webp`, `lgc.webp`, `legacy.webp`) |

**Atenção aos nomes:** a diferença entre maiúsculas e minúsculas importa. `Legacy.webp` não é o mesmo que `legacy.webp`.

---

## 3. Passo a passo para publicar

O projeto é publicado como **Cloudflare Worker** com arquivos estáticos, no endereço `https://NOME.SEU-USUARIO.workers.dev`. Não use o modo "Pages" com este projeto.

### Parte 1: Aplicativo no Discord

1. Acesse https://discord.com/developers/applications e clique em **New Application**.
2. Dê o nome `LEGACY LAVAGEM` e confirme.
3. Copie o **Application ID**. Ele será o `DISCORD_CLIENT_ID`.
4. No menu **OAuth2**, clique em **Reset Secret**, confirme e copie o **Client Secret**. Ele aparece uma vez só. Esse valor será o `DISCORD_CLIENT_SECRET`.
5. Ainda em **OAuth2 → Redirects**, adicione **exatamente** esta URL e clique em **Save Changes**:

   `https://legacy.faclegacy.workers.dev/api/callback`

   Troque `legacy.faclegacy.workers.dev` pelo endereço do seu Worker, se for diferente. Não coloque barra no final, não use `http` e não use URL de preview.

### Parte 2: Webhooks de Discord

Os webhooks enviam uma mensagem para o canal a cada operação registrada.

1. No Discord, abra o canal desejado.
2. Clique em **Editar canal → Integrações → Webhooks → Novo Webhook**.
3. Clique em **Copiar URL do Webhook**.

A URL tem este formato:

`https://discord.com/api/webhooks/ID/TOKEN`

Você precisa de três webhooks:

- Lavagens (canal 1) → será o `WEBHOOK_LAV_1`
- Lavagens (canal 2) → será o `WEBHOOK_LAV_2`
- Vendas → será o `WEBHOOK_VENDAS`

**A URL do webhook é segredo.** Quem tiver a URL consegue enviar mensagens no canal. Não cole URLs em conversas, arquivos públicos nem no README. Se alguma URL vazar, apague o webhook no Discord e crie outro.

### Parte 3: GitHub

1. Crie uma conta em https://github.com, se ainda não tiver.
2. Clique em **New repository**, dê o nome `legacy-lavagem` e marque **Private**.
3. Clique em **uploading an existing file**, selecione **todos** os arquivos da lista da seção 2 e faça o commit.
4. Confira na raiz do repositório se aparecem `_worker.js`, `wrangler.toml`, `.assetsignore` e as imagens `.webp`.

### Parte 4: Banco D1

1. Acesse https://dash.cloudflare.com.
2. Vá em **Storage & Databases → D1 SQL database → Create database**.
3. Dê o nome `legacy-lavagem` e confirme.
4. Na página do banco, copie o **Database ID** (um código como `a1b2c3d4-e5f6-7890-abcd-ef1234567890`).
5. No GitHub, abra o `wrangler.toml` e confirme que o campo `database_id` tem esse código, entre aspas. Não deve restar n
