from copy import deepcopy

from .data import DISTRICTS, WEIGHTS, MEASURES


DIRECTIONS = {
    "transport",
    "ecology",
    "social",
    "safety",
    "services",
}


SYNERGIES = [
    ("M1", "M2", {"T1": 2}),
    ("M10", "M12", {"B1": 2}),
    ("M5", "M6", {"E2": 2}),
]


CONFLICTS = [
    ("M1", "M3"),
    ("M4", "M7"),
    ("M5", "M13"),
]


def validate(decisions):
    if len(decisions) != 5:
        return False, "Нужно выбрать ровно 5 мероприятий"

    if len(set(item["id"] for item in decisions)) != 5:
        return False, "Повторение мероприятий запрещено"

    total_cost = sum(MEASURES[item["id"]]["cost"] for item in decisions)

    if total_cost > 100:
        return False, f"Превышен бюджет: {total_cost}/100"

    direction_count = {}

    for item in decisions:
        measure = MEASURES[item["id"]]
        direction = measure["direction"]

        direction_count[direction] = direction_count.get(direction, 0) + 1

        if direction_count[direction] > 2:
            return False, f"Не более 2 мероприятий направления: {direction}"

        if measure["type"] == "district":
            if item.get("district") not in DISTRICTS:
                return False, f"Не указан корректный район для {item['id']}"

    selected_ids = {item["id"] for item in decisions}

    for a, b in CONFLICTS:
        if a in selected_ids and b in selected_ids:
            return False, f"Несовместимые мероприятия: {a} и {b}"

    return True, None


def calculate(decisions):
    valid, error = validate(decisions)

    if not valid:
        return {
            "valid": False,
            "error": error,
        }

    result = deepcopy(DISTRICTS)

    selected_ids = {item["id"] for item in decisions}

    # Применяем основные эффекты
    for decision in decisions:
        measure = MEASURES[decision["id"]]

        factor = (8 - measure["lag"]) / 8

        target_districts = (
            [decision["district"]]
            if measure["type"] == "district"
            else list(result.keys())
        )

        for district in target_districts:
            for indicator, effect in measure["effects"].items():
                result[district][indicator] += effect * factor

    # Синергии
    for a, b, effects in SYNERGIES:
        if a in selected_ids and b in selected_ids:

            first_decision = next(
                item for item in decisions
                if item["id"] == a
            )

            if MEASURES[a]["type"] == "district":
                targets = [first_decision["district"]]
            else:
                targets = list(result.keys())

            for district in targets:
                for indicator, effect in effects.items():
                    result[district][indicator] += effect

    # Ограничение 0..100
    indicators = list(WEIGHTS.keys())

    for district in result:
        for indicator in indicators:
            result[district][indicator] = max(
                0,
                min(100, result[district][indicator])
            )

    # D_d
    district_scores = {}

    for district, values in result.items():
        score = sum(
            values[indicator] * weight
            for indicator, weight in WEIGHTS.items()
        )

        district_scores[district] = score

    # D_avg
    d_avg = sum(
        DISTRICTS[district]["pop"] * score
        for district, score in district_scores.items()
    )

    # Критические показатели
    critical = []

    for district, values in result.items():
        for indicator in indicators:
            if values[indicator] < 40:
                critical.append({
                    "district": district,
                    "indicator": indicator,
                    "value": values[indicator],
                })

    n_crit = len(critical)

    min_district = min(district_scores.values())

    score = (
        0.7 * d_avg
        + 0.3 * min_district
        - n_crit
    )

    total_cost = sum(
        MEASURES[item["id"]]["cost"]
        for item in decisions
    )

    return {
        "valid": True,
        "score": round(score, 2),
        "baseline_score": 52.56,
        "score_delta": round(score - 52.56, 2),
        "budget": 100,
        "spent": total_cost,
        "remaining": 100 - total_cost,
        "district_scores": {
            district: round(value, 2)
            for district, value in district_scores.items()
        },
        "districts": result,
        "critical_indicators": critical,
        "critical_count": n_crit,
        "d_avg": round(d_avg, 2),
        "min_district": round(min_district, 2),
    }