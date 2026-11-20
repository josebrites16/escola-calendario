// ====== Escola — calendário escolar estilo iOS ======
const $ = (s, el = document) => el.querySelector(s);
const uid = () => Math.random().toString(36).slice(2, 10);
const pad = n => String(n).padStart(2, "0");
const iso = d => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const parseISO = s => { const [y, m, d] = s.split("-").map(Number); return new Date(y, m - 1, d); };
const addDays = (d, n) => { const x = new Date(d); x.setDate(x.getDate() + n); return x; };
const todayISO = () => iso(new Date());
const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const daysBetween = (a, b) => Math.round((parseISO(b) - parseISO(a)) / 864e5);

const WD = ["Seg", "Ter", "Qua", "Qui", "Sex", "Sáb", "Dom"];
const WD_LONG = ["Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado", "Domingo"];
const MONTHS = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"];
const PALETTE = ["#007aff", "#ff9500", "#34c759", "#af52de", "#ff2d55", "#5ac8fa", "#ffcc00", "#5856d6", "#00c7be", "#a2845e"];
const TYPES = {
  exame: { label: "Exame", color: "#ff3b30" },
  teste: { label: "Teste", color: "#ff9500" },
  entrega: { label: "Entrega", color: "#af52de" },
  apresentacao: { label: "Apresentação", color: "#5856d6" },
  feriado: { label: "Feriado / Férias", color: "#34c759" },
  outro: { label: "Outro", color: "#8e8e93" },
};
const weekday = d => (d.getDay() + 6) % 7 + 1; // 1 = Segunda … 7 = Domingo

// ---------- Estado ----------
const DEFAULTS = {
  classes: [], events: [], study: [],
  settings: {
    apiKey: "", semesterEnd: "", studyTime: "18:00", studyMinutes: 60,
    examDays: 5, testDays: 4, deliveryDays: 3, classAlert: 10, eventAlertDays: 1,
  },
};
let S = load();
function load() {
  try {
    const s = JSON.parse(localStorage.getItem("escola") || "null");
    if (s) return { ...DEFAULTS, ...s, settings: { ...DEFAULTS.settings, ...s.settings } };
  } catch {}
  return structuredClone(DEFAULTS);
}
function save() { localStorage.setItem("escola", JSON.stringify(S)); }

function subjectColor(name) {
  const key = (name || "").trim().toLowerCase();
  let h = 0; for (const c of key) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  return PALETTE[h % PALETTE.length];
}

// ---------- Plano de estudo ----------
function rebuildStudy() {
  const st = S.settings, today = todayISO();
  const doneKeys = new Set(S.study.filter(s => s.done).map(s => s.eventId + "|" + s.date));
  const extra = S.study.filter(s => !s.eventId); // tarefas manuais
  const out = [];
  for (const ev of S.events) {
    const n = { exame: st.examDays, teste: st.testDays, entrega: st.deliveryDays, apresentacao: st.deliveryDays }[ev.type];
    if (!n || ev.date < today) continue;
    for (let i = n; i >= 1; i--) {
      const date = iso(addDays(parseISO(ev.date), -i));
      if (date < today && !doneKeys.has(ev.id + "|" + date)) continue;
      const verb = ev.type === "entrega" || ev.type === "apresentacao" ? "Trabalhar em" : "Estudar";
      out.push({
        id: ev.id + "|" + date, eventId: ev.id, date, subject: ev.subject || ev.title,
        title: `${verb}: ${ev.title}`, note: i === 1 ? "Última revisão" : `Faltam ${i} dias`,
        done: doneKeys.has(ev.id + "|" + date),
      });
    }
  }
  S.study = [...out, ...extra].sort((a, b) => a.date.localeCompare(b.date));
}

// ---------- Navegação ----------
let tab = localStorage.getItem("escola-tab") || "hoje";
let selDay = weekday(new Date()); if (selDay > 5 && !S.classes.some(c => c.day === selDay)) selDay = 1;
let calMonth = new Date(); calMonth.setDate(1);
let calSel = todayISO();

document.querySelectorAll(".tabbar button").forEach(b => b.onclick = () => { tab = b.dataset.tab; localStorage.setItem("escola-tab", tab); render(); window.scrollTo(0, 0); });

function render() {
  document.querySelectorAll(".tabbar button").forEach(b => b.classList.toggle("on", b.dataset.tab === tab));
  const v = $("#view");
  v.innerHTML = ({ hoje: viewToday, horario: viewSchedule, calendario: viewCalendar, estudo: viewStudy, definicoes: viewSettings })[tab]();
  v.classList.remove("fade-in"); void v.offsetWidth; v.classList.add("fade-in");
  bindView();
}

const ICON = {
  plus: '<svg viewBox="0 0 24 24"><path d="M12 5v14M5 12h14"/></svg>',
  camera: '<svg viewBox="0 0 24 24"><path d="M4 8h3l2-3h6l2 3h3v11H4z"/><circle cx="12" cy="13" r="3.5"/></svg>',
  cal: '<svg viewBox="0 0 24 24"><rect x="3" y="5" width="18" height="16" rx="3"/><path d="M3 10h18M8 3v4M16 3v4"/></svg>',
  clock: '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></svg>',
  book: '<svg viewBox="0 0 24 24"><path d="M4 5.5C4 4.7 4.7 4 5.5 4H11v16H5.5C4.7 20 4 19.3 4 18.5zM20 5.5c0-.8-.7-1.5-1.5-1.5H13v16h5.5c.8 0 1.5-.7 1.5-1.5z"/></svg>',
  bell: '<svg viewBox="0 0 24 24"><path d="M6 16V11a6 6 0 0 1 12 0v5l2 2H4zM10 20a2 2 0 0 0 4 0"/></svg>',
  flag: '<svg viewBox="0 0 24 24"><path d="M5 21V4h11l-2 4 2 4H5"/></svg>',
  key: '<svg viewBox="0 0 24 24"><circle cx="8" cy="15" r="4"/><path d="M11 12l9-9M17 6l3 3"/></svg>',
  trash: '<svg viewBox="0 0 24 24"><path d="M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13"/></svg>',
  share: '<svg viewBox="0 0 24 24"><path d="M12 3v12M8 7l4-4 4 4M5 12v8h14v-8"/></svg>',
};

const header = (title, sub, actions = "") =>
  `<div class="header"><div>${sub ? `<div class="sub">${sub}</div>` : ""}<h1>${title}</h1></div><div class="header-actions">${actions}</div></div>`;

// ---------- HOJE ----------
function viewToday() {
  const now = new Date(), t = todayISO(), wd = weekday(now);
  const nowHM = `${pad(now.getHours())}:${pad(now.getMinutes())}`;
  const classes = S.classes.filter(c => c.day === wd).sort((a, b) => a.start.localeCompare(b.start));
  const upcoming = S.events.filter(e => e.date >= t && e.type !== "feriado").sort((a, b) => a.date.localeCompare(b.date));
  const in7 = upcoming.filter(e => daysBetween(t, e.date) <= 7);
  const studyToday = S.study.filter(s => s.date === t);
  const nextClass = classes.find(c => c.end > nowHM);
  const nextExam = upcoming.find(e => e.type === "exame" || e.type === "teste");
  const sub = `${WD_LONG[wd - 1]}, ${now.getDate()} de ${MONTHS[now.getMonth()].toLowerCase()}`;

  let h = header("Hoje", sub, `<button class="round-btn" data-act="import">${ICON.camera}</button>`);

  if (!S.classes.length && !S.events.length) {
    return h + `<div class="empty">${ICON.camera}<b>Vamos começar</b>Tira um print ao teu horário e ao calendário de avaliações e importa-os aqui. A app organiza tudo e cria um plano de estudo.</div>
      <button class="btn" data-act="import">Importar prints</button>
      <button class="btn secondary" data-act="add-class">Adicionar manualmente</button>`;
  }

  if (nextClass) {
    const live = nextClass.start <= nowHM;
    h += `<div class="next-card" style="background:linear-gradient(135deg, ${subjectColor(nextClass.subject)}, ${shade(subjectColor(nextClass.subject))})">
      <div class="k">${live ? "A decorrer agora" : "Próxima aula"}</div>
      <div class="t">${esc(nextClass.subject)}</div>
      <div class="m">${nextClass.start}–${nextClass.end}${nextClass.room ? " · " + esc(nextClass.room) : ""}</div></div>`;
  }

  h += `<div class="cards" style="margin-top:12px">
    <div class="stat"><div class="icon-tile" style="background:var(--blue)">${ICON.clock}</div><div class="n">${classes.length}</div><div class="l">Aulas hoje</div></div>
    <div class="stat"><div class="icon-tile" style="background:var(--red)">${ICON.flag}</div><div class="n">${nextExam ? daysBetween(t, nextExam.date) : "–"}</div><div class="l">${nextExam ? "Dias p/ " + esc(TYPES[nextExam.type].label.toLowerCase()) : "Sem avaliações"}</div></div>
  </div>`;

  h += `<div class="section-title big">Para estudar hoje</div>`;
  h += studyToday.length ? `<div class="group">${studyToday.map(studyRow).join("")}</div>`
    : `<div class="group"><div class="row"><div class="grow meta" style="margin:0">Nada planeado para hoje 🎉</div></div></div>`;

  if (classes.length) {
    h += `<div class="section-title big">Aulas</div><div class="group">` + classes.map(c => `
      <button class="row" data-edit-class="${c.id}" style="${c.end <= nowHM ? "opacity:.45" : ""}">
        <span class="bar" style="background:${subjectColor(c.subject)}"></span>
        <div class="grow"><div class="title">${esc(c.subject)}</div><div class="meta">${[c.type, c.room].filter(Boolean).map(esc).join(" · ")}</div></div>
        <div class="right">${c.start}<br><small>${c.end}</small></div></button>`).join("") + `</div>`;
  }

  h += `<div class="section-title big">Próximos 7 dias</div>`;
  h += in7.length ? `<div class="group">${in7.map(eventRow).join("")}</div>`
    : `<div class="group"><div class="row"><div class="grow meta" style="margin:0">Sem avaliações esta semana</div></div></div>`;
  return h;
}

function shade(hex) {
  const n = parseInt(hex.slice(1), 16);
  const f = v => Math.max(0, Math.round(v * .72));
  return `rgb(${f(n >> 16)},${f((n >> 8) & 255)},${f(n & 255)})`;
}

function relDay(date) {
  const d = daysBetween(todayISO(), date);
  if (d === 0) return "Hoje"; if (d === 1) return "Amanhã"; if (d === -1) return "Ontem";
  const dt = parseISO(date);
  return d > 0 && d < 7 ? WD_LONG[weekday(dt) - 1] : `${dt.getDate()} ${MONTHS[dt.getMonth()].slice(0, 3).toLowerCase()}`;
}

function eventRow(e) {
  const ty = TYPES[e.type] || TYPES.outro;
  const d = daysBetween(todayISO(), e.date);
  return `<button class="row" data-edit-event="${e.id}">
    <span class="bar" style="background:${ty.color}"></span>
    <div class="grow"><div class="title">${esc(e.title)}</div><div class="meta">${ty.label}${e.subject && e.subject !== e.title ? " · " + esc(e.subject) : ""}${e.time ? " · " + e.time : ""}</div></div>
    <div class="right">${relDay(e.date)}${d > 1 && e.type !== "feriado" ? `<br><small style="color:${d <= 3 ? "var(--red)" : "var(--text2)"}">${d} dias</small>` : ""}</div></button>`;
}

function studyRow(s) {
  return `<div class="row ${s.done ? "done" : ""}" data-toggle-study="${esc(s.id)}">
    <span class="check ${s.done ? "on" : ""}"></span>
    <div class="grow"><div class="title">${esc(s.title)}</div><div class="meta"><span class="dot" style="display:inline-block;width:8px;height:8px;background:${subjectColor(s.subject)};margin-right:5px"></span>${esc(s.note || "")}</div></div></div>`;
}

// ---------- HORÁRIO ----------
function viewSchedule() {
  let h = header("Horário", "", `<button class="round-btn" data-act="import-horario">${ICON.camera}</button><button class="round-btn" data-act="add-class">${ICON.plus}</button>`);
  if (!S.classes.length) return h + `<div class="empty">${ICON.clock}<b>Sem horário</b>Importa um print do teu horário semanal ou adiciona as aulas à mão.</div><button class="btn" data-act="import-horario">Importar print do horário</button>`;
  const days = S.classes.some(c => c.day >= 6) ? 7 : 5;
  const todayWd = weekday(new Date());
  h += `<div class="daytabs">${WD.slice(0, days).map((d, i) =>
    `<button data-day="${i + 1}" class="${selDay === i + 1 ? "on" : ""}"><small>${d.toUpperCase()}</small><b>${S.classes.filter(c => c.day === i + 1).length}</b></button>`).join("")}</div>`;
  const list = S.classes.filter(c => c.day === selDay).sort((a, b) => a.start.localeCompare(b.start));
  h += `<div class="section-title">${WD_LONG[selDay - 1]}${selDay === todayWd ? " · hoje" : ""}</div>`;
  h += list.length ? list.map(c => `
    <button class="class-card" data-edit-class="${c.id}">
      <div class="time">${c.start}<small>${c.end}</small></div>
      <span class="bar" style="background:${subjectColor(c.subject)}"></span>
      <div class="grow"><div class="title">${esc(c.subject)}</div><div class="meta">${[c.type, c.room, c.teacher].filter(Boolean).map(esc).join(" · ") || "&nbsp;"}</div></div>
    </button>`).join("") : `<div class="empty" style="padding:24px">Dia livre 😌</div>`;
  return h;
}

// ---------- CALENDÁRIO ----------
function viewCalendar() {
  let h = header("Calendário", "", `<button class="round-btn" data-act="import-calendario">${ICON.camera}</button><button class="round-btn" data-act="add-event">${ICON.plus}</button>`);
  const y = calMonth.getFullYear(), m = calMonth.getMonth();
  const first = new Date(y, m, 1), start = addDays(first, -(weekday(first) - 1));
  const t = todayISO();
  const byDate = {};
  S.events.forEach(e => (byDate[e.date] ||= []).push(e));
  h += `<div class="month"><div class="month-head"><b>${MONTHS[m]} ${y}</b><div class="nav"><button data-month="-1">‹</button><button data-month="1">›</button></div></div>
    <div class="grid7">${WD.map(d => `<div class="wd">${d[0]}</div>`).join("")}`;
  for (let i = 0; i < 42; i++) {
    const d = addDays(start, i), k = iso(d);
    if (i === 35 && d.getMonth() !== m) break;
    const evs = byDate[k] || [];
    h += `<button class="day ${d.getMonth() !== m ? "other" : ""} ${k === t ? "today" : ""} ${k === calSel ? "sel" : ""}" data-cal="${k}">
      <span class="num">${d.getDate()}</span><span class="dots">${evs.slice(0, 3).map(e => `<i style="background:${(TYPES[e.type] || TYPES.outro).color}"></i>`).join("")}</span></button>`;
  }
  h += `</div></div>`;
  const sel = parseISO(calSel), dayEvs = byDate[calSel] || [];
  const dayClasses = S.classes.filter(c => c.day === weekday(sel) && !isHoliday(calSel)).sort((a, b) => a.start.localeCompare(b.start));
  h += `<div class="section-title">${WD_LONG[weekday(sel) - 1]}, ${sel.getDate()} de ${MONTHS[sel.getMonth()].toLowerCase()}</div>`;
  h += `<div class="group">${dayEvs.map(eventRow).join("")}${dayClasses.map(c => `
    <button class="row" data-edit-class="${c.id}"><span class="dot" style="background:${subjectColor(c.subject)}"></span>
    <div class="grow"><div class="title">${esc(c.subject)}</div><div class="meta">Aula${c.room ? " · " + esc(c.room) : ""}</div></div><div class="right">${c.start}</div></button>`).join("")}
    ${!dayEvs.length && !dayClasses.length ? `<div class="row"><div class="grow meta" style="margin:0">Nada marcado</div></div>` : ""}</div>`;

  const upcoming = S.events.filter(e => e.date >= t).sort((a, b) => a.date.localeCompare(b.date));
  if (upcoming.length) h += `<div class="section-title big">Próximas datas</div><div class="group">${upcoming.map(eventRow).join("")}</div>`;
  return h;
}
const isHoliday = date => S.events.some(e => e.type === "feriado" && e.date === date);

// ---------- ESTUDO ----------
function viewStudy() {
  let h = header("Estudo", "", `<button class="round-btn" data-act="add-task">${ICON.plus}</button>`);
  const t = todayISO();
  const late = S.study.filter(s => s.date < t && !s.done);
  const next = S.study.filter(s => s.date >= t);
  const total = S.study.filter(s => s.date <= t).length, done = S.study.filter(s => s.date <= t && s.done).length;
  if (!S.study.length) return h + `<div class="empty">${ICON.book}<b>Sem plano de estudo</b>Quando adicionares exames, testes ou entregas, a app cria sessões de estudo automaticamente nos dias anteriores.</div>`;
  const pct = total ? Math.round(done / total * 100) : 100;
  h += `<div class="stat" style="display:flex;align-items:center;gap:16px">
    <svg width="64" height="64" viewBox="0 0 36 36" style="transform:rotate(-90deg)"><circle cx="18" cy="18" r="15.5" fill="none" stroke="var(--fill)" stroke-width="4"/>
    <circle cx="18" cy="18" r="15.5" fill="none" stroke="var(--green)" stroke-width="4" stroke-linecap="round" stroke-dasharray="${pct * .974} 100"/></svg>
    <div><div class="n" style="margin:0">${pct}%</div><div class="l">do plano em dia</div></div></div>`;
  if (late.length) h += `<div class="section-title" style="color:var(--red)">Em atraso</div><div class="group">${late.map(studyRow).join("")}</div>`;
  const groups = {};
  next.forEach(s => (groups[s.date] ||= []).push(s));
  for (const [date, items] of Object.entries(groups)) {
    h += `<div class="section-title">${relDay(date)}${daysBetween(t, date) > 1 ? " · " + parseISO(date).getDate() + "/" + (parseISO(date).getMonth() + 1) : ""}</div><div class="group">${items.map(studyRow).join("")}</div>`;
  }
  return h;
}

// ---------- DEFINIÇÕES ----------
function viewSettings() {
  const st = S.settings;
  return header("Definições") + `
  <div class="section-title">Avisos no iPhone</div>
  <div class="group">
    <button class="row indent" data-act="export"><span class="icon-tile" style="background:var(--red)">${ICON.bell}</span><div class="grow"><div class="title">Adicionar ao Calendário do iPhone</div><div class="meta">Aulas, avaliações e sessões de estudo com alertas</div></div><span class="chev">›</span></button>
  </div>
  <div class="footnote">Abre o ficheiro e toca em "Adicionar tudo". O iPhone avisa-te mesmo com a app fechada. Se mudares algo, exporta de novo (apaga primeiro o calendário antigo para não duplicar).</div>

  <div class="section-title">Alertas</div>
  <div class="group">
    ${numField("classAlert", "Aulas", "min antes")}
    ${numField("eventAlertDays", "Avaliações", "dias antes")}
    <div class="field"><label>Hora de estudo</label><input type="time" data-set="studyTime" value="${st.studyTime}"></div>
    ${numField("studyMinutes", "Duração", "min")}
  </div>

  <div class="section-title">Plano de estudo — começar</div>
  <div class="group">
    ${numField("examDays", "Exames", "dias antes")}
    ${numField("testDays", "Testes", "dias antes")}
    ${numField("deliveryDays", "Entregas", "dias antes")}
  </div>

  <div class="section-title">Semestre</div>
  <div class="group"><div class="field"><label>Fim das aulas</label><input type="date" data-set="semesterEnd" value="${st.semesterEnd}"></div></div>
  <div class="footnote">As aulas repetem-se no Calendário do iPhone até esta data.</div>

  <div class="section-title">Leitura de prints (IA)</div>
  <div class="group">
    <div class="field"><span class="icon-tile" style="background:var(--purple)">${ICON.key}</span><input type="password" data-set="apiKey" placeholder="Chave da API Claude (sk-ant-…)" value="${esc(st.apiKey)}" autocomplete="off" style="text-align:left"></div>
  </div>
  <div class="footnote">Opcional. Sem chave, importas grátis através da app do Claude (modo Grátis no ecrã de importar). Com uma chave paga de console.anthropic.com a leitura é automática — fica guardada só neste iPhone.</div>

  <div class="section-title">Dados</div>
  <div class="group">
    <button class="row link" data-act="backup">Exportar cópia de segurança</button>
    <button class="row link" data-act="restore">Restaurar cópia de segurança</button>
    <button class="row danger" data-act="reset">Apagar tudo</button>
  </div>
  <div class="footnote" style="text-align:center;margin-top:24px">Escola v3 · ${S.classes.length} aulas · ${S.events.length} datas</div>`;
}
const numField = (k, label, unit) =>
  `<div class="field"><label>${label}</label><input type="number" inputmode="numeric" min="0" data-set="${k}" value="${S.settings[k]}" style="max-width:70px"><span class="meta" style="color:var(--text2);width:78px">${unit}</span></div>`;

// ---------- Ligações ----------
function bindView() {
  const v = $("#view");
  v.querySelectorAll("[data-act]").forEach(b => b.onclick = () => ACTIONS[b.dataset.act]());
  v.querySelectorAll("[data-day]").forEach(b => b.onclick = () => { selDay = +b.dataset.day; render(); });
  v.querySelectorAll("[data-month]").forEach(b => b.onclick = () => { calMonth.setMonth(calMonth.getMonth() + +b.dataset.month); render(); });
  v.querySelectorAll("[data-cal]").forEach(b => b.onclick = () => { calSel = b.dataset.cal; render(); });
  v.querySelectorAll("[data-edit-class]").forEach(b => b.onclick = () => classForm(S.classes.find(c => c.id === b.dataset.editClass)));
  v.querySelectorAll("[data-edit-event]").forEach(b => b.onclick = () => eventForm(S.events.find(e => e.id === b.dataset.editEvent)));
  v.querySelectorAll("[data-toggle-study]").forEach(b => b.onclick = () => {
    const s = S.study.find(x => x.id === b.dataset.toggleStudy); if (!s) return;
    s.done = !s.done; save(); if (s.done && navigator.vibrate) navigator.vibrate(10); render();
  });
  v.querySelectorAll("[data-set]").forEach(inp => inp.onchange = () => {
    const k = inp.dataset.set;
    S.settings[k] = inp.type === "number" ? Math.max(0, +inp.value || 0) : inp.value.trim();
    rebuildStudy(); save(); toast("Guardado");
  });
}

const ACTIONS = {
  import: () => importSheet("auto"),
  "import-horario": () => importSheet("horario"),
  "import-calendario": () => importSheet("calendario"),
  "add-class": () => classForm(),
  "add-event": () => eventForm(null, calSel),
  "add-task": () => taskForm(),
  export: exportICS,
  backup: () => shareFile(new Blob([JSON.stringify(S, null, 1)], { type: "application/json" }), `escola-backup-${todayISO()}.json`),
  restore: () => {
    const inp = document.createElement("input"); inp.type = "file"; inp.accept = ".json,application/json";
    inp.onchange = async () => {
      try { const d = JSON.parse(await inp.files[0].text()); S = { ...DEFAULTS, ...d, settings: { ...DEFAULTS.settings, ...d.settings } }; save(); render(); toast("Restaurado"); }
      catch { toast("Ficheiro inválido"); }
    };
    inp.click();
  },
  reset: () => {
    if (!confirm("Apagar todas as aulas, datas e o plano de estudo?")) return;
    const key = S.settings.apiKey; S = structuredClone(DEFAULTS); S.settings.apiKey = key; save(); render(); toast("Tudo apagado");
  },
};

// ---------- Sheet ----------
function openSheet(html, onBind) {
  const sh = $("#sheet"); sh.innerHTML = html; sh.scrollTop = 0;
  $("#backdrop").classList.add("open"); sh.classList.add("open");
  sh.querySelectorAll("[data-close]").forEach(b => b.onclick = closeSheet);
  onBind?.(sh);
}
function closeSheet() { $("#sheet").classList.remove("open"); $("#backdrop").classList.remove("open"); }
$("#backdrop").onclick = closeSheet;
const sheetNav = (title, right = "") => `<div class="sheet-nav"><button data-close>Cancelar</button><b>${title}</b>${right || "<button></button>"}</div>`;

function toast(msg) {
  const t = $("#toast"); t.textContent = msg; t.classList.add("show");
  clearTimeout(toast.t); toast.t = setTimeout(() => t.classList.remove("show"), 2200);
}

const subjectsList = () => [...new Set([...S.classes.map(c => c.subject), ...S.events.map(e => e.subject)].filter(Boolean))].sort();
const datalist = () => `<datalist id="subjects">${subjectsList().map(s => `<option value="${esc(s)}">`).join("")}</datalist>`;

function classForm(c) {
  const isNew = !c; c ||= { id: uid(), subject: "", day: selDay, start: "09:00", end: "10:30", room: "", type: "", teacher: "" };
  openSheet(sheetNav(isNew ? "Nova aula" : "Aula", `<button data-save>${isNew ? "Adicionar" : "OK"}</button>`) + `
    <div class="group" style="margin-top:8px">
      <div class="field"><input type="text" name="subject" list="subjects" placeholder="Disciplina" value="${esc(c.subject)}"></div>
      <div class="field"><input type="text" name="type" placeholder="Tipo (Teórica, Prática…)" value="${esc(c.type)}"></div>
      <div class="field"><input type="text" name="room" placeholder="Sala" value="${esc(c.room)}"></div>
      <div class="field"><input type="text" name="teacher" placeholder="Professor" value="${esc(c.teacher)}"></div>
    </div>${datalist()}
    <div class="group" style="margin-top:20px">
      <div class="field"><label>Dia</label><select name="day">${WD_LONG.map((d, i) => `<option value="${i + 1}" ${c.day === i + 1 ? "selected" : ""}>${d}</option>`).join("")}</select></div>
      <div class="field"><label>Início</label><input type="time" name="start" value="${c.start}"></div>
      <div class="field"><label>Fim</label><input type="time" name="end" value="${c.end}"></div>
    </div>
    ${isNew ? "" : `<div class="group" style="margin-top:20px"><button class="row danger" data-del style="justify-content:center">Apagar aula</button></div>`}`,
    sh => {
      sh.querySelector("[data-save]").onclick = () => {
        const f = n => sh.querySelector(`[name=${n}]`).value.trim();
        if (!f("subject")) return toast("Escreve a disciplina");
        Object.assign(c, { subject: f("subject"), type: f("type"), room: f("room"), teacher: f("teacher"), day: +f("day"), start: f("start"), end: f("end") });
        if (isNew) S.classes.push(c);
        save(); closeSheet(); render(); toast(isNew ? "Aula adicionada" : "Guardado");
      };
      sh.querySelector("[data-del]")?.addEventListener("click", () => { S.classes = S.classes.filter(x => x.id !== c.id); save(); closeSheet(); render(); });
    });
}

function eventForm(e, date) {
  const isNew = !e; e ||= { id: uid(), title: "", subject: "", date: date || todayISO(), time: "", type: "teste", notes: "" };
  openSheet(sheetNav(isNew ? "Nova data" : "Detalhes", `<button data-save>${isNew ? "Adicionar" : "OK"}</button>`) + `
    <div class="segmented" style="margin-top:8px">${Object.entries(TYPES).map(([k, t]) => `<button data-type="${k}" class="${e.type === k ? "on" : ""}">${t.label.split(" ")[0]}</button>`).join("")}</div>
    <div class="group" style="margin-top:12px">
      <div class="field"><input type="text" name="title" placeholder="Título (ex: Teste 1)" value="${esc(e.title)}"></div>
      <div class="field"><input type="text" name="subject" list="subjects" placeholder="Disciplina" value="${esc(e.subject)}"></div>
    </div>${datalist()}
    <div class="group" style="margin-top:20px">
      <div class="field"><label>Data</label><input type="date" name="date" value="${e.date}"></div>
      <div class="field"><label>Hora</label><input type="time" name="time" value="${e.time || ""}"></div>
    </div>
    <div class="group" style="margin-top:20px"><div class="field"><textarea name="notes" rows="3" placeholder="Notas (matéria, sala…)">${esc(e.notes)}</textarea></div></div>
    ${isNew ? "" : `<div class="group" style="margin-top:20px"><button class="row danger" data-del style="justify-content:center">Apagar</button></div>`}`,
    sh => {
      let type = e.type;
      sh.querySelectorAll("[data-type]").forEach(b => b.onclick = () => { type = b.dataset.type; sh.querySelectorAll("[data-type]").forEach(x => x.classList.toggle("on", x === b)); });
      sh.querySelector("[data-save]").onclick = () => {
        const f = n => sh.querySelector(`[name=${n}]`).value.trim();
        if (!f("title") || !f("date")) return toast("Falta o título ou a data");
        Object.assign(e, { title: f("title"), subject: f("subject"), date: f("date"), time: f("time"), notes: f("notes"), type });
        if (isNew) S.events.push(e);
        rebuildStudy(); save(); closeSheet(); render(); toast(isNew ? "Adicionado" : "Guardado");
      };
      sh.querySelector("[data-del]")?.addEventListener("click", () => { S.events = S.events.filter(x => x.id !== e.id); rebuildStudy(); save(); closeSheet(); render(); });
    });
}

function taskForm() {
  openSheet(sheetNav("Nova tarefa", `<button data-save>Adicionar</button>`) + `
    <div class="group" style="margin-top:8px">
      <div class="field"><input type="text" name="title" placeholder="O que vais estudar?"></div>
      <div class="field"><input type="text" name="subject" list="subjects" placeholder="Disciplina"></div>
      <div class="field"><label>Dia</label><input type="date" name="date" value="${todayISO()}"></div>
    </div>${datalist()}`,
    sh => sh.querySelector("[data-save]").onclick = () => {
      const f = n => sh.querySelector(`[name=${n}]`).value.trim();
      if (!f("title")) return toast("Escreve a tarefa");
      S.study.push({ id: uid(), eventId: null, title: f("title"), subject: f("subject"), date: f("date") || todayISO(), note: f("subject"), done: false });
      S.study.sort((a, b) => a.date.localeCompare(b.date)); save(); closeSheet(); render();
    });
}

// ---------- Importar prints ----------
function importSheet(mode) {
  let images = [];
  let how = localStorage.getItem("escola-how") || "free";
  const modeHint = () => mode === "horario" ? "Print do horário semanal: as aulas são lidas com dia, hora e sala." : mode === "calendario" ? "Print do calendário de avaliações: exames, testes, entregas e feriados." : "A IA percebe sozinha se é horário ou calendário (podes misturar).";
  const draw = () => openSheet(sheetNav("Importar prints", how === "api" ? `<button data-go ${images.length ? "" : "disabled style='opacity:.4'"}>Ler</button>` : `<button data-read>Ler</button>`) + `
    <div class="segmented" style="margin-top:8px">
      <button data-how="free" class="${how === "free" ? "on" : ""}">Grátis (app Claude)</button>
      <button data-how="api" class="${how === "api" ? "on" : ""}">Automático (chave)</button>
    </div>
    <div class="section-title">O que é o print?</div>
    <div class="segmented">
      ${[["auto", "Detetar"], ["horario", "Horário"], ["calendario", "Calendário"]].map(([k, l]) => `<button data-mode="${k}" class="${mode === k ? "on" : ""}">${l}</button>`).join("")}
    </div>
    <div class="footnote" style="margin-bottom:14px">${modeHint()}</div>
    ${how === "free" ? `
    <div class="group">
      <button class="row indent" data-copy><span class="icon-tile" style="background:var(--blue)">1</span><div class="grow"><div class="title">Copiar o pedido</div><div class="meta">Copia as instruções para a IA</div></div><span class="chev">›</span></button>
      <a class="row indent" href="https://claude.ai/new" target="_blank" rel="noopener" style="color:inherit;text-decoration:none"><span class="icon-tile" style="background:#d97757">2</span><div class="grow"><div class="title">Abrir o Claude</div><div class="meta">Anexa os prints, cola o pedido e envia</div></div><span class="chev">›</span></a>
      <button class="row indent" data-paste><span class="icon-tile" style="background:var(--green)">3</span><div class="grow"><div class="title">Colar a resposta</div><div class="meta">Copia a resposta do Claude e volta aqui</div></div><span class="chev">›</span></button>
    </div>
    <div class="group" style="margin-top:12px"><div class="field"><textarea name="reply" rows="6" placeholder="A resposta do Claude aparece aqui…" style="font-size:13px;font-family:ui-monospace,Menlo,monospace"></textarea></div></div>
    <button class="btn" data-read style="margin-top:12px">Ler resposta</button>
    <div class="footnote">Usa a tua conta grátis do Claude (app ou claude.ai). Também funciona com o ChatGPT ou o Gemini. Para copiar a resposta, toca no botão de copiar por baixo da mensagem.</div>` : `
    ${images.length ? `<div class="thumbs">${images.map(i => `<img src="${i.url}">`).join("")}</div>` : ""}
    <button class="btn ${images.length ? "secondary" : ""}" data-pick style="margin-top:12px">${images.length ? "Adicionar mais prints" : "Escolher prints da galeria"}</button>
    ${!S.settings.apiKey ? `<div class="footnote" style="color:var(--orange);margin-top:14px">⚠️ Este modo precisa de uma chave da API (paga) em Definições. Usa o modo Grátis se não tiveres.</div>` : ""}`}`,
    sh => {
      const reply = sh.querySelector("[name=reply]");
      if (reply && draw.reply) reply.value = draw.reply;
      reply?.addEventListener("input", () => draw.reply = reply.value);
      sh.querySelectorAll("[data-how]").forEach(b => b.onclick = () => { how = b.dataset.how; localStorage.setItem("escola-how", how); draw(); });
      sh.querySelectorAll("[data-mode]").forEach(b => b.onclick = () => { mode = b.dataset.mode; draw(); });
      sh.querySelector("[data-pick]")?.addEventListener("click", () => {
        const fp = $("#filepick"); fp.value = "";
        fp.onchange = async () => { for (const f of fp.files) images.push(await shrink(f)); draw(); };
        fp.click();
      });
      sh.querySelector("[data-go]")?.addEventListener("click", () => images.length && runImport(images, mode));
      sh.querySelector("[data-copy]")?.addEventListener("click", async () => {
        const text = buildPrompt(mode);
        try { await navigator.clipboard.writeText(text); toast("Pedido copiado ✓ Agora abre o Claude"); }
        catch { reply.value = text; reply.select(); toast("Copia o texto da caixa"); }
      });
      sh.querySelector("[data-paste]")?.addEventListener("click", async () => {
        try { reply.value = draw.reply = await navigator.clipboard.readText(); toast("Colado"); }
        catch { reply.focus(); toast("Toca na caixa e escolhe Colar"); }
      });
      sh.querySelectorAll("[data-read]").forEach(b => b.onclick = () => {
        const text = (reply?.value || "").trim();
        if (!text) return toast("Cola primeiro a resposta do Claude");
        try { const r = parseResult(text); draw.reply = ""; reviewImport(r); }
        catch (e) { toast(e.message); }
      });
    });
  draw.reply = "";
  draw();
}

function shrink(file) {
  return new Promise((res, rej) => {
    const img = new Image(), url = URL.createObjectURL(file);
    img.onload = () => {
      const max = 1800, k = Math.min(1, max / Math.max(img.width, img.height));
      const c = document.createElement("canvas"); c.width = img.width * k; c.height = img.height * k;
      c.getContext("2d").drawImage(img, 0, 0, c.width, c.height);
      const data = c.toDataURL("image/jpeg", .85);
      res({ url: data, b64: data.split(",")[1] });
    };
    img.onerror = rej; img.src = url;
  });
}

async function runImport(images, mode) {
  if (!S.settings.apiKey) { closeSheet(); tab = "definicoes"; render(); return toast("Falta a chave da API"); }
  openSheet(`<div class="sheet-nav"><button data-close>Cancelar</button><b>A ler…</b><button></button></div>
    <div style="text-align:center;padding:60px 20px"><div class="spinner"></div><div class="meta" style="color:var(--text2)">A analisar ${images.length} print${images.length > 1 ? "s" : ""}…<br>Pode demorar uns segundos.</div></div>`);
  try {
    const result = await extractWithClaude(images, mode);
    reviewImport(result);
  } catch (err) {
    console.error(err);
    openSheet(sheetNav("Erro") + `<div class="empty"><b>Não deu para ler</b>${esc(err.message || err)}</div><button class="btn" data-close>OK</button>`);
  }
}

function buildPrompt(mode) {
  const now = new Date();
  const what = { horario: "um HORÁRIO semanal de aulas", calendario: "um CALENDÁRIO escolar / de avaliações", auto: "um horário semanal de aulas e/ou um calendário escolar de avaliações (descobre qual)" }[mode];
  return `Estas imagens são prints de ${what} de um estudante (Portugal). Hoje é ${iso(now)}.
Extrai TUDO o que conseguires e responde APENAS com JSON válido, sem texto à volta, neste formato:
{"classes":[{"subject":"","day":1,"start":"HH:MM","end":"HH:MM","room":"","type":"","teacher":""}],
 "events":[{"title":"","subject":"","date":"YYYY-MM-DD","time":"HH:MM ou vazio","type":"exame|teste|entrega|apresentacao|feriado|outro","notes":""}]}
Regras:
- "classes" = aulas que se repetem todas as semanas. day: 1=segunda … 7=domingo. Usa o nome completo da disciplina se estiver visível; se só houver sigla, usa a sigla. "type" = Teórica/Prática/TP/Lab se indicado.
- Se a mesma disciplina tiver várias aulas na semana, cria uma entrada por aula.
- "events" = datas específicas (exames, testes, frequências, entregas de trabalhos, apresentações, feriados, férias, interrupções). Para períodos (ex.: férias de 2 a 6), cria um evento "feriado" por cada dia útil.
- Se o ano não aparecer, escolhe o ano letivo atual (a data mais próxima no futuro ou passado recente faz sentido).
- Não inventes nada que não esteja nas imagens. Listas vazias se não houver.`;
}

function parseResult(text) {
  const json = text.slice(text.indexOf("{"), text.lastIndexOf("}") + 1);
  let data; try { data = JSON.parse(json); } catch { throw new Error("Não percebi a resposta. Confirma que copiaste a resposta toda (começa por { e acaba em })."); }
  const okTime = t => /^\d{1,2}:\d{2}$/.test(t || "") ? t.padStart(5, "0") : "";
  return {
    classes: (data.classes || []).filter(c => c.subject && c.day >= 1 && c.day <= 7 && okTime(c.start))
      .map(c => ({ id: uid(), subject: c.subject.trim(), day: +c.day, start: okTime(c.start), end: okTime(c.end) || okTime(c.start), room: c.room || "", type: c.type || "", teacher: c.teacher || "" })),
    events: (data.events || []).filter(e => e.title && /^\d{4}-\d{2}-\d{2}$/.test(e.date))
      .map(e => ({ id: uid(), title: e.title.trim(), subject: e.subject || "", date: e.date, time: okTime(e.time), type: TYPES[e.type] ? e.type : "outro", notes: e.notes || "" })),
  };
}

let AnthropicSDK;
async function extractWithClaude(images, mode) {
  AnthropicSDK ||= (await import("https://esm.sh/@anthropic-ai/sdk")).default;
  const client = new AnthropicSDK({ apiKey: S.settings.apiKey, dangerouslyAllowBrowser: true });
  const prompt = buildPrompt(mode);
  const req = {
    model: "claude-opus-5-5",
    max_tokens: 16000,
    output_config: { effort: "medium" },
    betas: ["server-side-fallback-2026-07-01"],
    fallbacks: "default",
    messages: [{
      role: "user",
      content: [
        ...images.map(i => ({ type: "image", source: { type: "base64", media_type: "image/jpeg", data: i.b64 } })),
        { type: "text", text: prompt },
      ],
    }],
  };
  let msg;
  try {
    msg = await client.beta.messages.create(req);
  } catch (e) {
    if (e?.status === 401) throw new Error("Chave da API inválida. Confirma-a em Definições.");
    if (e?.status === 429) throw new Error("Demasiados pedidos — espera um minuto e tenta outra vez.");
    if (e?.status === 400 && /fallback/i.test(e?.message || "")) { delete req.betas; delete req.fallbacks; msg = await client.messages.create(req); }
    else throw new Error(e?.message || "Falha de ligação.");
  }
  if (msg.stop_reason === "refusal") throw new Error("O modelo recusou ler estas imagens. Tenta prints mais claros.");
  const text = msg.content.filter(b => b.type === "text").map(b => b.text).join("");
  return parseResult(text);
}

function reviewImport(r) {
  const n = r.classes.length + r.events.length;
  if (!n) return openSheet(sheetNav("Resultado") + `<div class="empty"><b>Não encontrei nada</b>Experimenta um print mais nítido ou com mais zoom.</div><button class="btn" data-close>OK</button>`);
  const keep = new Set([...r.classes, ...r.events].map(x => x.id));
  const replace = { v: r.classes.length > 0 && S.classes.length > 0 };
  const draw = () => openSheet(sheetNav("Rever", `<button data-save>Guardar</button>`) + `
    <div class="footnote" style="margin:4px 4px 0">Encontrei ${n} ite${n > 1 ? "ns" : "m"}. Toca para desmarcar o que estiver errado — podes editar tudo depois.</div>
    ${r.classes.length ? `<div class="section-title">Aulas (${r.classes.length})</div><div class="group">${r.classes.sort((a, b) => a.day - b.day || a.start.localeCompare(b.start)).map(c => `
      <div class="row" data-k="${c.id}"><span class="check ${keep.has(c.id) ? "on" : ""}"></span><span class="bar" style="background:${subjectColor(c.subject)}"></span>
      <div class="grow"><div class="title">${esc(c.subject)}</div><div class="meta">${WD[c.day - 1]} ${c.start}–${c.end}${c.room ? " · " + esc(c.room) : ""}${c.type ? " · " + esc(c.type) : ""}</div></div></div>`).join("")}</div>
      ${S.classes.length ? `<div class="group" style="margin-top:12px"><div class="field"><label style="width:auto;flex:1">Substituir horário atual</label><label class="toggle"><input type="checkbox" data-replace ${replace.v ? "checked" : ""}><span></span></label></div></div>` : ""}` : ""}
    ${r.events.length ? `<div class="section-title">Datas (${r.events.length})</div><div class="group">${r.events.sort((a, b) => a.date.localeCompare(b.date)).map(e => `
      <div class="row" data-k="${e.id}"><span class="check ${keep.has(e.id) ? "on" : ""}"></span><span class="bar" style="background:${TYPES[e.type].color}"></span>
      <div class="grow"><div class="title">${esc(e.title)}</div><div class="meta">${TYPES[e.type].label} · ${parseISO(e.date).toLocaleDateString("pt-PT", { weekday: "short", day: "numeric", month: "short", year: "numeric" })}${e.time ? " · " + e.time : ""}</div></div></div>`).join("")}</div>` : ""}`,
    sh => {
      sh.querySelectorAll("[data-k]").forEach(row => row.onclick = () => { const k = row.dataset.k; keep.has(k) ? keep.delete(k) : keep.add(k); row.querySelector(".check").classList.toggle("on", keep.has(k)); });
      sh.querySelector("[data-replace]")?.addEventListener("change", ev => replace.v = ev.target.checked);
      sh.querySelector("[data-save]").onclick = () => {
        const cls = r.classes.filter(c => keep.has(c.id)), evs = r.events.filter(e => keep.has(e.id));
        if (replace.v && cls.length) S.classes = [];
        const sig = e => `${e.date}|${e.title.toLowerCase()}`;
        const have = new Set(S.events.map(sig));
        S.classes.push(...cls);
        S.events.push(...evs.filter(e => !have.has(sig(e))));
        rebuildStudy(); save(); closeSheet();
        tab = evs.length && !cls.length ? "calendario" : cls.length ? "horario" : tab;
        if (cls.length) selDay = cls[0].day;
        render(); toast(`${cls.length + evs.length} itens guardados ✓`);
      };
    });
  draw();
}

// ---------- Exportar .ics (alertas no iPhone) ----------
function exportICS() {
  const st = S.settings;
  if (!S.classes.length && !S.events.length) return toast("Ainda não há nada para exportar");
  const L = ["BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//Escola//PT", "CALSCALE:GREGORIAN", "X-WR-CALNAME:Escola", "X-WR-CALDESC:Aulas, avaliações e estudo"];
  const stamp = new Date().toISOString().replace(/[-:]/g, "").slice(0, 15) + "Z";
  const dt = (date, time) => date.replace(/-/g, "") + (time ? "T" + time.replace(":", "") + "00" : "");
  const txt = s => String(s || "").replace(/\\/g, "\\\\").replace(/\n/g, "\\n").replace(/[,;]/g, m => "\\" + m);
  const alarm = (trigger, desc) => ["BEGIN:VALARM", "ACTION:DISPLAY", `DESCRIPTION:${txt(desc)}`, `TRIGGER:${trigger}`, "END:VALARM"];
  const ev = (uidv, lines) => L.push("BEGIN:VEVENT", `UID:${uidv}@escola`, `DTSTAMP:${stamp}`, ...lines, "END:VEVENT");
  const addMin = (hm, m) => { const [h, mi] = hm.split(":").map(Number), t = h * 60 + mi + m; return `${pad(Math.floor(t / 60) % 24)}:${pad(t % 60)}`; };

  // Aulas semanais
  const today = new Date();
  const until = st.semesterEnd ? st.semesterEnd.replace(/-/g, "") + "T235959" : null;
  const holidays = S.events.filter(e => e.type === "feriado").map(e => e.date);
  for (const c of S.classes) {
    let first = new Date(today); while (weekday(first) !== c.day) first = addDays(first, 1);
    const fd = iso(first);
    const ex = holidays.filter(h => weekday(parseISO(h)) === c.day && h >= fd).map(h => dt(h, c.start));
    ev(c.id, [`SUMMARY:${txt(c.subject)}${c.type ? " (" + txt(c.type) + ")" : ""}`, `DTSTART:${dt(fd, c.start)}`, `DTEND:${dt(fd, c.end)}`,
      `RRULE:FREQ=WEEKLY${until ? ";UNTIL=" + until : ";COUNT=20"}`, ...(ex.length ? [`EXDATE:${ex.join(",")}`] : []),
      ...(c.room ? [`LOCATION:${txt(c.room)}`] : []), ...(st.classAlert > 0 ? alarm(`-PT${st.classAlert}M`, `${c.subject} daqui a ${st.classAlert} min`) : [])]);
  }
  // Avaliações e datas
  for (const e of S.events) {
    const ty = TYPES[e.type] || TYPES.outro;
    const lines = [`SUMMARY:${e.type === "feriado" ? "" : "📌 "}${txt(ty.label)}: ${txt(e.title)}`];
    if (e.time) lines.push(`DTSTART:${dt(e.date, e.time)}`, `DTEND:${dt(e.date, addMin(e.time, 120))}`);
    else lines.push(`DTSTART;VALUE=DATE:${dt(e.date)}`, `DTEND;VALUE=DATE:${dt(iso(addDays(parseISO(e.date), 1)))}`);
    if (e.notes || e.subject) lines.push(`DESCRIPTION:${txt([e.subject, e.notes].filter(Boolean).join("\n"))}`);
    if (e.type !== "feriado") {
      if (st.eventAlertDays > 0) lines.push(...alarm(e.time ? `-P${st.eventAlertDays}D` : `-P${st.eventAlertDays - 1}DT6H`, `${ty.label} de ${e.title} ${st.eventAlertDays === 1 ? "amanhã" : `em ${st.eventAlertDays} dias`}`));
      lines.push(...alarm(e.time ? "-PT1H" : "PT8H", `${ty.label} hoje: ${e.title}`));
    }
    ev(e.id, lines);
  }
  // Sessões de estudo
  for (const s of S.study.filter(s => !s.done && s.date >= todayISO())) {
    ev(s.id.replace(/\|/g, "-"), [`SUMMARY:📚 ${txt(s.title)}`, `DTSTART:${dt(s.date, st.studyTime)}`, `DTEND:${dt(s.date, addMin(st.studyTime, st.studyMinutes || 60))}`,
      `DESCRIPTION:${txt(s.note)}`, ...alarm("PT0M", s.title)]);
  }
  L.push("END:VCALENDAR");
  // linhas ≤ 75 octetos (aprox.)
  const out = L.map(l => l.length <= 72 ? l : l.match(/.{1,72}/gu).join("\r\n ")).join("\r\n");
  shareFile(new Blob([out], { type: "text/calendar" }), "escola.ics");
}

async function shareFile(blob, name) {
  const file = new File([blob], name, { type: blob.type });
  if (navigator.canShare?.({ files: [file] })) {
    try { await navigator.share({ files: [file], title: name }); return; } catch (e) { if (e.name === "AbortError") return; }
  }
  const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = name; a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 4000);
}

// ---------- Arranque ----------
rebuildStudy(); save(); render();
if ("serviceWorker" in navigator && location.protocol === "https:") navigator.serviceWorker.register("sw.js", { updateViaCache: "none" }).then(r => r.update());
// atualizar "Hoje" quando se volta à app
document.addEventListener("visibilitychange", () => { if (!document.hidden && !$("#sheet").classList.contains("open")) { rebuildStudy(); render(); } });
