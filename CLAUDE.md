# CLAUDE.md — n8n-nodes-liveconnect

Nodo comunitario **declarativo** de n8n para el API público de LiveConnect. La **fuente de verdad** es el OpenAPI:

```
https://cdn.liveconnect.chat/liveconnect/public-openapi.json
```

Todo cambio al nodo debe derivarse de ese spec. No inventar campos ni endpoints.

**UI en ESPAÑOL** (desde v0.3.0): displayName, labels de options, actions, descriptions y placeholders van en español ("ID del Canal", "Obtener Varios", "Campos Adicionales"); los `name`/`value` internos NO cambian nunca (snake_case del API / camelCase). Preposiciones y artículos en minúscula dentro de labels ("ID del Canal", NO "ID Del Canal"). Las reglas ESLint que exigen literales en inglés (Simplify/limit/Get Many/Whether/Title Case) están desactivadas en `.eslintrc.js` con comentario.

⚠️ **`node-param-operation-option-action-miscased` debe seguir DESACTIVADA**: su autofix pasa cada `action` por la librería `sentence-case`, que **elimina los diacríticos** — así se rompieron los 25 actions con tilde en v0.3.0 ("Enviar una respuesta rápida" → "Enviar una respuesta r pida", visible en el panel de acciones de n8n). Tras cualquier `npm run lintfix`, comprobar: `grep -rho "action: '[^']*'" nodes/LiveConnect/descriptions/*.ts | grep -cE "[áéíóúñ]"` debe dar 25. Options siempre reordenadas alfabéticamente por el texto español. Ícono: `liveconnect2.svg` (renombrado desde liveconnect.svg para reventar la caché de n8n/navegador — si se cambia el ícono otra vez, renombrar de nuevo el archivo).

## Arquitectura

```
credentials/LiveConnectApi.credentials.ts   # auth: cKey+privateKey → JWT (preAuthentication)
nodes/LiveConnect/
  LiveConnect.node.ts                       # nodo principal: selector de resource + spread de descripciones
  GenericFunctions.ts                       # LIVECONNECT_BASE_URL + handleLcResponse (postReceive compartido)
  LoadOptions.ts                            # selectores dinámicos (10 métodos loadOptions)
  TriggerFunctions.ts                       # helpers de triggers: secret, sessionId, simplify, lcHookRequest
  ActionsFunctions.ts                       # helpers del constructor de actions: toAction, applyClosingRule, buildEnvelope
  LiveConnectProxyTrigger.node.ts           # trigger: notificaciones del proxy (registra webhook vía API)
  LiveConnectCallbackTrigger.node.ts        # trigger: callbacks del Flowbot (URL manual, respuesta síncrona)
  LiveConnectCallbackResponse.node.ts       # constructor visual de actions; responde el webhook vía sendResponse()
  descriptions/<Recurso>Description.ts      # 1 archivo por recurso: <camel>Operations + <camel>Fields
  descriptions/index.ts                     # re-exporta todo
scripts/verify-spec.mjs                     # diff automático dist/ vs OpenAPI (npm run verify)
scripts/smoke-triggers.mjs                  # humo de triggers con payload real y mocks (npm run smoke)
.github/workflows/ci.yml                    # build + lint en push/PR
.github/workflows/release.yml               # release de GitHub → npm publish (secret NPM_TOKEN)
```

- **Nodo de acciones sin execute()**: 100 % declarativo — cada operación lleva `routing.request` (method/url) y cada campo `routing.send` (`type: 'body' | 'query'`, `property: <nombre exacto del API>`). **Excepción**: los dos triggers son programáticos (`webhook()` + `webhookMethods`), es la única forma de hacer triggers en n8n.
- `ContactDescription.ts` es el **template canónico**: imitar su estilo para cualquier recurso nuevo.
- 18 recursos, 58 operaciones (todas las del spec menos `/account/token`, que lo manejan las credenciales) + 2 triggers.

## Triggers (contratos verificados)

**LiveConnectProxyTrigger** — gestiona el webhook del canal automáticamente:
- `webhookMethods.default.create` → `POST /proxy/setWebhook {id_canal, url, estado:1, secret}` (estado=1 alta/REEMPLAZA — slot único por canal; estado≠1 elimina). `checkExists` → `POST /proxy/getWebhook` y compara `webhook`, `secret` y `TTL` (epoch DynamoDB; vencido = re-registrar). `delete` traga errores para nunca bloquear la desactivación.
- Secret vacío → `create()` genera `randomBytes(16).hex` y lo persiste en `getWorkflowStaticData('node')`.
- El payload de las notificaciones del proxy NO está documentado: `simplifyProxyEvent` simplifica solo si reconoce `{chat|inputs|userInput}`, si no entrega crudo.

**LiveConnectCallbackTrigger** — callback del chatbot (Flowbot). Contrato completo en la skill `liveconnect-chatbot-gateway` (repo liveconnect-super-agent):
- POST `{chat, inputs, userInput, intent, userFile, idcs}`; secret en query `?secret=` Y header `secret`; user-agent `PageGear-Lambda-Hook/x`.
- Primer turno: `userInput === ''` y el mensaje real está en `inputs.mensaje_inicial`.
- `chat.usuarios` es OBJETO indexado por id (no array); hay humano solo si alguna entrada tiene `isbot === 0`.
- Session ID: `inputs.id` → `chat.contacto.id` → `chat.id` → hash.
- LiveConnect espera respuesta SÍNCRONA `{status:1, status_message:'Ok', data:{actions:[...]}}` — la construye el workflow (Respond to Webhook); 10 tipos de action; SIEMPRE cerrar con `{type:'input'}` salvo delegación (sin `input` LiveConnect abandona el callback). El trigger NO responde actions: `responseMode` por expresión (default `responseNode`).
- Sin `webhookMethods` (la URL se pega a mano en el Flowbot). OJO: en n8n-workflow 1.120 el tipo de `webhookMethods.default` exige los 3 métodos — omitir el bloque entero, no hacer no-ops.
- Secret inválido en ambos triggers: `getResponseObject().status(403).json(...)` + `{noWebhookResponse:true}` (workflow no corre). Comparación con `timingSafeEqual`.

ESLint de triggers (el plugin los detecta por archivo `*Trigger.node.ts`): name/displayName sufijados con Trigger, `inputs: []`, `outputs: ['main']`, el parámetro Simplify DEBE llamarse `simple` con la description literal `Whether to return a simplified version of the response instead of the raw data`, NO agregar subtitle.

**LiveConnectCallbackResponse** ("LiveConnect Respuesta al Callback") — constructor visual de actions: fixedCollection `acciones.accion[]` con campo `tipo` + campos condicionales (`displayOptions.show.tipo` funciona entre hermanos dentro del fixedCollection, scope local del item). `toAction` valida obligatorios (IDs enteros >0 rechazando '' antes de `Number()`; URLs http(s)), `applyClosingRule` aplica la regla del input de cierre (delegación gana y elimina inputs), y responde el webhook con `this.sendResponse({body, headers, statusCode})` — API pública de IExecuteFunctions (interfaces.d.ts:733), no-op sin webhook esperando (NO copiar el guard "No Webhook node found" del core: su lista de triggers no incluye nodos comunitarios). Requiere el Callback Trigger en responseMode `responseNode` (default). Smoke: scripts/smoke-response.mjs.

## API LiveConnect — comportamiento real (verificado, no todo está en el spec)

1. **Envelope**: siempre `{ status, status_message, data }`. `status < 0` = error **aun con HTTP 200**. `handleLcResponse` lanza `NodeApiError` en ese caso y desanida `data` (salvo que el toggle global `fullResponse` esté activo).
2. **Token**: `POST /account/token {cKey, privateKey}`. El JWT de sesión llega en `data.token` **o en el campo raíz `PageGearToken` del body** (el schema `AccountToken` del spec no lo documenta). Viaja en el header `PageGearToken` y dura ~10 min.

   **Ciclo de vida del token (v0.4.1) — leer antes de tocar la credencial.** LiveConnect reporta el token vencido como **HTTP 200 con `status:-403`**, y n8n solo re-ejecuta `preAuthentication` ante un **401 real** (core: `credentials-helper.ts` `credentialsExpired` ← `request-helper-functions.ts`, catch de 401). Ese 401 nunca llega → el `sessionToken` guardado queda muerto. Solución en dos capas, en `GenericFunctions.ts`:
   - **Proactiva**: `refreshTokenIfExpired` (preSend colgado de la propiedad `resource` de `LiveConnect.node.ts`, que siempre está visible → cubre las 58 operaciones sin tocar descriptions) decodifica el `exp` del JWT y renueva 60 s antes. Caché en memoria por `sha256(cKey)` + `Map` de promesas en vuelo (RoutingNode lanza los ítems con `Promise.allSettled`, así que sin dedupe habría N emisiones).
   - **Reactiva**: `handleLcResponse` con `status === -403` **quema** el token en caché para que el siguiente request renueve aunque el `exp` no sea legible. **NO** falsear `httpCode: 401` ahí: el postReceive corre fuera del try/catch que dispara la renovación de n8n, así que no renovaría nada.

   **`authenticate` es una FUNCIÓN, no `IAuthenticateGeneric`** — y debe seguir siéndolo: n8n aplica la autenticación DESPUÉS de los preSend y la forma genérica sobrescribe el header sin condición, con lo que el token fresco sembrado por el preSend se perdería. La función respeta el `PageGearToken` ya presente y solo cae al `sessionToken` de la credencial si no hay ninguno.

   El `test` de la credencial lleva `rules` de tipo `responseSuccessBody` para `-403` y `-2`: sin ellas el botón "Probar conexión" dice "Connection successful!" aunque el API haya devuelto un error (el tester solo falla ante HTTP no-2xx).
3. **Trampas del token**: con keys faltantes el API responde HTTP 200 con `status:-2` **y un JWT anónimo** en `PageGearToken` que no sirve como sesión — por eso `preAuthentication` valida `status < 0` ANTES de extraer token. Con cKey/privateKey inválidos responde **404 en texto plano**.
4. **Archivos**: se envían por **URL pública** (`url` en el body), nunca como binarios.

## Workflow para actualizar cuando cambie el spec

1. `npm install --ignore-scripts` (ver gotcha isolated-vm abajo)
2. `npm run build && npm run verify` — descarga el spec actual del CDN y reporta:
   - `✗` endpoints/propiedades faltantes, inventados o con body/query equivocado (exit 1)
   - `~` required del spec no marcado required en el nodo
   - `-` propiedades del spec no expuestas
3. Para **operación nueva**: agregarla al `<Recurso>Description.ts` correspondiente (o crear archivo nuevo + export en `descriptions/index.ts` + import/spread en `LiveConnect.node.ts` + opción en el selector `resource`). Seguir el contrato de abajo.
4. `npm run build && npm run lint && npm run verify` hasta verde.
5. Subir `version` en `package.json`, commit, push, `gh release create vX.Y.Z` → el workflow publica a npm solo.

## Contrato de diseño (obligatorio para descripciones)

- Exports: `<camel>Operations` y `<camel>Fields` (`INodeProperties[]`).
- Cada opción de operation: `name` (inglés), `value` (camelCase), `action`, `description` (español, del spec) y:
  ```ts
  routing: {
  	request: { method: 'POST', url: '/ruta/del/spec' },
  	output: { postReceive: [handleLcResponse] },
  },
  ```
- Campo: `name` = **propiedad exacta del API** (snake_case: `id_canal`, `celular`…); `displayName` inglés Title Case; `description` español.
- Requeridos del spec → top-level con `required: true`. Opcionales → collection: `additionalFields` (create/send), `updateFields` (update), `filters` (getMany), `searchFields` (búsqueda por identificador).
- Tipos: integer→`number` (default 0), string→`string`, fecha→string con placeholder `YYYY-MM-DD`, enum 0/1→options No/Yes, boolean→description empieza con "Whether".
- Array de enteros → string CSV con:
  ```
  value: '={{ $value.toString().split(",").map((v) => v.trim()).filter((v) => v !== "").map((v) => Number(v)).filter((v) => !isNaN(v)) }}'
  ```
  (filtrar vacíos ANTES de `Number()`: `Number('') === 0` pasa el `!isNaN`).
- Objeto/array libre → `type: 'json'` con:
  ```
  value: '={{ typeof $value === "object" && $value !== null ? $value : JSON.parse($value || "{}") }}'
  ```
  (el `!== null` es obligatorio: `typeof null === "object"`).
- Listados = "Get Many" (`value: 'getMany'`); `limit` con `typeOptions: { minValue: 1 }`, default 50 y description exacta `Max number of results to return`; opciones ordenadas alfabéticamente; IDs siempre "… ID".
- En descriptions no escribir referencias tipo `tabla.id` — la regla `node-param-description-miscased-id` las rompe; usar "(tabla X)".

## Selectores dinámicos (v0.5.0)

Los campos de ID con endpoint de listado son desplegables: `type: 'options'` + `typeOptions: { loadOptionsMethod: '<método>' }` + `default: ''`, **sin tocar `name` ni `routing.send`** (el valor sigue siendo el ID plano → compatible con workflows anteriores). Los métodos viven en `LoadOptions.ts` y se registran con `methods = { loadOptions }` en los nodos.

Mapeo: `id_canal`→getChannels · `id_grupo`/`id_team`/`id_to_delegate`→getGroups · `id_usuario`/`id_responsable`/`id_asignado`/`idSupervisor`/`id_user`→getUsers · `id_pipeline`→getPipelines · `id_etapa_pipeline`→getStages (depende de `id_pipeline`) · `origen_lead`→getLeadOrigins · `canal_origen`→getLeadChannels · `id_categoria`→getCategories · `id_assistant`→getAssistants · `id_plantilla`→getWabaTemplates (depende de `id_canal`; su ID es string).

**Sin selector por falta de endpoint en el spec**: `id_tag`, `etiquetas`, `id_respuesta`, `id_empresa`, `id_contacto`, `id_deal`. Las dependencias se resuelven con el mapa `DEPENDENCY_PATHS` (`${resource}.${operation}.${campo}` → ruta exacta): n8n NO limpia los valores de los campos ocultos al cambiar de operación, así que probar varias rutas candidatas devolvía el valor de otra operación. La regla `node-param-display-name-wrong-for-dynamic-options` está desactivada (exige el literal inglés "Name or ID").

**Forma de la respuesta**: casi todos los listados devuelven `data` como array plano, pero `/direct/waba/getTemplates` lo anida en **`data.templates`** (+ `paging`). `lcList` normaliza con `pickRows` (array, o el primer array dentro del objeto); `getTemplate` devuelve UN objeto, así que se pide con `lcRequest` (crudo) — con `lcList` tomaría `components` por error.

**Refresco de selectores dependientes**: sin `typeOptions.loadOptionsDependsOn` las opciones quedan cacheadas y no se recargan al cambiar el campo del que dependen. Se declara con **ruta relativa `&`** (`['&id_canal']`, `['&id_pipeline']`), que resuelve al campo hermano y por eso sirve igual top-level que dentro de una colección (`node-parameters/path-utils.js:22`).

## Plantillas WABA: campo "Datos de la Plantilla" (v0.6.0)

`type: 'resourceMapper'` (`resourceMapperMethod: getTemplateFields`) que muestra las variables de la plantilla elegida **precargadas con los `example` de Meta** y editables. `ResourceMapperField.defaultValue` es lo que prellena (interfaces.d.ts:2321 · ResourceMapper.vue:93).

- `TemplateFields.ts` parsea los `components` crudos de Meta: BODY/HEADER TEXT → una variable por cada `{{n}}` **detectado en el texto** (no depende de que haya `example`, así nunca falta un dato obligatorio); HEADER IMAGE/VIDEO/DOCUMENT → un campo de URL cuyo **ID lleva el formato** (`header_media_IMAGE`) para no adivinarlo luego por la extensión; BUTTONS → un campo por botón con parámetro dinámico (URL con `{{n}}` o COPY_CODE). Carruseles (`cards`) NO soportados aún.
- Los valores llegan al body por un **preSend** (`applyTemplateData`), no por `routing.send`: un solo campo alimenta varias propiedades (`variables`, `variables_encabezado`, `url_*_encabezado`, `buttons`). **Lo que el usuario escriba en Campos Adicionales gana** sobre lo precargado.
- IDs ordenables por sufijo numérico (`body_1`…`body_10`); el comparador manda los IDs sin número al final para no volverse inconsistente.
- El formato de `buttons` en el body no está documentado en el spec: se envía `{index, parameter}` como mejor esfuerzo y el campo `buttons` (json) permite sobrescribirlo.

## Gotchas de build/publicación

- **`npm install --ignore-scripts` SIEMPRE** (local y CI): `isolated-vm`, transitiva de n8n-workflow, no compila en Node ≥ 26 ni en runners sin toolchain nativa. Ninguna dependencia propia necesita scripts de instalación.
- n8n-workflow ≥ 1.9x: `NodeConnectionType` es solo tipo; en runtime usar strings `['main']` (el autofix de eslint lo deja así).
- `npm run lintfix` arregla la mayoría de reglas n8n; correr `lint` después para ver lo que queda.
- Publicación: secret `NPM_TOKEN` del repo debe ser token npm **Automation** (classic) o granular con **Bypass 2FA** — un token Publish normal falla con 403 si la cuenta exige 2FA.
- El tarball solo lleva `dist/` (`files` en package.json); los íconos los copia `gulp build:icons`.

## Comandos

```bash
npm install --ignore-scripts   # instalar (NUNCA npm install a secas)
npm run build                  # tsc + íconos
npm run lint / npm run lintfix
npm run verify                 # diff dist/ vs OpenAPI del CDN (acepta spec local como arg)
npm run smoke                  # humo de los triggers (payload real + mocks de n8n)
```

Repo: https://github.com/Exus-Agencia-Web/liveconnect-n8n · npm: `n8n-nodes-liveconnect`
