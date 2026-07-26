# El API de LiveConnect en la práctica

El OpenAPI (<https://cdn.liveconnect.chat/liveconnect/public-openapi.json>) es la fuente de verdad para **qué existe**. Este documento recoge **cómo se comporta de verdad**, que es otra cosa. Todo lo de aquí está verificado contra el API real; donde se pudo, se indica cómo.

Base URL: `https://api.liveconnect.chat/prod`

## 1. El envelope y el error con HTTP 200

Todas las respuestas tienen la forma:

```json
{ "status": 1, "status_message": "Ok", "data": … }
```

**`status < 0` es un error aunque el HTTP sea 200.** Es la trampa central del API: cualquier integración que solo mire el código HTTP dará por buenas las respuestas fallidas.

`handleLcResponse` (postReceive compartido por las 58 operaciones) hace lo siguiente:

- `status < 0` → lanza `NodeApiError` con el `status_message` del API.
- éxito → devuelve `data` desanidado (una fila por elemento si es array), salvo que el toggle **Devolver Respuesta Completa** esté activo.

Códigos vistos: `-1` (error de negocio, p. ej. plantilla inválida), `-2` (faltan credenciales), `-400` (identificador inválido), `-403` (token de sesión vencido o inválido).

## 2. Autenticación y ciclo de vida del token

### Emisión

`POST /account/token {cKey, privateKey}` → el JWT de sesión llega **en `data.token` o en el campo raíz `PageGearToken` del cuerpo**. El schema `AccountToken` del spec no documenta la segunda forma; hay que aceptar las dos.

El token viaja en el header **`PageGearToken`** y dura **~10 minutos**.

### Trampas comprobadas

- Con **keys faltantes**: HTTP 200, `status:-2` **y un JWT anónimo** en `PageGearToken` que no sirve como sesión. Por eso `extractSessionToken` valida `status < 0` **antes** de leer el token.
- Con **cKey/privateKey inválidos**: HTTP **404 en texto plano** (no JSON, no envelope).
- Con **token vencido**: HTTP **200 con `status:-403`** — nunca un 401.

### Por qué eso importa (y cómo se resolvió)

n8n solo re-ejecuta `preAuthentication` ante un **401 real** (`credentials-helper.ts` → `credentialsExpired`, disparado desde el catch de 401 en `request-helper-functions.ts`). Como LiveConnect nunca devuelve 401, el `sessionToken` guardado en la credencial quedaba muerto y todas las operaciones fallaban con `-403`.

Solución en dos capas, en `GenericFunctions.ts`:

- **Proactiva** — `refreshTokenIfExpired`, un `preSend` colgado de la propiedad `resource` (siempre visible → cubre las 58 operaciones sin tocar las descriptions). Decodifica el `exp` del JWT y renueva 60 s antes. Caché en memoria por `sha256(cKey)` y un `Map` de promesas en vuelo: `RoutingNode` lanza los ítems con `Promise.allSettled`, así que sin deduplicación habría N emisiones simultáneas.
- **Reactiva** — `handleLcResponse` con `status === -403` **quema** el token en caché para que la siguiente petición renueve, aunque el `exp` no fuera legible.

Dos cosas que parecen buena idea y no lo son:

- **Falsear `httpCode: 401` en el postReceive** para forzar la renovación de n8n: el postReceive corre **fuera** del try/catch que dispara esa renovación, así que no renueva nada.
- **Declarar `authenticate` como `IAuthenticateGeneric`**: n8n aplica la autenticación **después** de los preSend, y la forma genérica sobrescribe el header sin condición — se perdería el token fresco que sembró el preSend. Debe seguir siendo una **función** que respete el `PageGearToken` ya presente.

### Prueba de conexión de la credencial

El tester de n8n solo falla ante HTTP no-2xx, así que con `-403` diría "Connection successful!". Por eso el `test` lleva `rules` de tipo `responseSuccessBody` para `-403` y `-2`.

### Rutas que no pasan por el preSend

Los `loadOptions`, los `webhookMethods` de los triggers y las consultas internas (p. ej. el listado de plantillas del preSend de envío) **no** pasan por el routing del nodo. Todos llaman a `ensureFreshToken(...)` y siembran el header a mano.

## 3. Formas de respuesta que no son uniformes

- Casi todos los listados devuelven `data` como **array plano**.
- **`/direct/waba/getTemplates` devuelve `data` como objeto `{ templates: [...], paging }`.** `lcList` lo normaliza con `pickRows` (array directo, o el primer array que encuentre dentro del objeto, probando primero claves conocidas).
- `/direct/waba/getTemplate` devuelve **un objeto**, no una lista: si se pasara por `lcList` tomaría por error el array `components`.

Regla práctica: al añadir un listado nuevo, comprobar la forma real antes de asumir que es un array.

## 4. `getTemplate` vs `getTemplates` (importante)

`POST /direct/waba/getTemplate` identifica la plantilla por el **ID de Meta** (`id`) o por un **nombre alterno** (`id_template`). Con el ID de LiveConnect responde:

```
status: -400 — "Invalid template id provided."
```

Comprobado en vivo, ejecutando la operación *Obtener Plantilla* del propio nodo contra el canal 4695.

**Consecuencia**: el preSend de envío **no puede** usar `getTemplate` para leer la plantilla que el usuario acaba de elegir en el selector (cuyo valor es el ID de LiveConnect). Usa el **listado** `getTemplates`, cacheado por canal. En v0.9.0 esto pasó inadvertido porque el fallo se tragaba en un `catch`: el nodo enviaba plantillas con las variables vacías sin avisar.

## 5. Archivos

Los archivos (imágenes, documentos, video) se envían **por URL pública** en el cuerpo, nunca como binarios. La URL debe ser accesible desde internet.

## 6. Webhook del proxy

- `POST /proxy/setWebhook {id_canal, url, estado, secret}`: `estado: 1` da de alta **o reemplaza** — hay **un solo slot por canal**, así que dos workflows activos con el mismo canal se pisan. `estado` distinto de 1 elimina.
- `POST /proxy/getWebhook {id_canal}`: devuelve `webhook`, `secret` y un `TTL` (epoch de DynamoDB, en segundos). **Un TTL vencido significa que el registro ya no existe**: hay que volver a registrar.
- El **payload de las notificaciones del proxy no está documentado**. `simplifyProxyEvent` solo simplifica si reconoce la forma `{chat|inputs|userInput}`; en cualquier otro caso entrega el cuerpo crudo.

## 7. Callbacks del Flowbot

Contrato completo en [04-triggers-y-callbacks.md](04-triggers-y-callbacks.md). Lo esencial: el callback exige **respuesta síncrona** con `{status:1, status_message:'Ok', data:{actions:[...]}}` y el secret llega **tanto en la query (`?secret=`) como en el header `secret`**.

## 8. Plantillas de WhatsApp

Tienen su propio documento porque el API delega en **varios proveedores** y cada uno se comporta distinto: [03-plantillas-waba.md](03-plantillas-waba.md).
