import {
  DISTRICTS,
  INCOMPATIBILITIES,
  INDICATORS,
  MEASURES,
  SIMULATION,
  SYNERGIES,
} from "./data.js";

const districtById = new Map(DISTRICTS.map((district) => [district.id, district]));
const measureById = new Map(MEASURES.map((measure) => [measure.id, measure]));

export function validateScenario(selections) {
  const errors = [];
  if (!Array.isArray(selections)) {
    return { valid: false, errors: ["Передайте список выбранных решений."] };
  }

  if (selections.length !== SIMULATION.decisionsRequired) {
    errors.push("Нужно выбрать ровно " + SIMULATION.decisionsRequired + " решений (сейчас выбрано " + selections.length + ").");
  }

  const selectedMeasures = [];
  const seen = new Set();
  for (const [index, selection] of selections.entries()) {
    if (!selection || typeof selection.measureId !== "string") {
      errors.push("Решение " + (index + 1) + ": выберите мероприятие.");
      continue;
    }
    const measure = measureById.get(selection.measureId);
    if (!measure) {
      errors.push("Решение " + (index + 1) + ": неизвестное мероприятие " + selection.measureId + ".");
      continue;
    }
    if (seen.has(measure.id)) errors.push("Мероприятие " + measure.id + " выбрано несколько раз.");
    seen.add(measure.id);
    selectedMeasures.push({ ...selection, measure });

    if (measure.scope === "district" && !districtById.has(selection.districtId)) {
      errors.push("Для мероприятия " + measure.id + " обязательно выберите район.");
    }
    if (measure.scope === "city" && selection.districtId != null && selection.districtId !== "") {
      errors.push("Для городского мероприятия " + measure.id + " район выбирать не нужно.");
    }
  }

  const cost = selectedMeasures.reduce((sum, item) => sum + item.measure.cost, 0);
  if (cost > SIMULATION.budget) errors.push("Бюджет превышен: " + cost + " из " + SIMULATION.budget + ".");

  const countsByDirection = new Map();
  for (const { measure } of selectedMeasures) {
    countsByDirection.set(measure.direction, (countsByDirection.get(measure.direction) ?? 0) + 1);
  }
  for (const [direction, count] of countsByDirection) {
    if (count > 2) errors.push("В направлении «" + direction + "» выбрано " + count + " меры; максимум — 2.");
  }

  const selectedIds = new Set(selectedMeasures.map(({ measure }) => measure.id));
  for (const rule of INCOMPATIBILITIES) {
    const [firstId, secondId] = rule.measures;
    if (!selectedIds.has(firstId) || !selectedIds.has(secondId)) continue;
    const first = selectedMeasures.find(({ measure }) => measure.id === firstId);
    const second = selectedMeasures.find(({ measure }) => measure.id === secondId);
    if (rule.scope === "any" || (first?.districtId && second?.districtId && first.districtId === second.districtId)) errors.push(rule.message);
  }

  return {
    valid: errors.length === 0,
    errors,
    cost,
    remainingBudget: SIMULATION.budget - cost,
    selected: selectedMeasures,
  };
}

function districtScore(indicators) {
  return INDICATORS.reduce((sum, indicator) => sum + indicators[indicator.id] * indicator.weight, 0);
}

export function calculateScenario(selections) {
  const validation = validateScenario(selections);
  if (!validation.valid) return { valid: false, errors: validation.errors };

  const applied = Object.fromEntries(
    DISTRICTS.map((district) => [district.id, Object.fromEntries(INDICATORS.map(({ id }) => [id, 0]))]),
  );
  const selectedIds = new Set(validation.selected.map(({ measure }) => measure.id));
  const contributionDetails = [];

  for (const { measure, districtId } of validation.selected) {
    const realizedShare = (SIMULATION.horizon - measure.lag) / SIMULATION.horizon;
    const targetDistricts = measure.scope === "city" ? DISTRICTS : [districtById.get(districtId)];

    for (const district of targetDistricts) {
      for (const [indicatorId, fullEffect] of Object.entries(measure.effects)) {
        const realizedEffect = fullEffect * realizedShare;
        applied[district.id][indicatorId] += realizedEffect;
        contributionDetails.push({
          measureId: measure.id,
          measureName: measure.name,
          districtId: district.id,
          indicatorId,
          effect: realizedEffect,
          kind: "measure",
        });
      }
    }
  }

  for (const synergy of SYNERGIES) {
    if (!synergy.measures.every((id) => selectedIds.has(id))) continue;
    const targetSelection = validation.selected.find(({ measure }) => measure.id === synergy.districtMeasure);
    const targetMeasure = measureById.get(synergy.districtMeasure);
    const targets = targetMeasure.scope === "city" ? DISTRICTS : [districtById.get(targetSelection.districtId)];

    for (const district of targets) {
      for (const [indicatorId, bonus] of Object.entries(synergy.effects)) {
        applied[district.id][indicatorId] += bonus;
        contributionDetails.push({
          measureId: synergy.measures.join("+"),
          measureName: "Синергия",
          districtId: district.id,
          indicatorId,
          effect: bonus,
          kind: "synergy",
        });
      }
    }
  }

  const results = DISTRICTS.map((district) => {
    const indicators = Object.fromEntries(
      INDICATORS.map(({ id }) => [
        id,
        Math.max(0, Math.min(100, district.indicators[id] + applied[district.id][id])),
      ]),
    );
    const changes = Object.fromEntries(
      INDICATORS.map(({ id }) => [id, indicators[id] - district.indicators[id]]),
    );
    return {
      districtId: district.id,
      districtName: district.name,
      population: district.population,
      baselineScore: districtScore(district.indicators),
      score: districtScore(indicators),
      indicators,
      changes,
      criticalIndicators: INDICATORS.filter(({ id }) => indicators[id] < 40).map(({ id }) => id),
    };
  });

  const averageScore = results.reduce((sum, district) => sum + district.population * district.score, 0);
  const weakestDistrictScore = Math.min(...results.map(({ score }) => score));
  const criticalCount = results.reduce((sum, district) => sum + district.criticalIndicators.length, 0);
  const baselineAverageScore = results.reduce((sum, district) => sum + district.population * district.baselineScore, 0);
  const baselineWeakestDistrictScore = Math.min(...results.map(({ baselineScore }) => baselineScore));
  const baselineCriticalCount = DISTRICTS.reduce(
    (sum, district) => sum + INDICATORS.filter(({ id }) => district.indicators[id] < 40).length,
    0,
  );
  const score = 0.7 * averageScore + 0.3 * weakestDistrictScore - criticalCount;
  const baselineScore = 0.7 * baselineAverageScore + 0.3 * baselineWeakestDistrictScore - baselineCriticalCount;

  return {
    valid: true,
    budget: { spent: validation.cost, remaining: validation.remainingBudget, total: SIMULATION.budget },
    score,
    baselineScore,
    scoreChange: score - baselineScore,
    averageScore,
    weakestDistrictScore,
    criticalCount,
    districts: results,
    contributions: contributionDetails,
    synergiesApplied: SYNERGIES.filter(({ measures }) => measures.every((id) => selectedIds.has(id))),
    selected: validation.selected.map(({ measure, districtId }) => ({
      ...measure,
      districtId: districtId ?? null,
      districtName: districtId ? districtById.get(districtId).name : null,
    })),
  };
}

export function getMeasure(measureId) {
  return measureById.get(measureId) ?? null;
}

