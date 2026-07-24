# n8n-nodes-liveconnect

Nodo comunitario de [n8n](https://n8n.io) para la **API pública de LiveConnect** (mensajería omnicanal + CRM): contactos, conversaciones, WhatsApp QR, WhatsApp Business API (WABA), CRM (deals, tareas, automatizaciones), catálogo, asistentes de IA, historial y más.

Cubre las 58 operaciones de la [especificación OpenAPI pública](https://cdn.liveconnect.chat/liveconnect/public-openapi.json) (la emisión de token es automática vía credenciales).

## Instalación

En n8n: **Settings → Community Nodes → Install** e ingresa `n8n-nodes-liveconnect`.

Manual (self-hosted):

```bash
cd ~/.n8n/nodes
npm install n8n-nodes-liveconnect
```

## Credenciales

Crea credenciales **LiveConnect API** con:

| Campo | Descripción |
|---|---|
| Account Key (cKey) | Hash de la cuenta LiveConnect |
| Private Key | Clave privada de la cuenta |

El nodo llama a `POST /account/token` automáticamente, guarda el JWT de sesión y lo envía en el header `PageGearToken`. Cuando el token expira (401), se renueva solo.

## Recursos y operaciones

| Recurso | Operaciones |
|---|---|
| **Assistant** | Get Many, Create, Update |
| **Topic** | Get Many, Create, Update (memorias de asistentes) |
| **Category** | Get Many, Create, Update |
| **Product** | Get Many, Create, Update |
| **Channel** | Get Many |
| **Contact** | Get Many, Get, Create, Update, Remove Tags |
| **Conversation** | Create |
| **CRM** | Get Lead Origins, Get Lead Channels, Get Pipelines, Get Stages |
| **CRM Automation** | Create, Update, Delete |
| **Deal** | Create, Update, Archive |
| **Deal Task** | Create, Update, Delete |
| **Group** | Get Many |
| **History** | Get Many Conversations, Get Conversation, Get Messages, Get Participants, Get Attachments |
| **Proxy** | Get Webhook, Set Webhook, Send Message, Send File, Send Quick Reply, Transfer, Get Balance |
| **Quick Reply** | Create, Update |
| **User** | Get Many, Get, Set State |
| **WhatsApp Business (WABA)** | Get Many Templates, Get Template, Send Template, Send Quick Reply |
| **WhatsApp QR** | Check Number, Send Message, Send File, Send Quick Reply |

## Respuesta del API

LiveConnect responde siempre `{ status, status_message, data }` (`status > 0` éxito, `status < 0` error):

- Con `status < 0` el nodo lanza error (visible en n8n con el mensaje del API).
- Por defecto el nodo devuelve solo `data` (una fila por elemento cuando es un array).
- Activa **Return Full Response** para recibir el envelope completo.

## Notas

- Los archivos (Send File) se envían por **URL pública**, no como binarios.
- El nodo es utilizable como **herramienta de AI Agents** (`usableAsTool`).
- Base URL: `https://api.liveconnect.chat/prod`.

## Desarrollo

```bash
npm install
npm run build   # tsc + íconos
npm run lint
```

## Licencia

[MIT](LICENSE.md)
