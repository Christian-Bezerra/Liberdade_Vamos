const $ = (s, el=document) => el.querySelector(s);
const $$ = (s, el=document) => [...el.querySelectorAll(s)];
const main = $('#main'), dialog = $('#placeDialog'), dialogContent = $('#dialogContent');
const today = new Date();
let data, view = 'itinerary', map, markers = [], position = null;
const state = JSON.parse(localStorage.getItem('liberdade-state') || '{"plan":[],"favorites":[],"visited":[],"notes":{},"coords":{},"durations":{}}');
if (!state.durations) state.durations = {};
// dayStart/dayEnd are stored as "HH:MM" strings; null means "use data.json default"
const dayStart = () => state.dayStart || (data?.day.start) || '11:00';
const dayEnd   = () => state.dayEnd   || (data?.day.end)   || '17:00';
const save = () => localStorage.setItem('liberdade-state', JSON.stringify(state));
const mins = h => { const m=/([01]?\d|2[0-3]):([0-5]\d)/.exec(h||''); return m ? +m[1]*60 + +m[2] : null; };
const clock = m => `${String(Math.floor(m/60)).padStart(2,'0')}:${String(m%60).padStart(2,'0')}`;
const timeNow = () => today.getHours()*60+today.getMinutes();
const categoryIcon = c => ({comida:'●',café:'◆',compras:'■',mercado:'▲',cultura:'✦',atividade:'★'})[c]||'●';
const allPlaces = () => [...data.fixedEvents, ...data.places];
const getPlace = id => allPlaces().find(p=>p.id===id);
const isFixed = p => data.fixedEvents.some(x=>x.id===p.id);

// Returns effective duration (user-edited override takes priority)
const getDuration = p => state.durations[p.id] ?? p.duration;

const opening = p => {
  if (isFixed(p) || !p.hours) return null;
  const now=timeNow(); const pairs=[...p.hours.matchAll(/(\d{1,2}:\d{2})\s*[–-]\s*(\d{1,2}:\d{2})/g)];
  return pairs.some(x=>{const start=mins(x[1]),end=mins(x[2]);return end>=start ? now>=start&&now<=end : now>=start||now<=end;});
};

const mapUrl = p => `https://www.openstreetmap.org/search?query=${encodeURIComponent([p.name,p.address,'Liberdade, São Paulo'].filter(Boolean).join(', '))}`;
const routeUrl = p => `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent([p.name,p.address,'São Paulo'].filter(Boolean).join(', '))}&travelmode=walking`;

function toast(msg){const t=$('#toast');t.textContent=msg;t.classList.add('show');clearTimeout(toast.t);toast.t=setTimeout(()=>t.classList.remove('show'),2800)}

function add(id){ if(isFixed(getPlace(id))) return; if(!state.plan.includes(id)){state.plan.push(id);save();toast('Adicionado ao roteiro.')} else toast('Este local já está no roteiro.');render(); }
function toggle(arr,id){const i=state[arr].indexOf(id);i<0?state[arr].push(id):state[arr].splice(i,1);save();render();}
function move(id, dir){const i=state.plan.indexOf(id), j=i+dir;if(j<0||j>=state.plan.length)return;[state.plan[i],state.plan[j]]=[state.plan[j],state.plan[i]];save();render();}

function coord(p){return p.coordinates || state.coords[p.id] || null}

function haversine(a,b){
  const R=6371000,rad=x=>x*Math.PI/180;
  const dLat=rad(b.lat-a.lat),dLon=rad(b.lng-a.lng);
  const q=Math.sin(dLat/2)**2+Math.cos(rad(a.lat))*Math.cos(rad(b.lat))*Math.sin(dLon/2)**2;
  return 2*R*Math.asin(Math.sqrt(q));
}

function travel(a,b){
  const ca=coord(a),cb=coord(b);
  if(ca&&cb){
    const d=haversine(ca,cb);
    // Walking speed: ~80m/min (4.8 km/h), minimum 2 min
    const walkMins = Math.max(2,Math.round(d/80));
    return {minutes:walkMins, label:`${Math.round(d)} m · ${walkMins} min a pé`};
  }
  return {minutes:8, label:'~8 min a pé (estimativa; toque em "Localizar endereços" no mapa)'};
}

function conflicts(){
  let t=mins(dayStart()), issues=[];
  for(const id of state.plan){
    const p=getPlace(id);
    const dur=getDuration(p);
    if(t+dur>mins(data.fixedEvents[0].start)&&t<mins(data.fixedEvents[0].end))issues.push(p.name);
    t+=dur+8;
  }
  return issues;
}

function timelineItems(){
  const fixed=data.fixedEvents[0], before=[],after=[];
  let t=mins(dayStart());
  for(const id of state.plan){
    const p=getPlace(id);
    const dur=getDuration(p);
    const next=t+dur;
    const walkMins=8;
    if(next<=mins(fixed.start)) before.push({p,start:t,dur});
    else after.push({p,start:null,dur});
    t=next+walkMins;
  }
  let at=mins(fixed.end);
  after.forEach(x=>{x.start=at;at+=x.dur+8});
  return {before,fixed,after,end:at};
}

function header(title, sub, action=''){return `<section class="view-head"><div><h2>${title}</h2><p>${sub}</p></div>${action}</section>`}

function placeCard(p, compact=false){
  const fav=state.favorites.includes(p.id), visit=state.visited.includes(p.id);
  const dur=getDuration(p);
  return `<article class="place-card">
    <header>
      <div><h3>${categoryIcon(p.category)} ${p.name}</h3><p class="address">${p.address||'Endereço não informado'}</p></div>
      <button class="heart" data-favorite="${p.id}" aria-label="Favoritar ${p.name}" aria-pressed="${fav}">${fav?'♥':'♡'}</button>
    </header>
    <div class="meta">
      <span class="tag ${p.category}">${p.category}</span>
      <span class="tag">${p.hours||'Horário não informado'}</span>
      <span class="tag duration-tag" data-dur-id="${p.id}">${dur} min</span>
      ${p.priority==='alta'?'<span class="priority">PRIORIDADE ALTA</span>':''}
    </div>
    ${compact?'':`<p>${p.notes?.[0]||'Sem observações.'}</p>`}
    <div class="actions">
      <button class="button small secondary" data-details="${p.id}">Detalhes</button>
      ${!isFixed(p)?`<button class="button small" data-add="${p.id}">${state.plan.includes(p.id)?'No roteiro':'Adicionar'}</button>`:''}
      <button class="button small ghost" data-visited="${p.id}">${visit?'✓ Visitado':'Marcar visitado'}</button>
    </div>
  </article>`;
}

function renderItinerary(){
  const {before,fixed,after,end}=timelineItems();
  const issues=conflicts();
  const ds=dayStart(), de=dayEnd();
  const available=mins(de)-mins(ds);
  const usedMins=state.plan.reduce((n,id)=>n+getDuration(getPlace(id))+8,60);
  const isDefaultWindow = !state.dayStart && !state.dayEnd;

  let html=header('Seu roteiro',`${ds.replace(':','h')} – ${de.replace(':','h')} · sábado`,'<span class="pill">sem cadastro</span>');

  // Time window editor
  html+=`<div class="time-window">
    <span class="time-window-label">Janela do dia</span>
    <div class="time-window-inputs">
      <label>De <input type="time" id="editDayStart" value="${ds}" class="time-input"></label>
      <span class="time-sep">→</span>
      <label>Até <input type="time" id="editDayEnd" value="${de}" class="time-input"></label>
      ${!isDefaultWindow?`<button class="button small ghost" id="resetWindow">Restaurar</button>`:''}
    </div>
  </div>`;

  html+=`<section class="summary-grid">
    <div class="metric"><b>${state.plan.length}</b><span>paradas</span></div>
    <div class="metric"><b>${Math.max(0,available-usedMins)} min</b><span>livres (estimado)</span></div>
    <div class="metric"><b>${clock(Math.min(end,mins(de)))}</b><span>término previsto</span></div>
    <div class="metric"><b>${issues.length}</b><span>alertas</span></div>
  </section>`;
  html+=`<div class="notice"><strong>Compromisso fixo.</strong> Karaokê Kampai das 14h às 15h. Ele nunca é movido pela sugestão de rota.</div>`;
  if(issues.length) html+=`<div class="notice"><strong>Possível conflito:</strong> ${issues.join(', ')} encosta no horário do karaokê. Reorganize ou retire uma parada.</div>`;

  html+='<section class="timeline">';
  let previous=null;

  const item=(x,fix=false)=>{
    const dur=fix?getDuration(x.p):x.dur;
    const w=previous&&!fix ? travel(previous,x.p) : null;
    if(w) html+=`<div class="walk">↘ <b>${w.label}</b></div>`;
    html+=`<article class="timeline-card ${fix?'fixed':''}">
      <div class="time-row">
        <span class="time">${fix?'14:00':clock(x.start)}</span>
        <div style="flex:1">
          <h3>${x.p.name}</h3>
          <p>${fix?'14:00–15:00 · agendamento pago':`${x.p.address||'Endereço não informado'}`}</p>
          ${!fix?`<div class="duration-edit">
            <label>Tempo: <input type="number" class="dur-input" data-dur="${x.p.id}" value="${dur}" min="5" max="240" step="5"> min</label>
          </div>`:''}
        </div>
        ${!fix?`<div class="reorder">
          <button data-move="${x.p.id},-1" aria-label="Subir ${x.p.name}">↑</button>
          <button data-move="${x.p.id},1" aria-label="Descer ${x.p.name}">↓</button>
        </div>`:''}
      </div>
      <div class="actions">
        <button class="button small secondary" data-details="${x.p.id}">Detalhes</button>
        ${!fix?`<button class="button small ghost" data-remove="${x.p.id}">Remover</button>`:''}
      </div>
    </article>`;
    previous=fix?null:x.p;
  };

  before.forEach(x=>item(x));
  item({p:fixed,dur:60},true);
  after.forEach(x=>item(x));
  html+='</section>';

  if(!state.plan.length) html+=`<div class="empty"><b>O roteiro está livre.</b><br>Escolha uma parada em Explorar e ela aparece aqui. O karaokê já está protegido no horário certo.</div>`;
  html+=`<h3 class="section-title">Ações rápidas</h3>
    <div class="actions">
      <button class="button secondary" id="suggest">Sugerir sequência</button>
      <button class="button ghost" id="copyPlan">Copiar roteiro</button>
    </div>
    <p class="detail-note">Toque no campo de minutos de qualquer parada para ajustar o tempo. Deslocamentos sem coordenada confirmada usam 8 minutos como estimativa.</p>`;
  main.innerHTML=html;
}

// Explore: render only the results list, not the entire view, to preserve search input
let exploreRendered = false;
function renderExplore(){
  const categories=['todos','comida','café','compras','mercado','cultura'];
  const selected=main.dataset.cat||'todos';
  const q=main.dataset.q||'';
  const open=main.dataset.open==='1';
  const max=+main.dataset.max||0;

  let items=data.places.filter(p=>
    (selected==='todos'||p.category===selected)&&
    (!q||`${p.name} ${p.address} ${p.category} ${p.notes.join(' ')}`.toLowerCase().includes(q.toLowerCase()))&&
    (!open||opening(p))&&
    (!max||getDuration(p)<=max)
  );

  // If the explore shell doesn't exist yet, render the full shell
  if(!$('#explore-shell',main)){
    exploreRendered=false;
  }

  if(!exploreRendered){
    let html=header('Explorar',`${items.length} locais na base`);
    html+=`<div class="search"><input id="query" type="search" value="${q.replace(/"/g,'&quot;')}" placeholder="Buscar comida, café, mercado…" aria-label="Buscar locais" autocomplete="off" inputmode="text"></div>`;
    html+=`<div class="filters" id="filter-bar">${categories.map(c=>`<button class="filter ${c===selected?'active':''}" data-category="${c}">${c[0].toUpperCase()+c.slice(1)}</button>`).join('')}<button class="filter ${open?'active':''}" id="openNow">Aberto agora</button></div>`;
    html+=`<div class="control-grid">
      <select id="duration" aria-label="Duração">
        <option value="0">Qualquer duração</option>
        <option value="20" ${max===20?'selected':''}>Até 20 min</option>
        <option value="40" ${max===40?'selected':''}>Até 40 min</option>
        <option value="60" ${max===60?'selected':''}>Até 1 hora</option>
      </select>
      <button class="button secondary" id="nearMe">${position?'✓ Perto de mim':'Perto de mim'}</button>
    </div>`;
    html+=`<div id="explore-shell"></div>`;
    main.innerHTML=html;
    exploreRendered=true;
  } else {
    // Update filter button states without re-rendering the input
    $$('.filter',main).forEach(b=>{
      if(b.dataset.category) b.classList.toggle('active', b.dataset.category===selected);
      if(b.id==='openNow') b.classList.toggle('active', open);
    });
    // Update result count in subtitle
    const sub=$('.view-head p',main);
    if(sub) sub.textContent=`${items.length} locais na base`;
  }

  // Always update just the results area
  const shell=$('#explore-shell',main);
  if(shell){
    shell.innerHTML=items.length
      ?`<section class="place-list">${items.map(p=>placeCard(p)).join('')}</section>`
      :`<div class="empty">Nada encontrado com estes filtros.<br><button class="button small secondary" id="clearFilters">Limpar filtros</button></div>`;
  }
}

function renderSaved(){
  const saved=[...state.favorites,...state.visited].filter((id,i,a)=>a.indexOf(id)===i).map(getPlace).filter(Boolean);
  let html=header('Salvos','Favoritos e locais visitados');
  html+=saved.length?`<section class="place-list">${saved.map(p=>placeCard(p)).join('')}</section>`:`<div class="empty"><b>Guarde o que chamou atenção.</b><br>Toque no coração de qualquer local para vê-lo aqui.</div>`;
  main.innerHTML=html;
  exploreRendered=false;
}

function renderMap(){
  const without=allPlaces().filter(p=>!coord(p)).length;
  let html=header('Mapa','Pins por categoria; coordenadas confirmadas quando disponíveis');
  html+=`<div class="map-key"><span><i class="dot comida"></i>comida</span><span><i class="dot café"></i>café</span><span><i class="dot compras"></i>compras</span><span><i class="dot mercado"></i>mercado</span><span><i class="dot cultura"></i>cultura</span></div>`;
  html+=`<div class="map-wrap"><div id="map" class="map"></div></div>`;
  html+=`<div class="map-tools">
    <button class="button secondary" id="geocode">Localizar endereços</button>
    <button class="button ghost" id="locate">Usar minha localização</button>
    ${Object.keys(state.coords).length>0?`<button class="button ghost" id="clearCoords">Limpar coords</button>`:''}
  </div>`;
  html+=`<p class="detail-note">${without?`${without} locais ainda sem coordenada salva. "Localizar endereços" consulta OpenStreetMap somente ao tocar no botão.`:'Coordenadas salvas neste aparelho.'} Nenhum endereço ou coordenada foi inventado.</p>`;
  html+=`<details class="map-list"><summary>Ver locais sem pin (${without})</summary><ul>${allPlaces().filter(p=>!coord(p)).map(p=>`<li>${p.name} — ${p.address||'endereço não informado'}</li>`).join('')}</ul></details>`;
  main.innerHTML=html;
  exploreRendered=false;
  setTimeout(initMap);
}

function initMap(){
  if(!window.L){$('#map').innerHTML='<div class="map-message">O mapa precisa de conexão para carregar. O restante do roteiro continua disponível.</div>';return}
  map=L.map('map',{zoomControl:true}).setView([-23.5584,-46.6354],15);
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',{attribution:'© OpenStreetMap'}).addTo(map);
  drawMarkers();
}

function drawMarkers(){
  if(!map)return;
  markers.forEach(m=>m.remove());
  markers=[];
  const pins=allPlaces().filter(p=>coord(p));
  pins.forEach(p=>{
    const c=coord(p);
    const icon=L.divIcon({className:'',html:`<span class="tag ${p.category}" style="border:2px solid white;box-shadow:0 1px 5px #0005">${categoryIcon(p.category)}</span>`,iconSize:[26,26],iconAnchor:[13,13]});
    const marker=L.marker([c.lat,c.lng],{icon}).addTo(map).bindPopup(`<b>${p.name}</b><br><span>${p.address||''}</span><br><button onclick="window.open('${mapUrl(p)}','_blank')">Ver no mapa</button>`);
    markers.push(marker);
  });
  if(position){
    const u=L.circleMarker([position.lat,position.lng],{radius:9,color:'#184e9a',fillColor:'#4d91e8',fillOpacity:1}).addTo(map).bindPopup('Você está aqui');
    markers.push(u);
  }
  if(pins.length){
    const group=L.featureGroup(markers);
    map.fitBounds(group.getBounds().pad(.18));
  }
}

async function geocode(){
  const missing=allPlaces().filter(p=>p.address&&!coord(p));
  if(!missing.length){toast('Todos os endereços disponíveis já foram localizados.');return}
  toast(`Localizando ${missing.length} endereços com OpenStreetMap…`);
  let found=0;
  for(const p of missing){
    try{
      // More specific query: include the street number and neighborhood
      const streetQuery = p.address.replace(/,\s*\d+$/, m => m); // keep number
      const q=encodeURIComponent(`${streetQuery}, Bairro Liberdade, São Paulo, SP, Brasil`);
      const r=await fetch(`https://nominatim.openstreetmap.org/search?format=jsonv2&limit=3&q=${q}&countrycodes=br&bounded=1&viewbox=-46.660,-23.545,-46.620,-23.575`);
      const res=await r.json();
      if(res[0]){
        state.coords[p.id]={lat:+res[0].lat,lng:+res[0].lon};
        save();
        found++;
      }
    }catch(e){console.warn('geocode error',p.name,e)}
    await new Promise(r=>setTimeout(r,1100));
  }
  renderMap();
  toast(`${found} de ${missing.length} endereços localizados. Confira os pins antes de sair.`);
}

function useLocation(){
  if(!navigator.geolocation){toast('Localização não é compatível neste navegador.');return}
  navigator.geolocation.getCurrentPosition(x=>{
    position={lat:x.coords.latitude,lng:x.coords.longitude};
    toast('Localização usada apenas nesta sessão.');
    render();
  },()=>toast('Sem localização — o app segue funcionando normalmente.'),{enableHighAccuracy:false,timeout:8000,maximumAge:300000});
}

function showDetails(id){
  const p=getPlace(id), fav=state.favorites.includes(id), visited=state.visited.includes(id);
  const dur=getDuration(p);
  dialogContent.innerHTML=`
    <button class="close" id="closeDialog" aria-label="Fechar">×</button>
    <p class="tag ${p.category}">${p.category}</p>
    <h2 class="detail-title">${p.name}</h2>
    <p class="detail-address">${p.address||'Endereço não informado — edite antes de sair.'}</p>
    <p><b>Horário:</b> ${p.hours||'Não informado'}</p>
    <div class="duration-edit-detail">
      <label class="field-label" for="detailDur">Tempo de permanência</label>
      <div class="dur-row">
        <input type="number" id="detailDur" class="dur-input-lg" value="${dur}" min="5" max="240" step="5">
        <span class="dur-unit">min</span>
        ${state.durations[p.id]!==undefined?`<button class="button small ghost" id="resetDur" data-id="${p.id}">Restaurar padrão (${p.duration} min)</button>`:''}
      </div>
    </div>
    <ul class="detail-list">${(p.notes||[]).map(n=>`<li>${n}</li>`).join('')}</ul>
    ${p.priority==='alta'?'<div class="notice"><strong>Prioridade alta.</strong> Agendamento já pago, das 14h às 15h.</div>':''}
    <div class="actions">
      <a class="button secondary" target="_blank" rel="noopener" href="${mapUrl(p)}">Ver no mapa</a>
      ${p.address?`<a class="button ghost" target="_blank" rel="noopener" href="${routeUrl(p)}">Rota a pé</a>`:''}
      ${!isFixed(p)?`<button class="button" data-add="${p.id}">${state.plan.includes(p.id)?'No roteiro':'Adicionar'}</button>`:''}
      <button class="heart" data-favorite="${p.id}" aria-pressed="${fav}">${fav?'♥':'♡'}</button>
    </div>
    <label class="field-label" for="personalNote">Nota rápida (fica neste aparelho)</label>
    <textarea class="note-input" id="personalNote" placeholder="Ex.: pedir o choux…">${state.notes[p.id]||''}</textarea>
    <div class="actions">
      <button class="button small secondary" id="saveNote" data-id="${p.id}">Salvar nota</button>
      <button class="button small secondary" id="saveDurDetail" data-id="${p.id}">Salvar tempo</button>
      <button class="button small ghost" data-visited="${p.id}">${visited?'✓ Visitado':'Marcar visitado'}</button>
    </div>`;
  dialog.showModal();
}

function suggest(){
  const unfixed=state.plan.map(getPlace);
  if(unfixed.length<2){toast('Adicione pelo menos dois locais para sugerir uma sequência.');return}
  const fixedStart=mins(data.fixedEvents[0].start);
  let pre=[],post=[],t=mins(dayStart());
  [...unfixed].sort((a,b)=>getDuration(a)-getDuration(b)).forEach(p=>{
    if(t+getDuration(p)+8<=fixedStart){pre.push(p);t+=getDuration(p)+8}
    else post.push(p)
  });
  state.plan=[...pre,...post].map(p=>p.id);
  save();render();
  toast('Sequência sugerida mantendo o karaokê fixo.');
}

function copyPlan(){
  const {before,fixed,after}=timelineItems();
  const lines=[`Liberdade — ${data.day.dateLabel}`,...before.map(x=>`${clock(x.start)} · ${x.p.name} (${x.dur} min)`),'14:00–15:00 · '+fixed.name+' (agendado)',...after.map(x=>`${clock(x.start)} · ${x.p.name} (${x.dur} min)`)];
  navigator.clipboard?.writeText(lines.join('\n')).then(()=>toast('Roteiro copiado.')).catch(()=>toast(lines.join(' · ')));
}

function shareDay(){
  const text=`Roteiro Liberdade: ${state.plan.map(id=>getPlace(id).name).join(', ')||'a definir'}. Compromisso fixo: Karaokê Kampai, 14h–15h.`;
  if(navigator.share)navigator.share({title:'Liberdade, vamos?',text}).catch(()=>{});
  else navigator.clipboard?.writeText(text).then(()=>toast('Resumo copiado para compartilhar.'));
}

function bind(){
  const clicks=e=>{
    const b=e.target.closest('[data-add],[data-remove],[data-favorite],[data-visited],[data-details],[data-move],[data-category]');
    if(b){
      if(b.dataset.add)add(b.dataset.add);
      if(b.dataset.remove){state.plan=state.plan.filter(x=>x!==b.dataset.remove);save();render()}
      if(b.dataset.favorite)toggle('favorites',b.dataset.favorite);
      if(b.dataset.visited)toggle('visited',b.dataset.visited);
      if(b.dataset.details)showDetails(b.dataset.details);
      if(b.dataset.move){const [id,d]=b.dataset.move.split(',');move(id,+d)}
      if(b.dataset.category){main.dataset.cat=b.dataset.category;exploreRendered=false;renderExplore()}
      return;
    }
    if(e.target.id==='openNow'){main.dataset.open=main.dataset.open==='1'?'0':'1';renderExplore()}
    if(e.target.id==='clearFilters'){main.dataset.cat='todos';main.dataset.open='0';main.dataset.max='0';main.dataset.q='';exploreRendered=false;renderExplore()}
    if(e.target.id==='nearMe')useLocation();
    if(e.target.id==='geocode')geocode();
    if(e.target.id==='locate')useLocation();
    if(e.target.id==='clearCoords'){delete state.coords;state.coords={};save();renderMap();}
    if(e.target.id==='suggest')suggest();
    if(e.target.id==='copyPlan')copyPlan();
    if(e.target.id==='closeDialog')dialog.close();
    if(e.target.id==='saveNote'){state.notes[e.target.dataset.id]=$('#personalNote').value.trim();save();toast('Nota salva neste aparelho.')}
    if(e.target.id==='saveDurDetail'){
      const id=e.target.dataset.id;
      const val=parseInt($('#detailDur').value);
      if(val>=5&&val<=240){state.durations[id]=val;save();toast(`Tempo atualizado: ${val} min`);dialog.close();render();}
    }
    if(e.target.id==='resetDur'){
      const id=e.target.dataset.id;
      delete state.durations[id];
      save();
      showDetails(id);
      toast('Tempo restaurado ao padrão.');
    }
    if(e.target.id==='resetWindow'){
      delete state.dayStart; delete state.dayEnd;
      save(); renderItinerary();
      toast('Horários restaurados ao padrão.');
    }
  };

  main.addEventListener('click',clicks);
  dialog.addEventListener('click',clicks);

  // Duration editing inline in itinerary (debounced)
  let durTimer;
  main.addEventListener('input',e=>{
    if(e.target.classList.contains('dur-input')){
      const id=e.target.dataset.dur;
      const val=parseInt(e.target.value);
      clearTimeout(durTimer);
      durTimer=setTimeout(()=>{
        if(val>=5&&val<=240){state.durations[id]=val;save();renderItinerary();toast(`Tempo ajustado: ${val} min`);}
      },600);
      return;
    }
    if(e.target.id==='editDayStart'){
      const v=e.target.value;
      if(v && v < (state.dayEnd||data.day.end||'17:00')){
        state.dayStart=v; save(); renderItinerary();
      }
    }
    if(e.target.id==='editDayEnd'){
      const v=e.target.value;
      if(v && v > (state.dayStart||data.day.start||'11:00')){
        state.dayEnd=v; save(); renderItinerary();
      }
    }
    if(e.target.id==='query'){
      main.dataset.q=e.target.value;
      // Preserve cursor position
      const cursor=e.target.selectionStart;
      renderExplore();
      const input=$('#query',main);
      if(input){input.focus();try{input.setSelectionRange(cursor,cursor);}catch(err){}}
    }
    if(e.target.id==='duration'){main.dataset.max=e.target.value;renderExplore();}
  });
}

function render(){
  $$('.bottom-nav button').forEach(b=>b.classList.toggle('active',b.dataset.view===view));
  if(view==='itinerary'){exploreRendered=false;renderItinerary();}
  if(view==='explore')renderExplore();
  if(view==='saved'){exploreRendered=false;renderSaved();}
  if(view==='map'){exploreRendered=false;renderMap();}
}

$$('.bottom-nav button').forEach(b=>b.addEventListener('click',()=>{view=b.dataset.view;render()}));
$('#shareDay').addEventListener('click',shareDay);
bind();

fetch('./data.json').then(r=>r.json()).then(d=>{
  data=d;
  render();
  if('serviceWorker'in navigator)navigator.serviceWorker.register('./sw.js').catch(()=>{});
}).catch(()=>main.innerHTML='<div class="empty"><b>Não foi possível abrir a base local.</b><br>Tente novamente com conexão ou recarregue o app.</div>');
