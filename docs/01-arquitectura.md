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
  smoke-i18n.mjs                    humo del paquete español generado (dist-es/)
  build-es-package.mjs              genera dist-es/ (paquete n8n-nodes-liveconnect-es)
  extract-i18n.mjs / i18n-status.mjs / i18n-paths.mjs / i18n-runtime.js   diccionario de traducción

i18n/
  es.json                            diccionario de traducción (1065 textos, 100% cobertura)
  README.es.md                       README del paquete n8n-nodes-liveconnect-es

examples/                           workflows importables + su README
docs/                               esta documentación
eslint.config.mjs                   config oficial del escáner de nodos verificados (npm run lint)
.github/workflows/                  ci.yml (build+lint) · release.yml (release de GitHub → publica los DOS paquetes a npm)
```

El sistema de traducción (por qué el español es un paquete aparte, cómo se genera y cómo se mantiene el diccionario) tiene su propio documento: [08-paquete-espanol.md](08-paquete-espanol.md).

## Los cuatro nodos

| Nodo | Tipo | Por qué es así |
|---|---|---|
| **LiveConnect** | Declarativo, sin `execute()` | 18 recursos y 58 operaciones; cada operación lleva `routing.request` y cada campo `routing.send`. Menos código, menos superficie de error |
| **LiveConnect Proxy Trigger** | Programático (`webhook()` + `webhookMethods`) | Es la única forma de hacer triggers en n8n. Registra y elimina el webhook del canal por API |
| **LiveConnect Callback Trigger** | Programático, `webhookMethods` no-op | El Flowbot no tiene API de registro (la URL se pega a mano), pero el escáner de nodos verificados exige los tres métodos igual — ver [04-triggers-y-callbacks.md](04-triggers-y-callbacks.md) |
| **LiveConnect Respuesta al Callback** | Programático con `execute()` | Construye las actions visualmente y responde el webhook con `sendResponse()` |

Los tres nodos programáticos comparten helpers con el declarativo (token, envelope, selectores), así que un arreglo en `GenericFunctions.ts` los cubre a todos.

Los cuatro nodos declaran `usableAsTool: true` (utilizables como herramienta de un AI Agent) y `subtitle`. Los cuatro (y la credencial) usan `icon: { light, dark }` con dos archivos SVG distintos — el escáner de nodos verificados (`icon-validation` / `icon-prefer-themed-variants`) exige las dos variantes y prohíbe que apunten al mismo archivo, de ahí `liveconnect2.dark.svg` junto a `liveconnect2.svg`. La credencial declara su propio `icon` y el campo `sessionToken` lleva `typeOptions.password: true`.

## Cómo fluye una operación del nodo declarativo

1. El usuario elige **Recurso** y **Operación**. El campo `resource` lleva un `routing.send.preSend` con `refreshTokenIfExpired` — sin `property`, así que no envía nada al cuerpo; existe solo para que **ese preSend corra en las 58 operaciones** (ver [05-lecciones-n8n.md](05-lecciones-n8n.md)).
2. n8n arma la petición: `routing.request` (method + url) de la operación, y una propiedad de body/query por cada campo con `routing.send`.
3. Corren los `preSend` (todos los de los campos **visibles**), después `authenticate` de la credencial.
4. La respuesta pasa por `handleLcResponse` (`postReceive` de cada operación): valida el envelope, lanza `NodeApiError` si `status < 0` y desanida `data`.

## Convenciones de las descriptions

`ContactDescription.ts` es el **template canónico**: al añadir un recurso, imitar su estilo. El contrato completo (nombres, tipos, colecciones, expresiones para CSV y JSON) está en [06-mantenimiento.md](06-mantenimiento.md).

## Idioma

La interfaz del paquete principal va en **inglés** (`displayName` en Title Case, `description` en sentence case, `action`, labels de `options`, placeholders): lo exige la verificación de nodos comunitarios de n8n. Los `name` y `value` internos (propiedades del API en snake_case, operaciones en camelCase) **no se traducen nunca**: cambiarlos rompe los workflows ya construidos.

El español no desapareció: se publica como paquete aparte, `n8n-nodes-liveconnect-es`, generado desde este mismo código en tiempo de build aplicando el diccionario `i18n/es.json`. Detalle completo en [08-paquete-espanol.md](08-paquete-espanol.md).
