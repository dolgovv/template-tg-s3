// built-in english texts, the reference for every other language
// ---  "{name}" is a parameter: it is escaped, so file names can't break the HTML
// ---  { one, other, ... } is a text by {count}, see PluralSource
// ---  the rest is HTML of telegram: <b>, <i>, <code>, <pre>, <a>
export const en = {
  meta: {
    // the name on the language button
    name: "English",
  },

  common: {
    anonName: "Anonymous user",
    greet:
      "Hello, {name}!\nWelcome to the administration panel for {site}",
  },

  buttons: {
    navigation: "Navigation",
    back: "⬅️",
    add: "➕",
    open: "Open",
    delete: "Delete",
    rename: "Rename",
    yes: "Yes",
    no: "No",
    file: "File",
    folder: "Folder",
    prevPage: "◀️",
    nextPage: "▶️",
  },

  help: {
    upload:
      "<b>To add files to the current directory, just send them to this chat. Put the names in the caption: the whole caption for one file, names separated by spaces or commas in the same order for several. <i>Missing titles will be generated automatically</i></b>",
    commandsTitle: "All available commands:",
  },

  // shown in /help next to each command, plain text without HTML
  commands: {
    start: "to get main menu",
    nav: "to get navigation menu",
    all_imgs_here: "to get all images in current directory",
    list_all: "to get the tree of the current directory (up to 5 levels deep)",
    help: "to get this help",
  },

  nav: {
    empty: "This folder is empty",
    // a popup on the button: plain text without HTML
    outdated: "This menu is outdated, here is the current one",
    noSuchFolder: "No such folder",
    chooseAction: "Would you like to open it or remove completely?",
    addAskType: "Add file or directory?",
  },

  files: {
    awaitingFile:
      "Please, send a file and its name together in the single message",
    awaitingFolderName: "Name new folder:",
    uploaded: "File uploaded successfully",
    invalidName:
      "Invalid name. Use letters, digits, hyphens and underscores. Length: 1–200 characters.",
    nameExists: {
      file: "A file with this name already exists.",
      folder: "A folder with this name already exists.",
    },
    askNewName: "Enter new name:",
    renameFailed: "Could not rename. Changes were rolled back",
    deleteAsk: {
      file: "Are you sure you want to delete this file?",
      folder: "Are you sure you want to delete this folder?",
    },
    deleted: {
      file: "File {name} removed successfully",
      folder: "Folder {name} removed successfully",
    },
    deleteFailed: {
      file: "Could not delete file {name}.\nMake sure it exists",
      folder: "Could not delete folder {name}.\nMake sure it exists",
    },
    notFound: "File {name} does not exist",
    content: "{name} file content:",
    page: "<i>Page {page} of {pages}</i>",
    noImages: "There are no images in this folder",
  },

  album: {
    uploaded: {
      one: "{count} file uploaded",
      other: "{count} files uploaded",
    },
    failed: "Could not upload: {names}",
    extraNames: "<i>Extra names were not used: {names}</i>",
  },

  tree: {
    summary: "Directories: {dirs}, files: {files}",
    depthLimited: "<i>Folders deeper than {depth} levels are collapsed: …</i>",
    truncated: "<i>The folder is too big, showing the first {limit} objects</i>",
    asFile: "The tree doesn't fit in a message, so it is sent as a file",
  },

  cache: {
    // plain text without HTML
    failed: "Changes are saved, but the site cache was not reset",
  },

  errors: {
    accessDenied: "Access denied.",
    unexpected: "Something went wrong, please try again",
    listFailed: "Could not read the folder, please try again",
    createFolderFailed: "Could not create the folder",
  },
} as const;
