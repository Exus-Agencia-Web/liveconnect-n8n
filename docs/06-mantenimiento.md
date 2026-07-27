# Mantenimiento: actualizar, probar y publicar

## Comandos

```bash
npm install --ignore-scripts   # instalar (NUNCA npm install a secas — ver lecciones-n8n §12)
npm run build                  # tsc + copia de íconos
npm run build:es               # build + genera dist-es/ (paquete n8n-nodes-liveconnect-es) — ver 08-paquete-espanol.md
npm run lint / npm run lintfix # n8n-node lint — la MISMA config del escáner oficial (ver § Verificación de n8n)
npm run verify                 # diff de dist/ contra el OpenAPI del CDN (acepta un spec local como argumento)
npm run smoke                  # 114 pruebas: triggers, nodo de respuesta, token, selectores, plantillas + 5 del paquete español
npm run i18n:status            # qué textos nuevos faltan traducir a español (no escribe nada)
npm run scan                   # npx @n8n/scan-community-package — solo funciona contra una versión YA publicada en npm
```

## Actualizar el nodo cuando cambia el OpenAPI

1. `npm install --ignore-scripts`
2. `npm run build && npm run verify`. El verificador reporta:
   - `✗` endpoints o propiedades faltantes, inventados o con body/query equivocado → **sale con código 1**
   - `~` un `required` del spec que el nodo no marca como requerido
   - `-` propiedades del spec que el nodo no expone (cobertura)
3. Para una **operación nueva**: añadirla al `<Recurso>Description.ts` correspondiente, o crear el archivo y registrarlo en `descriptions/index.ts`, importarlo/esparcirlo en `LiveConnect.node.ts` y añadir la opción al selector `resource`.
4. `npm run build && npm run lint && npm run verify && npm run smoke` hasta verde.
5. Subir `version` en `package.json`, commit, push y `gh release create vX.Y.Z` → el workflow publica en npm.

## Contrato de las descriptions (obligatorio)

- Exports: `<camel>Operations` y `<camel>Fields`, ambos `INodeProperties[]`.
- Cada opción de operación lleva `name` (Title Case inglés), `value` (camelCase), `action` (oración corta en inglés, p. ej. `Create a contact`) y `description` en inglés, sentence case, tomada del spec, más:

  ```ts
  routing: {
  	request: { method: 'POST', url: '/ruta/del/spec' },
  	output: { postReceive: [handleLcResponse] },
  },
  ```

- Campo: `name` = **propiedad exacta del API** (snake_case: `id_canal`, `celular`…, nunca se traduce); `displayName` en inglés Title Case; `description` en inglés, sentence case.
- Requeridos del spec → top-level con `required: true`. Opcionales → dentro de una colección: `additionalFields` (create/send), `updateFields` (update), `filters` (getMany), `searchFields` (búsqueda por identificador).
- Tipos: integer → `number` (default 0); string → `string`; fecha → string con placeholder `YYYY-MM-DD`; enum 0/1 → options No/Yes; boolean → la descripción empieza con "Whether".
- **Array de enteros** → string CSV con:

  ```ts
  value: '={{ $value.toString().split(",").map((v) => v.trim()).filter((v) => v !== "").map((v) => Number(v)).filter((v) => !isNaN(v)) }}'
  ```

  Filtrar los vacíos **antes** de `Number()`: `Number('') === 0` pasaría el `!isNaN`.

- **Objeto o array libre** → `type: 'json'` con:

  ```ts
  value: '={{ typeof $value === "object" && $value !== null ? $value : JSON.parse($value || "{}") }}'
  ```

  El `!== null` es obligatorio: `typeof null === "object"`.

- Listados = "Get Many" (`value: 'getMany'`), con `limit` (`typeOptions: { minValue: 1 }`, default 50, descripción exacta `Max number of results to return`). Opciones ordenadas alfabéticamente por su texto en inglés. Los IDs se nombran "… ID".
- Campo de ID con selector dinámico (ver siguiente sección): `displayName` termina en **"Name or ID"** y `description` es exactamente `Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>` — lo exige el escáner de nodos verificados (antes esta regla estaba desactivada por el español, ver [05-lecciones-n8n.md](05-lecciones-n8n.md) §11).

## Selectores dinámicos

Campo de ID con endpoint de listado = `type: 'options'` + `typeOptions.loadOptionsMethod` + `default: ''`, **sin tocar `name` ni `routing.send`** (el valor sigue siendo el ID plano → compatible con los workflows ya construidos). Los métodos viven en `LoadOptions.ts` y se registran con `methods = { loadOptions }`.

Mapeo actual: `id_canal`→`getChannels` · `id_grupo`/`id_team`/`id_to_delegate`→`getGroups` · `id_usuario`/`id_responsable`/`id_asignado`/`idSupervisor`/`id_user`→`getUsers` · `id_pipeline`→`getPipelines` · `id_etapa_pipeline`→`getStages` (depende de `id_pipeline`) · `origen_lead`→`getLeadOrigins` · `canal_origen`→`getLeadChannels` · `id_categoria`→`getCategories` · `id_assistant`→`getAssistants` · `id_plantilla`→`getWabaTemplates` (depende de `id_canal`; su ID es string).

**Sin selector por falta de endpoint en el spec**: `id_tag`, `etiquetas`, `id_respuesta`, `id_empresa`, `id_contacto`, `id_deal`.

Las dependencias se resuelven con el mapa `DEPENDENCY_PATHS` y se declaran con ruta relativa `&` — el porqué está en [05-lecciones-n8n.md](05-lecciones-n8n.md) §6 y §7.

## Pruebas

No hay framework: son scripts de Node con `node:assert/strict`, ejecutables sueltos y rápidos. Cada uno imprime cuántas pruebas pasó.

| Script | Cubre |
|---|---|
| `smoke-triggers.mjs` | secret (query/header/timingSafeEqual), sessionId, simplify, `webhookMethods` del proxy con mocks |
| `smoke-response.mjs` | validación de las 10 actions, regla del `input` de cierre, `sendResponse` |
| `smoke-token.mjs` | emisión, caché, dedupe de emisiones en vuelo, quemado por `-403`, errores accionables |
| `smoke-loadoptions.mjs` | los 10 selectores, dependencias, respuestas anidadas, errores explicativos |
| `smoke-template-fields.mjs` | parser Gupshup y Meta, etiqueta y valor del selector, **visibilidad real de los campos vía `NodeHelpers.displayParameter`**, preSend completo |

Al arreglar un bug, **añade la prueba que lo habría cazado** en el script que corresponda; los mocks imitan la forma real de las respuestas del API (incluido el anidamiento `data.templates`).

Ojo con las cachés en memoria: varias son por canal o por cuenta, así que dos pruebas que usan el mismo `id_canal` con plantillas distintas se pisan. Usa un `id_canal` propio por prueba.

## Verificación de n8n

Guía oficial: <https://docs.n8n.io/connect/create-nodes/build-your-node/reference/verification-guidelines>. Resumen de lo que exige un nodo comunitario **verificado**:

- Interfaz y documentación **solo en inglés** (ver § Idioma de la UI).
- Sin dependencias de runtime; TypeScript.
- Licencia MIT; repositorio público que coincide con el `repository` de `package.json`; autor consistente.
- Nada de variables de entorno ni acceso al sistema de archivos.
- Un solo servicio por paquete — por eso el español es un paquete aparte y no una opción del mismo paquete, ver [08-paquete-espanol.md](08-paquete-espanol.md).
- Publicación **desde GitHub Actions con provenance** (`npm publish --provenance`), obligatorio desde el 1 de mayo de 2026, nunca desde una máquina local. `.github/workflows/release.yml` lo hace para los dos paquetes.

**Comprobación**: `npx @n8n/scan-community-package n8n-nodes-liveconnect` — solo funciona contra una versión **ya publicada** en npm. En local se valida con `npm run lint`, que corre la misma config (`eslint.config.mjs` → `@n8n/node-cli/eslint`, activada con `npx n8n-node cloud-support enable`).

**Envío**: portal de creadores, <https://creators.n8n.io/nodes>.

**Resultado medido** (esta sesión, sobre v0.9.2 antes de traducir): el escáner reportaba **341 problemas (337 errores)**, de los que 319 eran el idioma — `displayName` sin Title Case, `action` en español, faltaban los literales `Name or ID`, `Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>`, `Max number of results to return`, y descripciones booleanas sin `Whether`. Tras traducir ~1.100 textos y los arreglos técnicos descritos en [05-lecciones-n8n.md](05-lecciones-n8n.md) y [04-triggers-y-callbacks.md](04-triggers-y-callbacks.md): **0 errores**.

## Publicación

- `gh release create vX.Y.Z` (o `workflow_dispatch`) dispara `.github/workflows/release.yml`, que publica **dos paquetes desde el mismo código**:
  1. `npm ci --ignore-scripts` → `build` → `lint` (las reglas oficiales del escáner) → `verify` → `smoke` → `npm pack --dry-run` → `npm publish --provenance --access public` para **`n8n-nodes-liveconnect`** (inglés, el que se envía a verificación).
  2. `npm run build:es` (genera `dist-es/`) → `npm publish --provenance --access public` con `working-directory: dist-es` para **`n8n-nodes-liveconnect-es`** (español, ver [08-paquete-espanol.md](08-paquete-espanol.md)).
- El secret `NPM_TOKEN` debe ser un token npm **Automation** (classic) o granular con **Bypass 2FA**: un token de publicación normal falla con 403 si la cuenta exige 2FA. Se reutiliza para los dos `npm publish`.
- El tarball del paquete inglés solo lleva `dist/` (campo `files` de `package.json`); los íconos los copia `gulp build:icons`. El del paquete español lleva `base/`, `i18n/`, `nodes/` y `credentials/` (ver [08-paquete-espanol.md](08-paquete-espanol.md)).
- `prepublishOnly` corre `build` + `lint` — el mismo `n8n-node lint` de siempre, no una config aparte: los antiguos `.eslintrc.js` / `.eslintrc.prepublish.js` ya no los invoca ningún script.

## Íconos

El ícono actual es `liveconnect2.svg` (claro) y `liveconnect2.dark.svg` (oscuro, mismo dibujo con degradado aclarado). Los cuatro nodos y la credencial declaran `icon: { light, dark }`: el escáner de nodos verificados (`icon-validation` / `icon-prefer-themed-variants`) exige las dos variantes y **prohíbe que ambas apunten al mismo archivo**, de ahí que exista un segundo SVG y no un simple alias. n8n y el navegador **cachean el ícono con fuerza**: si se cambia el dibujo, hay que **renombrar el archivo** (y sus referencias en los cuatro nodos y la credencial) para que se vea el nuevo.

## Idioma de la UI

**Inglés** en `displayName` (Title Case), labels de `options`, `action` (oración corta, p. ej. `Create a contact`), `description` (sentence case) y placeholders — lo exige la verificación de nodos comunitarios de n8n (ver § Verificación de n8n). Literales que pide el escáner: `Name or ID` y `Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>` en los selectores dinámicos, `Max number of results to return` en `limit`, descripciones booleanas que empiezan por `Whether`. Los `name`/`value` internos no cambian nunca. Ya no hay reglas de ESLint desactivadas por el idioma — detalle en [05-lecciones-n8n.md](05-lecciones-n8n.md) §11.

El español se conserva como paquete aparte, `n8n-nodes-liveconnect-es`, generado desde este mismo código con el diccionario `i18n/es.json`. Detalle completo en [08-paquete-espanol.md](08-paquete-espanol.md).

## Checklist antes de publicar

- [ ] `npm run build` sin errores de TypeScript
- [ ] `npm run lint` limpio (0 errores — es la misma config del escáner oficial)
- [ ] `npm run verify` con 0 errores duros y el conteo de endpoints correcto (58/58 hoy)
- [ ] `npm run smoke` entero en verde (114 pruebas)
- [ ] `npm run i18n:status` sin textos nuevos por traducir (o ya traducidos antes de publicar)
- [ ] `npm run build:es` genera `dist-es/` sin errores
- [ ] `version` de `package.json` subida
- [ ] Documentación actualizada: `docs/` y, si cambia algo que él resuma, `CLAUDE.md`
- [ ] Entrada nueva en [07-historial-decisiones.md](07-historial-decisiones.md)
