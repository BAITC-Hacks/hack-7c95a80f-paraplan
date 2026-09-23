DISTRICTS = {
    "Есиль": {
        "pop": 0.27,
        "T1": 45, "T2": 62, "E1": 68, "E2": 72,
        "S1": 48, "S2": 55, "B1": 78, "B2": 60,
        "C1": 75, "C2": 70
    },
    "Алматы": {
        "pop": 0.24,
        "T1": 40, "T2": 75, "E1": 50, "E2": 55,
        "S1": 60, "S2": 65, "B1": 62, "B2": 52,
        "C1": 50, "C2": 60
    },
    "Сарыарка": {
        "pop": 0.20,
        "T1": 50, "T2": 70, "E1": 42, "E2": 40,
        "S1": 62, "S2": 68, "B1": 58, "B2": 55,
        "C1": 45, "C2": 55
    },
    "Байконур": {
        "pop": 0.13,
        "T1": 52, "T2": 68, "E1": 55, "E2": 50,
        "S1": 58, "S2": 60, "B1": 52, "B2": 58,
        "C1": 55, "C2": 58
    },
    "Нура": {
        "pop": 0.16,
        "T1": 55, "T2": 40, "E1": 45, "E2": 65,
        "S1": 38, "S2": 35, "B1": 55, "B2": 50,
        "C1": 60, "C2": 50
    }
}



WEIGHTS = {
    "T1": 0.10,
    "T2": 0.10,
    "E1": 0.09,
    "E2": 0.11,
    "S1": 0.11,
    "S2": 0.11,
    "B1": 0.09,
    "B2": 0.09,
    "C1": 0.10,
    "C2": 0.10,
}

MEASURES = {
    "M1": {
        "name": "Выделенные полосы для автобусов",
        "direction": "transport",
        "type": "district",
        "cost": 18,
        "lag": 2,
        "effects": {"T1": 6, "T2": 9},
    },

    "M2": {
        "name": "Умные светофоры",
        "direction": "transport",
        "type": "city",
        "cost": 22,
        "lag": 2,
        "effects": {"T1": 4, "B2": 3},
    },

    "M3": {
        "name": "Линия ЛРТ / расширение",
        "direction": "transport",
        "type": "district",
        "cost": 30,
        "lag": 4,
        "effects": {"T1": 16, "T2": 20, "E2": 4},
    },

    "M4": {
        "name": "Парк / сквер",
        "direction": "ecology",
        "type": "district",
        "cost": 15,
        "lag": 2,
        "effects": {"E1": 12, "E2": 3, "B1": 2},
    },

    "M5": {
        "name": "Перевод частного сектора на чистое топливо",
        "direction": "ecology",
        "type": "district",
        "cost": 25,
        "lag": 3,
        "effects": {"E2": 14, "C1": 4},
    },

    "M6": {
        "name": "Городская программа озеленения",
        "direction": "ecology",
        "type": "city",
        "cost": 20,
        "lag": 4,
        "effects": {"E1": 5, "E2": 3},
    },

    "M7": {
        "name": "Школа + детсад",
        "direction": "social",
        "type": "district",
        "cost": 24,
        "lag": 3,
        "effects": {"S1": 16},
    },

    "M8": {
        "name": "Центр семейного здоровья / поликлиника",
        "direction": "social",
        "type": "district",
        "cost": 20,
        "lag": 3,
        "effects": {"S2": 14},
    },

    "M9": {
        "name": "Дворовые спорт-хабы",
        "direction": "social",
        "type": "district",
        "cost": 10,
        "lag": 1,
        "effects": {"S1": 3, "S2": 3, "B1": 3},
    },

    "M10": {
        "name": "Освещение и камеры Safe City",
        "direction": "safety",
        "type": "district",
        "cost": 12,
        "lag": 1,
        "effects": {"B1": 12, "B2": 2},
    },

    "M11": {
        "name": "Безопасные переходы и школьные зоны",
        "direction": "safety",
        "type": "district",
        "cost": 10,
        "lag": 1,
        "effects": {"B2": 12, "T1": -2},
    },

    "M12": {
        "name": "Единая цифровая платформа обращений",
        "direction": "services",
        "type": "city",
        "cost": 14,
        "lag": 1,
        "effects": {"C2": 5},
    },

    "M13": {
        "name": "Модернизация тепло- и водосетей",
        "direction": "services",
        "type": "district",
        "cost": 28,
        "lag": 4,
        "effects": {"C1": 18, "E2": 2},
    },

    "M14": {
        "name": "Аварийные бригады ЖКХ",
        "direction": "services",
        "type": "city",
        "cost": 16,
        "lag": 1,
        "effects": {"C1": 5, "C2": 2},
    },
}

