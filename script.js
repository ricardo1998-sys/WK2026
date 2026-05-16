const flags = ["🇺🇸","🇨🇦","🇲🇽","🇧🇷","🇦🇷","🇫🇷","🇳🇱","🇩🇪","🇪🇸","🇬🇧","🇵🇹","🇮🇹","🇯🇵","🇰🇷","🇲🇦","🇸🇳","🇺🇾","🇨🇴","🇨🇭","🇭🇷","🇧🇪","🇩🇰","🇸🇪","🇳🇴","🇵🇱","🇷🇸","🇹🇷","🇺🇦","🇦🇺","🇮🇷","🇸🇦","🇪🇬","🇹🇳","🇬🇭","🇨🇲","🇳🇬","🇨🇱","🇵🇾","🇵🇪","🇪🇨","🇨🇷","🇯🇲","🇵🇦","🇶🇦","🇦🇪","🇿🇦","🇨🇳","🇺🇿"];
const names = [
  "Verenigde Staten","Canada","Mexico","Brazilië","Argentinië","Frankrijk","Nederland","Duitsland",
  "Spanje","Engeland","Portugal","Italië","Japan","Zuid-Korea","Marokko","Senegal",
  "Uruguay","Colombia","Zwitserland","Kroatië","België","Denemarken","Zweden","Noorwegen",
  "Polen","Servië","Turkije","Oekraïne","Australië","Iran","Saoedi-Arabië","Egypte",
  "Tunesië","Ghana","Kameroen","Nigeria","Chili","Paraguay","Peru","Ecuador",
  "Costa Rica","Jamaica","Panama","Qatar","VAE","Zuid-Afrika","China","Oezbekistan"
];

const teams = names.map((name, i) => ({
  id: `T${i+1}`,
  name,
  flag: flags[i],
  coach: "Nog te bepalen",
  stars: "Sterspelers volgen",
  ranking: "FIFA-ranking volgt"
}));

const groups = Array.from({length:12}, (_, gi) => ({
  id: String.fromCharCode(65 + gi),
  teams: teams.slice(gi*4, gi*4 + 4)
}));

const stadiums = ["Azteca Stadion","BMO Field","MetLife Stadium","AT&T Stadium","BC Place","SoFi Stadium","Hard Rock Stadium","Mercedes-Benz Stadium","NRG Stadium","Lumen Field","Levi's Stadium","Lincoln Financial Field"];
const pairings = [[0,1],[2,3],[0,2],[3,1],[3,0],[1,2]];
const matches = [];
let matchNo = 1;
const start = new Date("2026-06-11T20:00:00");
groups.forEach((group, gi) => {
  pairings.forEach((pair, pi) => {
    const d = new Date(start.getTime() + (matchNo-1) * 8 * 60 * 60 * 1000);
    matches.push({
      id: `M${matchNo}`,
      group: group.id,
      matchday: Math.floor(pi / 2) + 1,
      home: group.teams[pair[0]].id,
      away: group.teams[pair[1]].id,
      date: d.toISOString(),
      stadium: stadiums[(matchNo-1) % stadiums.length]
    });
    matchNo++;
  });
});

const teamById = Object.fromEntries(teams.map(t => [t.id, t]));

function validateData() {
  const errors = [];
  if (groups.length !== 12) errors.push("Er zijn niet precies 12 groepen.");
  groups.forEach(g => {
    if (g.teams.length !== 4) errors.push(`Groep ${g.id} heeft niet precies 4 teams.`);
    const groupTeamIds = new Set(g.teams.map(t => t.id));
    const groupMatches = matches.filter(m => m.group === g.id);
    if (groupMatches.length !== 6) errors.push(`Groep ${g.id} heeft niet precies 6 wedstrijden.`);
    const seen = new Set();
    groupMatches.forEach(m => {
      if (m.home === m.away) errors.push(`${m.id}: team speelt tegen zichzelf.`);
      if (!groupTeamIds.has(m.home) || !groupTeamIds.has(m.away)) errors.push(`${m.id}: team buiten groep ${g.id}.`);
      const key = [m.home, m.away].sort().join("-");
      if (seen.has(key)) errors.push(`${m.id}: dubbele wedstrijd in groep ${g.id}.`);
      seen.add(key);
    });
  });
  if (matches.length !== 72) errors.push("Er zijn niet precies 72 groepswedstrijden.");
  return errors;
}

function renderGroups() {
  const el = document.querySelector("#groups");
  el.innerHTML = groups.map(g => `
    <article class="group-card">
      <h3>Groep ${g.id}</h3>
      ${g.teams.map(t => `
        <div class="team-row">
          <span class="team-name">${t.flag} ${t.name}</span>
          <span class="team-meta">Favoriet team ☆</span>
        </div>`).join("")}
    </article>`).join("");
}

function renderGroupFilter() {
  const sel = document.querySelector("#group-filter");
  groups.forEach(g => {
    const opt = document.createElement("option");
    opt.value = g.id;
    opt.textContent = `Groep ${g.id}`;
    sel.appendChild(opt);
  });
  sel.addEventListener("change", renderMatches);
}

function formatDate(iso) {
  return new Intl.DateTimeFormat("nl-NL", { dateStyle:"medium", timeStyle:"short" }).format(new Date(iso));
}

function renderMatches() {
  const filter = document.querySelector("#group-filter").value;
  const list = filter === "all" ? matches : matches.filter(m => m.group === filter);
  document.querySelector("#matches").innerHTML = list.map(m => {
    const home = teamById[m.home], away = teamById[m.away];
    return `<article class="match-card">
      <div class="match-meta"><span>Groep ${m.group} • MD${m.matchday}</span><span>${formatDate(m.date)}</span></div>
      <div class="match-teams">
        <span class="match-team">${home.flag} ${home.name}</span>
        <span class="vs">VS</span>
        <span class="match-team">${away.flag} ${away.name}</span>
      </div>
      <div class="stadium">🏟️ ${m.stadium}</div>
    </article>`;
  }).join("");
}

function predictions() {
  return JSON.parse(localStorage.getItem("wk2026_predictions") || "{}");
}
function savePredictions(p) {
  localStorage.setItem("wk2026_predictions", JSON.stringify(p));
}

function renderPredictions() {
  const p = predictions();
  document.querySelector("#prediction-list").innerHTML = matches.map(m => {
    const home = teamById[m.home], away = teamById[m.away];
    const pred = p[m.id] || {};
    return `<div class="prediction-card">
      <strong>${home.flag} ${home.name}</strong>
      <div class="score-inputs">
        <input type="number" min="0" data-match="${m.id}" data-side="home" value="${pred.home ?? ""}" placeholder="0">
        <input type="number" min="0" data-match="${m.id}" data-side="away" value="${pred.away ?? ""}" placeholder="0">
      </div>
      <strong>${away.flag} ${away.name}</strong>
    </div>`;
  }).join("");
  document.querySelectorAll("#prediction-list input").forEach(input => {
    input.addEventListener("input", e => {
      const all = predictions();
      const id = e.target.dataset.match;
      all[id] = all[id] || {};
      const value = e.target.value === "" ? "" : Number(e.target.value);
      all[id][e.target.dataset.side] = value;
      savePredictions(all);
      renderStandings();
    });
  });
  renderStandings();
}

function renderStandings() {
  const p = predictions();
  const html = groups.map(g => {
    const rows = Object.fromEntries(g.teams.map(t => [t.id, {team:t, played:0,w:0,d:0,l:0,gf:0,ga:0,gd:0,pts:0}]));
    matches.filter(m => m.group === g.id).forEach(m => {
      const pred = p[m.id];
      if (!pred || pred.home === "" || pred.away === "" || pred.home === undefined || pred.away === undefined) return;
      const h = rows[m.home], a = rows[m.away];
      h.played++; a.played++;
      h.gf += pred.home; h.ga += pred.away;
      a.gf += pred.away; a.ga += pred.home;
      h.gd = h.gf - h.ga; a.gd = a.gf - a.ga;
      if (pred.home > pred.away) { h.w++; a.l++; h.pts += 3; }
      else if (pred.home < pred.away) { a.w++; h.l++; a.pts += 3; }
      else { h.d++; a.d++; h.pts++; a.pts++; }
    });
    const sorted = Object.values(rows).sort((a,b) => b.pts-a.pts || b.gd-a.gd || b.gf-a.gf || a.team.name.localeCompare(b.team.name));
    return `<article class="standing-card">
      <h3>Stand groep ${g.id}</h3>
      <table><thead><tr><th>Team</th><th>G</th><th>W</th><th>GL</th><th>V</th><th>DS</th><th>PT</th></tr></thead>
      <tbody>${sorted.map(r => `<tr><td>${r.team.flag} ${r.team.name}</td><td>${r.played}</td><td>${r.w}</td><td>${r.d}</td><td>${r.l}</td><td>${r.gd}</td><td>${r.pts}</td></tr>`).join("")}</tbody></table>
    </article>`;
  }).join("");
  document.querySelector("#standings").innerHTML = html;
}

function renderDataCheck() {
  const errors = validateData();
  const el = document.querySelector("#data-check");
  if (errors.length === 0) {
    el.textContent = "✅ Datacheck: 72 wedstrijden kloppen";
    el.className = "data-check ok";
  } else {
    el.textContent = `⚠️ Datacheck: ${errors.length} probleem(en)`;
    el.className = "data-check bad";
    console.warn("WK 2026 datacheck:", errors);
  }
}

const quiz = [
  {q:"Hoeveel teams doen mee aan het WK 2026?", a:["32","40","48","64"], correct:2},
  {q:"Welke landen organiseren het WK 2026?", a:["VS, Canada en Mexico","VS en Mexico","Canada en Brazilië","Mexico en Argentinië"], correct:0},
  {q:"Wanneer is de finale gepland?", a:["11 juni 2026","27 juni 2026","28 juni 2026","19 juli 2026"], correct:3}
];
let quizIndex = 0;
function renderQuiz() {
  const item = quiz[quizIndex];
  document.querySelector("#quiz-question").textContent = item.q;
  document.querySelector("#quiz-result").textContent = "";
  document.querySelector("#quiz-options").innerHTML = item.a.map((x,i) => `<button class="button ghost option" data-i="${i}">${x}</button>`).join("");
  document.querySelectorAll(".option").forEach(btn => {
    btn.addEventListener("click", () => {
      document.querySelector("#quiz-result").textContent = Number(btn.dataset.i) === item.correct ? "✅ Goed!" : "❌ Net niet.";
    });
  });
}
document.querySelector("#next-question").addEventListener("click", () => {
  quizIndex = (quizIndex + 1) % quiz.length;
  renderQuiz();
});

function countdown() {
  const target = new Date("2026-06-11T20:00:00+02:00");
  const diff = Math.max(0, target - new Date());
  const days = Math.floor(diff / 86400000);
  const hours = Math.floor(diff / 3600000) % 24;
  const minutes = Math.floor(diff / 60000) % 60;
  const seconds = Math.floor(diff / 1000) % 60;
  document.querySelector("#days").textContent = days;
  document.querySelector("#hours").textContent = hours;
  document.querySelector("#minutes").textContent = minutes;
  document.querySelector("#seconds").textContent = seconds;
}

document.querySelector(".nav-toggle").addEventListener("click", () => document.querySelector(".nav-links").classList.toggle("open"));
renderGroups();
renderGroupFilter();
renderMatches();
renderPredictions();
renderDataCheck();
renderQuiz();
countdown();
setInterval(countdown, 1000);
