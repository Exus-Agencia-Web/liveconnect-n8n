# CLAUDE.md — n8n-nodes-liveconnect

Nodo comunitario **declarativo** de n8n para el API público de LiveConnect. La **fuente de verdad** es el OpenAPI:

```
https://cdn.liveconnect.chat/liveconnect/public-openapi.json
```

Todo cambio al nodo debe derivarse de ese spec. No inventar campos ni endpoints.

## Arquitectura

```
credentials/LiveConnectApi.credentials.ts   # auth: cKey+privateKey → JWT (preAuthentication)
nodes/LiveConnect/
  LiveConnect.node.ts                       # nodo principal: selector de resource + spread de descripciones
  GenericFunctions.ts                       # LIVECONNECT_BASE_URL + handleLcResponse (postReceive compartido)
  descriptions/<Recurso>Description.ts      # 1 archivo por recurso: <camel>Operations + <camel>Fields
  descriptions/index.ts                     # re-exporta todo
scripts/verify-spec.mjs                     # diff automático dist/ vs OpenAPI (npm run verify)
.github/workflows/ci.yml                    # build + lint en push/PR
.github/workflows/release.yml               # release de GitHub → npm publish (secret NPM_TOKEN)
```

- **Sin execute()**: el nodo es 100 % declarativo — cada operación lleva `routing.request` (method/url) y cada campo `routing.send` (`type: 'body' | 'query'`, `property: <nombre exacto del API>`).
- `ContactDescription.ts` es el **template canónico**: imitar su estilo para cualquier recurso nuevo.
- 18 recursos, 58 operaciones (todas las del spec menos `/account/token`, que lo manejan las credenciales).

## API LiveConnect — comportamiento real (verificado, no todo está en el spec)

1. **Envelope**: siempre `{ status, status_message, data }`. `status < 0` = error **aun con HTTP 200**. `handleLcResponse` lanza `NodeApiError` en ese caso y desanida `data` (salvo que el toggle global `fullResponse` esté activo).
2. **Token**: `POST /account/token {cKey, privateKey}`. El JWT de sesión llega en `data.token` **o en el campo raíz `PageGearToken` del body** (el schema `AccountToken` del spec no lo documenta). Viaja en el header `PageGearToken`. Dura ~10 min; n8n lo renueva solo ante 401 (`sessionToken` es `expirable`).
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
```

Repo: https://github.com/Exus-Agencia-Web/liveconnect-n8n · npm: `n8n-nodes-liveconnect`
