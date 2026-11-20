// LEGACY LAVAGEM — servidor (Cloudflare Pages Functions). Segredos ficam nas variáveis do Cloudflare, NUNCA aqui.
const GUILD='1541651937257328660';
const ROLES={'1541651937286422617':1,'1541651937299271722':2,'1541651937311719490':3}; // Membro=1, Gerente=2, Líder=3
const NOME=['','Membro','Gerente','Líder'];
const NEED={registrar:1,excluir:2,produtos:2,admin:3}; // nível mínimo (todos os cargos podem ver o painel)
const NOMES=['Cartão de Ação Nível I','Cartão de Ação Nível II','Cartão de Ação Nível III','Capuz','Algema','Outros itens'];
// Mesmas regras do script.js: [máquina%, lavador%, LEGACY%]. Não altere sem alterar nos dois.
const RULES={membro:{sim:[10,0,0],nao:[10,0,10]},parceria:{sim:[10,10,5],nao:[10,5,10]},semparceria:{sim:[10,10,10],nao:[10,5,15]}};
const pct=(b,p)=>Math.floor((b*p+50)/100);
function calcLav(b,cat,farm,parc){const k=cat==='membro'?'membro':parc==='sim'?'parceria':'semparceria',r=RULES[k][farm],maquina=pct(b,r[0]),lavador=pct(b,r[1]),legacy=pct(b,r[2]),taxas=maquina+lavador+legacy;return{pm:r[0],pl:r[1],pg:r[2],maquina,lavador,legacy,taxas,liquido:b-taxas}}
function calcVenda(q,u){const total=q*u,vendedor=Math.floor(total/2);return{total,vendedor,legacy:total-vendedor}}
const fmt=c=>'R$ '+Math.floor(c/100).toString().replace(/\B(?=(\d{3})+(?!\d))/g,'.')+','+String(c%100).padStart(2,'0');
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const idOf=s=>'OP-'+String(s).padStart(5,'0');
const enc=new TextEncoder();
const b64u=a=>btoa(String.fromCharCode(...a)).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'');
const toB=o=>b64u(enc.encode(JSON.stringify(o)));
const fromB=s=>JSON.parse(new TextDecoder().decode(Uint8Array.from(atob(s.replace(/-/g,'+').replace(/_/g,'/')),c=>c.charCodeAt(0))));
async function sign(s,k){const key=await crypto.subtle.importKey('raw',enc.encode(k),{name:'HMAC',hash:'SHA-256'},false,['sign']);return b64u(new Uint8Array(await crypto.subtle.sign('HMAC',key,enc.encode(s))))}
const cookie=(r,n)=>((r.headers.get('Cookie')||'').split(/;\s*/).find(c=>c.startsWith(n+'='))||'').slice(n.length+1);
const setc=(n,v,age)=>`${n}=${v}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=${age}`;
const J=(o,s=200)=>new Response(JSON.stringify(o),{status:s,headers:{'Content-Type':'application/json','Cache-Control':'no-store'}});
const go=(O,e)=>new Response(null,{status:302,headers:{Location:O+'/?erro='+e}});
async function sess(r,env){const c=cookie(r,'ls'),[p,s]=c.split('.');if(!p||!s||s!==await sign(p,env.SESSION_SECRET))return null;try{const o=fromB(p);return o.exp>Date.now()?o:null}catch(e){return null}}
let ready;
const init=env=>ready||(ready=env.DB.batch([env.DB.prepare('CREATE TABLE IF NOT EXISTS ops(seq INTEGER PRIMARY KEY AUTOINCREMENT,ts INTEGER,j TEXT)'),env.DB.prepare('CREATE TABLE IF NOT EXISTS cfg(k TEXT PRIMARY KEY,v TEXT)')]).catch(e=>{ready=null;throw e}));
const getProd=async env=>{const c=await env.DB.prepare("SELECT v FROM cfg WHERE k='produtos'").first();return c?JSON.parse(c.v):NOMES.map(n=>({n,p:0}))};
const setProd=(env,l)=>env.DB.prepare("INSERT OR REPLACE INTO cfg(k,v) VALUES('produtos',?)").bind(JSON.stringify(l));
// O servidor refaz TODOS os cálculos (não confia no que o navegador manda).
function build(b,prods){const resp=String(b.resp||'').trim().slice(0,60),obs=String(b.obs||'').trim().slice(0,200);if(!resp)return'Informe o nome.';
 if(b.tipo==='lavagem'){const v=b.bruto;if(!Number.isInteger(v)||v<=0||v>1e13)return'Valor bruto inválido.';
  const cat=b.cat==='membro'?'membro':'fora',farm=b.farm==='sim'?'sim':'nao',parc=cat==='fora'?(b.parc==='sim'?'sim':'nao'):'',c=calcLav(v,cat,farm,parc),det=[['Valor bruto','100%',v],['Máquina',c.pm+'%',c.maquina]];
  if(cat!=='membro')det.push(['Lavador',c.pl+'%',c.lavador]);
  det.push(['LEGACY',c.pg+'%',c.legacy],['Total de taxas',(c.pm+c.pl+c.pg)+'%',c.taxas],[cat==='membro'?'<b>VALOR FINAL (membro)</b>':'<b>VALOR FINAL (cliente)</b>',(100-c.pm-c.pl-c.pg)+'%',c.liquido]);
  return{tipo:'lavagem',resp,bruto:v,maquina:c.maquina,lavador:c.lavador,legacy:c.legacy,vendedor:0,liquido:c.liquido,cat,farm,parc,pm:c.pm,pl:c.pl,pg:c.pg,obs,det}}
 if(b.tipo==='venda'){const q=b.qtd,u=b.unit;if(!Number.isInteger(q)||q<1||q>9999||!Number.isInteger(u)||u<=0||u>1e12)return'Quantidade ou valor inválido.';
  if(!prods.some(x=>x.n===b.produto))return'Produto inválido.';const c=calcVenda(q,u);
  return{tipo:'venda',resp,produto:b.produto,qtd:q,unit:u,bruto:c.total,maquina:0,lavador:0,legacy:c.legacy,vendedor:c.vendedor,liquido:c.vendedor,cat:'',obs,det:[[esc(b.produto)+' ('+q+' × '+fmt(u)+')','100%',c.total],['Parte do vendedor','50%',c.vendedor],['Parte LEGACY','50%',c.legacy]]}}
 return'Tipo inválido.'}
async function onRequest({request:r,env,waitUntil}){
 try{
  const falta=['DB','SESSION_SECRET','DISCORD_CLIENT_ID','DISCORD_CLIENT_SECRET'].filter(k=>!env[k]);
  if(falta.length)return J({erro:'config',falta},500);
  await init(env);return await rota(r,env,waitUntil)}
 catch(e){return J({erro:'Erro interno do servidor.'},500)}}
async function hook(env,op,O){const lav=op.tipo==='lavagem',fora=op.cat==='fora',f=(name,value,inline=true)=>({name,value:String(value).slice(0,1000)||'—',inline});
 const fields=lav?[f('👤 Quem lavou',op.resp),f('🏷️ Categoria',fora?'Pessoa de fora':'Membro LEGACY'),f('🌾 Pagou o farm',op.farm==='sim'?'Sim':'Não'),...(fora?[f('🤝 Parceria',op.parc==='sim'?'Sim':'Não')]:[]),
  f('💵 Valor bruto','**'+fmt(op.bruto)+'**'),f(`⚙️ Máquina (${op.pm}%)`,fmt(op.maquina)),...(fora?[f(`🧼 Lavador (${op.pl}%)`,fmt(op.lavador))]:[]),f(`👑 LEGACY (${op.pg}%)`,fmt(op.legacy)),
  f(`📉 Total de taxas (${op.pm+op.pl+op.pg}%)`,fmt(op.maquina+op.lavador+op.legacy)),f(`✅ VALOR FINAL (${100-op.pm-op.pl-op.pg}%)`,'**'+fmt(op.liquido)+'**')]
 :[f('🧑‍💼 Vendedor',op.resp),f('📦 Produto',op.produto),f('🔢 Quantidade',op.qtd),f('💲 Valor unitário',fmt(op.unit)),f('💵 Total da venda','**'+fmt(op.bruto)+'**'),f('🤝 Parte do vendedor (50%)',fmt(op.vendedor)),f('👑 Parte LEGACY (50%)',fmt(op.legacy))];
 if(op.obs)fields.push(f('📝 Observação',op.obs,false));
 const body=JSON.stringify({username:'LEGACY LAVAGEM',avatar_url:O+'/lgc.webp',allowed_mentions:{parse:[]},embeds:[{title:lav?'💸 NOVA LAVAGEM REGISTRADA':'🛒 NOVA VENDA REGISTRADA',description:`Operação **${op.id}** · registrada por <@${op.por.id}>`,color:lav?0xB0121F:0xFF9A3C,author:{name:op.resp},thumbnail:{url:O+'/lgc.webp'},fields,footer:{text:'LEGACY LAVAGEM · Cidade Brava'},timestamp:new Date(op.ts).toISOString()}]});
 await Promise.all((lav?[env.WEBHOOK_LAV_1,env.WEBHOOK_LAV_2]:[env.WEBHOOK_VENDAS]).filter(Boolean).map(u=>fetch(u,{method:'POST',headers:{'Content-Type':'application/json'},body}).catch(()=>{})))}
async function onRequest({request:r,env,waitUntil}){
 try{if(!env.DB||!env.SESSION_SECRET||!env.DISCORD_CLIENT_ID||!env.DISCORD_CLIENT_SECRET)return J({erro:'config'},500);await init(env);return await rota(r,env,waitUntil)}
 catch(e){return J({erro:'Erro interno do servidor.'},500)}}
async function rota(r,env,waitUntil){const u=new URL(r.url),p=u.pathname,m=r.method,O=u.origin,RED=O+'/api/callback';
 if(p==='/api/login'){const st=crypto.randomUUID();return new Response(null,{status:302,headers:{Location:'https://discord.com/oauth2/authorize?'+new URLSearchParams({client_id:env.DISCORD_CLIENT_ID,response_type:'code',redirect_uri:RED,scope:'identify guilds.members.read',state:st,prompt:'consent'}),'Set-Cookie':setc('st',st,600)}})}
 if(p==='/api/callback'){const code=u.searchParams.get('code'),st=cookie(r,'st');if(!code||!st||u.searchParams.get('state')!==st)return go(O,'login');
  const t=await fetch('https://discord.com/api/oauth2/token',{method:'POST',headers:{'Content-Type':'application/x-www-form-urlencoded'},body:new URLSearchParams({client_id:env.DISCORD_CLIENT_ID,client_secret:env.DISCORD_CLIENT_SECRET,grant_type:'authorization_code',code,redirect_uri:RED})}).then(x=>x.json());
  if(!t.access_token)return go(O,'login');const H={Authorization:'Bearer '+t.access_token};
  const me=await fetch('https://discord.com/api/users/@me',{headers:H}).then(x=>x.json()),mb=await fetch(`https://discord.com/api/users/@me/guilds/${GUILD}/member`,{headers:H});
  if(!mb.ok)return go(O,'servidor');const mem=await mb.json(),lvl=Math.max(0,...(mem.roles||[]).map(x=>ROLES[x]||0));if(!lvl)return go(O,'cargo');
  const pl=toB({id:me.id,nome:mem.nick||me.global_name||me.username,av:me.avatar,lvl,exp:Date.now()+12*36e5}),h=new Headers({Location:O+'/'});
  h.append('Set-Cookie',setc('ls',pl+'.'+await sign(pl,env.SESSION_SECRET),43200));h.append('Set-Cookie',setc('st','',0));return new Response(null,{status:302,headers:h})}
 if(p==='/api/logout')return new Response(null,{status:302,headers:{Location:O+'/','Set-Cookie':setc('ls','',0)}});
 const S=await sess(r,env);if(!S)return J({erro:'login'},401);
 if(p==='/api/me')return J({id:S.id,nome:S.nome,av:S.av,lvl:S.lvl,cargo:NOME[S.lvl]});
 if(m!=='GET'&&r.headers.get('Origin')!==O)return J({erro:'Origem não permitida.'},403);
 const deny=()=>J({erro:'Seu cargo não permite esta ação.'},403),bad=e=>J({erro:e},400);
 if(p==='/api/state'&&m==='GET'){const rs=await env.DB.prepare('SELECT seq,ts,j FROM ops ORDER BY seq').all();return J({ops:rs.results.map(x=>({...JSON.parse(x.j),id:idOf(x.seq),ts:x.ts})),produtos:await getProd(env)})}
 if(p==='/api/ops'&&m==='POST'){if(S.lvl<NEED.registrar)return deny();const op=build(await r.json(),await getProd(env));if(typeof op==='string')return bad(op);
  op.por={id:S.id,nome:S.nome};op.ts=Date.now();const {ts,...rest}=op,res=await env.DB.prepare('INSERT INTO ops(ts,j) VALUES(?,?)').bind(ts,JSON.stringify(rest)).run();op.id=idOf(res.meta.last_row_id);waitUntil(hook(env,op,O));return J(op)}
 if(m==='DELETE'&&p.startsWith('/api/ops/OP-')){if(S.lvl<NEED.excluir)return deny();const seq=parseInt(p.slice(12),10);if(!seq)return bad('ID inválido.');await env.DB.prepare('DELETE FROM ops WHERE seq=?').bind(seq).run();return J({ok:1})}
 if(p==='/api/produtos'&&m==='PUT'){if(S.lvl<NEED.produtos)return deny();const l=await r.json();if(!Array.isArray(l)||l.length>100||l.some(x=>!x||typeof x.n!=='string'||!x.n.trim()||x.n.length>60||!Number.isInteger(x.p)||x.p<0))return bad('Lista de produtos inválida.');
  await setProd(env,l.map(x=>({n:x.n.trim(),p:x.p}))).run();return J({ok:1})}
 if(p==='/api/restore'&&m==='POST'){if(S.lvl<NEED.admin)return deny();const d=await r.json();
  if(!d||!Array.isArray(d.ops)||!Array.isArray(d.produtos)||d.ops.length>5000||d.ops.some(o=>!o||!/^OP-\d+$/.test(o.id)||!Number.isInteger(o.bruto)||o.bruto<0||!Number.isInteger(o.ts)||!Array.isArray(o.det)))return bad('Backup inválido.');
  await env.DB.batch([env.DB.prepare('DELETE FROM ops'),...d.ops.map(o=>{const{id,ts,...rest}=o;return env.DB.prepare('INSERT INTO ops(seq,ts,j) VALUES(?,?,?)').bind(parseInt(id.slice(3),10),ts,JSON.stringify(rest))}),setProd(env,d.produtos.map(x=>({n:String(x.n).slice(0,60),p:Number.isInteger(x.p)&&x.p>=0?x.p:0})))]);return J({ok:1})}
 if(p==='/api/clear'&&m==='POST'){if(S.lvl<NEED.admin)return deny();await env.DB.batch([env.DB.prepare('DELETE FROM ops'),setProd(env,NOMES.map(n=>({n,p:0})))]);return J({ok:1})}
 return J({erro:'Rota não encontrada.'},404)}

export default{async fetch(request,env,ctx){if(!new URL(request.url).pathname.startsWith('/api/'))return env.ASSETS.fetch(request);return onRequest({request,env,waitUntil:p=>ctx.waitUntil(p)})}};
