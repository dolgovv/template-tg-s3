export const textTranslates = {
  ru: {
    welcome: "Добро пожаловать! Бот запущен.",
    notAdmin: "У вас нет доступа.",
    noFilename:
      "Вместе с картинкой, пожалуйста, укажите название файла в том же сообщении",
    invalidName:
      "Некорректное имя. Используйте буквы, цифры, дефис и подчёркивание. Длина — от 1 до 200 символов.",
    nameAlreadyExists: (isFile: boolean) => {
      return (isFile ? "Файл " : "Папка ") + "с таким именем уже существует.";
    },
    unknownCommand: "Неизвестная команда.",
    anonName: "Анонимный пользователь",
    langChanged: "Язык успешно изменен!",
    awaitingImage:
      "Пожалуйста, отправьте фото и название для загрузки одним сообщением",
    awaitingMultipleImages:
      "Пожалуйста, отправьте несколько фото и укажите названия для каждого из них в сообщении через пробел\n<i>Например, с 5 картинками нужно написать текст 'название_первой_картинки название_второй_картинки' и тд. Если названий будет меньше, чем картинок - название сгенерируется автоматически </i>",
    awaitingDirectoryName: "Укажите название директории:",
    addFileSuccessful: "Файл успешно загружен",
    chooseAction: "Вы бы хотели открыть или удалить (безвозвратно)?",
    addAskType: "Добавить файл или директорию?",
    askNewName: "Введите новое имя:",
    deletedSuccessfully: (isFile: boolean, path: string): string => {
      return (
        (isFile ? "Файл " : "Папка ") + path + " удален" + (isFile ? "" : "а")
      );
    },
    deleteAsk: (isFile: boolean) => {
      return (
        "Вы уверены, что хотите удалить " + (isFile ? "файл" : "папку") + "?"
      );
    },
    help:
      "<b>Чтобы добавить файлы в текущую директорию - просто отправьте их в этот чат с указанием названий через пробел. <i>Недостающие названия будут сгенерированы автоматически</i></b>" +
      "\n" +
      "\n" +
      "Доступные команды:" +
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
    dirEmpty: "Папка пуста",
    dirListEmpty: "Не существует такой папки",
    error: "Возникла непредвиденная ошибка: ",
    errorDeletion: (isFile: boolean, path: string) => {
      return (
        "Ошибка удаления " +
        (isFile ? "файла " : "папки ") +
        ": " +
        path +
        ".\nУбедитесь, что " +
        (isFile ? "такой файл " : "такая папка ") +
        "существует"
      );
    },
    buttonEchoReply: "Вот твоя кнопка:",
    menuOutdated: "Это меню устарело, вот актуальное",
    noImages: "В этой папке нет картинок",
    fileTruncated: (shown: number, total: number) =>
      `\n<i>Показаны первые ${shown} из ${total} символов</i>`,
    renameError: "Не удалось переименовать. Изменения отменены",
    unexpectedError: "Что-то пошло не так, попробуйте ещё раз",
  },
  en: {
    welcome: "Welcome! Bot is running.",
    notAdmin: "Access denied.",
    noFilename: "Please, provide a file name with the same message",
    invalidName:
      "Invalid name. Use letters, digits, hyphens and underscores. Length: 1–200 characters.",
    nameAlreadyExists: (isFile: boolean) => {
      return (
        "A " + (isFile ? "file " : "folder ") + "with this name already exists."
      );
    },
    unknownCommand: "Unknown command.",
    anonName: "Anonymous user",
    langChanged: "Language changed successfully!",
    awaitingImage:
      "Please, send photo and it`s name together in the single message",
    awaitingMultipleImages:
      "Please send multiple photos and include titles for each in the message, separated by spaces. \n<i>For example, with 5 images, you should write the text 'title_of_the_first_image, title_of_the_second_image,' etc. If there are fewer titles than images, the title will be generated automatically.</i>",
    awaitingDirectoryName: "Name new folder:",
    addFileSuccessful: "File uploaded successfully",
    chooseAction: "Would you like to open it or remove completely?",
    addAskType: "Add file or directory?",
    askNewName: "Enter new name:",
    deletedSuccessfully: (isFile: boolean, path: string): string => {
      return (isFile ? "File " : "Folder ") + path + " removed successfully";
    },
    deleteAsk: (isFile: boolean) => {
      return (
        "Are you shure you want to delete this " +
        (isFile ? "file" : "folder") +
        "?"
      );
    },
    help:
      "<b>To add files to the current directory, just send them to this chat with the names separated by a space. <i>Missing titles will be generated automatically</i></b>" +
      "\n" +
      "\n" +
      "All available commands:" +
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
    dirEmpty: "This folder is empty",
    dirListEmpty: "No such folder",
    error: "An error occured: ",
    errorDeletion: (isFile: boolean, path: string) => {
      return (
        "Delete " +
        (isFile ? "file " : "folder ") +
        "error: " +
        path +
        ".\nMake sure it exist"
      );
    },
    buttonEchoReply: "Here's your button:",
    menuOutdated: "This menu is outdated, here is the current one",
    noImages: "There are no images in this folder",
    fileTruncated: (shown: number, total: number) =>
      `\n<i>Showing the first ${shown} of ${total} characters</i>`,
    renameError: "Could not rename. Changes were rolled back",
    unexpectedError: "Something went wrong, please try again",
  },
  // here you can add more languages
};

export const menusTranslates = {
  ru: {
    addAskType: [
      { text: "Файл", call: "newFile" },
      { text: "Папку", call: "newDirectory" },
    ],
    askNewName: [
      {
        text: "⬅️",
        call: "cancel",
      },
    ],
    actionsMenu: (isFile: boolean, ref: string) => {
      return [
        {
          text: "Открыть",
          call: isFile ? "openFile:" + ref : "navDir:" + ref,
        },
        {
          text: "Удалить",
          call: isFile ? "deleteFileAsk:" + ref : "deleteDirAsk:" + ref,
        },
        {
          text: "Переименовать",
          call: isFile ? "renameFileAsk:" + ref : "renameDirAsk:" + ref,
        },
        {
          text: "⬅️",
          call: "cancel",
        },
      ];
    },
    deleteAskMenu: (isFile: boolean, ref: string) => {
      return [
        {
          text: "Да",
          call: isFile ? "deleteFile:" + ref : "deleteDir:" + ref,
        },
        {
          text: "Нет",
          call: "cancel",
        },
      ];
    },
    welcome: [
      { text: "Русский", call: "lang=ru" },
      { text: "English", call: "lang=en" },
      { text: "Навигация", call: "navDir:root" },
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
    addAskType: [
      { text: "File", call: "newFile" },
      { text: "Folder", call: "newDirectory" },
    ],
    askNewName: [
      {
        text: "⬅️",
        call: "cancel",
      },
    ],
    actionsMenu: (isFile: boolean, ref: string) => {
      return [
        { text: "Open", call: isFile ? "openFile:" + ref : "navDir:" + ref },
        {
          text: "Delete",
          call: isFile ? "deleteFileAsk:" + ref : "deleteDirAsk:" + ref,
        },
        {
          text: "Rename",
          call: isFile ? "renameFileAsk:" + ref : "renameDirAsk:" + ref,
        },
        {
          text: "⬅️",
          call: "cancel",
        },
      ];
    },
    deleteAskMenu: (isFile: boolean, ref: string) => {
      return [
        {
          text: "Yes",
          call: isFile ? "deleteFile:" + ref : "deleteDir:" + ref,
        },
        {
          text: "No",
          call: "cancel",
        },
      ];
    },
    welcome: [
      { text: "English", call: "lang=en" },
      { text: "Русский", call: "lang=ru" },
      { text: "Navigation", call: "navDir:root" },
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

export type BotTexts = {
  text: typeof textTranslates;
  menus: typeof menusTranslates;
};

export const defaultTexts: BotTexts = {
  text: textTranslates,
  menus: menusTranslates,
};
