export const SIMULATION = {
  budget: 100,
  horizon: 8,
  decisionsRequired: 5,
};

export const INDICATORS = [
  { id: "T1", name: "Разгрузка дорог", direction: "Транспорт", weight: 0.10 },
  { id: "T2", name: "Доступность общественного транспорта", direction: "Транспорт", weight: 0.10 },
  { id: "E1", name: "Озеленение", direction: "Экология", weight: 0.09 },
  { id: "E2", name: "Качество воздуха", direction: "Экология", weight: 0.11 },
  { id: "S1", name: "Школы и детсады", direction: "Соцсфера", weight: 0.11 },
  { id: "S2", name: "Поликлиники и первичная медпомощь", direction: "Соцсфера", weight: 0.11 },
  { id: "B1", name: "Безопасность улиц", direction: "Безопасность", weight: 0.09 },
  { id: "B2", name: "Безопасность дорожного движения", direction: "Безопасность", weight: 0.09 },
  { id: "C1", name: "Надёжность ЖКХ", direction: "Городские сервисы", weight: 0.10 },
  { id: "C2", name: "Скорость решения обращений", direction: "Городские сервисы", weight: 0.10 },
];

export const DISTRICTS = [
  {
    id: "esil",
    name: "Есиль",
    population: 0.27,
    profile: "Богатый район, но есть пробки на мостах и переполненные школы.",
    indicators: { T1: 45, T2: 62, E1: 68, E2: 72, S1: 48, S2: 55, B1: 78, B2: 60, C1: 75, C2: 70 },
  },
  {
    id: "almaty",
    name: "Алматы",
    population: 0.24,
    profile: "Старый ЖКХ и пробки.",
    indicators: { T1: 40, T2: 75, E1: 50, E2: 55, S1: 60, S2: 65, B1: 62, B2: 52, C1: 50, C2: 60 },
  },
  {
    id: "saryarka",
    name: "Сарыарка",
    population: 0.20,
    profile: "Смог от частного сектора и слабое озеленение.",
    indicators: { T1: 50, T2: 70, E1: 42, E2: 40, S1: 62, S2: 68, B1: 58, B2: 55, C1: 45, C2: 55 },
  },
  {
    id: "baikonur",
    name: "Байконур",
    population: 0.13,
    profile: "Средний район без ярко выраженных перекосов.",
    indicators: { T1: 52, T2: 68, E1: 55, E2: 50, S1: 58, S2: 60, B1: 52, B2: 58, C1: 55, C2: 58 },
  },
  {
    id: "nura",
    name: "Нура",
    population: 0.16,
    profile: "Самый слабый район по социальной инфраструктуре и транспорту.",
    indicators: { T1: 55, T2: 40, E1: 45, E2: 65, S1: 38, S2: 35, B1: 55, B2: 50, C1: 60, C2: 50 },
  },
];

export const MEASURES = [
  { id: "M1", direction: "Транспорт", name: "Выделенные полосы для автобусов", scope: "district", cost: 18, lag: 2, effects: { T1: 6, T2: 9 } },
  { id: "M2", direction: "Транспорт", name: "Умные светофоры (адаптивное управление)", scope: "city", cost: 22, lag: 2, effects: { T1: 4, B2: 3 } },
  { id: "M3", direction: "Транспорт", name: "Линия ЛРТ / расширение", scope: "district", cost: 30, lag: 4, effects: { T1: 16, T2: 20, E2: 4 } },
  { id: "M4", direction: "Экология", name: "Парк / сквер", scope: "district", cost: 15, lag: 2, effects: { E1: 12, E2: 3, B1: 2 } },
  { id: "M5", direction: "Экология", name: "Перевод частного сектора на чистое топливо", scope: "district", cost: 25, lag: 3, effects: { E2: 14, C1: 4 } },
  { id: "M6", direction: "Экология", name: "Городская программа озеленения и ветрозащитных полос", scope: "city", cost: 20, lag: 4, effects: { E1: 5, E2: 3 } },
  { id: "M7", direction: "Соцсфера", name: "Школа + детсад (модульное строительство)", scope: "district", cost: 24, lag: 3, effects: { S1: 16 } },
  { id: "M8", direction: "Соцсфера", name: "Центр семейного здоровья / поликлиника", scope: "district", cost: 20, lag: 3, effects: { S2: 14 } },
  { id: "M9", direction: "Соцсфера", name: "Дворовые спорт-хабы", scope: "district", cost: 10, lag: 1, effects: { S1: 3, S2: 3, B1: 3 } },
  { id: "M10", direction: "Безопасность", name: "Освещение и камеры (расширение Safe City)", scope: "district", cost: 12, lag: 1, effects: { B1: 12, B2: 2 } },
  { id: "M11", direction: "Безопасность", name: "Безопасные переходы и школьные зоны", scope: "district", cost: 10, lag: 1, effects: { B2: 12, T1: -2 } },
  { id: "M12", direction: "Городские сервисы", name: "Единая цифровая платформа обращений", scope: "city", cost: 14, lag: 1, effects: { C2: 5 } },
  { id: "M13", direction: "Городские сервисы", name: "Модернизация тепло- и водосетей", scope: "district", cost: 28, lag: 4, effects: { C1: 18, E2: 2 } },
  { id: "M14", direction: "Городские сервисы", name: "Аварийные бригады ЖКХ + раннее оповещение", scope: "city", cost: 16, lag: 1, effects: { C1: 5, C2: 2 } },
];

export const SYNERGIES = [
  { measures: ["M1", "M2"], districtMeasure: "M1", effects: { T1: 2 } },
  { measures: ["M10", "M12"], districtMeasure: "M10", effects: { B1: 2 } },
  { measures: ["M5", "M6"], districtMeasure: "M5", effects: { E2: 2 } },
];

export const INCOMPATIBILITIES = [
  { measures: ["M1", "M3"], scope: "any", message: "Нельзя одновременно выбрать автобусные полосы M1 и ЛРТ M3." },
  { measures: ["M4", "M7"], scope: "sameDistrict", message: "Парк M4 и школа M7 конкурируют за участок в одном районе." },
  { measures: ["M5", "M13"], scope: "sameDistrict", message: "Чистое топливо M5 и модернизация сетей M13 дублируют программу в одном районе." },
];
