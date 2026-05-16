const {teams, groups, matches} = window.WK_DATA;
const byId = Object.fromEntries(teams.map(t=>[t.id,t]));
const groupMap = Object.fromEntries(groups.map(g=>[g, teams.filter(t=>t.group===g).sort((a,b)=>a.position-b.position)]));

const fmt = d => new Intl.DateTimeFormat('nl-NL',{weekday:'short', day:'numeric', month:'long', year:'numeric'}).format(new Date(d+'T12:00:00'));
function validate(){
  const errors=[];
  if(groups.length!==12) errors.push('Niet precies 12 groepen.');
  if(matches.length!==72) errors.push('Niet precies 72 groepswedstrijden.');
  groups.forEach(g=>{
    const gt=groupMap[g]||[];
    if(gt.length!==4) errors.push(`Groep ${g}: ${gt.length} teams i.p.v. 4.`);
    const ids=new Set(gt.map(t=>t.id));
    const gm=matches.filter(m=>m.group===g);
    if(gm.length!==6) errors.push(`Groep ${g}: ${gm.length} wedstrijden i.p.v. 6.`);
    const pairs=new Set();
    gm.forEach(m=>{
      if(m.home===m.away) errors.push(`${m.id}: team speelt tegen zichzelf.`);
      if(!ids.has(m.home)||!ids.has(m.away)) errors.push(`${m.id}: team hoort niet in groep ${g}.`);
      const key=[m.home,m.away].sort().join('|');
      if(pairs.has(key)) errors.push(`${m.id}: dubbele wedstrijd in groep ${g}.`);
      pairs.add(key);
    });
  });
  return errors;
}
function renderGroups(){
  document.querySelector('#groupsGrid').innerHTML = groups.map(g=>`<article class="group-card"><h3>Groep ${g}</h3>${groupMap[g].map(t=>`<div class="team-row"><b><span class="pos">${t.position}</span> ${t.flag} ${t.name}</b><span>★</span></div>`).join('')}</article>`).join('');
  const sel=document.querySelector('#groupFilter');
  groups.forEach(g=>sel.insertAdjacentHTML('beforeend',`<option value="${g}">Groep ${g}</option>`));
}
function renderMatches(){
  const gf=document.querySelector('#groupFilter').value;
  const q=document.querySelector('#searchInput').value.toLowerCase();
  const filtered=matches.filter(m=>{
    const h=byId[m.home], a=byId[m.away];
    return (gf==='all'||m.group===gf) && `${h.name} ${a.name} ${m.venue}`.toLowerCase().includes(q);
  });
  document.querySelector('#matchesGrid').innerHTML = filtered.map(m=>{
    const h=byId[m.home], a=byId[m.away];
    return `<article class="match-card">
      <div class="match-top"><span>Groep ${m.group}</span><span>${fmt(m.date)}</span></div>
      <div class="matchup"><div class="team">${h.flag} ${h.name}</div><div class="vs">VS</div><div class="team">${a.flag} ${a.name}</div></div>
      <div class="venue">🏟️ ${m.venue}</div>
    </article>`;
  }).join('');
}
function getPred(){return JSON.parse(localStorage.getItem('wk26-premium-predictions')||'{}')}
function setPred(p){localStorage.setItem('wk26-premium-predictions',JSON.stringify(p))}
function renderPredictions(){
  const p=getPred();
  document.querySelector('#predictionGrid').innerHTML = matches.map(m=>{
    const h=byId[m.home], a=byId[m.away], pred=p[m.id]||{};
    return `<div class="prediction-card"><b>${h.flag} ${h.name}</b><div class="score-box"><input type="number" min="0" data-id="${m.id}" data-side="home" value="${pred.home??''}" placeholder="0"><input type="number" min="0" data-id="${m.id}" data-side="away" value="${pred.away??''}" placeholder="0"></div><b>${a.flag} ${a.name}</b></div>`;
  }).join('');
  document.querySelectorAll('.prediction-card input').forEach(i=>i.addEventListener('input',e=>{
    const p=getPred(), id=e.target.dataset.id, side=e.target.dataset.side;
    p[id]=p[id]||{}; p[id][side]=e.target.value===''?'':Number(e.target.value); setPred(p); renderStandings();
  }));
}
function renderStandings(){
  const p=getPred();
  document.querySelector('#standingsGrid').innerHTML = groups.map(g=>{
    const rows=Object.fromEntries(groupMap[g].map(t=>[t.id,{t,pl:0,w:0,d:0,l:0,gf:0,ga:0,gd:0,pts:0}]));
    matches.filter(m=>m.group===g).forEach(m=>{
      const s=p[m.id]; if(!s||s.home===''||s.away===''||s.home===undefined||s.away===undefined)return;
      const h=rows[m.home], a=rows[m.away]; h.pl++; a.pl++; h.gf+=s.home; h.ga+=s.away; a.gf+=s.away; a.ga+=s.home; h.gd=h.gf-h.ga; a.gd=a.gf-a.ga;
      if(s.home>s.away){h.w++;a.l++;h.pts+=3}else if(s.home<s.away){a.w++;h.l++;a.pts+=3}else{h.d++;a.d++;h.pts++;a.pts++}
    });
    const sorted=Object.values(rows).sort((a,b)=>b.pts-a.pts||b.gd-a.gd||b.gf-a.gf||a.t.name.localeCompare(b.t.name));
    return `<article class="standing-card"><h3>Groep ${g}</h3><table><thead><tr><th>Team</th><th>G</th><th>W</th><th>GL</th><th>V</th><th>DV</th><th>DT</th><th>DS</th><th>PT</th></tr></thead><tbody>${sorted.map(r=>`<tr><td>${r.t.flag} ${r.t.name}</td><td>${r.pl}</td><td>${r.w}</td><td>${r.d}</td><td>${r.l}</td><td>${r.gf}</td><td>${r.ga}</td><td>${r.gd}</td><td><b>${r.pts}</b></td></tr>`).join('')}</tbody></table></article>`;
  }).join('');
}
function renderCheck(){
  const errors=validate(), badge=document.querySelector('#checkBadge'), panel=document.querySelector('#dataPanel');
  if(errors.length===0){badge.textContent='✅ Datacheck: schema klopt'; badge.className='check-badge ok'; panel.innerHTML='<h3>✅ Alles logisch gekoppeld</h3><p>12 groepen, 48 teams en 72 groepswedstrijden zijn gecontroleerd. Geen dubbele wedstrijden, geen teams tegen zichzelf en geen teams buiten hun eigen groep.</p>'}
  else{badge.textContent=`⚠️ ${errors.length} problemen`; badge.className='check-badge bad'; panel.innerHTML='<h3>Problemen gevonden</h3><ul>'+errors.map(e=>`<li>${e}</li>`).join('')+'</ul>'}
}
function countdown(){
  const target=new Date('2026-06-11T20:00:00+02:00'), diff=Math.max(0,target-new Date());
  document.querySelector('#cd-days').textContent=Math.floor(diff/86400000);
  document.querySelector('#cd-hours').textContent=Math.floor(diff/3600000)%24;
  document.querySelector('#cd-mins').textContent=Math.floor(diff/60000)%60;
  document.querySelector('#cd-secs').textContent=Math.floor(diff/1000)%60;
}
document.querySelector('#menuBtn').onclick=()=>document.querySelector('#nav').classList.toggle('open');
document.querySelector('#groupFilter').addEventListener('change', renderMatches);
document.querySelector('#searchInput').addEventListener('input', renderMatches);
renderGroups(); renderMatches(); renderPredictions(); renderStandings(); renderCheck(); countdown(); setInterval(countdown,1000);
