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
| [docs/06-mantenimiento.md](docs/06-mantenimiento.md) | actualizar desde el spec, probar o publicar |
| [docs/07-historial-decisiones.md](docs/07-historial-decisiones.md) | proponer un rediseño |

**Al terminar un cambio, actualiza la documentación en el mismo commit** (qué va en qué archivo: `docs/README.md` → "Cómo mantener esta documentación"). Si descubres algo que contradice este resumen, corrige los dos.

## Arquitectura (resumen)

```
credentials/LiveConnectApi.credentials.ts   # cKey+privateKey → JWT · authenticate como FUNCIÓN · test con rules
nodes/LiveConnect/
  LiveConnect.node.ts                       # nodo declarativo: selector de resource + spread de descriptions
  GenericFunctions.ts                       # token (proactivo/reactivo), handleLcResponse, prepareTemplateSend
  LoadOptions.ts                            # 10 métodos loadOptions + lcRequest/lcList/pickRows + DEPENDENCY_PATHS
  TemplateFields.ts                         # parser de plantillas (Gupshup y Meta) + valor codificado del selector
  TriggerFunctions.ts                       # secret, sessionId, simplify*, lcHookRequest
  ActionsFunctions.ts                       # toAction, applyClosingRule, buildEnvelope
  LiveConnectProxyTrigger.node.ts           # trigger del proxy (registra el webhook vía API)
  LiveConnectCallbackTrigger.node.ts        # trigger del Flowbot (URL manual, respuesta síncrona)
  LiveConnectCallbackResponse.node.ts       # constructor visual de actions; responde con sendResponse()
  descriptions/<Recurso>Description.ts      # 1 archivo por recurso: <camel>Operations + <camel>Fields
scripts/verify-spec.mjs                     # diff dist/ vs OpenAPI (npm run verify)
scripts/smoke-*.mjs                         # 101 pruebas de humo (npm run smoke)
.github/workflows/                          # ci.yml (build+lint) · release.yml (release → npm publish)
```

18 recursos, 58 operaciones (todas las del spec menos `/account/token`, que la maneja la credencial), 2 triggers y 1 nodo de respuesta. `ContactDescription.ts` es el **template canónico** para recursos nuevos. Detalle en [docs/01-arquitectura.md](docs/01-arquitectura.md).

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

**UI en español** (desde v0.3.0): `displayName`, labels de `options`, `action`, `description` y placeholders en español; los `name`/`value` internos **no cambian nunca**. Preposiciones y artículos en minúscula ("ID del Canal", no "ID Del Canal").

⚠️ **`node-param-operation-option-action-miscased` debe seguir DESACTIVADA**: su autofix pasa cada `action` por `sentence-case` y **borra los diacríticos** (así se rompieron 25 actions en v0.3.0). Tras cualquier `npm run lintfix`:

```bash
grep -rho "action: '[^']*'" nodes/LiveConnect/descriptions/*.ts | grep -cE "[áéíóúñ]"   # debe dar 25
```

**Ícono**: `liveconnect2.svg`. n8n cachea los íconos con fuerza — si se cambia el dibujo, **renombrar el archivo**.

## Plantillas WABA (lo mínimo)

LiveConnect trabaja con **varios proveedores de WhatsApp** y cada uno acepta un identificador distinto: **ID (UUID) en Gupshup, nombre en Meta directo** — lo decide `templateSendIdentifier` por la forma de la fila. El selector codifica en su valor lo que la plantilla necesita (`<id>|v2|IMAGE`) para poder mostrar solo esos campos, y `prepareTemplateSend` (colgado de `numero`, que nunca se oculta) lee la plantilla del **listado** cacheado por canal, recorta las variables y valida nombrando el hueco.

Antes de rediseñar esta operación, lee [docs/03-plantillas-waba.md](docs/03-plantillas-waba.md) y [docs/07-historial-decisiones.md](docs/07-historial-decisiones.md): ya se intentaron cinco enfoques.

## Workflow para actualizar cuando cambie el spec

1. `npm install --ignore-scripts`
2. `npm run build && npm run verify` — reporta `✗` (errores duros, exit 1), `~` (required no marcado) y `-` (propiedad no expuesta).
3. Operación nueva → al `<Recurso>Description.ts` que toque (o archivo nuevo + export en `descriptions/index.ts` + import/spread en `LiveConnect.node.ts` + opción en el selector `resource`). Contrato en [docs/06-mantenimiento.md](docs/06-mantenimiento.md).
4. `npm run build && npm run lint && npm run verify && npm run smoke` hasta verde.
5. Subir `version`, commit, push, `gh release create vX.Y.Z` → publica en npm.
6. Actualizar `docs/` y añadir la entrada en `docs/07-historial-decisiones.md`.

## Comandos

```bash
npm install --ignore-scripts   # instalar (NUNCA npm install a secas)
npm run build                  # tsc + íconos
npm run lint / npm run lintfix
npm run verify                 # diff dist/ vs OpenAPI del CDN (acepta un spec local como argumento)
npm run smoke                  # 101 pruebas de humo (triggers, respuesta, token, selectores, plantillas)
```

Repo: https://github.com/Exus-Agencia-Web/liveconnect-n8n · npm: `n8n-nodes-liveconnect`
