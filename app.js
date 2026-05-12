const bank = window.FADE_QUESTION_BANK || { themes: [], questions: [] };
const questions = bank.questions || [];
const themes = bank.themes || [];
const app = document.querySelector("#app");
const title = document.querySelector("#screenTitle");
const backButton = document.querySelector("#backButton");
const themeToggle = document.querySelector("#themeToggle");
const navButtons = [...document.querySelectorAll("[data-nav]")];
const STORAGE_KEY = "fade-test-progress-v2";
const THEME_KEY = "fade-test-theme";

let stack = [];
let currentView = "home";
let activeTheme = null;
let session = null;
let toastTimer = null;

const byTheme = themes.reduce((acc, theme) => {
  acc[theme.name] = questions.filter((question) => question.tema === theme.name);
  return acc;
}, {});

function h(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function optionExplanation(question, label) {
  return question?.explicacion_opciones?.[label] || "";
}

function optionExplanationsHtml(question) {
  if (!question?.explicacion_opciones) return "";
  const items = ["A", "B", "C", "D"]
    .filter((label) => question.explicacion_opciones[label])
    .map((label) => `<li><strong>${h(label)}:</strong> ${h(question.explicacion_opciones[label])}</li>`)
    .join("");
  if (!items) return "";
  return `
    <div class="option-explanations">
      <strong>Explicación de opciones</strong>
      <ul>${items}</ul>
    </div>
  `;
}

function optionExplanationsText(question) {
  if (!question?.explicacion_opciones) return "";
  return ["A", "B", "C", "D"]
    .filter((label) => question.explicacion_opciones[label])
    .map((label) => `${label}: ${question.explicacion_opciones[label]}`)
    .join(" ");
}

function fallbackWrongExplanation(question, label) {
  const chosenText = question?.opciones?.[label] ? `Elegiste "${question.opciones[label]}". ` : "";
  return `${chosenText}La respuesta correcta era ${question.respuesta_correcta}; revisa la explicación general para ver el matiz.`;
}

function resultFailureExplanation(question, choice) {
  if (question.tipo !== "test") return question.explicacion || "";
  const chosenSpecific = choice && choice !== question.respuesta_correcta
    ? optionExplanation(question, choice) || fallbackWrongExplanation(question, choice)
    : "";
  return [
    `Correcta: ${question.respuesta_correcta}.`,
    question.explicacion,
    optionExplanationsText(question) ? `Opciones: ${optionExplanationsText(question)}` : "",
    chosenSpecific ? `Tu opción ${choice}: ${chosenSpecific}` : "",
  ].filter(Boolean).join(" ");
}

function icon(name) {
  const paths = {
    play: '<path d="M8 5v14l11-7z"/>',
    list: '<path d="M8 6h13M8 12h13M8 18h13"/><path d="M3 6h.01M3 12h.01M3 18h.01"/>',
    alert: '<path d="M12 3 2 21h20z"/><path d="M12 9v5M12 17h.01"/>',
    timer: '<path d="M10 2h4"/><path d="M12 14l3-3"/><circle cx="12" cy="14" r="8"/>',
    chart: '<path d="M4 19V5M4 19h16M8 16v-5M13 16V8M18 16v-9"/>',
    swap: '<path d="M7 7h11l-3-3M17 17H6l3 3"/>',
    book: '<path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M4 4.5A2.5 2.5 0 0 1 6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5z"/>',
    target: '<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/><circle cx="12" cy="12" r="1"/>',
    pen: '<path d="M12 20h9"/><path d="m16.5 3.5 4 4L7 21H3v-4z"/>',
    check: '<path d="m20 6-11 11-5-5"/>',
    x: '<path d="M18 6 6 18M6 6l12 12"/>',
    flag: '<path d="M5 21V4h11l-1 4 1 4H5"/>',
    download: '<path d="M12 3v12"/><path d="m7 10 5 5 5-5"/><path d="M5 21h14"/>',
    upload: '<path d="M12 21V9"/><path d="m7 14 5-5 5 5"/><path d="M5 3h14"/>',
    copy: '<path d="M8 8h12v12H8z"/><path d="M4 16V4h12"/>',
    moon: '<path d="M12 3a7 7 0 1 0 7 7 5.5 5.5 0 0 1-7-7z"/>',
  };
  return `<svg viewBox="0 0 24 24" aria-hidden="true">${paths[name] || paths.play}</svg>`;
}

function loadProgress() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY));
    if (saved && saved.version === 1) return saved;
  } catch {
    // Progress is recoverable; start fresh if localStorage was edited by hand.
  }
  return {
    version: 1,
    createdAt: Date.now(),
    updatedAt: Date.now(),
    stats: { seen: 0, correct: 0, wrong: 0, currentStreak: 0, bestStreak: 0 },
    questions: {},
    history: [],
  };
}

let progress = loadProgress();

function saveProgress() {
  progress.updatedAt = Date.now();
  localStorage.setItem(STORAGE_KEY, JSON.stringify(progress));
}

function recordFor(id) {
  if (!progress.questions[id]) {
    progress.questions[id] = {
      seen: 0,
      correct: 0,
      wrong: 0,
      streak: 0,
      status: "normal",
      marked: false,
      lastPracticed: null,
    };
  }
  return progress.questions[id];
}

function requiredStreak(record) {
  return record.wrong >= 3 ? 3 : 2;
}

function recordResult(question, correct, source) {
  const record = recordFor(question.id);
  record.seen += 1;
  record.lastPracticed = Date.now();
  progress.stats.seen += 1;

  if (correct) {
    record.correct += 1;
    record.streak += 1;
    progress.stats.correct += 1;
    progress.stats.currentStreak += 1;
    progress.stats.bestStreak = Math.max(progress.stats.bestStreak, progress.stats.currentStreak);
    if (record.streak >= requiredStreak(record)) record.status = "dominada";
  } else {
    record.wrong += 1;
    record.streak = 0;
    record.status = "fallada";
    progress.stats.wrong += 1;
    progress.stats.currentStreak = 0;
  }

  progress.history.push({
    id: question.id,
    tema: question.tema,
    correct,
    source,
    at: Date.now(),
  });
  progress.history = progress.history.slice(-300);
  saveProgress();
}

function markForReview(question) {
  const record = recordFor(question.id);
  record.status = "fallada";
  record.marked = true;
  record.streak = 0;
  saveProgress();
  showToast("Añadida a falladas");
}

function getRecord(question) {
  return progress.questions[question.id] || null;
}

function isFailed(question) {
  return getRecord(question)?.status === "fallada";
}

function isDominated(question) {
  return getRecord(question)?.status === "dominada";
}

function shuffle(items) {
  const copy = [...items];
  for (let index = copy.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(Math.random() * (index + 1));
    [copy[index], copy[swapIndex]] = [copy[swapIndex], copy[index]];
  }
  return copy;
}

function sample(items, count) {
  return shuffle(items).slice(0, Math.min(count, items.length));
}

function normalizeTitle(view) {
  const titles = {
    home: "Test de estudio",
    themes: "Elegir tema",
    failed: "Falladas",
    progress: "Progreso",
    exam: "Examen rápido",
    io: "Importar/exportar",
  };
  return titles[view] || view;
}

function setView(view, options = {}) {
  if (!options.replace) stack.push({ view: currentView, theme: activeTheme });
  currentView = view;
  if (options.theme !== undefined) activeTheme = options.theme;
  title.textContent = options.title || normalizeTitle(view);
  backButton.classList.toggle("hidden", stack.length === 0 || view === "home");
  navButtons.forEach((button) => button.classList.toggle("active", button.dataset.nav === view));
  window.scrollTo({ top: 0, behavior: "smooth" });
}

function goBack() {
  const previous = stack.pop();
  if (!previous) return renderHome(true);
  activeTheme = previous.theme;
  renderRoute(previous.view, true);
}

function renderRoute(view, replace = false) {
  if (view === "home") return renderHome(replace);
  if (view === "themes") return renderThemes(replace);
  if (view === "failed") return renderFailed(replace);
  if (view === "progress") return renderProgress(replace);
  if (view === "exam") return renderExam(replace);
  if (view === "io") return renderImportExport(replace);
  if (view === "theme-detail") return renderThemeDetail(activeTheme);
  if (view === "study-all") return renderStudyAll();
  return renderHome(true);
}

function questionCounts() {
  const total = questions.length;
  const failed = questions.filter(isFailed).length;
  const dominated = questions.filter(isDominated).length;
  const accuracy = progress.stats.seen ? Math.round((progress.stats.correct / progress.stats.seen) * 100) : 0;
  return { total, failed, dominated, accuracy };
}

function actionCard(action, iconName, label, text, extra = "") {
  return `
    <button class="action-card" type="button" data-action="${h(action)}" ${extra}>
      <span class="icon-tile">${icon(iconName)}</span>
      <span><strong>${h(label)}</strong><span>${h(text)}</span></span>
      <span class="chevron">›</span>
    </button>
  `;
}

function renderHome(replace = false) {
  setView("home", { replace, title: "Test de estudio" });
  stack = [];
  backButton.classList.add("hidden");
  const counts = questionCounts();
  app.innerHTML = `
    <section class="hero-panel">
      <div class="hero-copy">
        <h2>Tests rápidos para FADE</h2>
        <p>${counts.total} preguntas para sesiones rápidas por tema, globales y falladas.</p>
        <div class="toolbar">
          <span class="pill good">${icon("check")} ${counts.accuracy}% acierto</span>
          <span class="pill bad">${icon("alert")} ${counts.failed} falladas</span>
          <span class="pill">${icon("target")} ${counts.dominated} dominadas</span>
        </div>
      </div>
      <div class="stat-strip">
        <div class="stat"><strong>${progress.stats.seen}</strong><span>hechas</span></div>
        <div class="stat"><strong>${progress.stats.bestStreak}</strong><span>mejor racha</span></div>
        <div class="stat"><strong>${themes.length}</strong><span>temas</span></div>
      </div>
    </section>
    <section class="action-grid">
      ${actionCard("study-all", "play", "Estudiar todo", "Preguntas mezcladas de todos los temas")}
      ${actionCard("themes", "list", "Elegir tema", "Niveles, mini examen y falladas por tema")}
      ${actionCard("failed", "alert", "Falladas", "Repaso global o filtrado por tema")}
      ${actionCard("exam", "timer", "Examen rápido", "Simulacros de 20, 30 o mini examen")}
      ${actionCard("progress", "chart", "Progreso", "Aciertos, dominadas y puntos débiles")}
      ${actionCard("io", "swap", "Importar/exportar progreso", "Mover avances entre ordenador y móvil")}
    </section>
  `;
}

function renderStudyAll() {
  setView("study-all", { title: "Estudiar todo" });
  app.innerHTML = `
    <section class="panel">
      <h2>Modo global</h2>
      <p>Mezcla preguntas de todos los temas válidos: 1, 3, 5, 6, 7, 8, 9 y 10.</p>
    </section>
    <section class="action-grid">
      ${actionCard("session-global-basic", "book", "Básicas", "Reconocer conceptos y definiciones")}
      ${actionCard("session-global-mixed", "target", "Mixtas", "Básicas, medias y difíciles")}
      ${actionCard("session-global-hard", "alert", "Difíciles", "Matices y confusiones típicas")}
      ${actionCard("session-global-written", "pen", "Escritas", "Responder y comparar con modelo")}
      ${actionCard("failed-global", "flag", "Falladas globales", "Repasar hasta dominar")}
    </section>
  `;
}

function themeStats(themeName) {
  const list = byTheme[themeName] || [];
  const seen = list.filter((question) => getRecord(question)?.seen).length;
  const failed = list.filter(isFailed).length;
  const dominated = list.filter(isDominated).length;
  const donePct = list.length ? Math.round((dominated / list.length) * 100) : 0;
  return { total: list.length, seen, failed, dominated, donePct };
}

function renderThemes(replace = false) {
  setView("themes", { replace, title: "Elegir tema" });
  app.innerHTML = `
    <section class="theme-list">
      ${themes
        .map((theme) => {
          const stats = themeStats(theme.name);
          return `
            <button class="theme-card" type="button" data-action="open-theme" data-theme="${h(theme.name)}">
              <h3>${h(theme.name)} · ${h(theme.title)}</h3>
              <p>${stats.total} preguntas · ${stats.failed} falladas · ${stats.dominated} dominadas</p>
              <div class="progress-track"><div class="progress-fill" style="width:${stats.donePct}%"></div></div>
            </button>
          `;
        })
        .join("")}
    </section>
  `;
}

function renderThemeDetail(themeName) {
  activeTheme = themeName;
  const theme = themes.find((item) => item.name === themeName);
  const stats = themeStats(themeName);
  setView("theme-detail", { title: themeName });
  app.innerHTML = `
    <section class="panel">
      <h2>${h(themeName)} · ${h(theme?.title || "")}</h2>
      <div class="toolbar">
        <span class="pill">${icon("book")} ${stats.total} preguntas</span>
        <span class="pill bad">${icon("alert")} ${stats.failed} falladas</span>
        <span class="pill good">${icon("check")} ${stats.dominated} dominadas</span>
      </div>
    </section>
    <section class="action-grid">
      ${actionCard("theme-basic", "book", "Tipo test básico", "Nivel 1 · reconocer conceptos", `data-theme="${h(themeName)}"`)}
      ${actionCard("theme-medium", "target", "Tipo test medio", "Nivel 2 · distinguir conceptos", `data-theme="${h(themeName)}"`)}
      ${actionCard("theme-hard", "alert", "Tipo test difícil", "Nivel 3 · matices finos", `data-theme="${h(themeName)}"`)}
      ${actionCard("theme-written", "pen", "Definiciones y escritas", "Nivel 4 · respuesta modelo", `data-theme="${h(themeName)}"`)}
      ${actionCard("theme-failed", "flag", "Falladas de este tema", "Dos aciertos seguidos para salir", `data-theme="${h(themeName)}"`)}
      ${actionCard("theme-exam", "timer", "Mini examen del tema", "10 preguntas tipo test", `data-theme="${h(themeName)}"`)}
    </section>
  `;
}

function renderFailed(replace = false) {
  setView("failed", { replace, title: "Falladas" });
  const failed = questions.filter(isFailed);
  app.innerHTML = `
    <section class="panel">
      <h2>Repaso de falladas</h2>
      <p>Una fallada sale del repaso con 2 aciertos seguidos; si se atasca mucho, pide 3.</p>
    </section>
    <section class="action-grid">
      ${actionCard("failed-global", "alert", "Falladas globales", `${failed.length} preguntas activas`)}
    </section>
    <section class="theme-list">
      ${themes
        .map((theme) => {
          const count = (byTheme[theme.name] || []).filter(isFailed).length;
          return `
            <button class="theme-card" type="button" data-action="failed-theme" data-theme="${h(theme.name)}">
              <h3>${h(theme.name)} · ${h(theme.title)}</h3>
              <p>${count} falladas activas</p>
              <div class="progress-track"><div class="progress-fill" style="width:${Math.min(100, count * 8)}%"></div></div>
            </button>
          `;
        })
        .join("")}
    </section>
  `;
}

function renderExam(replace = false) {
  setView("exam", { replace, title: "Examen rápido" });
  app.innerHTML = `
    <section class="panel">
      <h2>Simulacro</h2>
      <p>Sin pistas durante el examen. Al terminar verás nota, fallos y explicaciones.</p>
    </section>
    <section class="action-grid">
      ${actionCard("exam-global-20", "timer", "Global de 20", "Preguntas tipo test mezcladas")}
      ${actionCard("exam-global-30", "timer", "Global de 30", "Preguntas tipo test mezcladas")}
    </section>
    <section class="panel">
      <h2>Mini examen por tema</h2>
    </section>
    <section class="theme-list">
      ${themes
        .map(
          (theme) => `
            <div class="theme-card">
              <h3>${h(theme.name)} · ${h(theme.title)}</h3>
              <div class="button-row">
                <button class="secondary-button" type="button" data-action="exam-theme-10" data-theme="${h(theme.name)}">10 preguntas</button>
                <button class="secondary-button" type="button" data-action="exam-theme-20" data-theme="${h(theme.name)}">20 preguntas</button>
              </div>
            </div>
          `
        )
        .join("")}
    </section>
  `;
}

function renderProgress(replace = false) {
  setView("progress", { replace, title: "Progreso" });
  const counts = questionCounts();
  const themeRows = themes.map((theme) => ({ ...theme, ...themeStats(theme.name) }));
  const practicedRows = themeRows.filter((row) => row.seen > 0);
  const best = [...practicedRows].sort((a, b) => b.donePct - a.donePct)[0];
  const worst = [...practicedRows].sort((a, b) => a.donePct - b.donePct)[0];
  app.innerHTML = `
    <section class="metric-grid">
      <div class="metric"><strong>${progress.stats.seen}</strong><span>hechas</span></div>
      <div class="metric"><strong>${counts.accuracy}%</strong><span>acierto</span></div>
      <div class="metric"><strong>${counts.failed}</strong><span>falladas</span></div>
      <div class="metric"><strong>${counts.dominated}</strong><span>dominadas</span></div>
    </section>
    <section class="panel">
      <h2>Resumen</h2>
      <div class="result-line"><span>Mejor tema</span><strong>${best ? h(best.name) : "Sin datos"}</strong></div>
      <div class="result-line"><span>Peor tema</span><strong>${worst ? h(worst.name) : "Sin datos"}</strong></div>
      <div class="result-line"><span>Racha actual</span><strong>${progress.stats.currentStreak}</strong></div>
      <div class="result-line"><span>Preguntas pendientes</span><strong>${questions.length - counts.dominated}</strong></div>
    </section>
    <section class="theme-list">
      ${themeRows
        .map(
          (row) => `
            <div class="theme-card">
              <h3>${h(row.name)} · ${h(row.title)}</h3>
              <p>${row.seen} vistas · ${row.failed} falladas · ${row.dominated}/${row.total} dominadas</p>
              <div class="progress-track"><div class="progress-fill" style="width:${row.donePct}%"></div></div>
            </div>
          `
        )
        .join("")}
    </section>
  `;
}

function renderImportExport(replace = false) {
  setView("io", { replace, title: "Importar/exportar" });
  const exportText = JSON.stringify(progress, null, 2);
  app.innerHTML = `
    <section class="panel io-box">
      <h2>Exportar progreso</h2>
      <div class="button-row">
        <button class="primary-button" type="button" data-action="export-file">${icon("download")} Descargar progreso_fade.json</button>
        <button class="secondary-button" type="button" data-action="copy-progress">${icon("copy")} Copiar texto</button>
      </div>
      <textarea id="exportText" readonly>${h(exportText)}</textarea>
    </section>
    <section class="panel io-box">
      <h2>Importar progreso</h2>
      <input class="file-input" id="importFile" type="file" accept="application/json,.json">
      <textarea id="importText" placeholder="Pega aquí el progreso exportado"></textarea>
      <button class="primary-button" type="button" data-action="import-text">${icon("upload")} Importar texto pegado</button>
    </section>
    <section class="panel">
      <h2>Reiniciar</h2>
      <button class="danger-button" type="button" data-action="reset-progress">${icon("x")} Borrar progreso de este dispositivo</button>
    </section>
  `;
  document.querySelector("#importFile")?.addEventListener("change", importFile);
}

function filterQuestions({ theme, type, difficulty, failedOnly = false }) {
  return questions.filter((question) => {
    if (theme && question.tema !== theme) return false;
    if (type && question.tipo !== type) return false;
    if (difficulty && question.dificultad !== difficulty) return false;
    if (failedOnly && !isFailed(question)) return false;
    return true;
  });
}

function startSession(config) {
  const list = sample(config.questions, config.count || config.questions.length);
  if (!list.length) {
    renderEmpty(config.emptyTitle || "No hay preguntas", config.emptyText || "Prueba otro modo o vuelve cuando tengas progreso.");
    return;
  }
  session = {
    title: config.title,
    questions: list,
    index: 0,
    correct: 0,
    wrong: 0,
    answers: [],
    exam: Boolean(config.exam),
    repeatConfig: config,
  };
  setView("session", { title: config.title });
  renderQuestion();
}

function renderEmpty(emptyTitle, text) {
  setView("empty", { title: "Sin preguntas" });
  app.innerHTML = `
    <section class="empty-state">
      <div class="empty-icon"></div>
      <h2>${h(emptyTitle)}</h2>
      <p>${h(text)}</p>
      <button class="primary-button" type="button" data-action="home">Volver al inicio</button>
    </section>
  `;
}

function renderQuestion(answered = null) {
  const question = session.questions[session.index];
  const pct = Math.round((session.index / session.questions.length) * 100);
  const record = getRecord(question);
  const meta = `
    <div class="question-meta">
      <div class="toolbar">
        <span class="pill">${h(question.tema)}</span>
        <span class="pill">${h(question.dificultad)}</span>
        ${record?.status === "fallada" ? `<span class="pill bad">${icon("flag")} fallada</span>` : ""}
      </div>
      <span class="pill">${session.index + 1}/${session.questions.length}</span>
    </div>
    <div class="progress-track"><div class="progress-fill" style="width:${pct}%"></div></div>
  `;

  if (question.tipo === "definicion") {
    renderWrittenQuestion(question, meta, answered);
    return;
  }

  const optionsHtml = Object.entries(question.opciones)
    .map(([key, value]) => {
      let className = "answer-option";
      if (answered) {
        if (key === question.respuesta_correcta) className += " correct";
        if (key === answered.choice && !answered.correct) className += " wrong";
      }
      return `
        <button class="${className}" type="button" data-action="answer-test" data-choice="${h(key)}" ${answered ? "disabled" : ""}>
          <span class="label">${h(key)}</span>
          <span>${h(value)}</span>
        </button>
      `;
    })
    .join("");

  const feedback = answered
    ? (() => {
      const correctSpecific = optionExplanation(question, question.respuesta_correcta);
      const chosenSpecific = !answered.correct
        ? optionExplanation(question, answered.choice) || fallbackWrongExplanation(question, answered.choice)
        : "";
      return `
      <section class="feedback ${answered.correct ? "good" : "bad"}">
        <h3>${answered.correct ? "Correcto" : "Incorrecto"}</h3>
        <p><strong>Respuesta correcta: ${h(question.respuesta_correcta)}.</strong>${correctSpecific ? ` ${h(correctSpecific)}` : ""}</p>
        ${question.explicacion ? `<p>${h(question.explicacion)}</p>` : ""}
        ${
          !answered.correct
            ? `<p><strong>Tu opción ${h(answered.choice)}:</strong> ${h(chosenSpecific)}</p>`
            : ""
        }
        ${optionExplanationsHtml(question)}
      </section>
      <div class="button-row">
        <button class="secondary-button" type="button" data-action="mark-review">${icon("flag")} Marcar para repasar</button>
        <button class="primary-button" type="button" data-action="next-question">${icon("play")} Continuar</button>
      </div>
    `;
    })()
    : "";

  app.innerHTML = `
    <section class="question-shell">
      ${meta}
      <article class="question-card">
        <p class="question-text">${h(question.pregunta)}</p>
        <div class="answers">${optionsHtml}</div>
        ${feedback}
      </article>
    </section>
  `;
}

function renderWrittenQuestion(question, meta, revealed) {
  const model = revealed
    ? `
      <section class="feedback">
        <h3>Respuesta modelo</h3>
        <p>${h(question.respuesta_modelo)}</p>
        <ul class="key-list">
          ${(question.puntos_clave || []).map((point) => `<li>${h(point)}</li>`).join("")}
        </ul>
        <p>${h(question.explicacion)}</p>
      </section>
      <div class="button-row">
        <button class="primary-button" type="button" data-action="written-known">${icon("check")} La sabía</button>
        <button class="secondary-button" type="button" data-action="written-half">${icon("target")} Más o menos</button>
        <button class="danger-button" type="button" data-action="written-wrong">${icon("x")} No la sabía</button>
      </div>
    `
    : `<button class="primary-button" type="button" data-action="show-model">${icon("book")} Ver respuesta modelo</button>`;

  app.innerHTML = `
    <section class="question-shell">
      ${meta}
      <article class="question-card">
        <p class="question-text">${h(question.pregunta)}</p>
        <textarea class="written-answer" id="writtenAnswer" placeholder="Escribe tu respuesta antes de mirar el modelo"></textarea>
        ${model}
      </article>
    </section>
  `;
}

function answerTest(choice) {
  const question = session.questions[session.index];
  const correct = choice === question.respuesta_correcta;
  session.answers.push({ question, choice, correct });
  if (correct) session.correct += 1;
  else session.wrong += 1;
  recordResult(question, correct, session.exam ? "exam" : "practice");

  if (session.exam) {
    nextQuestion();
    return;
  }
  renderQuestion({ choice, correct });
}

function gradeWritten(kind) {
  const question = session.questions[session.index];
  const correct = kind === "known";
  session.answers.push({ question, choice: kind, correct });
  if (correct) session.correct += 1;
  else session.wrong += 1;
  recordResult(question, correct, "written");
  nextQuestion();
}

function nextQuestion() {
  session.index += 1;
  if (session.index >= session.questions.length) {
    renderResults();
    return;
  }
  renderQuestion();
}

function renderResults(replace = false) {
  const pct = session.questions.length ? Math.round((session.correct / session.questions.length) * 100) : 0;
  const failed = session.answers.filter((answer) => !answer.correct);
  setView("results", { title: "Resultado", replace });
  app.innerHTML = `
    <section class="hero-panel">
      <div class="hero-copy">
        <h2>Nota: ${pct}%</h2>
        <p>${session.correct} aciertos y ${session.wrong} fallos sobre ${session.questions.length} preguntas.</p>
      </div>
      <div class="stat-strip">
        <div class="stat"><strong>${session.correct}</strong><span>aciertos</span></div>
        <div class="stat"><strong>${session.wrong}</strong><span>fallos</span></div>
        <div class="stat"><strong>${pct}%</strong><span>nota</span></div>
      </div>
    </section>
    ${
      failed.length
        ? `
          <section class="panel">
            <h2>Fallos</h2>
            ${failed
              .map(
                ({ question, choice }) => `
                  <div class="result-line">
                    <span>${h(question.tema)} · ${h(question.pregunta)}</span>
                  </div>
                  <p class="muted">${h(resultFailureExplanation(question, choice))}</p>
                `
              )
              .join("")}
          </section>
        `
        : `<section class="empty-state"><div class="empty-icon"></div><h2>Sin fallos</h2><p>Sesión limpia.</p></section>`
    }
    <div class="button-row">
      ${failed.length ? `<button class="secondary-button" type="button" data-action="mark-session-failures">${icon("flag")} Añadir fallos al repaso</button>` : ""}
      <button class="secondary-button" type="button" data-action="repeat-session">${icon("timer")} Repetir</button>
      <button class="primary-button" type="button" data-action="home">${icon("play")} Inicio</button>
    </div>
  `;
}

function exportFile() {
  const blob = new Blob([JSON.stringify(progress, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = "progreso_fade.json";
  link.click();
  URL.revokeObjectURL(url);
}

async function copyProgress() {
  const text = JSON.stringify(progress, null, 2);
  try {
    await navigator.clipboard.writeText(text);
    showToast("Progreso copiado");
  } catch {
    document.querySelector("#exportText")?.select();
    showToast("Selecciona el texto y cópialo");
  }
}

function validateProgress(value) {
  if (!value || value.version !== 1 || !value.stats || !value.questions) {
    throw new Error("Formato de progreso no válido");
  }
  return value;
}

function importProgressText(text) {
  try {
    progress = validateProgress(JSON.parse(text));
    saveProgress();
    showToast("Progreso importado");
    renderProgress(true);
  } catch (error) {
    showToast(error.message || "No se pudo importar");
  }
}

function importFile(event) {
  const file = event.target.files?.[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = () => importProgressText(String(reader.result || ""));
  reader.readAsText(file);
}

function resetProgress() {
  if (!confirm("¿Borrar el progreso de este dispositivo?")) return;
  localStorage.removeItem(STORAGE_KEY);
  progress = loadProgress();
  showToast("Progreso borrado");
  renderHome(true);
}

function showToast(message) {
  clearTimeout(toastTimer);
  document.querySelector(".toast")?.remove();
  const toast = document.createElement("div");
  toast.className = "toast";
  toast.textContent = message;
  document.body.appendChild(toast);
  toastTimer = setTimeout(() => toast.remove(), 2200);
}

function startGlobal(kind) {
  const configs = {
    basic: {
      title: "Global básicas",
      count: 20,
      questions: filterQuestions({ type: "test", difficulty: "basica" }),
    },
    mixed: {
      title: "Global mixtas",
      count: 25,
      questions: filterQuestions({ type: "test" }),
    },
    hard: {
      title: "Global difíciles",
      count: 20,
      questions: filterQuestions({ type: "test", difficulty: "dificil" }),
    },
    written: {
      title: "Global escritas",
      count: 10,
      questions: filterQuestions({ type: "definicion" }),
    },
  };
  startSession(configs[kind]);
}

function startTheme(theme, mode) {
  const map = {
    basic: { type: "test", difficulty: "basica", count: 15, title: `${theme} · básicas` },
    medium: { type: "test", difficulty: "media", count: 15, title: `${theme} · medias` },
    hard: { type: "test", difficulty: "dificil", count: 15, title: `${theme} · difíciles` },
    written: { type: "definicion", count: 10, title: `${theme} · escritas` },
  };
  const config = map[mode];
  startSession({
    ...config,
    questions: filterQuestions({ theme, type: config.type, difficulty: config.difficulty }),
  });
}

function startFailed(theme = null) {
  const list = filterQuestions({ theme, failedOnly: true });
  startSession({
    title: theme ? `${theme} · falladas` : "Falladas globales",
    questions: list,
    count: list.length,
    emptyTitle: "No hay falladas activas",
    emptyText: "Cuando falles preguntas aparecerán aquí para repasarlas.",
  });
}

function startExam(theme, count) {
  startSession({
    title: theme ? `${theme} · examen` : "Examen global",
    questions: filterQuestions({ theme, type: "test" }),
    count,
    exam: true,
  });
}

app.addEventListener("click", (event) => {
  const button = event.target.closest("button");
  if (!button) return;
  const action = button.dataset.action;
  if (!action) return;

  if (action === "home") return renderHome(true);
  if (action === "themes") return renderThemes();
  if (action === "failed") return renderFailed();
  if (action === "progress") return renderProgress();
  if (action === "exam") return renderExam();
  if (action === "io") return renderImportExport();
  if (action === "study-all") return renderStudyAll();
  if (action === "open-theme") return renderThemeDetail(button.dataset.theme);

  if (action === "session-global-basic") return startGlobal("basic");
  if (action === "session-global-mixed") return startGlobal("mixed");
  if (action === "session-global-hard") return startGlobal("hard");
  if (action === "session-global-written") return startGlobal("written");
  if (action === "failed-global") return startFailed();
  if (action === "failed-theme") return startFailed(button.dataset.theme);

  if (action === "theme-basic") return startTheme(button.dataset.theme, "basic");
  if (action === "theme-medium") return startTheme(button.dataset.theme, "medium");
  if (action === "theme-hard") return startTheme(button.dataset.theme, "hard");
  if (action === "theme-written") return startTheme(button.dataset.theme, "written");
  if (action === "theme-failed") return startFailed(button.dataset.theme);
  if (action === "theme-exam") return startExam(button.dataset.theme, 10);

  if (action === "exam-global-20") return startExam(null, 20);
  if (action === "exam-global-30") return startExam(null, 30);
  if (action === "exam-theme-10") return startExam(button.dataset.theme, 10);
  if (action === "exam-theme-20") return startExam(button.dataset.theme, 20);

  if (action === "answer-test") return answerTest(button.dataset.choice);
  if (action === "mark-review") return markForReview(session.questions[session.index]);
  if (action === "next-question") return nextQuestion();
  if (action === "show-model") return renderQuestion({ revealed: true });
  if (action === "written-known") return gradeWritten("known");
  if (action === "written-half") return gradeWritten("half");
  if (action === "written-wrong") return gradeWritten("wrong");
  if (action === "repeat-session") return startSession(session.repeatConfig);
  if (action === "mark-session-failures") {
    session.answers.filter((answer) => !answer.correct).forEach((answer) => markForReview(answer.question));
    return renderResults(true);
  }

  if (action === "export-file") return exportFile();
  if (action === "copy-progress") return copyProgress();
  if (action === "import-text") return importProgressText(document.querySelector("#importText")?.value || "");
  if (action === "reset-progress") return resetProgress();
});

backButton.addEventListener("click", goBack);

navButtons.forEach((button) => {
  button.addEventListener("click", () => {
    const view = button.dataset.nav;
    stack = [];
    renderRoute(view, true);
  });
});

themeToggle.addEventListener("click", () => {
  const next = document.documentElement.dataset.theme === "dark" ? "light" : "dark";
  document.documentElement.dataset.theme = next;
  localStorage.setItem(THEME_KEY, next);
});

function initTheme() {
  const saved = localStorage.getItem(THEME_KEY);
  if (saved === "dark") document.documentElement.dataset.theme = "dark";
}

if ("serviceWorker" in navigator && location.protocol !== "file:") {
  navigator.serviceWorker.register("./sw.js").catch(() => {});
}

initTheme();
renderHome(true);
