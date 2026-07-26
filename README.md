# n8n-nodes-liveconnect

Nodo comunitario de [n8n](https://n8n.io) para la **API pública de LiveConnect** (mensajería omnicanal + CRM): contactos, conversaciones, WhatsApp QR, WhatsApp Business API (WABA), CRM (deals, tareas, automatizaciones), catálogo, asistentes de IA, historial y más.

Cubre las 58 operaciones de la [especificación OpenAPI pública](https://cdn.liveconnect.chat/liveconnect/public-openapi.json) (la emisión de token es automática vía credenciales), más **dos triggers**: notificaciones del proxy de conversaciones y callbacks del chatbot (Flowbot).

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

## Triggers

### LiveConnect Proxy Trigger

Se dispara con las notificaciones del **proxy de conversaciones**. Gestiona el webhook del canal solo: al activar el workflow lo registra (`/proxy/setWebhook`) y al desactivarlo lo elimina. Si dejas el campo Secret vacío, genera uno seguro automáticamente y valida cada notificación entrante.

> ⚠️ LiveConnect permite **un solo webhook por canal**: no actives dos workflows con el mismo Channel ID (se roban el registro entre sí; probar con "Listen for test event" también reemplaza temporalmente el webhook de producción).

### LiveConnect Callback Trigger

Recibe los **callbacks del chatbot (Flowbot)**. Activa el workflow y pega la URL Production del trigger en la acción de callback del Flowbot. El trigger valida el secret (query o header) y entrega el evento simplificado: `mensaje` (resuelve el primer turno desde `inputs.mensaje_inicial`), `sessionId` estable para memoria, `esPrimerTurno`, `hayAgenteHumano`, `contacto`, `inputs`, `intent` y `raw`.

**El callback exige respuesta síncrona.** La forma fácil (v0.4.0+): el nodo **LiveConnect Respuesta al Callback** arma las acciones visualmente desde el editor (texto, imagen, archivo, etiqueta, variables, delegación, actualizar contacto), aplica solo la regla del `input` de cierre y **responde el webhook él mismo** — sin Code ni Respond to Webhook. Ver [`examples/09-chatbot-callback-visual.json`](examples/09-chatbot-callback-visual.json).

Si prefieres construirla a mano, este es el envelope (devuélvelo con un nodo *Respond to Webhook*):

```json
{ "status": 1, "status_message": "Ok", "data": { "actions": [
  { "type": "sendText", "text": "¡Hola! ¿En qué puedo ayudarte?" },
  { "type": "input", "input": "" }
] } }
```

Regla de oro: **cierra siempre con una acción `input`** (vacía sirve) — sin ella LiveConnect abandona el callback y no vuelve a llamar. Única excepción: cuando delegas a un humano (`userDelegate`/`teamDelegate`). Tipos de action soportados: `sendText`, `sendImage`, `sendFile`, `addTag`, `userDelegate`, `teamDelegate`, `addVar`, `setVar`, `input`, `updateContact`. Ver el ejemplo [`examples/07-chatbot-callback-trigger.json`](examples/07-chatbot-callback-trigger.json).

## Selectores dinámicos

Los campos de ID (canal, equipo, agente, pipeline, etapa, origen de lead, categoría, asistente, plantilla WABA) son **listas desplegables** que se cargan desde tu propia cuenta de LiveConnect: no hace falta buscar los IDs a mano. Las etapas se filtran por el pipeline elegido y las plantillas por el canal WABA elegido. Si prefieres pasar un ID desde otro nodo, usa el modo expresión del campo.

## Enviar una plantilla de WhatsApp

Es la operación que más datos combina, así que el nodo la resuelve por ti:

1. Elige el **Canal** (solo aparecen los canales WhatsApp) y la **Plantilla**. La etiqueta del desplegable ya dice lo que hace falta: `promo_48h · es · 2 variables · video`.
2. Aparecen **exactamente** los campos que esa plantilla necesita: `Variable {{1}}`, `Variable {{2}}`… y `URL del Encabezado` solo si la plantilla lleva imagen, video o documento. Si no lleva nada, no se muestra nada.
3. **Execute step**. Si falta algo, el error dice cuál: *«La plantilla promo_48h necesita 2 variables y falta el valor de {{2}}»*.

Atajos útiles:

- **Campos Adicionales → Usar Datos de Ejemplo**: rellena lo que dejes vacío con los ejemplos que trae la plantilla, para enviarte una prueba sin escribir nada.
- **Envío masivo con una plantilla distinta por fila**: pon una expresión en *ID de la Plantilla* y manda los valores por *Campos Adicionales → Variables del Cuerpo Separadas por Comas*, en el orden `{{1}}, {{2}}…` (ver [`examples/02-envio-masivo-plantillas-waba.json`](examples/02-envio-masivo-plantillas-waba.json)).

## Respuesta del API

LiveConnect responde siempre `{ status, status_message, data }` (`status > 0` éxito, `status < 0` error):

- Con `status < 0` el nodo lanza error (visible en n8n con el mensaje del API).
- Por defecto el nodo devuelve solo `data` (una fila por elemento cuando es un array).
- Activa **Return Full Response** para recibir el envelope completo.

## Notas

- Los archivos (Send File) se envían por **URL pública**, no como binarios.
- El nodo es utilizable como **herramienta de AI Agents** (`usableAsTool`).
- Base URL: `https://api.liveconnect.chat/prod`.

## Ejemplos

En [`examples/`](examples/) hay workflows importables listos para usar: envío masivo de plantillas WABA, chatbot con IA (con memoria por conversación), chatbot vendedor que crea negociaciones en el CRM usando el nodo como herramienta del AI Agent, reporte diario de conversaciones y alta validada de contactos. Ver [examples/README.md](examples/README.md).

## Desarrollo

```bash
npm install
npm run build   # tsc + íconos
npm run lint
```

## Licencia

[MIT](LICENSE.md)
