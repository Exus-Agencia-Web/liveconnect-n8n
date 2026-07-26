# Mantenimiento: actualizar, probar y publicar

## Comandos

```bash
npm install --ignore-scripts   # instalar (NUNCA npm install a secas — ver lecciones-n8n §12)
npm run build                  # tsc + copia de íconos
npm run lint / npm run lintfix
npm run verify                 # diff de dist/ contra el OpenAPI del CDN (acepta un spec local como argumento)
npm run smoke                  # 101 pruebas: triggers, nodo de respuesta, token, selectores, plantillas
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
- Cada opción de operación lleva `name` (inglés), `value` (camelCase), `action` y `description` (español, tomada del spec), más:

  ```ts
  routing: {
  	request: { method: 'POST', url: '/ruta/del/spec' },
  	output: { postReceive: [handleLcResponse] },
  },
  ```

- Campo: `name` = **propiedad exacta del API** (snake_case: `id_canal`, `celular`…); `displayName` en español; `description` en español.
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

- Listados = "Get Many" (`value: 'getMany'`), con `limit` (`typeOptions: { minValue: 1 }`, default 50, descripción exacta `Max number of results to return`). Opciones ordenadas alfabéticamente por su texto en español. Los IDs se nombran "… ID".

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

## Publicación

- `gh release create vX.Y.Z` dispara `.github/workflows/release.yml` → `npm ci --ignore-scripts` → `npm publish --provenance --access public`.
- El secret `NPM_TOKEN` debe ser un token npm **Automation** (classic) o granular con **Bypass 2FA**: un token de publicación normal falla con 403 si la cuenta exige 2FA.
- El tarball solo lleva `dist/` (campo `files` de `package.json`); los íconos los copia `gulp build:icons`.
- `prepublishOnly` corre build + el lint estricto de publicación (`.eslintrc.prepublish.js`).

## Íconos

El ícono actual es `liveconnect2.svg`. n8n y el navegador **cachean el ícono con fuerza**: si se cambia el dibujo, hay que **renombrar el archivo** (y sus referencias en los cuatro nodos) para que se vea el nuevo.

## Idioma de la UI

Español en `displayName`, labels de `options`, `action`, `description` y placeholders. Preposiciones y artículos en minúscula dentro de las etiquetas ("ID del Canal", no "ID Del Canal"). Los `name`/`value` internos no cambian nunca. Vocabulario canónico en `docs-glosario-es.md` (raíz). Las reglas de ESLint que chocan con esto están desactivadas con comentario — detalle en [05-lecciones-n8n.md](05-lecciones-n8n.md) §11.

## Checklist antes de publicar

- [ ] `npm run build` sin errores de TypeScript
- [ ] `npm run lint` y `npx eslint -c .eslintrc.prepublish.js nodes credentials package.json` limpios
- [ ] `npm run verify` con 0 errores duros y el conteo de endpoints correcto (58/58 hoy)
- [ ] `npm run smoke` entero en verde
- [ ] Tildes de los `action` intactas (el `grep` de §11 de lecciones)
- [ ] `version` de `package.json` subida
- [ ] Documentación actualizada: `docs/` y, si cambia algo que él resuma, `CLAUDE.md`
- [ ] Entrada nueva en [07-historial-decisiones.md](07-historial-decisiones.md)
