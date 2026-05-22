const $ = id => (document.getElementById(id)?.value || "").trim();
const HISTORICO_KEY = "evoResumoHistorico";
let resumoEmEdicaoId = null;

function showLoading(text="Processando..."){
  const overlay=document.getElementById("loadingOverlay");
  const loadingText=document.getElementById("loadingText");
  if(loadingText) loadingText.textContent=text;
  overlay?.classList.remove("hidden");
}
function hideLoading(){document.getElementById("loadingOverlay")?.classList.add("hidden")}
function toggleTheme(){
  const isDark=document.body.classList.toggle("dark");
  localStorage.setItem("evoResumoTheme",isDark?"dark":"light");
  document.getElementById("themeToggle").textContent=isDark?"☀️":"🌙";
}
function initTheme(){
  const saved=localStorage.getItem("evoResumoTheme");
  const dark=saved?saved==="dark":(window.matchMedia&&window.matchMedia("(prefers-color-scheme: dark)").matches);
  document.body.classList.toggle("dark",dark);
  document.getElementById("themeToggle").textContent=dark?"☀️":"🌙";
}
function showSkeleton(){
  document.querySelectorAll(".card").forEach(c=>c.classList.add("skeleton"));
  setTimeout(()=>document.querySelectorAll(".card").forEach(c=>c.classList.remove("skeleton")),380);
}

function somenteDigitos(v){return String(v||"").replace(/\D/g,"")}
function formatarCEP(v){const d=somenteDigitos(v).slice(0,8);return d.replace(/^(\d{5})(\d)/,"$1-$2")}
function formatarCNPJ(v){const d=somenteDigitos(v).slice(0,14);return d.replace(/^(\d{2})(\d)/,"$1.$2").replace(/^(\d{2})\.(\d{3})(\d)/,"$1.$2.$3").replace(/\.(\d{3})(\d)/,".$1/$2").replace(/(\d{4})(\d)/,"$1-$2")}
function formatarCPF(v){const d=somenteDigitos(v).slice(0,11);return d.replace(/^(\d{3})(\d)/,"$1.$2").replace(/^(\d{3})\.(\d{3})(\d)/,"$1.$2.$3").replace(/\.(\d{3})(\d)/,".$1-$2")}
function formatarTelefone(v){
  const d=somenteDigitos(v).slice(0,11);
  if(d.length<=10) return d.replace(/^(\d{2})(\d)/,"($1) $2").replace(/(\d{4})(\d)/,"$1-$2");
  return d.replace(/^(\d{2})(\d)/,"($1) $2").replace(/(\d{5})(\d)/,"$1-$2");
}
function formatarPercentual(v){
  const d=somenteDigitos(v).slice(0,5);
  if(!d) return "";
  const n=Number(d)/100;
  return n.toLocaleString("pt-BR",{minimumFractionDigits:2,maximumFractionDigits:2})+"%";
}

async function buscarCEP(cepId="cep", enderecoId="endereco", municipioId="municipio", ufId="uf", statusId="cepStatus"){
  const cep=somenteDigitos($(cepId));
  const status=document.getElementById(statusId);
  if(status){status.className="";status.textContent=""}
  if(cep.length!==8) return;
  try{
    if(status) status.textContent="Buscando CEP...";
    showLoading("Buscando CEP...");
    const res=await fetch(`https://viacep.com.br/ws/${cep}/json/`);
    const data=await res.json();
    if(data.erro){if(status){status.className="erro";status.textContent="CEP não encontrado."} hideLoading(); return}
    document.getElementById(enderecoId).value=data.logradouro||"";
    if(document.getElementById("bairro") && cepId==="cep"){} // placeholder
    document.getElementById(municipioId).value=data.localidade||"";
    document.getElementById(ufId).value=data.uf||"";
    if(document.getElementById("estado") && cepId==="cep") document.getElementById("estado").value=data.uf||"";
    if(status){status.className="ok";status.textContent="Endereço preenchido automaticamente."}
  }catch(e){if(status){status.className="erro";status.textContent="Não foi possível consultar o CEP."}}
  hideLoading();
}

async function buscarCNPJ(cnpjId="cnpj"){
  const cnpj=somenteDigitos($(cnpjId));
  const status=document.getElementById(cnpjId==="cnpj"?"cnpjStatus":null);
  if(status){status.className="";status.textContent=""}
  if(cnpj.length!==14) return;
  try{
    if(status) status.textContent="Consultando CNPJ...";
    showLoading("Consultando CNPJ...");
    const res=await fetch(`https://brasilapi.com.br/api/cnpj/v1/${cnpj}`);
    const data=await res.json();
    if(!res.ok || data.message || data.type){if(status){status.className="erro";status.textContent="CNPJ não encontrado."} hideLoading(); return}
    if(cnpjId==="cnpj"){
      document.getElementById("razaoSocial").value=data.razao_social||data.nome_fantasia||"";
      document.getElementById("endereco").value=[data.descricao_tipo_de_logradouro,data.logradouro,data.numero].filter(Boolean).join(" ");
      document.getElementById("municipio").value=data.municipio||"";
      document.getElementById("estado").value=data.uf||"";
      document.getElementById("uf").value=data.uf||"";
      document.getElementById("cep").value=formatarCEP(data.cep||"");
      if(data.email) document.getElementById("email").value=data.email;
      if(data.ddd_telefone_1) document.getElementById("telefone").value=formatarTelefone(data.ddd_telefone_1);
      if(status){status.className="ok";status.textContent="Dados preenchidos automaticamente pelo CNPJ."}
    }
  }catch(e){if(status){status.className="erro";status.textContent="Não foi possível consultar o CNPJ."}}
  hideLoading();
}

function montarParcelas(){
  const labels=["1ª","2ª","3ª","4ª","5ª","6ª"];
  [["parcelasPME","pme"],["parcelasPJ","pj"]].forEach(([boxId,prefix])=>{
    const box=document.getElementById(boxId);
    box.innerHTML=labels.map((l,i)=>`
      <label>${l} Agenciamento<input id="${prefix}Ag${i+1}" inputmode="numeric" placeholder="0,00%"></label>
      <label>${l} Comissionamento<input id="${prefix}Com${i+1}" inputmode="numeric" placeholder="0,00%"></label>
    `).join("");
  });
}

function aplicarMascaras(){
  ["cnpj"].forEach(id=>{
    const el=document.getElementById(id);
    el?.addEventListener("input",()=>el.value=formatarCNPJ(el.value));
  });
  ["cpfRepresentante"].forEach(id=>{
    const el=document.getElementById(id);
    el?.addEventListener("input",()=>el.value=formatarCPF(el.value));
  });
  ["cep"].forEach(id=>{
    const el=document.getElementById(id);
    el?.addEventListener("input",()=>el.value=formatarCEP(el.value));
  });
  ["telefone"].forEach(id=>{
    const el=document.getElementById(id);
    el?.addEventListener("input",()=>el.value=formatarTelefone(el.value));
  });
  ["agenciamento99","comissionamento99","agenciamento100","comissionamento100","percentualVenda"].forEach(id=>{
    const el=document.getElementById(id);
    el?.addEventListener("input",()=>el.value=formatarPercentual(el.value));
  });
  ["pme","pj"].forEach(prefix=>{
    for(let i=1;i<=6;i++){
      ["Ag","Com"].forEach(t=>{
        const el=document.getElementById(`${prefix}${t}${i}`);
        el?.addEventListener("input",()=>el.value=formatarPercentual(el.value));
      });
    }
  });
  document.getElementById("cep")?.addEventListener("blur",()=>buscarCEP("cep","endereco","municipio","uf","cepStatus"));
  document.getElementById("cnpj")?.addEventListener("blur",()=>buscarCNPJ("cnpj"));
}

function limparCampos(container){
  container.querySelectorAll("input,textarea").forEach(el=>el.value="");
  container.querySelectorAll("select").forEach(el=>el.value="");
  container.querySelectorAll("small").forEach(el=>{el.textContent="";el.className=""});
}

function limparSecao(btn){
  const card = btn.closest(".card");
  if(!card) return;
  limparCampos(card);
}

function limparFormulario(){
  limparCampos(document);
  resumoEmEdicaoId = null;
  document.querySelectorAll(".history-item.editing").forEach(item=>item.classList.remove("editing"));
}

function adicionarBotoesLimparSecao(){
  document.querySelectorAll(".card").forEach(card=>{
    if(card.classList.contains("history-card")) return;
    const h2 = card.querySelector("h2");
    if(!h2 || card.querySelector(".clear-section-btn")) return;
    const header = document.createElement("div");
    header.className = "section-title-row";
    h2.parentNode.insertBefore(header, h2);
    header.appendChild(h2);
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "clear-section-btn";
    btn.textContent = "🧹 Limpar seção";
    btn.addEventListener("click",()=>limparSecao(btn));
    header.appendChild(btn);
  });
}

function obterCamposFormulario(){
  const data = {};
  document.querySelectorAll("input,select,textarea").forEach(el=>{
    if(el.id) data[el.id] = el.value;
  });
  return data;
}

function preencherFormulario(data={}){
  Object.entries(data).forEach(([id,value])=>{
    const el = document.getElementById(id);
    if(el) el.value = value || "";
  });
}

function lerHistorico(){
  try{return JSON.parse(localStorage.getItem(HISTORICO_KEY) || "[]")}catch(e){return []}
}

function gravarHistorico(lista){
  localStorage.setItem(HISTORICO_KEY, JSON.stringify(lista.slice(0,50)));
}

function tituloResumo(data){
  return data.razaoSocial || data.cnpj || data.representante || "Resumo sem identificação";
}

function formatarDataHora(iso){
  if(!iso) return "";
  return new Date(iso).toLocaleString("pt-BR",{dateStyle:"short",timeStyle:"short"});
}

function salvarResumoLocal(silencioso=false){
  const values = obterCamposFormulario();
  const agora = new Date().toISOString();
  let lista = lerHistorico();

  if(resumoEmEdicaoId){
    const idx = lista.findIndex(item=>item.id===resumoEmEdicaoId);
    if(idx >= 0){
      lista[idx] = {...lista[idx], title:tituloResumo(values), values, updatedAt:agora};
    }else{
      lista.unshift({id:resumoEmEdicaoId, title:tituloResumo(values), values, createdAt:agora, updatedAt:agora});
    }
  }else{
    resumoEmEdicaoId = String(Date.now());
    lista.unshift({id:resumoEmEdicaoId, title:tituloResumo(values), values, createdAt:agora, updatedAt:agora});
  }

  gravarHistorico(lista);
  renderHistorico();
  if(!silencioso) alert("Resumo salvo no histórico local.");
}

function carregarResumo(id){
  const item = lerHistorico().find(r=>r.id===id);
  if(!item) return;
  preencherFormulario(item.values);
  resumoEmEdicaoId = id;
  renderHistorico();
  window.scrollTo({top:0,behavior:"smooth"});
}

function duplicarResumo(id){
  const item = lerHistorico().find(r=>r.id===id);
  if(!item) return;
  preencherFormulario(item.values);
  resumoEmEdicaoId = null;
  salvarResumoLocal(true);
  alert("Resumo duplicado no histórico local.");
}

function excluirResumo(id){
  if(!confirm("Deseja excluir este resumo do histórico local?")) return;
  const lista = lerHistorico().filter(r=>r.id!==id);
  if(resumoEmEdicaoId===id) resumoEmEdicaoId = null;
  gravarHistorico(lista);
  renderHistorico();
}

function renderHistorico(){
  const box = document.getElementById("historyList");
  if(!box) return;
  const lista = lerHistorico();
  if(!lista.length){
    box.className = "history-list empty-state";
    box.textContent = "Nenhum resumo salvo até o momento.";
    return;
  }
  box.className = "history-list";
  box.innerHTML = lista.map(item=>`
    <div class="history-item ${item.id===resumoEmEdicaoId ? "editing" : ""}">
      <div>
        <strong>${escapeHtml(item.title)}</strong>
        <span>Criado em ${formatarDataHora(item.createdAt)}${item.updatedAt!==item.createdAt ? ` • Atualizado em ${formatarDataHora(item.updatedAt)}` : ""}</span>
      </div>
      <div class="history-actions">
        <button type="button" onclick="carregarResumo('${item.id}')">Editar</button>
        <button type="button" onclick="duplicarResumo('${item.id}')">Duplicar</button>
        <button type="button" onclick="excluirResumo('${item.id}')">Excluir</button>
      </div>
    </div>
  `).join("");
}

function escapeHtml(text){
  return String(text || "").replace(/[&<>'"]/g, ch=>({"&":"&amp;","<":"&lt;",">":"&gt;","'":"&#39;",'"':"&quot;"}[ch]));
}

function drawLogo(doc){
  // Logo menor para liberar espaço e evitar colisão com título
  doc.addImage("logo-header.png","PNG",82,4,46,18);
}

function drawWatermark(doc){
  try{
    doc.addImage("watermark-symbol.png","PNG",67,122,72,64);
  }catch(e){}
}
function centerText(doc,text,x,y,w,size=7,bold=true,color=[0,0,0]){
  doc.setTextColor(...color); doc.setFont("helvetica",bold?"bold":"normal"); doc.setFontSize(size);
  const tw=doc.getTextWidth(String(text||""));
  doc.text(String(text||""),x+(w-tw)/2,y);
  doc.setTextColor(0,0,0);
}
function fitText(doc,text,x,y,maxW,size=7,bold=false){
  if(!text) return;
  doc.setFont("helvetica",bold?"bold":"normal"); doc.setFontSize(size);
  let t=String(text);
  while(doc.getTextWidth(t)>maxW && t.length>3) t=t.slice(0,-1);
  doc.text(t,x,y);
}
function box(doc,x,y,w,h){
  doc.setLineWidth(0.1);
  doc.rect(x,y,w,h);
}

function line(doc,x1,y1,x2,y2){
  doc.setLineWidth(0.1);
  doc.line(x1,y1,x2,y2);
}
function headerBar(doc,text,y){
  doc.setFillColor(151,0,70);
  doc.rect(5,y,200,7.2,"F");
  centerText(doc,text,5,y+5.1,200,9,true,[255,255,255]);
  doc.setTextColor(0,0,0);
}

function rowCells(doc, x, y, widths, h){
  doc.setLineWidth(0.1);
  const total = widths.reduce((a,b)=>a+b,0);

  doc.rect(x,y,total,h);

  let acc = x;
  for(let i=0;i<widths.length-1;i++){
    acc += widths[i];
    doc.line(acc,y,acc,y+h);
  }
}

function labelValue(doc,label,value,x,y,w,h,lw=28,size=7){
  box(doc,x,y,w,h);
  if(lw) line(doc,x+lw,y,x+lw,y+h);

  doc.setFont("helvetica","bold");
  doc.setFontSize(6.5);
  doc.text(label,x+2,y+h/2+2.1);

  fitText(doc,value,x+lw+2,y+h/2+2.1,w-lw-3,7,false);
}
function checkOption(doc, selected, value, x, y, label){
  doc.setFont("helvetica","bold"); doc.setFontSize(6.5);
  doc.text("(   )",x,y); if(selected===value) doc.text("X",x+2.4,y);
  doc.text(label,x+13,y);
}


function topRow(doc, y){
  doc.setLineWidth(0.12);

  // contorno externo
  doc.rect(5,y,200,6.8);

  // divisórias únicas
  doc.line(35,y,35,y+6.8);
  doc.line(110,y,110,y+6.8);
  doc.line(128,y,128,y+6.8);

  // textos
  doc.setFont("helvetica","bold");
  doc.setFontSize(9);

  doc.text("Razão Social",8,y+4.5);
  doc.text("CNPJ",112,y+4.5);
}

function secondRow(doc, y){
  doc.setLineWidth(0.12);

  doc.rect(5,y,200,6.6);

  doc.line(32,y,32,y+6.6);
  doc.line(71,y,71,y+6.6);
  doc.line(115,y,115,y+6.6);
  doc.line(128,y,128,y+6.6);
  doc.line(144,y,144,y+6.6);
  doc.line(156,y,156,y+6.6);

  doc.setFont("helvetica","bold");
  doc.setFontSize(9);

  doc.text("Município",8,y+4.3);
  doc.text("Estado",74,y+4.3);
  doc.text("UF",118,y+4.3);
  doc.text("Telefone:",147,y+4.3);
}


function topInfoTable(doc, y){
  const x = 5;
  const w = 200;
  const h1 = 7.2;
  const h2 = 7.0;
  const h3 = 7.0;
  const h4 = 7.0;
  const h5 = 7.0;
  const h6 = 7.0;
  const totalH = h1+h2+h3+h4+h5+h6;

  doc.setDrawColor(0,0,0);
  doc.setLineWidth(0.12);

  // Borda externa única
  doc.rect(x,y,w,totalH);

  let yy = y;

  // Linha 1: Razão Social / CNPJ
  doc.line(x, yy+h1, x+w, yy+h1);
  doc.line(x+30, yy, x+30, yy+h1);
  doc.line(x+108, yy, x+108, yy+h1);
  doc.line(x+126, yy, x+126, yy+h1);

  doc.setFont("helvetica","bold");
  doc.setFontSize(8.7);
  doc.text("Razão Social", x+2, yy+4.8);
  doc.text("CNPJ", x+111, yy+4.8);

  fitText(doc,$("razaoSocial"),x+32,yy+4.8,73,8.4,false);
  fitText(doc,$("cnpj"),x+129,yy+4.8,68,8.4,false);

  yy += h1;

  // Linha 2: Município / Estado / UF / Telefone
  doc.line(x, yy+h2, x+w, yy+h2);
  doc.line(x+27, yy, x+27, yy+h2);
  doc.line(x+66, yy, x+66, yy+h2);
  doc.line(x+84, yy, x+84, yy+h2);
  doc.line(x+116, yy, x+116, yy+h2);
  doc.line(x+128, yy, x+128, yy+h2);
  doc.line(x+143, yy, x+143, yy+h2);
  doc.line(x+165, yy, x+165, yy+h2);

  doc.setFont("helvetica","bold");
  doc.setFontSize(8.7);
  doc.text("Município", x+2, yy+4.7);
  doc.text("Estado", x+68, yy+4.7);
  doc.text("UF", x+119, yy+4.7);
  doc.text("Telefone:", x+146, yy+4.7);

  fitText(doc,$("municipio"),x+29,yy+4.7,34,8.4,false);
  fitText(doc,$("estado"),x+86,yy+4.7,27,8.4,false);
  fitText(doc,$("uf"),x+131,yy+4.7,10,8.4,false);
  fitText(doc,$("telefone"),x+167,yy+4.7,30,8.4,false);

  yy += h2;

  // Linha 3: tipos
  doc.line(x, yy+h3, x+w, yy+h3);
  doc.line(x+w/3, yy, x+w/3, yy+h3);
  doc.line(x+(w/3)*2, yy, x+(w/3)*2, yy+h3);

  checkOption(doc,$("tipoOperacao"),"administradora",x+12,yy+4.8,"Administradora");
  checkOption(doc,$("tipoOperacao"),"empresa",x+78,yy+4.8,"Empresa");
  checkOption(doc,$("tipoOperacao"),"assessoria",x+143,yy+4.8,"Assessoria / Corretora");

  yy += h3;

  // Linha 4: tipos
  doc.line(x, yy+h4, x+w, yy+h4);
  doc.line(x+w/3, yy, x+w/3, yy+h4);
  doc.line(x+(w/3)*2, yy, x+(w/3)*2, yy+h4);

  checkOption(doc,$("tipoOperacao"),"sindicato",x+12,yy+4.8,"Sindicato/ Associação");
  checkOption(doc,$("tipoOperacao"),"pme",x+78,yy+4.8,"PME Administrado");
  checkOption(doc,$("tipoOperacao"),"pregao",x+143,yy+4.8,"Pregão Eletrônico ou Presencial");

  yy += h4;

  // Linha 5: Representante legal
  doc.line(x, yy+h5, x+w, yy+h5);
  doc.line(x+38, yy, x+38, yy+h5);

  doc.setFont("helvetica","bold");
  doc.setFontSize(8.7);
  doc.text("Representante Legal",x+2,yy+4.7);
  fitText(doc,$("representante"),x+40,yy+4.7,155,8.4,false);

  yy += h5;

  // Linha 6: CPF / E-mail
  doc.line(x, yy+h6, x+w, yy+h6);
  doc.line(x+20, yy, x+20, yy+h6);
  doc.line(x+90, yy, x+90, yy+h6);
  doc.line(x+110, yy, x+110, yy+h6);

  doc.setFont("helvetica","bold");
  doc.setFontSize(8.7);
  doc.text("CPF",x+2,yy+4.7);
  doc.text("E-mail",x+92,yy+4.7);
  fitText(doc,$("cpfRepresentante"),x+22,yy+4.7,65,8.4,false);
  fitText(doc,$("email"),x+112,yy+4.7,85,8.4,false);

  return y + totalH;
}

function bankAddressTable(doc, y){
  const x = 5;
  const w = 200;
  const h1 = 7.0;
  const h2 = 7.0;

  doc.setLineWidth(0.12);
  doc.rect(x,y,w,h1+h2);

  // Linha 1
  doc.line(x, y+h1, x+w, y+h1);
  doc.line(x+22, y, x+22, y+h1);
  doc.line(x+65, y, x+65, y+h1);
  doc.line(x+88, y, x+88, y+h1);
  doc.line(x+130, y, x+130, y+h1);
  doc.line(x+152, y, x+152, y+h1);

  doc.setFont("helvetica","bold");
  doc.setFontSize(8.7);
  doc.text("Banco",x+2,y+4.7);
  doc.text("Agência",x+67,y+4.7);
  doc.text("Conta",x+132,y+4.7);

  fitText(doc,$("banco"),x+24,y+4.7,38,8.4,false);
  fitText(doc,$("agencia"),x+90,y+4.7,36,8.4,false);
  fitText(doc,$("conta"),x+154,y+4.7,43,8.4,false);

  // Linha 2
  const yy = y+h1;
  doc.line(x+25, yy, x+25, yy+h2);
  doc.line(x+135, yy, x+135, yy+h2);
  doc.line(x+153, yy, x+153, yy+h2);

  doc.setFont("helvetica","bold");
  doc.setFontSize(8.7);
  doc.text("Endereço",x+2,yy+4.7);
  doc.text("CEP",x+137,yy+4.7);

  fitText(doc,$("endereco"),x+27,yy+4.7,105,8.4,false);
  fitText(doc,$("cep"),x+155,yy+4.7,42,8.4,false);

  return y+h1+h2;
}

function paginaResumoContratual(doc){
  drawLogo(doc);
  drawWatermark(doc);
  doc.setFont("helvetica","bold");
  doc.setFontSize(13);
  doc.setTextColor(151,0,70);
  doc.text("Resumo contratual",105,33,{align:"center"});
  doc.setTextColor(0,0,0);

  let x=5,y=42,w=200;

  y = topInfoTable(doc, y);
  y = bankAddressTable(doc, y);
  y += 10;

  headerBar(doc,"PERCENTUAIS DE COMISSÃO - ACOMODAÇÃO ENF / APT",y); y+=7.2;
  box(doc,x,y,52,7); box(doc,x+52,y,74,7); box(doc,x+126,y,74,7);
  centerText(doc,"NUMERO DE VIDAS",x,y+5.8,52,8.3); centerText(doc,"AGENCIAMENTO CORRETORAS PJ",x+52,y+5.8,74,8.3); centerText(doc,"COMISSIONAMENTO CORRETORAS PJ",x+126,y+5.8,74,8.3); y+=8.5;
  [["02 a 99 VIDAS",$("agenciamento99"),$("comissionamento99")],["100 OU MAIS VIDAS\nadmitido grupo econômico",$("agenciamento100"),$("comissionamento100")]].forEach(r=>{
    box(doc,x,y,52,7); box(doc,x+52,y,74,7); box(doc,x+126,y,74,7);
    centerText(doc,r[0].split("\n")[0],x,y+3.8,52,7.1,false);
    if(r[0].includes("\n")) centerText(doc,"admitido grupo econômico",x,y+6.5,52,5.8,false);
    centerText(doc,r[1],x+52,y+5.8,74,8.0,false); centerText(doc,r[2],x+126,y+5.8,74,8.0,false); y+=8.5;
  }); y+=4;

  function payTable(title,prefix){
    headerBar(doc,title,y); y+=7.2;
    rowCells(doc,x,y,[100,100],5.2);
    centerText(doc,"AGENCIAMENTO",x,y+3.9,100,8.0,false); centerText(doc,"COMISSIONAMENTO",x+100,y+3.9,100,8.0,false); y+=5.2;
    for(let i=1;i<=6;i++){
      rowCells(doc,x,y,[50,50,50,50],4.2);
      centerText(doc,`${i}ª`,x,y+3.3,50,7.5,false); centerText(doc,$(`${prefix}Ag${i}`),x+50,y+3.3,50,7.5,false);
      centerText(doc,`${i}ª`,x+100,y+3.3,50,7.5,false); centerText(doc,$(`${prefix}Com${i}`),x+150,y+3.3,50,7.5,false); y+=4.4;
    }
    y+=3.5;
  }
  payTable("FORMA DE PAGAMENTO PME - 2 A 99 VIDAS","pme");
  payTable("FORMA DE PAGAMENTO PJ - 100 OU MAIS VIDAS","pj");

  headerBar(doc,"APROVAÇÕES E VALIDAÇÕES",y); y+=7.2;
  [["RESPONSÁVEL PELA VENDA",$("responsavelVenda"),"PERCENTUAL:",$("percentualVenda")],["VALIDADO POR",$("validadoPor"),"CARGO:",$("cargoValidador")],["APROVADO POR",$("aprovadoPor"),"CARGO:",$("cargoAprovador")]].forEach(r=>{
    rowCells(doc,x,y,[45,88,25,42],5.2);
    doc.setFontSize(6.8); doc.setFont("helvetica","bold"); doc.text(r[0],x+2,y+3.8); fitText(doc,r[1],x+47,y+3.8,84,7.5);
    doc.setFont("helvetica","bold"); doc.text(r[2],x+135,y+3.8); fitText(doc,r[3],x+160,y+3.8,38,7.5); y+=5.2;
  }); y+=4;
  headerBar(doc,"OBSERVAÇÕES",y); y+=7.2;
  box(doc,x,y,w,18);
  const obs=$("observacoes").split(/\s+/); let lineTxt="", lines=[];
  obs.forEach(word=>{ if((lineTxt+" "+word).trim().length>110){lines.push(lineTxt); lineTxt=word}else lineTxt=(lineTxt+" "+word).trim()});
  if(lineTxt) lines.push(lineTxt);
  lines.slice(0,4).forEach((l,i)=>fitText(doc,l,x+2,y+5+i*4.2,w-4,6.5));
  doc.setTextColor(151,0,70);
  doc.setFontSize(7);
  doc.text("evosaude.com.br",105,287,{align:"center"});
  doc.setFillColor(151,0,70);
  doc.rect(0,292,210,5,"F");
  doc.setTextColor(0,0,0);
}

async function gerarPDF(){
  try{
    showLoading("Gerando PDF...");
    await new Promise(r=>setTimeout(r,250));

    const { jsPDF } = window.jspdf;

    if(!jsPDF){
      throw new Error("jsPDF não carregado");
    }

    const doc = new jsPDF({
      orientation:"portrait",
      unit:"mm",
      format:"a4",
      compress:true
    });

    paginaResumoContratual(doc);
    salvarResumoLocal(true);

    hideLoading();

    setTimeout(()=>{
      doc.save("resumo-contratual-evo.pdf");
    },100);

  }catch(error){
    console.error("Erro ao gerar PDF:", error);
    hideLoading();
    alert("Não foi possível gerar o PDF. Atualize a página e tente novamente.");
  }
}

document.addEventListener("DOMContentLoaded",()=>{
  initTheme();
  showSkeleton();
  montarParcelas();
  aplicarMascaras();
  adicionarBotoesLimparSecao();
  renderHistorico();
});
