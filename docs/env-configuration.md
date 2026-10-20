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
| `GARAGE_RPC_SECRET`    | только с Garage | Внутренний секрет Garage из docker-compose: `openssl rand -hex 32`. Пустой — сгенерирует `./start.sh` |

### Сброс кэша сайта

| Переменная               | Обязательная | Описание                                                            |
| ------------------------ | ------------ | ------------------------------------------------------------------- |
| `CACHE_INVALIDATE_URL`   | ❌ нет       | Адрес сервера сайта, который бот вызывает после каждого изменения   |
| `CACHE_INVALIDATE_TOKEN` | ❌ нет       | Секрет, отправляется в заголовке `Authorization: Bearer <token>`    |

---

## Типовые сценарии S3

### Garage в том же docker-compose

```env
S3_ENDPOINT=http://garage:3900
S3_REGION=garage
S3_ACCESS_KEY_ID=GK...        # echo "GK$(openssl rand -hex 12)"
S3_SECRET_ACCESS_KEY=...      # openssl rand -hex 32
S3_BUCKET=tg-bot
GARAGE_RPC_SECRET=...         # openssl rand -hex 32
```

Три ключа выше можно оставить пустыми: `./start.sh` сгенерирует их и запишет в `.env`. Заполненные значения он не трогает, только проверяет формат.

Запуск: `./start.sh` — скрипт увидит `http://garage:3900` и поднимет Garage вместе с ботом. Ключ и бакет Garage создаст сам при первом старте.
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

Запуск: `./start.sh` — поднимется только бот, Garage не нужен.

---

## Сброс кэша сайта

Если сайт отдаёт файлы из S3 через кэш, после замены картинки посетители видят старую, пока не истечёт срок кэша.
С `CACHE_INVALIDATE_URL` бот сам сообщает серверу сайта, что изменилось, и тот сбрасывает кэш сразу.

**Когда вызывается:** после каждого действия, которое меняет хранилище: загрузка файла или альбома, создание папки, переименование, удаление.
Просмотр, навигация, `/list_all` и `/all_imgs_here` ничего не вызывают.
Одно действие — один запрос: альбом из 10 файлов или переименование папки приходят одним запросом.

**Запрос:**

```http
POST <CACHE_INVALIDATE_URL>
Content-Type: application/json
Authorization: Bearer <CACHE_INVALIDATE_TOKEN>

{
  "event": "storage.changed",
  "keys": ["site/img/cat.jpg", "site/img/old-name.jpg"],
  "prefixes": ["site/news/"],
  "root": "site/"
}
```

- `keys` — изменённые файлы: загруженные, удалённые, старое и новое имя переименованного
- `prefixes` — изменённые папки целиком: созданные, удалённые, старое и новое имя переименованной
- `root` — значение `S3_ROOT_PREFIX`. Путь на сайте — это ключ без него: `site/img/cat.jpg` → `/img/cat.jpg`

Сервер должен ответить любым кодом `2xx` за 5 секунд. Иначе запись попадёт в `error.log`, а админ получит в чат «Изменения сохранены, но кэш сайта не сброшен». Сами изменения в хранилище при этом уже сделаны.

Пример обработчика (Node.js, Express):

```js
app.post("/cache/invalidate", express.json(), (req, res) => {
  if (req.get("Authorization") !== `Bearer ${process.env.CACHE_INVALIDATE_TOKEN}`) {
    return res.sendStatus(401);
  }
  const { keys, prefixes, root } = req.body;
  for (const key of keys) cache.delete("/" + key.slice(root.length));
  for (const prefix of prefixes) cache.deleteByPrefix("/" + prefix.slice(root.length));
  res.sendStatus(204);
});
```

Запрос идёт напрямую, без `PROXY_URL`: прокси нужен для Telegram, а сервер сайта свой.
Изменения, сделанные в S3 в обход бота (aws cli, rclone), бот не видит.

Нужен другой формат, например сразу API CDN? Передай свою функцию в `src/app/main.ts`:

```ts
app.use(fileManager({
  storage: s3Storage(config.s3),
  ...config.fileManager,
  onChange: async ({ keys, prefixes, root }) => {
    // любой вызов; исключение = кэш не сброшен
  },
}));
```

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
