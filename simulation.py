from copy import deepcopy

from .data import DISTRICTS, WEIGHTS, MEASURES


# Допустимые направления
DIRECTIONS = {
    "transport",
    "ecology",
    "social",
    "safety",
    "services",
}


# Синергии
# (первая мера, вторая мера, дополнительные эффекты)
SYNERGIES = [
    ("M1", "M2", {"T1": 2}),
    ("M10", "M12", {"B1": 2}),
    ("M5", "M6", {"E2": 2}),
]


def validate(decisions):
    """
    Проверяет корректность набора из 5 решений.

    Правила:
    - ровно 5 мероприятий;
    - повторения запрещены;
    - бюджет <= 100;
    - не более 2 мероприятий одного направления;
    - районные меры требуют район;
    - городские меры НЕ должны иметь район;
    - M1 + M3 несовместимы всегда;
    - M4 + M7 несовместимы только в одном районе;
    - M5 + M13 несовместимы только в одном районе.
    """

    # 1. Ровно 5 решений
    if len(decisions) != 5:
        return False, "Нужно выбрать ровно 5 мероприятий"

    # 2. Проверяем существование мероприятий
    for item in decisions:
        measure_id = item.get("id")

        if measure_id not in MEASURES:
            return False, f"Неизвестное мероприятие: {measure_id}"

    # 3. Повторы запрещены
    selected_ids = [item["id"] for item in decisions]

    if len(set(selected_ids)) != 5:
        return False, "Повторение мероприятий запрещено"

    # 4. Проверка бюджета
    total_cost = sum(
        MEASURES[item["id"]]["cost"]
        for item in decisions
    )

    if total_cost > 100:
        return False, f"Превышен бюджет: {total_cost}/100"

    # 5. Проверка направлений
    direction_count = {}

    for item in decisions:
        measure = MEASURES[item["id"]]
        direction = measure["direction"]

        direction_count[direction] = (
            direction_count.get(direction, 0) + 1
        )

        if direction_count[direction] > 2:
            return (
                False,
                f"Не более 2 мероприятий одного направления: {direction}"
            )

    # 6. Проверка районов
    for item in decisions:
        measure_id = item["id"]
        measure = MEASURES[measure_id]

        district = item.get("district")

        # Районная мера ОБЯЗАТЕЛЬНО должна иметь район
        if measure["type"] == "district":

            if district not in DISTRICTS:
                return (
                    False,
                    f"Для районной меры {measure_id} "
                    f"необходимо указать корректный район"
                )

        # Городская мера НЕ должна иметь район
        elif measure["type"] == "city":

            if district is not None:
                return (
                    False,
                    f"Для городской меры {measure_id} "
                    f"район указывать нельзя"
                )

    # Преобразуем в set для удобства
    selected_ids = set(selected_ids)

    # 7. M1 + M3 — глобальная несовместимость
    #
    # Эти две меры нельзя выбирать одновременно
    # независимо от района.
    if "M1" in selected_ids and "M3" in selected_ids:
        return (
            False,
            "M1 и M3 несовместимы: "
            "нельзя одновременно выбрать BRT и ЛРТ"
        )

    # Получаем решения для районных конфликтов
    decisions_by_id = {
        item["id"]: item
        for item in decisions
    }

    # 8. M4 + M7
    #
    # Запрещены ТОЛЬКО если назначены
    # в один и тот же район.
    if "M4" in selected_ids and "M7" in selected_ids:

        district_m4 = decisions_by_id["M4"].get("district")
        district_m7 = decisions_by_id["M7"].get("district")

        if district_m4 == district_m7:
            return (
                False,
                f"M4 и M7 нельзя выбрать в одном районе: {district_m4}"
            )

    # 9. M5 + M13
    #
    # Запрещены ТОЛЬКО если назначены
    # в один и тот же район.
    if "M5" in selected_ids and "M13" in selected_ids:

        district_m5 = decisions_by_id["M5"].get("district")
        district_m13 = decisions_by_id["M13"].get("district")

        if district_m5 == district_m13:
            return (
                False,
                f"M5 и M13 нельзя выбрать в одном районе: {district_m5}"
            )

    return True, None


def calculate(decisions):
    """
    Основной расчёт симуляции.
    """

    # Сначала проверяем набор решений
    valid, error = validate(decisions)

    if not valid:
        return {
            "valid": False,
            "error": error,
        }

    # Копируем исходное состояние города
    result = deepcopy(DISTRICTS)

    selected_ids = {
        item["id"]
        for item in decisions
    }

    # ---------------------------------------------------------
    # ОСНОВНЫЕ ЭФФЕКТЫ МЕРОПРИЯТИЙ
    # ---------------------------------------------------------

    for decision in decisions:

        measure_id = decision["id"]
        measure = MEASURES[measure_id]

        # Реализованная доля эффекта с учётом лага
        #
        # H = 8 кварталов
        # factor = (8 - L) / 8
        factor = (8 - measure["lag"]) / 8

        # Районная мера применяется к одному району
        if measure["type"] == "district":

            target_districts = [
                decision["district"]
            ]

        # Городская мера применяется ко всем районам
        else:

            target_districts = list(result.keys())

        # Применяем эффекты
        for district in target_districts:

            for indicator, effect in measure["effects"].items():

                result[district][indicator] += (
                    effect * factor
                )

    # ---------------------------------------------------------
    # СИНЕРГИИ
    # ---------------------------------------------------------

    for measure_a, measure_b, effects in SYNERGIES:

        if (
            measure_a in selected_ids
            and measure_b in selected_ids
        ):

            first_decision = next(
                item
                for item in decisions
                if item["id"] == measure_a
            )

            first_measure = MEASURES[measure_a]

            # Если первая мера районная,
            # бонус идёт в её район.
            if first_measure["type"] == "district":

                target_districts = [
                    first_decision["district"]
                ]

            # Если городская — во все районы.
            else:

                target_districts = list(result.keys())

            for district in target_districts:

                for indicator, effect in effects.items():

                    # Синергия НЕ масштабируется лагом
                    result[district][indicator] += effect

    # ---------------------------------------------------------
    # CLIP 0..100
    # ---------------------------------------------------------

    indicators = list(WEIGHTS.keys())

    for district in result:

        for indicator in indicators:

            result[district][indicator] = max(
                0,
                min(
                    100,
                    result[district][indicator]
                )
            )

    # ---------------------------------------------------------
    # D_d — оценка каждого района
    # ---------------------------------------------------------

    district_scores = {}

    for district, values in result.items():

        score = sum(
            values[indicator] * weight
            for indicator, weight in WEIGHTS.items()
        )

        district_scores[district] = score

    # ---------------------------------------------------------
    # D_avg — средневзвешенная оценка города
    # ---------------------------------------------------------

    d_avg = sum(
        DISTRICTS[district]["pop"] * score
        for district, score in district_scores.items()
    )

    # ---------------------------------------------------------
    # КРИТИЧЕСКИЕ ПОКАЗАТЕЛИ
    # ---------------------------------------------------------

    critical = []

    for district, values in result.items():

        for indicator in indicators:

            if values[indicator] < 40:

                critical.append(
                    {
                        "district": district,
                        "indicator": indicator,
                        "value": round(
                            values[indicator],
                            2
                        ),
                    }
                )

    n_crit = len(critical)

    # ---------------------------------------------------------
    # ФИНАЛЬНЫЙ SCORE
    # ---------------------------------------------------------

    min_district = min(
        district_scores.values()
    )

    score = (
        0.7 * d_avg
        + 0.3 * min_district
        - 1.0 * n_crit
    )

    # ---------------------------------------------------------
    # БЮДЖЕТ
    # ---------------------------------------------------------

    total_cost = sum(
        MEASURES[item["id"]]["cost"]
        for item in decisions
    )

    # ---------------------------------------------------------
    # РЕЗУЛЬТАТ
    # ---------------------------------------------------------

    return {
        "valid": True,

        "score": round(score, 2),

        "baseline_score": 52.56,

        "score_delta": round(
            score - 52.56,
            2
        ),

        "budget": 100,

        "spent": total_cost,

        "remaining": 100 - total_cost,

        "district_scores": {
            district: round(
                value,
                2
            )
            for district, value in district_scores.items()
        },

        "districts": result,

        "critical_indicators": critical,

        "critical_count": n_crit,

        "d_avg": round(
            d_avg,
            2
        ),

        "min_district": round(
            min_district,
            2
        ),
    }
