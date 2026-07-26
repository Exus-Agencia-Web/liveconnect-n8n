# Arquitectura del paquete

Paquete comunitario de n8n que expone el API público de LiveConnect. Un nodo de acciones **declarativo** (sin `execute()`), dos triggers y un nodo de respuesta, más una credencial que gestiona el JWT.

## Mapa de archivos

```
credentials/
  LiveConnectApi.credentials.ts     cKey+privateKey → JWT (preAuthentication) · authenticate como FUNCIÓN · test con rules

nodes/LiveConnect/
  LiveConnect.node.ts               nodo de acciones: selector de recurso + spread de las descriptions
  GenericFunctions.ts               token (refresco proactivo y reactivo), handleLcResponse, prepareTemplateSend
  LoadOptions.ts                    10 métodos loadOptions + lcRequest/lcList/pickRows + DEPENDENCY_PATHS
  TemplateFields.ts                 parser de plantillas WABA (Gupshup y Meta) + codificación del valor del selector
  TriggerFunctions.ts               secret (timingSafeEqual), sessionId, simplify*, lcHookRequest
  ActionsFunctions.ts               constructor de actions del callback: toAction, applyClosingRule, buildEnvelope
  LiveConnectProxyTrigger.node.ts   trigger de notificaciones del proxy (registra el webhook vía API)
  LiveConnectCallbackTrigger.node.ts trigger de callbacks del Flowbot (URL manual, respuesta síncrona)
  LiveConnectCallbackResponse.node.ts constructor visual de actions; responde el webhook con sendResponse()
  descriptions/<Recurso>Description.ts  una por recurso: <camel>Operations + <camel>Fields
  descriptions/index.ts             re-exporta todo

scripts/
  verify-spec.mjs                   diff de dist/ contra el OpenAPI del CDN (npm run verify)
  smoke-triggers.mjs                humo de los dos triggers
  smoke-response.mjs                humo del nodo de respuesta
  smoke-token.mjs                   humo del ciclo de vida del token
  smoke-loadoptions.mjs             humo de los selectores dinámicos
  smoke-template-fields.mjs         humo de plantillas WABA (incluye visibilidad real de campos)

examples/                           workflows importables + su README
docs/                               esta documentación
.github/workflows/                  ci.yml (build+lint) · release.yml (release de GitHub → npm)
```

## Los cuatro nodos

| Nodo | Tipo | Por qué es así |
|---|---|---|
| **LiveConnect** | Declarativo, sin `execute()` | 18 recursos y 58 operaciones; cada operación lleva `routing.request` y cada campo `routing.send`. Menos código, menos superficie de error |
| **LiveConnect Proxy Trigger** | Programático (`webhook()` + `webhookMethods`) | Es la única forma de hacer triggers en n8n. Registra y elimina el webhook del canal por API |
| **LiveConnect Callback Trigger** | Programático, sin `webhookMethods` | El Flowbot no tiene API de registro: la URL se pega a mano |
| **LiveConnect Respuesta al Callback** | Programático con `execute()` | Construye las actions visualmente y responde el webhook con `sendResponse()` |

Los tres nodos programáticos comparten helpers con el declarativo (token, envelope, selectores), así que un arreglo en `GenericFunctions.ts` los cubre a todos.

## Cómo fluye una operación del nodo declarativo

1. El usuario elige **Recurso** y **Operación**. El campo `resource` lleva un `routing.send.preSend` con `refreshTokenIfExpired` — sin `property`, así que no envía nada al cuerpo; existe solo para que **ese preSend corra en las 58 operaciones** (ver [05-lecciones-n8n.md](05-lecciones-n8n.md)).
2. n8n arma la petición: `routing.request` (method + url) de la operación, y una propiedad de body/query por cada campo con `routing.send`.
3. Corren los `preSend` (todos los de los campos **visibles**), después `authenticate` de la credencial.
4. La respuesta pasa por `handleLcResponse` (`postReceive` de cada operación): valida el envelope, lanza `NodeApiError` si `status < 0` y desanida `data`.

## Convenciones de las descriptions

`ContactDescription.ts` es el **template canónico**: al añadir un recurso, imitar su estilo. El contrato completo (nombres, tipos, colecciones, expresiones para CSV y JSON) está en [06-mantenimiento.md](06-mantenimiento.md).

## Idioma

La UI va en **español**: `displayName`, `description`, `action`, labels de `options`, placeholders. Los `name` y `value` internos (propiedades del API en snake_case, operaciones en camelCase) **no se traducen nunca**: cambiarlos rompe los workflows ya construidos. `docs-glosario-es.md` (raíz) fija el vocabulario.
