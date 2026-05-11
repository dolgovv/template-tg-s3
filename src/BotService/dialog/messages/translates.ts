export const translates = {
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
