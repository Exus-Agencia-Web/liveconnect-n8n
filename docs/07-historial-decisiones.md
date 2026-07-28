# Historial de decisiones

Changelog razonado: qué se hizo en cada versión, **qué se descartó y por qué**. Su función es evitar que se vuelva a intentar algo que ya falló, y explicar por qué el código tiene la forma que tiene.

## Envío de plantillas WABA: cinco intentos

Es el hilo más largo del proyecto. Resumen de lo que **no** funcionó, antes del detalle:

| Versión | Qué se intentó | Por qué se descartó |
|---|---|---|
| 0.6.0 | Un campo por variable generado con `resourceMapper` | UI de mapeo confusa, y **dos caminos para lo mismo**: el campo "inteligente" y las mismas opciones sueltas en Campos Adicionales |
| 0.7.0 | Un único campo JSON prellenado con la estructura de la plantilla | Le pide al usuario que entienda y edite una estructura. Sigue habiendo dos caminos |
| 0.8.0 | Cuatro campos planos: Variables (CSV) + URL del Encabezado | Mejor, pero **los dos campos se mostraban siempre**, incluso en plantillas sin variables ni medio |
| 0.8.1 | Enviar la plantilla por su **nombre** | Falso: en Gupshup el nombre da `Invalid template id provided`. Diagnóstico hecho sin probar contra el API |
| 0.8.2 | Mostrar los campos solo si la plantilla los usa (valor codificado) | Correcto en la idea, pero el preSend colgaba de un campo ocultable y **no se ejecutaba** |

Lo que finalmente funcionó (0.9.0 + 0.9.1): **un campo por variable** condicionado por el valor codificado del selector, preSend colgado de un campo no ocultable, plantilla leída del **listado**, e identificador **según el proveedor**. Detalle en [03-plantillas-waba.md](03-plantillas-waba.md).

**Patrón que se repite en los tres primeros fracasos**: ofrecer dos caminos para lo mismo, o pedirle al usuario que arme una estructura. La versión buena no añade inteligencia: **quita opciones** y muestra solo lo que esa plantilla concreta necesita.

**Lección de método**, del cuarto: dos versiones se publicaron con un diagnóstico plausible y sin verificar contra el API real. La prueba en vivo tardó minutos y desmintió las dos.

## Versión por versión

### 0.1.0 — Nodo inicial
18 recursos, 58 operaciones (todas las del spec menos `/account/token`, que la maneja la credencial), 100 % declarativo. Publicación a npm por GitHub Actions con provenance.

### 0.1.1 — La credencial no obtenía token
El API entrega el JWT en `data.token` **o** en el campo raíz `PageGearToken`, que el schema no documenta. Además, con keys faltantes devuelve `status:-2` **y un JWT anónimo**: hay que validar `status < 0` **antes** de leer el token. Con credenciales inválidas responde 404 en texto plano.

### 0.1.2 — Ícono
Primer aviso del cacheado agresivo de íconos.

### 0.2.0 — Triggers de Proxy y Callback
Contratos verificados contra la documentación interna del Flowbot y el API del proxy. Corregido un fallo de seguridad: `checkExists` daba por bueno un webhook cuyo secret el nodo ya no conocía.

### 0.3.0 — UI en español
Traducción completa (18 descriptions + nodo + triggers + credencial) y renombrado del ícono a `liveconnect2.svg` para forzar la recarga de la caché.

### 0.4.0 — Nodo "Respuesta al Callback"
Alternativa visual al nodo Code para construir las actions. Descubrimiento clave: `displayOptions.show` funciona **entre hermanos** dentro de un `fixedCollection`, que es lo que permite mostrar solo los campos de la acción elegida.

### 0.4.1 — El token vencido (`status -403`)
El fallo más caro de diagnosticar. LiveConnect reporta el token vencido con HTTP 200, y n8n solo renueva ante un 401 real. Solución en dos capas (refresco proactivo por `exp` + invalidación reactiva ante `-403`) y `authenticate` convertido en **función**. Descartado: falsear un `httpCode: 401` desde el postReceive — corre fuera del try/catch que dispara la renovación.

### 0.5.0 — Selectores dinámicos
42 campos de ID convertidos en desplegables, 10 métodos `loadOptions`. Las dependencias se resuelven con un mapa explícito (`DEPENDENCY_PATHS`) porque n8n no limpia los valores de los campos ocultos y "probar rutas candidatas" devolvía el valor de otra operación.

### 0.5.1 — Tildes borradas por el autofix de ESLint
`npm run lintfix` pasó los `action` por `sentence-case` y **eliminó los diacríticos** de 25 acciones, visible en el panel de acciones de n8n. La regla queda desactivada de forma permanente y hay un `grep` de verificación. En la misma versión, el refresco del token se extendió a `loadOptions` y triggers, que no pasan por el routing.

### 0.5.2 — Selector de plantillas vacío
`/direct/waba/getTemplates` devuelve `data` como `{templates, paging}`, no como array. `pickRows` normaliza.

### 0.6.0 / 0.7.0 / 0.8.0 / 0.8.1 / 0.8.2 — Iteraciones de plantillas
Ver la tabla de arriba.

### 0.9.0 — Un campo por variable, formato Gupshup e ID real
La prueba en vivo aclaró tres cosas a la vez: el identificador de envío es el **ID**, no el nombre; las plantillas llegan en **formato Gupshup** (`content`, `templateType`, `mediaUrl`, `elementName`), no en `components` de Meta; y el preSend **no se ejecutaba** por colgar de un campo ocultable.

### 0.9.1 — La validación por fin corre, y soporte multi-proveedor
Probando 0.9.0 en vivo: una plantilla de 2 variables **se envió con las dos vacías**. Causa: el preSend leía la plantilla con `getTemplate`, que identifica por el ID de **Meta** y rechaza el de LiveConnect (`status:-400`); el error se tragaba en un `catch` y se seguía sin validar. Ahora lee el **listado**, cacheado por canal.

En la misma versión, con el dato de que **LiveConnect trabaja con varios proveedores**, el identificador pasó a decidirse por la forma de la fila: ID en Gupshup, nombre en Meta directo. Y la URL del encabezado dejó de ser obligatoria cuando la plantilla trae su propio `mediaUrl` (comprobado: una plantilla de video se envía sin URL y el API usa la suya).

### 0.9.2 — Ruta del webhook configurable
Los dos triggers tenían el `path` fijo en `'webhook'`, así que la única parte variable de la URL era el `webhookId`, que n8n no deja editar. Peor: los workflows de `examples/` traían un `webhookId` **fijo** (`liveconnect-callback-switch-demo`), de modo que dos importaciones del mismo ejemplo compartían URL sin remedio. Ahora hay un parámetro **Webhook Path** (default `webhook`, que conserva la URL anterior) y los ejemplos ya no fijan `webhookId`.

### 1.0.0 — Interfaz en inglés + paquete español aparte (preparación para la verificación de n8n)
n8n exige que la interfaz de un nodo comunitario **verificado** esté íntegramente en inglés, y lo comprueba con ESLint (`npx @n8n/scan-community-package`). Con la UI en español (doctrina de 0.3.0), el escáner reportaba **341 problemas (337 errores)**, de los que 319 eran exactamente el idioma: `displayName` sin Title Case, `action` en español, y faltaban los literales que exigen las reglas (`Name or ID`, `Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>`, `Max number of results to return`, descripciones booleanas con `Whether`). Se revierte esa doctrina:

- Traducidos a inglés ~1.100 textos: las 18 descriptions, los 4 nodos, la credencial y los mensajes de error de `GenericFunctions`/`LoadOptions`/`TemplateFields`/`ActionsFunctions`. Los identificadores internos (`name` de propiedad, `value` de opción, `property` del routing, rutas del API) **no cambiaron**: los workflows existentes siguen funcionando.
- Antes de traducir, el español se **congeló** en un diccionario indexado por ruta (`i18n/es.json`, 1065 textos) con `scripts/extract-i18n.mjs`, para no perderlo.
- El lint pasa a ser el oficial: `@n8n/node-cli` con `npx n8n-node cloud-support enable` (pone `n8n.strict: true` en `package.json`), config en `eslint.config.mjs` → `@n8n/eslint-plugin-community-nodes` + `eslint-plugin-n8n-nodes-base`. El `.eslintrc.js` con las reglas desactivadas por el español (y `.eslintrc.prepublish.js`) quedan sin uso y se eliminan del repo.
- Arreglos técnicos que pidió el escáner: `NodeConnectionTypes.Main` en vez del literal `'main'`; `usableAsTool` y `subtitle` en los nodos programáticos; `webhookMethods` con los tres métodos como no-ops honestos en el Callback Trigger (no existe API de registro, pero la regla `webhook-lifecycle-complete` los exige); ícono con variantes `{light, dark}` en archivos distintos (`liveconnect2.dark.svg`); la credencial declara `icon` y `sessionToken` pasa a `password: true`; el `catch` de `LiveConnectCallbackResponse` envuelve siempre en `NodeOperationError` en vez de relanzar el error tal cual (regla `require-node-api-error`).
- **n8n no soporta traducciones dentro de un paquete comunitario**: el español se publica aparte, `n8n-nodes-liveconnect-es`, generado en tiempo de build (`scripts/build-es-package.mjs` → `dist-es/`) aplicando `i18n/es.json` sobre el paquete inglés compilado — una sola base de código, dos paquetes. `README.md` queda en inglés; el español vive en `i18n/README.es.md`. Detalle completo en [08-paquete-espanol.md](08-paquete-espanol.md).
- `release.yml` ahora valida `build && lint && verify && smoke && npm pack` antes de publicar, y publica **los dos paquetes** (con provenance) desde el mismo workflow.

Resultado: escáner oficial en 0 errores (antes 337); `npm run verify` 58/58; `npm run smoke` en verde (114 pruebas).

**Compatibilidad**: el tipo del nodo español es `n8n-nodes-liveconnect-es.liveConnect`, distinto del paquete principal. Los workflows existentes no se rompen (siguen en el paquete inglés); quien quiera la UI en español debe instalar el paquete aparte y recrear los nodos.

### 2.0.0 — Un nodo regular, claves de salida en inglés y credencial propia por paquete

Tras 1.0.0, dos releases de parche llegaron a la verificación real de n8n: **1.0.1** corrigió los 2 errores que el escáner oficial encontró en v1.0.0 y que `n8n-node lint` no veía (de ahí `scripts/lint-scanner.mjs`); **1.0.2** corrigió que el paquete español mutaba en sitio los objetos compartidos con el inglés (`clonarDescripcion`) y añadió a ambos README el aviso de "no instalar los dos paquetes en la misma instancia". **n8n rechazó la verificación de 1.0.2** con 3 hallazgos de severidad HIGH — la reseña llegó por el canal de revisión de n8n, no hay registro textual de ella en este repo, así que aquí se resume por lo que cada commit corrigió:

1. El paquete registraba **dos nodos regulares** (`LiveConnect` y `LiveConnectCallbackResponse`); n8n **solo admite uno por paquete verificado** (los triggers no cuentan aparte).
2. Los dos triggers exponían al workflow claves de salida **en español** (`mensaje`, `esPrimerTurno`, `tieneAdjunto`, `hayAgenteHumano`, `contacto`, `id_conversacion`, `id_canal`), pese a que la interfaz ya estaba en inglés desde 1.0.0.
3. Los dos paquetes (inglés y español) declaraban **la misma credencial** (`liveConnectApi`); el aviso de "no instalar los dos" que sumó 1.0.2 no bastaba — n8n exige que puedan coexistir.

Cómo se resolvió cada uno:

1. **El nodo de respuesta pasó a ser el recurso `callbackResponse` de `LiveConnect`.** El hallazgo que evitó tener que convertir programáticas las otras 58 operaciones: `n8n-workflow` define `customOperations` justo para "nodes that do not implement an execute method, such as declarative nodes" (`interfaces.d.ts`), lo resuelve `workflow-execute.ts`, y `nodes-base` ya lo usa en `WhatsApp.node.ts`. Las properties del nodo retirado pasaron intactas a `descriptions/CallbackResponseDescription.ts`; su lógica (antes el `execute()` del nodo) es ahora `customOperations.callbackResponse.send` en `LiveConnect.node.ts`, y sigue recibiendo `IExecuteFunctions`, así que `sendResponse()` no cambió. `LiveConnectCallbackResponse.node.ts` se eliminó, `package.json` pasa a registrar 3 nodos, y `scripts/verify-spec.mjs` excluye el recurso (su operación no sale del OpenAPI). `smoke-response.mjs` pasó a ejercitar la operación custom (13/13).
2. **Las claves de los triggers se tradujeron**: `mensaje`→`message`, `esPrimerTurno`→`isFirstTurn`, `tieneAdjunto`→`hasAttachment`, `hayAgenteHumano`→`hasHumanAgent`, `contacto`→`contact`, `id_conversacion`→`conversationId`, `id_canal`→`channelId` (`simplifyCallbackEvent`/`simplifyProxyEvent` en `TriggerFunctions.ts`). `raw` no cambió: es el payload de LiveConnect, no una salida propia. El diccionario del paquete español (`i18n/es.json`) remapeó las 57 claves del nodo retirado al recurso nuevo y sumó los 5 textos que antes no existían (el propio recurso `callbackResponse` y su operación `send`): cobertura 1067/1067 (100 %, antes 1065/1065).
3. **Cada paquete declara ahora su propia credencial.** El nombre pasó de estar repetido como literal `'liveConnectApi'` en cada sitio que lo necesitaba, a vivir en un objeto deliberadamente mutable, `LC_CREDENTIALS` (`GenericFunctions.ts`). `scripts/build-es-package.mjs` lo reescribe a `liveConnectApiEs` sobre la copia propia del compilado (`dist-es/base/`), sin tocar el paquete inglés, y hace lo mismo aparte con el `credentials[].name` que declara cada nodo y con el `name` de la propia clase de credencial. Prueba nueva en `smoke-i18n.mjs`: los dos paquetes cargados en el mismo proceso declaran credenciales distintas y cada nodo pide la suya. El aviso de "no instalar los dos paquetes" se quitó de ambos README y de [08-paquete-espanol.md](08-paquete-espanol.md).

De paso, se revisó el código fuente en busca de comentarios que hubieran quedado en español de rondas anteriores; hoy no queda ninguno en `nodes/`, `credentials/` ni `scripts/` (verificado con una búsqueda en todo el árbol). Queda explícito en [CLAUDE.md](../CLAUDE.md): código y comentarios en inglés, `docs/` en español.

**BREAKING**:

- Los workflows con el nodo **LiveConnect Callback Response** no migran solos: hay que rehacerlos con el recurso `callbackResponse` del nodo `LiveConnect`. No hay conversión automática.
- Cualquier expresión que lea las claves viejas de los triggers (`mensaje`, `esPrimerTurno`, `tieneAdjunto`, `hayAgenteHumano`, `contacto`, `id_conversacion`, `id_canal`) deja de funcionar; hay que actualizarla a la clave nueva en inglés.
- Quien ya use **`n8n-nodes-liveconnect-es`**: su credencial pasa de tipo `liveConnectApi` a `liveConnectApiEs`. Al actualizar, hay que crear la credencial de nuevo con ese tipo y reasignarla en los nodos — la anterior no migra sola.

Resultado: `npm run verify` 58/58 endpoints (el recurso `callbackResponse` queda fuera adrede, no sale del spec); `npm run smoke` en verde, 116 pruebas (109 del paquete principal + 7 del paquete español, antes 114).

## Decisiones de fondo que siguen vigentes

- **Nodo declarativo, sin `execute()` propio**: menos código y menos superficie de error para 58 operaciones. Los dos triggers son programáticos porque n8n no ofrece otra vía; el recurso `callbackResponse` lo es vía `customOperations`, sin convertir programático el resto del nodo.
- **El OpenAPI manda**, y `npm run verify` lo comprueba en cada cambio.
- **Errores que enseñan**: cuando el nodo puede saber qué falta, lo dice con el nombre del campo, en vez de dejar que el API responda algo opaco.
- **Nunca bloquear por una consulta auxiliar fallida**: si no se puede leer la plantilla, se envía lo configurado y decide el API.
- **Compatibilidad de los valores guardados**: los selectores mantienen el ID plano como valor donde es posible, y los decodificadores toleran los valores de versiones anteriores.
