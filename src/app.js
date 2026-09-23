import { DISTRICTS, INDICATORS, MEASURES, SIMULATION, SYNERGIES } from "./data.js";
import { validateScenario } from "./model.js";

const state = Array.from({ length: SIMULATION.decisionsRequired }, () => ({ measureId: "", districtId: "" }));
const slots = document.querySelector("#slots");
const API_URL = "http://127.0.0.1:8000/api/simulate";
const AI_API_URL = "http://127.0.0.1:8000/api/analyze";
let apiResult = null;
let aiState = { status: "idle", text: "" };
let requestedScenario = "";
let requestNumber = 0;
const esc = (value) => String(value).replace(/[&<>"']/g, (c) => ({
  "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
}[c]));
const fmt = (value) => Number(value).toFixed(2);

function renderSlots() {
  slots.innerHTML = state.map((choice, index) => {
    const selected = MEASURES.find((measure) => measure.id === choice.measureId);
    const options = ['<option value="">Выберите инициативу…</option>'].concat(MEASURES.map((measure) => {
      const others = state.filter((item, i) => i !== index && item.measureId);
      const taken = others.some((item) => item.measureId === measure.id);
      const usedCost = others.reduce((sum, item) => sum + MEASURES.find((candidate) => candidate.id === item.measureId).cost, 0);
      const directionFull = others.filter((item) => MEASURES.find((candidate) => candidate.id === item.measureId).direction === measure.direction).length >= 2;
      const disabled = taken || usedCost + measure.cost > SIMULATION.budget || directionFull;
      return '<option value="' + measure.id + '"' +
        (choice.measureId === measure.id ? " selected" : "") + (disabled ? " disabled" : "") + '>' +
        esc(measure.id + " · " + measure.name + " — " + measure.cost + " ед.") + '</option>';
    })).join("");
    const districts = ['<option value="">Выберите район…</option>'].concat(DISTRICTS.map((district) =>
      '<option value="' + district.id + '"' + (choice.districtId === district.id ? " selected" : "") + '>' +
      esc(district.name) + '</option>')).join("");
    const note = selected
      ? esc(selected.direction) + " · " + (selected.scope === "city" ? "все районы" : "район") + " · лаг " + selected.lag + " кв."
      : "Выберите меру из каталога";
    const target = selected && selected.scope === "district"
      ? '<select class="district-select" data-district="' + index + '" aria-label="Район">' + districts + '</select>'
      : '<select class="district-select" disabled aria-label="Район не требуется"><option>Весь город</option></select>';
    return '<div class="slot"><span class="slot-num">0' + (index + 1) + '</span>' +
      '<div><select data-measure="' + index + '" aria-label="Мероприятие ' + (index + 1) + '">' +
      options + '</select><div class="slot-note">' + note + '</div></div>' + target + '</div>';
  }).join("");

  slots.querySelectorAll("[data-measure]").forEach((select) => select.addEventListener("change", (event) => {
    const index = Number(event.target.dataset.measure);
    state[index] = { measureId: event.target.value, districtId: "" };
    render();
  }));
  slots.querySelectorAll("[data-district]").forEach((select) => select.addEventListener("change", (event) => {
    state[Number(event.target.dataset.district)].districtId = event.target.value;
    render();
  }));
}

function renderBudget() {
  const chosen = state.map((item) => MEASURES.find((measure) => measure.id === item.measureId)).filter(Boolean);
  const spent = chosen.reduce((sum, measure) => sum + measure.cost, 0);
  const remaining = SIMULATION.budget - spent;
  const over = remaining < 0;
  document.querySelector("#count").textContent = chosen.length;
  document.querySelector("#spent").textContent = spent;
  document.querySelector("#left").textContent = remaining;
  document.querySelector("#fill").style.width = Math.min(100, spent / SIMULATION.budget * 100) + "%";
  document.querySelector("#fill").classList.toggle("over", over);
  document.querySelector("#budget-message").textContent = over ? "Бюджет превышен" : "В пределах нормы";
  document.querySelector("#budget-message").classList.toggle("over", over);
}

function renderValidation() {
  const box = document.querySelector("#validation");
  const chosen = state.filter((item) => item.measureId);
  if (!chosen.length) {
    box.textContent = "";
    box.className = "";
    return;
  }
  const errors = validateScenario(chosen).errors.filter((message) => !message.startsWith("Нужно выбрать ровно"));
  if (errors.length) {
    box.className = "";
    box.innerHTML = "<ul>" + errors.map((message) => "<li>" + esc(message) + "</li>").join("") + "</ul>";
  } else if (chosen.length < SIMULATION.decisionsRequired) {
    box.className = "";
    box.textContent = "Осталось выбрать ещё " + (SIMULATION.decisionsRequired - chosen.length) + " решений.";
  } else {
    box.className = "ok";
    box.textContent = "Все правила соблюдены. Сценарий рассчитан.";
  }
}

function makeBaseline(district) {
  const score = INDICATORS.reduce((sum, indicator) =>
    sum + district.indicators[indicator.id] * indicator.weight, 0);
  return {
    districtName: district.name, population: district.population, baselineScore: score, score,
    indicators: { ...district.indicators },
    changes: Object.fromEntries(INDICATORS.map((indicator) => [indicator.id, 0])),
    criticalIndicators: INDICATORS.filter((indicator) => district.indicators[indicator.id] < 40)
      .map((indicator) => indicator.id),
  };
}
function renderDistricts(result) {
  const target = document.querySelector("#districts");
  const districts = result ? result.districts : DISTRICTS.map(makeBaseline);
  target.innerHTML = districts.map((district) => {
    const change = district.score - district.baselineScore;
    const weakest = result && district.score === result.weakestDistrictScore;
    const metricRows = INDICATORS.map((indicator) => {
      const value = district.indicators[indicator.id];
      const delta = district.changes[indicator.id];
      const changeText = delta === 0 ? "" : '<i class="' + (delta < 0 ? "down" : "") + '">' +
        (delta > 0 ? "+" : "") + fmt(delta) + '</i>';
      return '<div class="metric"><span class="metric-name" title="' + esc(indicator.name) + '">' +
        esc(indicator.id + " · " + indicator.name) + '</span><span class="metric-value">' +
        fmt(value) + changeText + '</span><div class="bar"><i class="' + (delta ? "changed" : "") +
        '" style="width:' + value + '%"></i></div></div>';
    }).join("");
    const critical = district.criticalIndicators.length
      ? '<span class="critical">КРИТИЧЕСКИХ: ' + district.criticalIndicators.length + '</span>' : "";
    const deltaTag = result ? '<span class="delta ' + (change < 0 ? "down" : "") + '">' +
      (change > 0 ? "+" : "") + fmt(change) + '</span>' : "";
    return '<article class="district-card ' + (weakest ? "weakest" : "") + '">' +
      '<div class="district-top"><div><h3>' + esc(district.districtName) +
      '</h3><div class="district-pop">НАСЕЛЕНИЕ · ' + Math.round(district.population * 100) +
      '%</div></div><div class="district-score">' + fmt(district.score) +
      '<small>БАЛЛ РАЙОНА</small></div></div><div class="district-baseline">' +
      (result ? "Было " : "Исходная оценка") + fmt(district.baselineScore) + deltaTag +
      '</div><div class="metrics">' + metricRows + '</div>' + critical + '</article>';
  }).join("");
}

function renderScore(result) {
  const score = document.querySelector("#score");
  const change = document.querySelector("#change");
  if (!result.valid) {
    score.innerHTML = '—<small>/ 100</small>';
    change.textContent = "Выберите пять допустимых решений";
    change.className = "";
    document.querySelector("#spent-result").textContent = "—";
    document.querySelector("#crit").textContent = "—";
    document.querySelector("#base").textContent = "52.56";
    return;
  }
  score.innerHTML = fmt(result.score) + '<small>/ 100</small>';
  change.textContent = (result.scoreChange >= 0 ? "+" : "") + fmt(result.scoreChange) + " к исходному сценарию";
  change.className = result.scoreChange >= 0 ? "positive" : "negative";
  document.querySelector("#spent-result").textContent = result.budget.spent + " / " + result.budget.total;
  document.querySelector("#crit").textContent = result.criticalCount;
  document.querySelector("#base").textContent = fmt(result.baselineScore);
}

function renderAnalysis(result) {
  const target = document.querySelector("#analysis");
  if (!result.valid) {
    target.innerHTML = '<p class="muted">Сильные стороны, риски и последствия появятся после выбора допустимого набора.</p>';
    return;
  }
  const best = [...result.districts].sort((a, b) =>
    (b.score - b.baselineScore) - (a.score - a.baselineScore))[0];
  const weak = [...result.districts].sort((a, b) => a.score - b.score)[0];
  const directionChange = {};
  for (const indicator of INDICATORS) {
    const weighted = result.districts.reduce((sum, district) =>
      sum + district.population * district.changes[indicator.id] * indicator.weight, 0);
    directionChange[indicator.direction] = (directionChange[indicator.direction] || 0) + weighted;
  }
  const lead = Object.entries(directionChange).sort((a, b) => b[1] - a[1])[0];
  const totalWeight = INDICATORS.filter((item) => item.direction === lead[0])
    .reduce((sum, item) => sum + item.weight, 0);
  const risks = result.criticalCount
    ? '<p class="risk">Остаётся ' + result.criticalCount + ' критических показателей ниже 40. Слабейший район — <b>' +
      esc(weak.districtName) + ' (' + fmt(weak.score) + ' балла)</b>.</p>'
    : '<p>Критических показателей ниже 40 не осталось.</p>';
  const synergy = result.synergiesApplied.length
    ? '<p>Сработала синергия <b>' + result.synergiesApplied.map((item) => item.measures.join(" + ")).join(", ") + '</b>.</p>'
    : "";
  target.innerHTML = '<p>AQOL Score меняется на <b>' + (result.scoreChange >= 0 ? "+" : "") +
    fmt(result.scoreChange) + '</b>. Наибольший прирост — в районе <b>' + esc(best.districtName) +
    ' (+' + fmt(best.score - best.baselineScore) + ')</b>. Сильнее всего улучшается направление <b>' +
    esc(lead[0]) + ' (около +' + fmt(lead[1] / totalWeight) + ' пункта)</b>.</p>' + risks + synergy +
    '<p>Остаток бюджета: <b>' + result.budget.remaining + ' из ' + result.budget.total +
    ' ед.</b> Он не даёт бонуса к баллу.</p>';
}

function adaptApiResult(payload) {
  const districts = DISTRICTS.map((source) => {
    const indicators = payload.districts[source.name];
    const baseline = makeBaseline(source);
    const changes = Object.fromEntries(INDICATORS.map(({ id }) =>
      [id, indicators[id] - source.indicators[id]]));
    return {
      districtId: source.id,
      districtName: source.name,
      population: source.population,
      baselineScore: baseline.baselineScore,
      score: payload.district_scores[source.name],
      indicators,
      changes,
      criticalIndicators: INDICATORS.filter(({ id }) => indicators[id] < 40).map(({ id }) => id),
    };
  });
  const selectedIds = new Set(state.map(({ measureId }) => measureId));
  return {
    valid: payload.valid,
    score: payload.score,
    baselineScore: payload.baseline_score,
    scoreChange: payload.score_delta,
    budget: { spent: payload.spent, remaining: payload.remaining, total: payload.budget },
    criticalCount: payload.critical_count,
    weakestDistrictScore: payload.min_district,
    districts,
    synergiesApplied: SYNERGIES.filter(({ measures }) => measures.every((id) => selectedIds.has(id))),
  };
}

async function calculateOnServer(validation) {
  const scenarioKey = JSON.stringify(state);
  if (scenarioKey === requestedScenario) return;
  requestedScenario = scenarioKey;
  apiResult = null;
  aiState = { status: "idle", text: "" };
  const currentRequest = ++requestNumber;
  try {
    const response = await fetch(API_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        decisions: validation.selected.map(({ measure, districtId }) => ({
          id: measure.id,
          district: measure.scope === "city"
            ? null
            : DISTRICTS.find((district) => district.id === districtId).name,
        })),
      }),
    });
    const payload = await response.json();
    if (!response.ok) throw new Error(payload.detail?.[0]?.msg || payload.error || "API вернул ошибку.");
    if (currentRequest !== requestNumber) return;
    if (!payload.valid) throw new Error(payload.error || "Сценарий отклонён backend.");
    apiResult = adaptApiResult(payload);
    const box = document.querySelector("#validation");
    box.className = "ok";
    box.textContent = "Сценарий проверен и рассчитан backend.";
    renderResults();
  } catch (error) {
    if (currentRequest !== requestNumber) return;
    apiResult = null;
    requestedScenario = "";
    const box = document.querySelector("#validation");
    box.className = "";
    box.textContent = "Не удалось получить расчёт от API: " + error.message +
      " Проверьте, что backend запущен.";
    renderResults();
  }
}

function renderAiPanel() {
  const button = document.querySelector("#ai-button");
  const output = document.querySelector("#ai-analysis");
  button.disabled = !apiResult?.valid || aiState.status === "loading";
  button.textContent = aiState.status === "loading" ? "Готовлю разбор…" : "Получить AI-разбор";
  output.replaceChildren();
  if (aiState.text) {
    const paragraph = document.createElement("p");
    paragraph.textContent = aiState.text;
    output.append(paragraph);
  }
  if (aiState.status === "unavailable" && aiState.text) output.classList.add("ai-warning");
  else output.classList.remove("ai-warning");
}

async function requestAiAnalysis() {
  if (!apiResult?.valid || aiState.status === "loading") return;
  const scenarioKey = JSON.stringify(state);
  aiState = { status: "loading", text: "Отправляю расчёт на AI-анализ…" };
  renderAiPanel();
  try {
    const response = await fetch(AI_API_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        decisions: state.map(({ measureId, districtId }) => {
          const measure = MEASURES.find(({ id }) => id === measureId);
          return {
            id: measureId,
            district: measure.scope === "city" ? null : DISTRICTS.find(({ id }) => id === districtId).name,
          };
        }),
      }),
    });
    const payload = await response.json();
    if (scenarioKey !== JSON.stringify(state)) return;
    aiState = payload.available
      ? { status: "ready", text: payload.text }
      : { status: "unavailable", text: payload.message || "AI-разбор временно недоступен." };
  } catch {
    if (scenarioKey !== JSON.stringify(state)) return;
    aiState = { status: "unavailable", text: "Не удалось связаться с AI API. Проверьте, что backend запущен." };
  }
  renderAiPanel();
}

function renderResults() {
  const result = apiResult || { valid: false };
  renderScore(result);
  renderAnalysis(result);
  renderDistricts(result.valid ? result : null);
  renderAiPanel();
}

function render() {
  renderSlots();
  renderBudget();
  renderValidation();
  const validation = validateScenario(state);
  if (validation.valid) {
    document.querySelector("#validation").textContent = "Правила соблюдены. Получаю расчёт от API…";
    calculateOnServer(validation);
  } else {
    requestedScenario = "";
    requestNumber += 1;
    apiResult = null;
    aiState = { status: "idle", text: "" };
  }
  renderResults();
}

document.querySelector("#example").addEventListener("click", () => {
  state.splice(0, state.length,
    { measureId: "M7", districtId: "nura" },
    { measureId: "M8", districtId: "nura" },
    { measureId: "M10", districtId: "nura" },
    { measureId: "M12", districtId: "" },
    { measureId: "M5", districtId: "saryarka" },
  );
  render();
});
document.querySelector("#reset").addEventListener("click", () => {
  state.splice(0, state.length, ...Array.from({ length: SIMULATION.decisionsRequired }, () =>
    ({ measureId: "", districtId: "" })));
  render();
});
document.querySelector("#ai-button").addEventListener("click", requestAiAnalysis);
render();

