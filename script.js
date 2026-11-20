'use strict';
const $=s=>document.querySelector(s),$$=s=>[...document.querySelectorAll(s)];
const KEY='legacy_financial_v1',NOMES=['Cartão de Ação Nível I','Cartão de Ação Nível II','Cartão de Ação Nível III','Capuz','Algema','Outros itens'];
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
let db={seq:0,ops:[],produtos:[]},eu=null;
const api=async(m,p,b)=>{const r=await fetch('/api/'+p,{method:m,headers:{'Content-Type':'application/json'},body:b?JSON.stringify(b):undefined});const j=await r.json().catch(()=>({}));if(r.status===401){showLogin();throw new Error('login')}if(!r.ok)throw new Error(j.erro||'Erro');return j};
const fmt=c=>(c/100).toLocaleString('pt-BR',{style:'currency',currency:'BRL'});
const dt=t=>new Date(t).toLocaleString('pt-BR');
const dk=t=>{const d=new Date(t);return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0')};
// Dinheiro em CENTAVOS (inteiros) para evitar erros de arredondamento.
function parse(s){s=String(s).trim().replace(/R\$|\s/g,'');if(!s)return NaN;if(s.includes(','))s=s.replace(/\./g,'').replace(',','.');else if(/^\d{1,3}(\.\d{3})+$/.test(s))s=s.replace(/\./g,'');if(!/^\d+(\.\d{1,2})?$/.test(s))return NaN;const[a,b='']=s.split('.');return+a*100+ +(b+'0').slice(0,2)}
// [máquina%, lavador%, LEGACY%]
const RULES={membro:{sim:[10,0,0],nao:[10,0,10]},parceria:{sim:[10,10,5],nao:[10,5,10]},semparceria:{sim:[10,10,10],nao:[10,5,15]}};
const pct=(b,p)=>Math.floor((b*p+50)/100);
function calcLav(b,cat,farm,parc){const k=cat==='membro'?'membro':parc==='sim'?'parceria':'semparceria',r=RULES[k][farm];
 const maquina=pct(b,r[0]),lavador=pct(b,r[1]),legacy=pct(b,r[2]),taxas=maquina+lavador+legacy;
 return{pm:r[0],pl:r[1],pg:r[2],maquina,lavador,legacy,taxas,liquido:b-taxas}}
function calcVenda(q,u){const total=q*u,vendedor=Math.floor(total/2);return{total,vendedor,legacy:total-vendedor}}
const tabela=det=>'<table>'+det.map(d=>`<tr><td>${d[0]}</td><td>${d[1]}</td><td>${fmt(d[2])}</td></tr>`).join('')+'</table>';
function lavOp(){const nome=$('#l-nome').value.trim(),b=parse($('#l-valor').value),cat=$('#l-cat').value,farm=$('#l-farm').value,parc=cat==='fora'?$('#l-parc').value:'';
 if(!nome)return'Informe o nome de quem está lavando.';if(!(b>0))return'Informe um valor bruto válido, maior que zero.';
 const c=calcLav(b,cat,farm,parc),det=[['Valor bruto','100%',b],['Máquina',c.pm+'%',c.maquina]];
 if(cat!=='membro')det.push(['Lavador',c.pl+'%',c.lavador]);det.push(['LEGACY',c.pg+'%',c.legacy],['Total de taxas',(c.pm+c.pl+c.pg)+'%',c.taxas],[cat==='membro'?'<b>VALOR FINAL (membro)</b>':'<b>VALOR FINAL (cliente)</b>',(100-c.pm-c.pl-c.pg)+'%',c.liquido]);
 return{tipo:'lavagem',resp:nome,bruto:b,maquina:c.maquina,lavador:c.lavador,legacy:c.legacy,vendedor:0,liquido:c.liquido,cat,farm,parc,obs:$('#l-obs').value.trim(),det}}
function vendaOp(){const nome=$('#v-nome').value.trim(),prod=$('#v-prod').value,q=+$('#v-qtd').value,u=parse($('#v-unit').value);
 if(!nome)return'Informe o nome do vendedor.';if(!prod)return'Cadastre um produto.';if(!Number.isInteger(q)||q<1)return'Quantidade deve ser um inteiro maior que zero.';if(!(u>0))return'Informe um valor unitário válido, maior que zero.';
 const c=calcVenda(q,u);return{tipo:'venda',resp:nome,produto:prod,qtd:q,unit:u,bruto:c.total,maquina:0,lavador:0,legacy:c.legacy,vendedor:c.vendedor,liquido:c.vendedor,cat:'',obs:$('#v-obs').value.trim(),
 det:[[esc(prod)+' ('+q+' × '+fmt(u)+')','100%',c.total],['Parte do vendedor','50%',c.vendedor],['Parte LEGACY','50%',c.legacy]]}}
let prevKey='';
async function acao(k,registrar){const el=$('#'+k+'-prev'),op=k==='l'?lavOp():vendaOp();
 if(typeof op==='string'){el.innerHTML=`<p class="bad">${op}</p>`;return}
 const key=k+JSON.stringify(op);el.innerHTML=tabela(op.det);
 if(!registrar){prevKey=key;return}
 if(prevKey!==key){prevKey=key;el.innerHTML+='<p class="gold">Confira a prévia e clique em REGISTRAR novamente para confirmar.</p>';return}
 prevKey='';const bt=$('#'+k+'-reg');bt.disabled=true;
 try{const n=await api('POST','ops',op);$(k==='l'?'#fl':'#fv').reset();toggles();await recarregar();el.innerHTML=`<p class="ok">Operação ${n.id} registrada e enviada ao Discord.</p>`+tabela(n.det)}
 catch(x){el.innerHTML+=`<p class="bad">${esc(x.message||'Falha ao registrar.')}</p>`}bt.disabled=false}
function toggles(){$('#l-parc-w').hidden=$('#l-cat').value!=='fora'}
function inPeriod(o,f){const d=new Date(o.ts),n=new Date();return f==='todos'||(f==='hoje'&&d.toDateString()===n.toDateString())||(f==='7'&&n-d<7*864e5)||(f==='30'&&n-d<30*864e5)||(f==='mes'&&d.getMonth()===n.getMonth()&&d.getFullYear()===n.getFullYear())}
function totals(ops){const t={n:ops.length,mov:0,maq:0,leg:0,mem:0,ven:0,lav:0,vendas:0,lavador:0,cli:0};
 ops.forEach(o=>{t.mov+=o.bruto;t.maq+=o.maquina;t.leg+=o.legacy;if(o.tipo==='lavagem'){t.lav+=o.bruto;t.lavador+=o.lavador;o.cat==='membro'?t.mem+=o.liquido:t.cli+=o.liquido}else{t.vendas+=o.bruto;t.ven+=o.vendedor}});return t}
const card=(l,v)=>`<div><small>${l}</small><b>${v}</b></div>`;
function linhas(ops){return`<table><tr><th>ID</th><th>Data</th><th>Responsável</th><th>Tipo</th><th>Bruto</th><th>Líquido</th></tr>${ops.map(o=>`<tr><td>${o.id}</td><td>${dt(o.ts)}</td><td>${esc(o.resp)}</td><td>${o.tipo}</td><td>${fmt(o.bruto)}</td><td>${fmt(o.liquido)}</td></tr>`).join('')}</table>`}
function renderDash(){const ops=db.ops.filter(o=>inPeriod(o,$('#d-f').value)),t=totals(ops);
 $('#d-cards').innerHTML=card('Total movimentado',fmt(t.mov))+card('Destinado à máquina',fmt(t.maq))+card('Caixa LEGACY',fmt(t.leg))+card('Recebido pelos vendedores',fmt(t.ven))+card('Operações',t.n);
 const g={};ops.forEach(o=>g[dk(o.ts)]=(g[dk(o.ts)]||0)+o.bruto);const ks=Object.keys(g).sort().slice(-10),mx=Math.max(1,...ks.map(k=>g[k]));
 $('#d-chart').innerHTML=ks.length?ks.map(k=>`<div title="${fmt(g[k])}"><i style="height:${Math.max(2,g[k]/mx*140)}px"></i>${k.slice(8)}/${k.slice(5,7)}</div>`).join(''):'<p class="muted">Sem dados no período.</p>';
 const parts=[['Máquina',t.maq],['Caixa LEGACY',t.leg],['Lavador',t.lavador],['Membros',t.mem],['Clientes',t.cli],['Vendedores',t.ven]];
 $('#d-dist').innerHTML=parts.map(p=>`<div class="dist">${p[0]}: ${fmt(p[1])} (${t.mov?(p[1]/t.mov*100).toFixed(1):'0.0'}%)<span><i style="width:${t.mov?p[1]/t.mov*100:0}%"></i></span></div>`).join('');
 $('#d-last').innerHTML=ops.length?linhas(ops.slice().reverse().slice(0,8)):'<p class="muted">Nenhuma operação registrada.</p>'}
function histFiltrado(){const q=$('#h-q').value.trim().toLowerCase(),t=$('#h-t').value,d=$('#h-d').value;
 return db.ops.filter(o=>(!q||o.resp.toLowerCase().includes(q))&&(!t||o.tipo===t)&&(!d||dk(o.ts)===d)).reverse()}
function renderHist(){const ops=histFiltrado();
 $('#h-tab').innerHTML=ops.length?`<table><tr><th>ID</th><th>Data</th><th>Responsável</th><th>Tipo</th><th>Bruto</th><th>Taxas/divisões</th><th>Líquido</th><th></th></tr>${ops.map(o=>`<tr><td>${o.id}</td><td>${dt(o.ts)}</td><td>${esc(o.resp)}</td><td>${o.tipo}</td><td>${fmt(o.bruto)}</td><td>${o.tipo==='lavagem'?'Máq '+fmt(o.maquina)+' · LEG '+fmt(o.legacy)+(o.lavador?' · Lav '+fmt(o.lavador):''):'Vend '+fmt(o.vendedor)+' · LEG '+fmt(o.legacy)}</td><td>${fmt(o.liquido)}</td><td><button data-a="ver" data-id="${o.id}">Detalhes</button><button data-a="imp" data-id="${o.id}">Imprimir</button><button data-a="del" data-min="2" data-id="${o.id}">Excluir</button></td></tr>`).join('')}</table>`:'<p class="muted">Nenhum registro encontrado.</p>'}
const compr=o=>`<h2>LEGACY LAVAGEM — Comprovante</h2><p>${o.id} · ${dt(o.ts)}<br>Responsável: ${esc(o.resp)}<br>Registrado por: ${esc(o.por?o.por.nome:"—")}<br>Tipo: ${o.tipo}${o.obs?'<br>Obs.: '+esc(o.obs):''}</p>${tabela(o.det)}`;
function renderRel(){const t=totals(db.ops);
 $('#r-cards').innerHTML=card('Total lavado',fmt(t.lav))+card('Taxas da máquina',fmt(t.maq))+card('Acumulado LEGACY',fmt(t.leg))+card('Destinado aos membros',fmt(t.mem))+card('Destinado aos vendedores',fmt(t.ven))+card('Total de vendas',fmt(t.vendas));
 const rows=relRows();$('#r-tab').innerHTML=rows.length?`<table><tr><th>Período</th><th>Operações</th><th>Movimentado</th><th>Máquina</th><th>LEGACY</th><th>Membros</th><th>Vendedores</th></tr>${rows.map(r=>`<tr><td>${r[0]}</td><td>${r[1]}</td>${r.slice(2).map(v=>`<td>${fmt(v)}</td>`).join('')}</tr>`).join('')}</table>`:'<p class="muted">Sem dados.</p>'}
function relRows(){const m=$('#r-g').value,g={};db.ops.forEach(o=>{let k=dk(o.ts);if(m==='mes')k=k.slice(0,7);if(m==='semana'){const d=new Date(o.ts);d.setDate(d.getDate()-(d.getDay()+6)%7);k='Semana de '+dk(d)}(g[k]=g[k]||[]).push(o)});
 return Object.keys(g).sort().reverse().map(k=>{const t=totals(g[k]);return[k,t.n,t.mov,t.maq,t.leg,t.mem,t.ven]})}
function renderProd(){$('#v-prod').innerHTML=db.produtos.map(p=>`<option>${esc(p.n)}</option>`).join('');
 $('#p-list').innerHTML='<table>'+db.produtos.map((p,i)=>`<tr><td><input data-i="${i}" data-f="n" value="${esc(p.n)}"></td><td><input data-i="${i}" data-f="p" value="${(p.p/100).toFixed(2).replace('.',',')}" inputmode="decimal"></td><td><button data-rm="${i}">Remover</button></td></tr>`).join('')+'</table>'}
function renderAll(){renderDash();renderHist();renderRel()}
function csv(name,head,rows){const c=v=>{v=String(v);if(/^[=+\-@]/.test(v))v="'"+v;return'"'+v.replace(/"/g,'""')+'"'};
 dl(name,'\ufeff'+[head,...rows].map(r=>r.map(c).join(';')).join('\r\n'),'text/csv')}
function dl(name,txt,type){const a=document.createElement('a');a.href=URL.createObjectURL(new Blob([txt],{type}));a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(a.href),1000)}
const num=c=>(c/100).toFixed(2).replace('.',',');
function runTests(){const r=[],eq=(n,a,b)=>r.push([n,JSON.stringify(a)===JSON.stringify(b),a,b]),B=10000;
 const f=(c,farm,p)=>{const x=calcLav(B,c,farm,p);return[x.maquina,x.lavador,x.legacy,x.taxas,x.liquido]};
 eq('Membro pagou farm',f('membro','sim'),[1000,0,0,1000,9000]);eq('Membro não pagou farm',f('membro','nao'),[1000,0,1000,2000,8000]);
 eq('Fora c/ parceria, pagou farm',f('fora','sim','sim'),[1000,1000,500,2500,7500]);eq('Fora c/ parceria, não pagou',f('fora','nao','sim'),[1000,500,1000,2500,7500]);
 eq('Fora s/ parceria, pagou farm',f('fora','sim','nao'),[1000,1000,1000,3000,7000]);eq('Fora s/ parceria, não pagou',f('fora','nao','nao'),[1000,500,1500,3000,7000]);
 const x=calcLav(333,'fora','nao','nao');eq('Soma exata com centavos (R$ 3,33)',x.taxas+x.liquido,333);
 const v=calcVenda(3,1001);eq('Venda 50/50',[v.total,v.vendedor,v.legacy],[3003,1501,1502]);
 eq('Máscara R$1.000.000,00',parse('R$1.000.000,00'),100000000);eq('Interpretação de valores',[parse('100.000,00'),parse('1,5'),parse('-5')],[10000000,150,NaN].map(n=>n!==n?null:n));return r}
document.addEventListener('click',e=>{const b=e.target.closest('button');if(!b)return;
 if(b.dataset.a){const o=db.ops.find(x=>x.id===b.dataset.id);if(!o)return;
  if(b.dataset.a==='ver'){$('#dlg').innerHTML=compr(o)+'<div class="btns"><button onclick="dlg.close()">FECHAR</button></div>';$('#dlg').showModal()}
  if(b.dataset.a==='imp'){$('#print').innerHTML=compr(o);window.print()}
  if(b.dataset.a==='del'&&confirm('Excluir o registro '+o.id+'? Esta ação não pode ser desfeita.')){api('DELETE','ops/'+o.id).then(recarregar).catch(x=>alert(x.message))}}
 if(b.dataset.rm!==undefined&&confirm('Remover este produto da lista?')){db.produtos.splice(+b.dataset.rm,1);salvarProd()}});
document.addEventListener('change',e=>{const t=e.target,i=t.dataset.i;if(i===undefined)return;
 if(t.dataset.f==='n'){if(t.value.trim())db.produtos[i].n=t.value.trim()}else{const v=parse(t.value||'0');if(v>=0)db.produtos[i].p=v}salvarProd()});
$('#l-cat').onchange=toggles;$('#l-calc').onclick=()=>acao('l',0);$('#l-reg').onclick=()=>acao('l',1);$('#v-calc').onclick=()=>acao('v',0);$('#v-reg').onclick=()=>acao('v',1);
$('#v-prod').onchange=()=>{const p=db.produtos.find(x=>x.n===$('#v-prod').value);if(p&&p.p>0)$('#v-unit').value=brl(p.p)};
$$('form').forEach(f=>f.onsubmit=e=>e.preventDefault());
$('#p-add').onclick=()=>{const n=$('#p-novo').value.trim();if(!n)return alert('Informe o nome do produto.');db.produtos.push({n,p:0});$('#p-novo').value='';salvarProd()};
['#d-f'].forEach(s=>$(s).onchange=renderDash);['#h-q','#h-t','#h-d'].forEach(s=>$(s).oninput=renderHist);$('#r-g').onchange=renderRel;
$('#h-csv').onclick=()=>csv('historico-legacy.csv',['ID','Data','Responsável','Tipo','Bruto','Máquina','Lavador','LEGACY','Vendedor','Líquido','Observações'],histFiltrado().map(o=>[o.id,dt(o.ts),o.resp,o.tipo,num(o.bruto),num(o.maquina),num(o.lavador),num(o.legacy),num(o.vendedor),num(o.liquido),o.obs]));
$('#r-csv').onclick=()=>csv('relatorio-legacy.csv',['Período','Operações','Movimentado','Máquina','LEGACY','Membros','Vendedores'],relRows().map(r=>[r[0],r[1],...r.slice(2).map(num)]));
$('#b-exp').onclick=()=>dl('backup-legacy-lavagem-'+dk(Date.now())+'.json',JSON.stringify(db,null,1),'application/json');
$('#b-imp').onchange=e=>{const f=e.target.files[0];if(!f)return;const r=new FileReader();r.onload=()=>{try{const d=JSON.parse(r.result);
 if(!d||!Array.isArray(d.ops)||!Array.isArray(d.produtos)||d.ops.some(o=>!o||!Number.isInteger(o.bruto)||o.bruto<0||!o.id||!o.ts||!Array.isArray(o.det)))throw 0;
 if(confirm('Importar este backup? Os dados atuais serão substituídos.')){api('POST','restore',{ops:d.ops,produtos:d.produtos}).then(recarregar).then(()=>alert('Backup importado.')).catch(x=>alert(x.message))}}catch(x){alert('Arquivo de backup inválido.')}e.target.value=''};r.readAsText(f)};
$('#b-clr').onclick=()=>{if(confirm('Apagar TODOS os dados deste navegador?')&&confirm('Tem certeza? Faça um backup antes. Esta ação é definitiva.')){api('POST','clear').then(recarregar).catch(x=>alert(x.message))}};
$('#t-run').onclick=()=>{const r=runTests();$('#t-out').innerHTML='<table>'+r.map(x=>`<tr><td>${x[0]}</td><td class="${x[1]?'ok':'bad'}">${x[1]?'OK':'FALHOU: '+JSON.stringify(x[2])+' ≠ '+JSON.stringify(x[3])}</td></tr>`).join('')+'</table><p>'+r.filter(x=>x[1]).length+'/'+r.length+' testes aprovados.</p>'};
function route(){const h=(location.hash||'#dash').slice(1);const id=$('#'+h)&&$('section#'+h)?h:'dash';$$('section').forEach(s=>s.classList.toggle('on',s.id===id));$$('nav a').forEach(a=>a.classList.toggle('on',a.hash==='#'+id));renderAll()}
window.addEventListener('hashchange',route);toggles();
async function recarregar(){db=await api('GET','state');renderProd();route()}
function salvarProd(){api('PUT','produtos',db.produtos).then(renderProd).catch(x=>{alert(x.message);recarregar()})}
function showLogin(e){const q=e||new URLSearchParams(location.search).get('erro');$('#login').hidden=false;$('#l-erro').textContent=({cargo:'Você está no servidor, mas não tem cargo de Membro, Gerente ou Líder.',servidor:'Você não está no servidor Discord da LEGACY.',login:'Não foi possível entrar. Tente de novo.',config:'Configuração do Cloudflare incompleta (veja o README).'})[q]||''}
(async()=>{try{eu=await api('GET','me');document.body.dataset.lvl=eu.lvl;
 $('#eu').innerHTML=`<div class="eu">${eu.av?`<img src="https://cdn.discordapp.com/avatars/${eu.id}/${eu.av}.png?size=64" alt="">`:''}<span><b>${esc(eu.nome)}</b><small>${eu.cargo}</small></span><a href="/api/logout">Sair</a></div>`;await recarregar()}
catch(e){if(e&&e.message==='config')showLogin('config')}})();

// Máscara de dinheiro: digita só números -> R$1.000.000,00 (centavos automáticos)
const brl=c=>'R$'+(c/100).toLocaleString('pt-BR',{minimumFractionDigits:2,maximumFractionDigits:2});
function mask(el){el.addEventListener('input',()=>{let d=el.value.replace(/\D/g,'').replace(/^0+/,'').slice(0,12);if(!d){el.value='';return}d=d.padStart(3,'0');el.value='R$'+(+d.slice(0,-2)).toLocaleString('pt-BR')+','+d.slice(-2)})}
mask($('#l-valor'));mask($('#v-unit'));
