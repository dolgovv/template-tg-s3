// import { InlineKeyboard } from "grammy";
// import type { Messages } from "../../utils/types.js";

// export type TextMessage = {
//   type: "text";
//   text: string;
//   keyboard?: InlineKeyboard;
// };

// export type PhotoMessage = {
//   type: "photo";
//   photo: string; // url или file_id
//   caption?: string;
//   keyboard?: InlineKeyboard;
// };

// export type BotMessage = TextMessage | PhotoMessage;

// export class MessageFactory {
//   constructor(private texts: Messages) {}

//   text(text: string): TextMessage {
//     return { type: "text", text };
//   }

//   textWithButtons(text: string, keyboard: InlineKeyboard): TextMessage {
//     return { type: "text", text, keyboard };
//   }

//   photo(
//     url: string,
//     caption?: string,
//     keyboard?: InlineKeyboard,
//   ): PhotoMessage {
//     return { type: "photo", photo: url, caption, keyboard };
//   }

//   // Готовые сообщения для конкретных сценариев
//   welcome(): TextMessage {
//     const kb = new InlineKeyboard()
//       .text("🐕 Собаки", "list_dogs")
//       .text("📅 События", "list_events");
//     return this.textWithButtons(this.texts.welcome, kb);
//   }

//   notAdmin(): TextMessage {
//     return this.text(this.texts.notAdmin);
//   }
// }
