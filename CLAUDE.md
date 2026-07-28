# CLAUDE.md — n8n-nodes-liveconnect

Nodo comunitario **declarativo** de n8n para el API público de LiveConnect. La **fuente de verdad** es el OpenAPI:

```
https://cdn.liveconnect.chat/liveconnect/public-openapi.json
```

Todo cambio al nodo debe derivarse de ese spec. No inventar campos ni endpoints.

## 📚 Lee `docs/` antes de tocar el código

`docs/` es la memoria del proyecto: el comportamiento real del API, las trampas del runtime de n8n y **lo que ya se intentó y falló**. Este archivo es solo el resumen operativo.

| Documento | Léelo antes de… |
|---|---|
| [docs/README.md](docs/README.md) | índice y **cómo mantener la documentación** |
| [docs/01-arquitectura.md](docs/01-arquitectura.md) | tocar cualquier cosa |
| [docs/02-api-liveconnect.md](docs/02-api-liveconnect.md) | añadir o cambiar operaciones, tocar auth |
| [docs/03-plantillas-waba.md](docs/03-plantillas-waba.md) | tocar `Enviar Plantilla` |
| [docs/04-triggers-y-callbacks.md](docs/04-triggers-y-callbacks.md) | tocar triggers o respuestas de callback |
| [docs/05-lecciones-n8n.md](docs/05-lecciones-n8n.md) | cualquier cambio de UI, routing, auth o ESLint |
| [docs/06-mantenimiento.md](docs/06-mantenimiento.md) | actualizar desde el spec, probar, verificar o publicar |
| [docs/07-historial-decisiones.md](docs/07-historial-decisiones.md) | proponer un rediseño |
| [docs/08-paquete-espanol.md](docs/08-paquete-espanol.md) | tocar cualquier texto visible del nodo, o el paquete español |

**Al terminar un cambio, actualiza la documentación en el mismo commit** (qué va en qué archivo: `docs/README.md` → "Cómo mantener esta documentación"). Si descubres algo que contradice este resumen, corrige los dos.

## Arquitectura (resumen)

```
credentials/LiveConnectApi.credentials.ts   # cKey+privateKey → JWT · authenticate como FUNCIÓN · test con rules
nodes/LiveConnect/
  LiveConnect.node.ts                       # nodo declarativo: selector de resource + spread de descriptions + customOperations.callbackResponse
  GenericFunctions.ts                       # token (proactivo/reactivo), handleLcResponse, prepareTemplateSend, LC_CREDENTIALS (nombre mutable de la credencial)
  LoadOptions.ts                            # 10 métodos loadOptions + lcRequest/lcList/pickRows + DEPENDENCY_PATHS
  TemplateFields.ts                         # parser de plantillas (Gupshup y Meta) + valor codificado del selector
  TriggerFunctions.ts                       # secret, sessionId, simplify* (claves de salida en inglés), lcHookRequest
  ActionsFunctions.ts                       # toAction, applyClosingRule, buildEnvelope — usadas por el recurso callbackResponse
  LiveConnectProxyTrigger.node.ts           # trigger del proxy (registra el webhook vía API)
  LiveConnectCallbackTrigger.node.ts        # trigger del Flowbot (URL manual, respuesta síncrona)
  descriptions/<Recurso>Description.ts      # 1 archivo por recurso: <camel>Operations + <camel>Fields
  descriptions/CallbackResponseDescription.ts # fields del recurso callbackResponse (antes un nodo aparte)
scripts/verify-spec.mjs                     # diff dist/ vs OpenAPI (npm run verify); excluye el recurso callbackResponse (no sale del spec)
scripts/smoke-*.mjs                         # 116 pruebas de humo (npm run smoke)
scripts/build-es-package.mjs + i18n-*.mjs   # genera dist-es/ (n8n-nodes-liveconnect-es), con su propia credencial — ver docs/08-paquete-espanol.md
eslint.config.mjs                           # config oficial del escáner de nodos verificados (npm run lint)
.github/workflows/                          # ci.yml (build+lint+verify+smoke+build:es) · release.yml (release → publica LOS DOS paquetes a npm)
```

18 recursos, 58 operaciones del spec (todas menos `/account/token`, que la maneja la credencial) + 1 recurso local (`callbackResponse`, no sale del OpenAPI), 2 triggers. **El paquete registra 3 nodos** (LiveConnect + los 2 triggers): n8n solo admite un nodo regular por paquete verificado, así que el antiguo nodo de respuesta separado pasó a ser el recurso `callbackResponse`, resuelto por `customOperations` — el mecanismo que define `n8n-workflow` para que un nodo declarativo tenga una operación con implementación propia sin volver programáticas las otras 58. `ContactDescription.ts` es el **template canónico** para recursos nuevos. Detalle en [docs/01-arquitectura.md](docs/01-arquitectura.md).

## Lo que no se puede olvidar

**API** (detalle en [docs/02-api-liveconnect.md](docs/02-api-liveconnect.md)):
1. Envelope `{status, status_message, data}`: **`status < 0` es error aun con HTTP 200**. Lo maneja `handleLcResponse`.
2. El JWT llega en `data.token` **o** en el campo raíz `PageGearToken`; dura ~10 min; viaja en el header `PageGearToken`. Con keys faltantes el API devuelve `status:-2` **y un JWT anónimo inservible** → validar `status < 0` ANTES de leer el token. Con keys inválidas, 404 en texto plano.
3. Token vencido = **HTTP 200 con `status:-403`**, nunca 401 → n8n no renueva solo. Doble capa en `GenericFunctions.ts` (preSend proactivo colgado de `resource` + quemado reactivo ante `-403`) y `authenticate` como **función**. No falsear un 401 desde el postReceive: el postReceive corre fuera del try/catch que dispara la renovación.
4. Los archivos se envían **por URL pública**, nunca como binarios.
5. `/direct/waba/getTemplates` anida en `data.templates`; `/direct/waba/getTemplate` identifica por el ID de **Meta** y rechaza el de LiveConnect (`-400`).

**n8n** (detalle en [docs/05-lecciones-n8n.md](docs/05-lecciones-n8n.md)):
1. **Los `preSend` de campos ocultos no se ejecutan** → cuelga los preSend de propiedades que no se puedan ocultar.
2. `displayOptions` no consulta el API ni evalúa expresiones → codifica en el `value` del selector lo que la UI necesita saber y condiciona con `_cnd.regex`.
3. n8n **no limpia** los valores de los campos ocultos → recorta/valida en el preSend y resuelve dependencias con rutas explícitas.
4. Selectores dependientes: `loadOptionsDependsOn` con ruta relativa `&`.
5. `npm install --ignore-scripts` SIEMPRE (isolated-vm no compila en Node ≥ 26).

**UI en inglés** (desde que se preparó la verificación de nodos de n8n): `displayName` en Title Case, `description` en sentence case, `action`, labels de `options` y placeholders en inglés; los `name`/`value` internos **no cambian nunca**. Literales que exige el escáner: `Name or ID` y `Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>` en selectores dinámicos, `Max number of results to return` en `limit`, descripciones booleanas con `Whether`. Ya no hay reglas de ESLint desactivadas por idioma — detalle en [docs/05-lecciones-n8n.md](docs/05-lecciones-n8n.md) §11. Por el mismo criterio, las claves que los dos triggers exponen al workflow (`simplifyCallbackEvent`/`simplifyProxyEvent` en `TriggerFunctions.ts`) son identificadores en inglés: `message`, `isFirstTurn`, `hasAttachment`, `hasHumanAgent`, `conversationId`, `channelId`, `contact`, `sessionId`, `inputs`, `intent`, `raw`. `raw` sigue entregando el payload de LiveConnect con sus nombres originales, sin tocar.

**El código fuente, comentarios incluidos, está en inglés**; `docs/` sigue en español.

**El español se publica aparte**: `n8n-nodes-liveconnect-es`, generado desde este mismo código aplicando `i18n/es.json` en tiempo de build (`npm run build:es`). Declara su propia credencial (`liveConnectApiEs` en vez de `liveConnectApi`, vía el objeto mutable `LC_CREDENTIALS` de `GenericFunctions.ts`), así que **los dos paquetes pueden convivir en la misma instancia de n8n**. Detalle en [docs/08-paquete-espanol.md](docs/08-paquete-espanol.md).

**Ícono**: `liveconnect2.svg` (claro) y `liveconnect2.dark.svg` (oscuro) — el escáner de nodos verificados prohíbe que las dos variantes `{light, dark}` apunten al mismo archivo. n8n cachea los íconos con fuerza — si se cambia el dibujo, **renombrar el archivo**.

## Verificación de n8n

Guía: <https://docs.n8n.io/connect/create-nodes/build-your-node/reference/verification-guidelines>. Interfaz y documentación en inglés, sin dependencias runtime, licencia MIT, TypeScript, **un solo nodo regular por paquete** (los triggers no cuentan), publicación desde GitHub Actions con provenance (obligatorio desde el 1 de mayo de 2026). Comprobación real: `npx @n8n/scan-community-package n8n-nodes-liveconnect` (solo funciona contra una versión ya publicada). En local, `npm run lint` corre **dos** linters — `n8n-node lint` (más laxo) y `scripts/lint-scanner.mjs` (construye la config real del escáner con `buildScanConfig()`) — porque el primero por sí solo dejó pasar 2 errores que el escáner real sí encontró (v1.0.0). Envío: <https://creators.n8n.io/nodes>. Detalle y resultado medido en [docs/06-mantenimiento.md](docs/06-mantenimiento.md) § Verificación de n8n.

## Plantillas WABA (lo mínimo)

LiveConnect trabaja con **varios proveedores de WhatsApp** y cada uno acepta un identificador distinto: **ID (UUID) en Gupshup, nombre en Meta directo** — lo decide `templateSendIdentifier` por la forma de la fila. El selector codifica en su valor lo que la plantilla necesita (`<id>|v2|IMAGE`) para poder mostrar solo esos campos, y `prepareTemplateSend` (colgado de `numero`, que nunca se oculta) lee la plantilla del **listado** cacheado por canal, recorta las variables y valida nombrando el hueco.

Antes de rediseñar esta operación, lee [docs/03-plantillas-waba.md](docs/03-plantillas-waba.md) y [docs/07-historial-decisiones.md](docs/07-historial-decisiones.md): ya se intentaron cinco enfoques.

## Workflow para actualizar cuando cambie el spec

1. `npm install --ignore-scripts`
2. `npm run build && npm run verify` — reporta `✗` (errores duros, exit 1), `~` (required no marcado) y `-` (propiedad no expuesta).
3. Operación nueva → al `<Recurso>Description.ts` que toque (o archivo nuevo + export en `descriptions/index.ts` + import/spread en `LiveConnect.node.ts` + opción en el selector `resource`). Contrato en [docs/06-mantenimiento.md](docs/06-mantenimiento.md). Todo texto visible va en inglés; añade su traducción a `i18n/es.json` (`npm run i18n:status` dice qué falta) — ver [docs/08-paquete-espanol.md](docs/08-paquete-espanol.md).
4. `npm run build && npm run lint && npm run verify && npm run smoke` hasta verde.
5. Subir `version`, commit, push, `gh release create vX.Y.Z` → publica en npm **los dos paquetes** (`n8n-nodes-liveconnect` y `n8n-nodes-liveconnect-es`).
6. Actualizar `docs/` y añadir la entrada en `docs/07-historial-decisiones.md`.

## Comandos

```bash
npm install --ignore-scripts   # instalar (NUNCA npm install a secas)
npm run build                  # tsc + íconos
npm run build:es               # build + genera dist-es/ (paquete n8n-nodes-liveconnect-es, credencial liveConnectApiEs)
npm run lint / npm run lintfix # dos linters: n8n-node lint + scripts/lint-scanner.mjs (config real del escáner oficial)
npm run verify                 # diff dist/ vs OpenAPI del CDN (acepta un spec local como argumento)
npm run smoke                  # 116 pruebas de humo (109 del paquete principal + 7 del paquete español)
npm run i18n:status            # qué textos nuevos faltan traducir a español
npm run scan                   # npx @n8n/scan-community-package (solo funciona contra una versión ya publicada)
```

Repo: https://github.com/Exus-Agencia-Web/liveconnect-n8n · npm: `n8n-nodes-liveconnect` (inglés) y `n8n-nodes-liveconnect-es` (español, ver [docs/08-paquete-espanol.md](docs/08-paquete-espanol.md))
