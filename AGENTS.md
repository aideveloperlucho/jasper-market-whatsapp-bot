# AGENTS.md — Mapa del proyecto

> Índice para agentes AI. Consultar este archivo antes de escanear todo el repositorio.

## Resumen

Bot de WhatsApp Business (demo **Jasper's Market**) basado en Node.js + Express. Recibe webhooks de Meta, enruta mensajes interactivos y envía respuestas vía Graph API. Usa Redis para deduplicar follow-ups según estados `delivered`/`read`.

**Stack:** Node.js, Express, `facebook-nodejs-business-sdk`, Redis, dotenv.

**Punto de entrada:** `app.js` → escucha en `PORT` (default 8080), webhook en `/webhook`.

---

## Árbol de directorios

```
whatsapp-business-jaspers-market/
├── app.js                 # Servidor Express, rutas / y /webhook
├── package.json           # Dependencias y script start
├── .sample.env            # Plantilla de variables de entorno
├── template.sh            # Script bash: crea plantillas de WhatsApp en Meta
├── AGENTS.md              # Este archivo (mapa para agentes)
│
├── services/              # Toda la lógica de negocio
│   ├── config.js          # Lee .env, exporta config congelada
│   ├── constants.js       # Textos, IDs de botones y CTAs del demo
│   ├── conversation.js    # Orquestador: handleMessage / handleStatus
│   ├── message.js         # Parsea mensajes entrantes de WhatsApp
│   ├── status.js          # Parsea actualizaciones de estado (delivered/read)
│   ├── graph-api.js       # Cliente Graph API: envío de mensajes y plantillas
│   └── redis.js           # Cache (clase Cache): TTL corto por messageId
│
├── public/                # Imágenes usadas en plantillas de WhatsApp
│   ├── groceries.jpg
│   ├── strawberries.jpg
│   ├── sheet_pan_dinner.jpg
│   └── salad_bowl.jpg
│
├── .vscode/
│   └── launch.json        # Config de depuración VS Code/Cursor
│
└── [docs raíz]
    ├── README.md          # Setup, ngrok, Redis, webhook
    ├── CHANGELOG.md
    ├── CONTRIBUTING.md
    └── CODE_OF_CONDUCT.md
```

**Ignorar al explorar:** `node_modules/`, `.env` (secretos locales), archivos de lock salvo que se necesite revisar dependencias.

---

## Índice por responsabilidad

| Si necesitas… | Ve a |
|---------------|------|
| Rutas HTTP, verificación de firma webhook | `app.js` |
| Variables de entorno requeridas | `services/config.js`, `.sample.env` |
| Flujo de conversación y switch de respuestas | `services/conversation.js` |
| IDs de botones, textos del bot | `services/constants.js` |
| Enviar mensajes/plantillas a WhatsApp | `services/graph-api.js` |
| Modelo de mensaje entrante | `services/message.js` |
| Modelo de status (delivered/read) | `services/status.js` |
| Cache Redis para follow-ups | `services/redis.js` |
| Crear plantillas en Meta (setup inicial) | `template.sh` |
| Assets de imágenes para templates | `public/` |

---

## Flujo de datos

```
WhatsApp → POST /webhook (app.js)
              │
              ├─ statuses → Conversation.handleStatus()
              │                  └─ Cache.remove() → follow-up si aplica
              │
              └─ messages → Conversation.handleMessage()
                                 ├─ Message (parse type/id)
                                 ├─ switch por constants.*_ID
                                 └─ GraphApi.* → envía respuesta
                                        └─ Cache.insert() para follow-up
```

---

## Dependencias entre módulos

```
app.js
  └── config, Conversation

conversation.js
  └── constants, config, graph-api, message, status, redis

graph-api.js
  └── config, facebook-nodejs-business-sdk, public/*.jpg

redis.js
  └── config, redis

message.js, status.js, constants.js
  └── (sin dependencias internas del proyecto)
```

---

## Variables de entorno

Definidas en `.sample.env` (copiar a `.env`):

| Variable | Uso |
|----------|-----|
| `ACCESS_TOKEN` | Token de app Meta / Graph API |
| `APP_SECRET` | Validación firma `x-hub-signature-256` |
| `VERIFY_TOKEN` | Handshake GET `/webhook` |
| `PORT` | Puerto del servidor (default 8080) |
| `REDIS_HOST`, `REDIS_PORT` | Cliente Redis en `services/redis.js` |

---

## Comandos útiles

```bash
npm install          # Instalar dependencias
npm start            # node app.js
cp .sample.env .env  # Configuración local
./template.sh        # Crear plantillas WhatsApp (requiere jq, tokens en script)
redis-server --daemonize yes
```

---

## Convenciones del código

- CommonJS (`require` / `module.exports`), no ES modules.
- Clases estáticas en `GraphApi`, `Conversation`, `Cache`.
- Graph API versión `v23.0` (hardcoded en `graph-api.js`).
- Respuesta al webhook siempre `200 EVENT_RECEIVED` (patrón fire-and-forget).
