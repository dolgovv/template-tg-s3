import type { botLanguage } from "../utils/types.js";
import { translates } from "./messages/translates.js";

export class DialogEngine {
  private lang: botLanguage = "ru";

  setLanguage(newLanguage: botLanguage) {
    this.lang = newLanguage;
  }

  mText(): typeof translates.ru {
    return translates[this.lang];
  }
}
