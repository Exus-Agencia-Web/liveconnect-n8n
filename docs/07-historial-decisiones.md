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
Los dos triggers tenían el `path` fijo en `'webhook'`, así que la única parte variable de la URL era el `webhookId`, que n8n no deja editar. Peor: los workflows de `examples/` traían un `webhookId` **fijo** (`liveconnect-callback-switch-demo`), de modo que dos importaciones del mismo ejemplo compartían URL sin remedio. Ahora hay un parámetro **Ruta del Webhook** (default `webhook`, que conserva la URL anterior) y los ejemplos ya no fijan `webhookId`.

## Decisiones de fondo que siguen vigentes

- **Nodo declarativo, sin `execute()`**: menos código y menos superficie de error para 58 operaciones. Los triggers y el nodo de respuesta son programáticos porque n8n no ofrece otra vía.
- **El OpenAPI manda**, y `npm run verify` lo comprueba en cada cambio.
- **Errores que enseñan**: cuando el nodo puede saber qué falta, lo dice con el nombre del campo, en vez de dejar que el API responda algo opaco.
- **Nunca bloquear por una consulta auxiliar fallida**: si no se puede leer la plantilla, se envía lo configurado y decide el API.
- **Compatibilidad de los valores guardados**: los selectores mantienen el ID plano como valor donde es posible, y los decodificadores toleran los valores de versiones anteriores.
