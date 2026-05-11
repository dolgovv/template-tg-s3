export const textTranslates = {
  ru: {
    welcome: "Добро пожаловать! Бот запущен.",
    notAdmin: "У вас нет доступа.",
    unknownCommand: "Неизвестная команда.",
    anonName: "Анонимный пользователь",
    langChanged: "Язык успешно изменен!",
    help: "Здесь будет /help текст.",
    greetUser: (name: string, websiteName: string) =>
      `Привет, ${name}!\nДобро пожаловать в панель администратора сайта ${websiteName}`,
    yourId: (id: number) => `Ваш ID: ${id}`,
  },
  en: {
    welcome: "Welcome! Bot is running.",
    notAdmin: "Access denied.",
    unknownCommand: "Unknown command.",
    anonName: "Anonymous user",
    langChanged: "Language changed successfully!",
    help: "Here will be /help text.",
    greetUser: (name: string) => `Hello, ${name}!`,
    yourId: (id: number) => `Your ID: ${id}`,
  },
  // here you can add more languages
};

export const menusTranslates = {
  ru: {
    welcome: [
      { text: "Русский", call: "lang=ru" },
      { text: "English", call: "lang=en" },
    ] as { text: string; call: string }[],
    notAdmin: [],
    unknownCommand: [],
    anonName: [],
    langChanged: [
      { text: "Русский", call: "lang=ru" },
      { text: "English", call: "lang=en" },
    ] as { text: string; call: string }[],
    help: [],
  },
  en: {
    welcome: [
      { text: "English", call: "lang=en" },
      { text: "Русский", call: "lang=ru" },
    ] as { text: string; call: string }[],
    notAdmin: [],
    unknownCommand: [],
    anonName: [],
    langChanged: [
      { text: "English", call: "lang=en" },
      { text: "Русский", call: "lang=ru" },
    ] as { text: string; call: string }[],
    help: [],
  },
  // here you can add more menus
};

export const calls: string[] = ["lang=en", "lang=ru"];
