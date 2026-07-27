# Lecciones del runtime de n8n

Trampas del framework que costaron versiones enteras. Cada una viene con la evidencia (archivo del core o prueba en vivo). **Los números de línea se mueven entre versiones de n8n**: lo que vale es la afirmación, no la línea.

## 1. Los `preSend` de campos ocultos NO se ejecutan

`RoutingNode` filtra las propiedades por visibilidad antes de recoger sus `preSend` (`routing-node.ts`, alrededor de la línea 804 en n8n-workflow 1.1x).

**Consecuencia**: un `preSend` colgado de un campo que `displayOptions` puede ocultar simplemente no corre, sin ningún aviso. Fue el bug de v0.8.2: el preSend de plantillas colgaba de *URL del Encabezado*, que se oculta cuando la plantilla no lleva medio, y el valor interno del selector salía crudo hacia el API.

**Regla**: cuelga los `preSend` de una propiedad **que no se pueda ocultar**. Para un preSend global, de `resource` (siempre visible, y sin `property` no envía nada al cuerpo).

## 2. `authenticate` se aplica DESPUÉS de los `preSend`

Y `IAuthenticateGeneric` sobrescribe los headers sin condición (`credentials-helper.ts`). Si un preSend siembra un token fresco, la forma genérica lo pisa.

**Regla**: cuando el preSend pueda aportar credenciales, `authenticate` debe ser una **función** que respete lo ya sembrado.

## 3. n8n solo renueva credenciales ante un 401 real

`credentialsExpired` se dispara desde el catch de 401 en `request-helper-functions.ts`. Un API que reporta el token vencido con HTTP 200 y un código propio **nunca** disparará `preAuthentication`.

Y **falsear `httpCode: 401` desde el `postReceive` no sirve**: el postReceive corre fuera del try/catch que lo dispara.

**Regla**: si el API no devuelve 401, gestiona tú el ciclo de vida del token (caché + refresco proactivo + invalidación reactiva). Ver [02-api-liveconnect.md](02-api-liveconnect.md).

## 4. `RoutingNode` lanza los ítems con `Promise.allSettled`

Todos los ítems de la ejecución arrancan sus preSend **en paralelo**. Cualquier operación cara y compartida (emitir un token, consultar un catálogo) necesita **deduplicación de llamadas en vuelo**, no solo una caché de resultado; si no, N ítems disparan N llamadas simultáneas.

## 5. `displayOptions` solo ve otros parámetros — nunca el API, nunca expresiones

- No hay forma de que la UI consulte el API para decidir qué campos mostrar.
- Si el parámetro observado contiene una **expresión**, la condición se evalúa contra el texto de la expresión, no contra su resultado.

**Patrón que sí funciona**: codificar en el `value` de la opción todo lo que la UI necesita saber (`<id>|v2|IMAGE`) y condicionar con `_cnd.regex`. Es lo que hace el nodo oficial de WhatsApp (`nombre|idioma`). Para el caso "el valor viene de una expresión", hay que ofrecer una salida alternativa (un campo genérico en Campos Adicionales).

Operadores disponibles en `_cnd`: `eq`, `not`, `gt`, `gte`, `lt`, `lte`, `between`, `startsWith`, `endsWith`, `includes`, `regex`, `exists`.

**Verificar la visibilidad con el propio n8n**, no releyendo los regex:

```js
const { NodeHelpers } = require('n8n-workflow');
NodeHelpers.displayParameter(values, propiedad, node, descripcionDelNodo);
```

(`scripts/smoke-template-fields.mjs` lo usa así.)

## 6. n8n NO limpia los valores de los campos ocultos

Al cambiar de operación o de opción, lo que el usuario escribió en campos que ahora están ocultos **sigue guardado en el nodo** y `getNodeParameter` lo devuelve.

**Consecuencias reales**:
- Los selectores dependientes tuvieron que resolver su dependencia con un mapa explícito (`DEPENDENCY_PATHS`, `${resource}.${operation}.${campo}` → ruta exacta): probar "rutas candidatas" devolvía el valor de otra operación.
- El preSend de plantillas **recorta** las variables a las que la plantilla declara.

## 7. Selectores dependientes: `loadOptionsDependsOn` con ruta relativa

Sin `typeOptions.loadOptionsDependsOn`, las opciones quedan cacheadas y no se recargan al cambiar el campo del que dependen.

Se declara con **ruta relativa `&`** — `['&id_canal']`, `['&id_pipeline']` — que resuelve al campo hermano y por eso funciona igual a nivel raíz que dentro de una colección (`node-parameters/path-utils.js`).

## 8. `resourceMapper`: qué es y por qué se descartó

- Un `ResourceMapperField` de `type: 'object'` se renderiza como **editor JSON** (`MappingFields.vue` mapea object/array → `json`) y `defaultValue` lo prellena (`interfaces.d.ts`, `ResourceMapper.vue`). Es la única forma de tener "un campo JSON que se llena solo".
- Aun así **se retiró**: para esta operación resultó una UI de mapeo confusa donde bastaban campos de texto. Ver [07-historial-decisiones.md](07-historial-decisiones.md).

## 9. Responder un webhook desde un nodo

`this.sendResponse({body, headers, statusCode})` es API pública de `IExecuteFunctions` (`interfaces.d.ts:733`) y es no-op si no hay webhook esperando.

**No copiar el guard "No Webhook node found" del core**: su lista de triggers reconocidos **no incluye nodos comunitarios**, así que rechazaría respuestas válidas.

## 9-bis. La URL de un webhook y el `webhookId`

`getNodeWebhookUrl` / `getNodeWebhookPath` (`node-helpers.js`) construyen:

- con `webhookId` → `<base>/<webhookId>/<path>`;
- sin `webhookId` → `<base>/<workflowId>/<nombre-del-nodo>/<path>`;
- con `isFullPath: true` → `<base>/<path>` (o el `webhookId` si el path está vacío).

Dos consecuencias prácticas:

1. **El `path` debe ser un parámetro**, como en el nodo Webhook core (`path: '={{$parameter["path"]}}'`). Fijarlo en el código deja al usuario sin ninguna palanca sobre su URL, porque el `webhookId` no se puede editar desde la UI.
2. **Un `webhookId` fijo dentro de un workflow de ejemplo es un error**: todo el que importe ese JSON obtiene la misma URL. Al omitirlo, n8n genera uno nuevo en cada importación.

## 10. Tipos y runtime

- **`NodeConnectionTypes` sí existe en runtime** (`NodeConnectionTypes.Main`) en n8n-workflow 1.82, la versión que usa este paquete. La nota de que "es solo un tipo, en runtime hay que usar el string `'main'`" venía de una versión anterior y ya no aplica: el escáner de nodos verificados lo exige con la regla `node-connection-type-literal` (`@n8n/eslint-plugin-community-nodes`), que rechaza el literal `'main'` en `inputs`/`outputs`.
- El tipo de `webhookMethods.default` exige los **tres** métodos (`create`, `checkExists`, `delete`) cuando el bloque existe — eso no cambió. Lo que cambió es que ya **no se puede omitir el bloque entero** en un trigger sin API de registro (como el Callback Trigger): la regla `webhook-lifecycle-complete` lo exige siempre. La solución son tres no-ops honestos que devuelven `true` — ver [04-triggers-y-callbacks.md](04-triggers-y-callbacks.md).
- `getNodeParameter(nombre, fallback)` lee de `node.parameters` con el fallback: un campo nunca tocado devuelve el fallback; uno tocado y luego oculto devuelve **el valor viejo** (ver punto 6).

## 11. ESLint: del `.eslintrc.js` propio al escáner oficial

**Ya no hay reglas desactivadas por idioma.** Desde que la interfaz volvió a inglés (ver [01-arquitectura.md](01-arquitectura.md) § Idioma), `npm run lint` corre `n8n-node lint`, que usa `eslint.config.mjs` (config plana) → `@n8n/node-cli/eslint`, activado con `npx n8n-node cloud-support enable` (que además puso `n8n.strict: true` en `package.json`). Es la **misma** config que aplica el escáner público (`npx @n8n/scan-community-package`) — ver [06-mantenimiento.md](06-mantenimiento.md) § Verificación de n8n. Compone dos plugins:

- `@n8n/eslint-plugin-community-nodes` — reglas nuevas, específicas de la verificación: `node-usable-as-tool`, `node-connection-type-literal`, `webhook-lifecycle-complete`, `require-node-api-error`, `icon-validation` / `icon-prefer-themed-variants`, `credential-password-field`, `trigger-node-conventions`, entre otras.
- `eslint-plugin-n8n-nodes-base` (la de siempre) — reglas de `nodes`/`credentials`/`package.json`, con solo 3 apagadas por el propio preset de `node-cli` (ninguna relacionada con idioma).

Los `.eslintrc.js` y `.eslintrc.prepublish.js` de las versiones anteriores **ya no los usa ningún script** (`lint`, `lintfix` y `prepublishOnly` corren todos `n8n-node lint`); quedan en el repo pero no son la config vigente.

### Historia: por qué las tildes se rompían (y por qué ya no puede repetirse)

En v0.5.1, `npm run lintfix` pasó cada `action` en español por la librería `sentence-case` (autofix de la entonces activa `node-param-operation-option-action-miscased`), que **elimina los diacríticos**: 25 actions con tilde la perdieron ("Enviar una respuesta rápida" → "Enviar una respuesta r pida", visible en el panel de acciones de n8n). La solución de entonces fue desactivar esa regla mientras la UI estuviera en español.

Esa trampa no puede repetirse ahora aunque alguien reactive la regla: el texto en español **ya no es código que pase por ESLint**. Vive en `i18n/es.json` (un JSON) y se aplica sobre las descripciones ya compiladas con una asignación directa (`objeto[campo] = traduccion` en `scripts/i18n-runtime.js`), fuera de cualquier paso de lint. Detalle en [08-paquete-espanol.md](08-paquete-espanol.md).

### Reglas activas que antes estaban desactivadas por el español

Los selectores dinámicos ahora llevan el `displayName` con el literal `Name or ID` y la `description` `Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>` (ver [06-mantenimiento.md](06-mantenimiento.md) § Selectores dinámicos): las reglas que los exigen (`node-param-display-name-wrong-for-dynamic-options` y afines) ya no hace falta desactivarlas.

### Lo que sigue igual

- `node-param-description-*` sigue siendo quisquillosa con el punto final: cuenta las frases, así que un texto con "etc." pide punto final y uno con "…" lo prohíbe. No pelear: ajustar la redacción.
- En las descripciones no escribir referencias tipo `tabla.id` — `node-param-description-miscased-id` las rompe. Usar "(tabla X)".

## 12. Node 26 y `isolated-vm`

`npm install` a secas falla: `isolated-vm` (transitiva de n8n-workflow) no compila en Node ≥ 26 ni en runners sin toolchain nativa.

**Siempre `npm install --ignore-scripts`**, en local y en CI. Ninguna dependencia propia necesita scripts de instalación.
