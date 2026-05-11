export const translates = {
  ru: {
    welcome: "Добро пожаловать! Бот запущен.",
    notAdmin: "У вас нет доступа.",
    unknownCommand: "Неизвестная команда.",
    anonName: "Анонимный пользователь",
    greetUser: (name: string) => `Привет, ${name}!`,
    yourId: (id: number) => `Ваш ID: ${id}`,
  },
  en: {
    welcome: "Welcome! Bot is running.",
    notAdmin: "Access denied.",
    unknownCommand: "Unknown command.",
    anonName: "Anonymous user",
    greetUser: (name: string) => `Hello, ${name}!`,
    yourId: (id: number) => `Your ID: ${id}`,
  },
  // here you can add more languages
};
