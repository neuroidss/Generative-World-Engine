import { AIModel, ModelProvider, SavedWorld } from "./types";

export const LAST_PLAYED_ID_KEY = 'generative-world-engine-last-played-id';

export const AI_MODELS: AIModel[] = [
    { id: 'gemini-2.5-pro', name: 'Gemini 2.5 Pro', provider: ModelProvider.GoogleAI },
    { id: 'gemini-2.5-flash', name: 'Gemini 2.5 Flash', provider: ModelProvider.GoogleAI },
    { id: 'gemini-2.5-flash-lite', name: 'Gemini 2.5 Flash-Lite', provider: ModelProvider.GoogleAI },
];

export const LANGUAGES = { 'en': 'English', 'ru': 'Русский' };

export const UI_STRINGS = {
    en: {
        title: "Generative World Engine", continueLast: "Continue Last Adventure?", continue: "Continue", startNew: "Start a New World", createOwn: "Create Your Own World",
        createOwnPlaceholder: "e.g., A floating city in the clouds, powered by alchemical crystals...", create: "Create", loadSave: "Load a Saved World",
        importWorld: "Import World (.zip, .json)", creatingWorld: "Creating world...", entities: "Entities", chronicles: "Chronicles", actions: "Actions",
        customActionPlaceholder: "Or suggest your own action...", mainMenu: "Main Menu", export: "Export", exportJson: "Export (JSON only)", close: "Close", playerActionPrefix: "Attempt: ",
        playerActionThinking: (action: string) => `You ponder how best to ${action.toLowerCase()}...`, worldCreated: "The world was created.", worldLog: "World Log",
        goal: "Goal", entityState: "Entity States", donghuaStart: "Start Story", donghuaPause: "Pause Story", regenerateImage: "Regenerate Image",
        playerThought: "Inner Monologue", loreSourcePlaceholder: "World/Franchise Names (e.g. Swallowed Star, Battle Through the Heavens)", playerRolePlaceholder: "Player Character Role (e.g., Luo Feng's friend)",
    },
    ru: {
        title: "Генеративный Движок Миров", continueLast: "Продолжить последнее приключение?", continue: "Продолжить", startNew: "Начать новый мир",
        createOwn: "Создать свой мир", createOwnPlaceholder: "Например, летающий город в облаках, питаемый алхимическими кристаллами...", create: "Создать",
        loadSave: "Загрузить сохранение", importWorld: "Импортировать мир (.zip, .json)", creatingWorld: "Создание мира...", entities: "Сущности", chronicles: "Хроники",
        actions: "Действия", customActionPlaceholder: "Или предложите свое действие...", mainMenu: "Главное меню", export: "Экспорт", exportJson: "Экспорт (только JSON)", close: "Закрыть",
        playerActionPrefix: "Попытка: ", playerActionThinking: (action: string) => `Вы обдумываете, как лучше ${action.toLowerCase()}...`, worldCreated: "Мир был создан.",
        worldLog: "Журнал Мира", goal: "Цель", entityState: "Состояния Сущностей", donghuaStart: "Начать историю", donghuaPause: "Поставить историю на паузу",
        regenerateImage: "Пересоздать изображение", playerThought: "Внутренний монолог", loreSourcePlaceholder: "Названия миров/франшиз (напр., Пожиратель звёзд, Боевой континент)", playerRolePlaceholder: "Роль персонажа (напр., подруга Ло Фэна)",
    }
};

interface PresetWorld {
    name: string;
    prompt?: string;
    worldData?: SavedWorld;
    loreSource?: string;
    playerRole?: string;
}

export const PRESET_WORLDS: { [key: string]: PresetWorld[] } = {
    en: [
        {
            name: "Cellular Journey to Immortality",
            prompt: "You are a nascent consciousness awakening within the Dantian of a young cultivator. Your world is the body itself. The 'sky' is the diaphragm, the 'rivers' are meridians. Your first sensation is a trickle of refined Qi flowing from the stomach meridian after a meal. Nearby, a cluster of 'Mortal Cells' labors, unaware of your existence. Your first goal: guide this fragile stream of Qi to the waiting 'Qi Nucleus' at the center of the Dantian.",
            loreSource: "Cells at Work, Cultivation Novels",
            playerRole: "The guiding consciousness of a cultivator's inner world, starting at Qi Condensation Stage 1."
        },
        {
            name: "Swallowed Star: The Awakened",
            prompt: "The year is 2056. The world has been ravaged by the RR virus, creating monstrous beasts that roam the wastelands outside fortified cities. You are a high school graduate in one of these cities, your future uncertain. As you stand on a rooftop, overlooking the armored walls, you feel a strange energy coursing through you for the first time—a faint, inner power. Down below, a Fighter dojo is recruiting.",
            loreSource: "Swallowed Star",
            playerRole: "A young resident of a post-apocalyptic city who has just awakened their genetic energy."
        },
        {
            name: "BTTH: The Fallen Genius",
            prompt: "Three years ago, you were the prodigy of the Xiao clan, reaching 9 Duan Qi at the age of 11. Now, you are its disgrace. Your Dou Qi has mysteriously vanished, leaving you a cripple in a world that respects only power. Your fiancée from the mighty Nalan clan has just arrived, not for a visit, but to publicly annul your engagement. The shame is unbearable, but a flicker of defiance remains in your heart.",
            loreSource: "Battle Through the Heavens",
            playerRole: "The former genius of the Xiao Clan, Xiao Yan, at the moment of his greatest humiliation."
        },
        {
            name: "A Mortal's Journey: The Seven Mysteries Sect",
            prompt: "Born a commoner, you've managed to enter the Seven Mysteries Sect, a minor Jianghu clan, not as a martial artist, but as an unofficial disciple through a connection. You are given menial tasks and looked down upon. Your innate spiritual roots are poor. In this world of hidden cultivators and ruthless politics, you possess only your wits, extreme caution, and a mysterious small green bottle you've carried since childhood.",
            loreSource: "A Record of a Mortal's Journey to Immortality",
            playerRole: "A young, unremarkable disciple with poor talent but a cautious mind, newly arrived at the Seven Mysteries Sect."
        },
    ],
    ru: [
        {
            name: "Клеточный Путь к Бессмертию",
            prompt: "Вы — зарождающееся сознание, пробуждающееся в Даньтяне молодого культиватора. Ваш мир — это само тело. 'Небо' — это диафрагма, 'реки' — меридианы. Ваше первое ощущение — это струйка очищенной Ци, текущая из меридиана желудка после еды. Рядом трудится скопление 'Смертных Клеток', не подозревающих о вашем существовании. Ваша первая цель: направить этот хрупкий поток Ци к ожидающему 'Ядру Ци' в центре Даньтяня.",
            loreSource: "Клетки за работой, новеллы о культивации",
            playerRole: "Направляющее сознание внутреннего мира культиватора, начиная с 1-й стадии Конденсации Ци."
        },
        {
            name: "Пожиратель звёзд: Пробуждённый",
            prompt: "Год 2056. Мир был разорён вирусом RR, создавшим чудовищных зверей, которые бродят по пустошам за пределами укреплённых городов. Вы — выпускник средней школы в одном из таких городов, ваше будущее неопределённо. Стоя на крыше и глядя на бронированные стены, вы впервые чувствуете, как по вам пробегает странная энергия — слабая внутренняя сила. Внизу додзё Бойцов проводит набор.",
            loreSource: "Пожиратель звёзд",
            playerRole: "Молодой житель постапокалиптического города, только что пробудивший свою генетическую энергию."
        },
        {
            name: "Расколотая битвой синева небес: Падший гений",
            prompt: "Три года назад вы были вундеркиндом клана Сяо, достигнув 9-го уровня Ду Ки в 11 лет. Теперь вы — его позор. Ваша Ду Ки таинственным образом исчезла, оставив вас калекой в мире, который уважает только силу. Ваша невеста из могущественного клана Налан только что прибыла, но не для визита, а чтобы публично расторгнуть вашу помолвку. Стыд невыносим, но в вашем сердце осталась искра неповиновения.",
            loreSource: "Расколотая битвой синева небес",
            playerRole: "Бывший гений клана Сяо, Сяо Янь, в момент своего величайшего унижения."
        },
        {
            name: "Путешествие к Бессмертию: Секта Семи Тайн",
            prompt: "Родившись простолюдином, вам удалось поступить в Секту Семи Тайн, незначительный клан Цзянху, не как боевой мастер, а как неофициальный ученик по знакомству. Вам поручают чёрную работу и смотрят свысока. Ваши врождённые духовные корни слабы. В этом мире скрытых культиваторов и безжалостной политики у вас есть только ваш ум, крайняя осторожность и таинственная маленькая зелёная бутылочка, которую вы носите с детства.",
            loreSource: "Путешествие к Бессмертию",
            playerRole: "Молодой, ничем не примечательный ученик со слабым талантом, но осторожным умом, только что прибывший в Секту Семи Тайн."
        },
    ]
};