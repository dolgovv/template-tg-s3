# Настройка переменных окружения (.env)

Все настройки бота хранятся в файле `.env` в корне проекта. При первом запуске скопируй пример:

```bash
cp .env.example .env
```

---

## Переменные окружения

### Telegram

| Переменная     | Обязательная | Описание                                                 |
| -------------- | ------------ | -------------------------------------------------------- |
| `BOT_TOKEN`    | ✅ да        | Токен бота от @BotFather                                 |
| `ADMIN_IDS`    | ✅ да        | Telegram ID администраторов через запятую                |
| `WEBSITE_NAME` | ✅ да        | Название сайта — отображается в приветственном сообщении |
| `PROXY_URL`    | ❌ нет       | HTTP/HTTPS прокси для обхода блокировок                  |
| `LOG_PATH`     | ❌ нет       | Папка для логов, по умолчанию `./logs`                   |

### S3-хранилище

| Переменная             | Обязательная | Описание                                                                 |
| ---------------------- | ------------ | ------------------------------------------------------------------------ |
| `S3_ENDPOINT`          | ❌ нет       | URL S3 API. Пусто — AWS S3                                               |
| `S3_REGION`            | ❌ нет       | Регион, по умолчанию `us-east-1`. Для Garage — `garage`                  |
| `S3_ACCESS_KEY_ID`     | ✅ да        | Ключ доступа (старое имя `S3_BOT_NAME` тоже поддерживается)              |
| `S3_SECRET_ACCESS_KEY` | ✅ да        | Секретный ключ (старое имя `S3_BOT_PASS` тоже поддерживается)            |
| `S3_BUCKET`            | ✅ да        | Имя бакета                                                               |
| `S3_FORCE_PATH_STYLE`  | ❌ нет       | `true` (по умолчанию) — `host/bucket/key`; `false` — `bucket.host/key`   |
| `S3_ROOT_PREFIX`       | ❌ нет       | Папка внутри бакета, с которой начинает бот (старое имя `S3_ROOT_FOLDER`) |
| `GARAGE_RPC_SECRET`    | только с Garage | Внутренний секрет Garage из docker-compose: `openssl rand -hex 32`    |

---

## Типовые сценарии S3

### Garage в том же docker-compose

```env
S3_ENDPOINT=http://garage:3900
S3_REGION=garage
S3_ACCESS_KEY_ID=GK...        # echo "GK$(openssl rand -hex 16)"
S3_SECRET_ACCESS_KEY=...      # openssl rand -hex 32
S3_BUCKET=tg-bot
GARAGE_RPC_SECRET=...         # openssl rand -hex 32
```

Запуск: `docker compose --profile garage up -d`. Ключ и бакет Garage создаст сам при первом старте.
S3 API также доступен с хоста на `http://127.0.0.1:3900` (для aws cli, rclone и т.п.).

### Облачное хранилище

```env
S3_ENDPOINT=https://storage.yandexcloud.net   # endpoint вашего провайдера
S3_REGION=ru-central1                          # регион бакета
S3_ACCESS_KEY_ID=...
S3_SECRET_ACCESS_KEY=...
S3_BUCKET=my-site
S3_FORCE_PATH_STYLE=true                       # false для AWS и провайдеров, где path style отключён
```

Запуск: `docker compose up -d` (без профиля — поднимется только бот).

---

## Как получить токен бота

1. Открой Telegram и напиши [@BotFather](https://t.me/BotFather)
2. Отправь команду `/newbot`
3. Следуй инструкциям — придумай имя и username для бота
4. BotFather пришлёт токен вида `1234567890:AAF...`
5. Вставь его в `.env`: `BOT_TOKEN=1234567890:AAF...`

---

## Настройка прокси

Если Telegram заблокирован в твоей сети, укажи прокси:

```
PROXY_URL=http://user:password@host:port
```

Поддерживаются HTTP и HTTPS прокси. SOCKS5 пока не реализован.
Если прокси не нужен — оставь поле пустым или удали строку.

---

## Что делать если бот не запускается

Бот проверяет наличие обязательных переменных при старте и сразу сообщает какой именно переменной не хватает. Пример ошибки:

```
Error: Your .env is wrong. BOT_TOKEN is missing
```

Проверь что файл `.env` существует и все обязательные поля заполнены.
