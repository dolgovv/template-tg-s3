export const textTranslates = {
  ru: {
    welcome: "Добро пожаловать! Бот запущен.",
    notAdmin: "У вас нет доступа.",
    unknownCommand: "Неизвестная команда.",
    anonName: "Анонимный пользователь",
    langChanged: "Язык успешно изменен!",
    help:
      "Доступные команды:." +
      "\n" +
      "/start " +
      "главное меню" +
      "\n" +
      "/nav " +
      "меню навигации" +
      "\n" +
      "/all_imgs_here " +
      "посмотреть все картинки в текущей директории" +
      "\n" +
      "/help " +
      "\n",
    dirChanged: "Текущая директория изменена на: ",
    fileContent: (path: string) => {
      return `Содержание файла ${path}:\n`;
    },
    greetUser: (name: string, websiteName: string) => {
      return `Привет, ${name}!\nДобро пожаловать в панель администратора сайта ${websiteName}`;
    },
    yourId: (id: number) => `Ваш ID: ${id}`,
    dirListEmpty: "В текущей директории нет папок",
    error: "Возникла непредвиденная ошибка: ",
    buttonEchoReply: "Вот твоя кнопка:",
  },
  en: {
    welcome: "Welcome! Bot is running.",
    notAdmin: "Access denied.",
    unknownCommand: "Unknown command.",
    anonName: "Anonymous user",
    langChanged: "Language changed successfully!",
    help:
      "All available commands:." +
      "\n" +
      "/start " +
      "to get main menu" +
      "\n" +
      "/nav " +
      "to get navigation menu" +
      "\n" +
      "/all_imgs_here " +
      "to get all .jpg/.png files in current directory" +
      "\n" +
      "/help " +
      "\n",
    dirChanged: "Current directory changed: ",
    fileContent: (path: string) => {
      return `${path} file content:\n`;
    },
    greetUser: (name: string, websiteName: string) => {
      return `Hello, ${name}!\nWelcome to the administration panel for ${websiteName}`;
    },
    yourId: (id: number) => `Your ID: ${id}`,
    dirListEmpty: "No folders here",
    error: "An error occured: ",
    buttonEchoReply: "Here's your button:",
  },
  // here you can add more languages
};

export const menusTranslates = {
  ru: {
    welcome: [
      { text: "Навигация", call: "navDir:root" },
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
      { text: "Navigation", call: "navDir:root" },
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
