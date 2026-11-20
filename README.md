# LEGACY LAVAGEM — Cidade Brava

Painel financeiro da organização LEGACY. Site estático (HTML, CSS e JavaScript puro): sem servidor, sem banco de dados, sem serviços externos.

## Arquivos
- `index.html` — páginas e formulários
- `style.css` — visual
- `script.js` — cálculos, dados (localStorage), histórico, relatórios, CSV e backup
- `functions/api/[[path]].js` — servidor: login Discord, banco D1, webhooks
- `assets/` — logos e fundo da LEGACY (envie esta pasta junto!)

## Publicar (Cloudflare Pages + GitHub + login Discord)
O Cloudflare **não aceita arrastar arquivos** quando o site tem servidor (pasta `functions`). Por isso o caminho é GitHub → Cloudflare. Tudo gratuito.

### Parte 1 — Discord
1. https://discord.com/developers/applications → **New Application** → nome `LEGACY LAVAGEM` (aplicativo NOVO, separado do bot DragonSYS, para não arriscar o bot atual). Copie o **Application ID**.
2. Menu **OAuth2** → **Reset Secret** → copie o **Client Secret** (aparece uma vez; não compartilhe).
3. Crie 3 webhooks (canal → Editar canal → Integrações → Webhooks → Novo Webhook → Copiar URL): lavagens `1573311237666902056`, lavagens `1573310826780295238` e vendas `1541769406596517919`. A URL do webhook é segredo.

### Parte 2 — GitHub
1. Crie conta em github.com → **New repository** → nome `legacy-lavagem` → **Private** → Create.
2. **Uploading an existing file** → arraste TUDO que está dentro da pasta descompactada (`index.html`, `style.css`, `script.js`, pastas `assets` e `functions`) → Commit.

### Parte 3 — Cloudflare
1. Workers & Pages → Storage & Databases → **D1** → Create database → nome `legacy-lavagem`.
2. Workers & Pages → Create → **Pages** → Connect to Git → escolha `legacy-lavagem` → Framework: None, build command vazio, output directory `/` → Deploy.
3. Anote o endereço `https://SEU-SITE.pages.dev`. No Discord (aplicativo → OAuth2 → Redirects) adicione `https://SEU-SITE.pages.dev/api/callback`.
4. No projeto: **Settings → Bindings → Add → D1 database** → variable name `DB` → banco `legacy-lavagem`.
5. **Settings → Variables and secrets** → adicione como **Secret**: `DISCORD_CLIENT_ID` (Application ID), `DISCORD_CLIENT_SECRET`, `SESSION_SECRET` (texto aleatório de 40+ caracteres), `WEBHOOK_LAV_1`, `WEBHOOK_LAV_2`, `WEBHOOK_VENDAS`.
6. **Deployments → Retry deployment** (para aplicar). Abra o site e entre com o Discord.

Para atualizar o site depois: envie os arquivos novos no GitHub e o Cloudflare publica sozinho.

### Permissões por cargo
Membro: ver e registrar. Gerente: + excluir registros, editar produtos, exportar backup. Líder: + importar backup e limpar dados. Para mudar, edite `NEED` no topo de `functions/api/[[path]].js`.

## Regras financeiras (% do valor bruto)
| Situação | Pagou o farm | Máquina | Lavador | LEGACY | Taxas | Valor final |
|---|---|---|---|---|---|---|
| Membro LEGACY | Sim | 10% | — | 0% | 10% | 90% |
| Membro LEGACY | Não | 10% | — | 10% | 20% | 80% |
| Fora, com parceria | Sim | 10% | 10% | 5% | 25% | 75% |
| Fora, com parceria | Não | 10% | 5% | 10% | 25% | 75% |
| Fora, sem parceria | Sim | 10% | 10% | 10% | 30% | 70% |
| Fora, sem parceria | Não | 10% | 5% | 15% | 30% | 70% |

Vendas de itens: 50% vendedor / 50% caixa LEGACY.
Os cálculos usam centavos inteiros; qualquer centavo de arredondamento fica no valor final, então a soma sempre fecha com o bruto.
Em Configurações há o botão **Executar testes** (as seis regras e a venda).

## Segurança e limitações
- O servidor refaz todos os cálculos e confere o cargo no Discord a cada login (sessão de 12 h). Segredos ficam só nas variáveis do Cloudflare, nunca no código.
- Quem sai do cargo só perde o acesso quando a sessão expirar (até 12 h).
- Dados antigos do navegador (versão 1) não migram sozinhos: use o backup JSON antigo em Configurações → Importar (Líder).
