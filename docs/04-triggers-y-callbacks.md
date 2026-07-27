# Triggers y callbacks

Dos triggers y un nodo de respuesta. Los tres son **programáticos**: en n8n no hay otra forma de implementar triggers ni de responder un webhook.

## 1. LiveConnect Proxy Trigger

Se dispara con las notificaciones del proxy de conversaciones. Gestiona el webhook del canal **automáticamente**.

### `webhookMethods.default`

| Método | Qué hace |
|---|---|
| `create` | `POST /proxy/setWebhook {id_canal, url, estado: 1, secret}` |
| `checkExists` | `POST /proxy/getWebhook` y compara `webhook`, `secret` y `TTL` |
| `delete` | `estado ≠ 1`; **traga los errores** para no bloquear nunca la desactivación del workflow |

Puntos que costaron:

- **Slot único por canal**: `estado: 1` da de alta *o reemplaza*. Dos workflows activos con el mismo canal se pisan — el aviso está en el `notice` del nodo.
- **TTL de DynamoDB** (epoch en segundos): vencido = el registro ya no existe → `checkExists` devuelve `false` y n8n vuelve a registrar.
- **Secret**: si el parámetro está vacío, `create()` genera `randomBytes(16).hex` y lo persiste en `getWorkflowStaticData('node')`.
- **Fallo de seguridad corregido**: `checkExists` devuelve `false` cuando no conoce el secret local, y `delete` solo limpia el secret guardado si el borrado remoto se confirmó. Sin eso, un webhook podía quedar registrado con un secret que el nodo ya no validaba.
- El payload del proxy **no está documentado**: `simplifyProxyEvent` simplifica solo si reconoce `{chat|inputs|userInput}`; si no, entrega crudo.

## 2. LiveConnect Callback Trigger

Recibe los callbacks del chatbot (Flowbot). **No tiene `webhookMethods`**: no existe API de registro, la URL de producción se pega a mano en el Flowbot.

### Contrato del callback (verificado)

Petición: `POST` con `{chat, inputs, userInput, intent, userFile, idcs}`.

- El **secret** llega **en la query (`?secret=`) y en el header `secret`**; se acepta cualquiera de los dos. User-agent: `PageGear-Lambda-Hook/x`.
- **Primer turno**: `userInput === ''` y el mensaje real está en `inputs.mensaje_inicial`. Un turno posterior sin texto pero **con** adjunto (`userFile`) no se confunde con el primero; un turno vacío sin adjunto sí es indistinguible (limitación del contrato).
- **`chat.usuarios` es un OBJETO indexado por id**, no un array. Hay agente humano si alguna entrada tiene `isbot === 0`.
- **Session ID**: `inputs.id` → `chat.contacto.id` → `chat.id` → hash de `id_canal:fecha_ini`. Si no hay ningún identificador, un UUID aleatorio por evento: un hash de campos ausentes sería constante y mezclaría conversaciones distintas.

### Respuesta síncrona (lo más importante)

LiveConnect espera **en la misma petición**:

```json
{ "status": 1, "status_message": "Ok", "data": { "actions": [ … ] } }
```

- Hay **10 tipos de action**: `sendText`, `sendImage`, `sendFile`, `addTag`, `userDelegate`, `teamDelegate`, `addVar`, `setVar`, `input`, `updateContact`.
- **Siempre hay que cerrar con `{type:'input'}`** (vacío sirve). Sin `input`, LiveConnect abandona el callback y no vuelve a llamar. **Única excepción**: cuando se delega a un humano (`userDelegate` / `teamDelegate`).
- El `input` debe ser el **último** elemento: uno intermedio no cierra el turno.
- El trigger **no** responde las actions: su `responseMode` es una expresión (`={{$parameter["responseMode"]}}`) con `responseNode` por defecto. La respuesta la construye el workflow.

### Ruta del webhook (ambos triggers)

La URL que registra n8n es `<base>/webhook/<webhookId>/<ruta>` (`node-helpers.js`, `getNodeWebhookPath`). El `webhookId` lo asigna n8n al crear el nodo y **no es editable desde la UI**; la `ruta` sí: es el parámetro **Ruta del Webhook** (`path`, default `webhook`), declarado como `path: '={{$parameter["path"] || "webhook"}}'` en `webhooks[0]`.

- El default reproduce la URL de las versiones anteriores a la 0.9.2, así que nadie tiene que volver a pegar nada en su Flowbot.
- Ruta vacía → cae al default; nunca se genera una URL terminada en `/`.
- Si el nodo **no** tiene `webhookId` (importado sin él), n8n usa `<workflowId>/<nombre del nodo>/<ruta>`: ahí la URL depende del nombre autogenerado del nodo ("LiveConnect Callback Trigger1"), otro motivo para fijar una ruta legible.
- En el **Proxy Trigger**, cambiar la ruta cambia la URL registrada: `checkExists` la ve distinta de la que tiene LiveConnect y vuelve a dar de alta el webhook solo.

⚠️ **Nunca dejar un `webhookId` fijo en los workflows de `examples/`.** Los ejemplos lo traían (`liveconnect-callback-switch-demo`) y eso hacía que **dos importaciones del mismo ejemplo compartieran URL**, sin forma de cambiarla desde la UI. Se quitó en 0.9.2: sin `webhookId` en el JSON, n8n genera uno nuevo al importar.

Verificado en `scripts/smoke-triggers.mjs` con el `Workflow` y el `NodeHelpers` reales de n8n.

### Secret inválido (en ambos triggers)

`getResponseObject().status(403).json(...)` + `{ noWebhookResponse: true }` → el workflow no se ejecuta. La comparación usa `timingSafeEqual`.

### Reglas de ESLint específicas de triggers

El plugin los detecta por el nombre de archivo `*Trigger.node.ts` y exige: `name`/`displayName` con sufijo `Trigger`, `inputs: []`, `outputs: ['main']`, **el parámetro de simplificación debe llamarse `simple`** con la descripción literal en inglés `Whether to return a simplified version of the response instead of the raw data`, y **sin** `subtitle`.

### Trampa de tipos

En n8n-workflow 1.120 el tipo de `webhookMethods.default` **exige los tres métodos**. Si un trigger no necesita registro (como el de callback), hay que **omitir el bloque entero**, no declarar métodos vacíos.

## 3. LiveConnect Respuesta al Callback

Constructor visual de las actions, para no depender de un nodo Code.

- `fixedCollection` `acciones.accion[]` con un campo `tipo` y campos condicionales por tipo. **`displayOptions.show.tipo` funciona entre hermanos dentro del `fixedCollection`** (el scope es local al ítem) — es lo que permite mostrar solo los campos de la acción elegida.
- `toAction` valida lo obligatorio: IDs enteros > 0 (rechazando `''` **antes** de `Number()`, porque `Number('') === 0` pasaría un `!isNaN`), URLs `http(s)`, y campos de texto que no sean objetos ni arrays (error típico de una expresión mal apuntada).
- `applyClosingRule` aplica la regla del `input` de cierre: si hay delegación, **elimina** los `input`; si no, garantiza uno al final.
- `buildEnvelope` arma `{status:1, status_message:'Ok', data:{actions}}`.
- **Responde el webhook él mismo** con `this.sendResponse({body, headers, statusCode})` — API pública de `IExecuteFunctions` (`interfaces.d.ts:733`). Sin webhook esperando (ejecución manual) es **no-op**, no lanza.
- **No copiar el guard "No Webhook node found" del core**: su lista de triggers reconocidos no incluye nodos comunitarios, así que rechazaría una respuesta perfectamente válida.
- Requiere que el Callback Trigger esté en `responseMode: responseNode` (su valor por defecto).

Humo: `scripts/smoke-response.mjs`.

## 4. Ejemplos

- `examples/07-chatbot-callback-trigger.json` — callback con nodo Code.
- `examples/08-mensajes-proxy-trigger.json` — proxy.
- `examples/09-chatbot-callback-visual.json` — callback con el nodo de respuesta visual.
- `examples/10-chatbot-ia-switch-respuestas.json` — callback + IA + Switch + respuestas por intención.
