# Plantillas de WhatsApp (WABA)

La operación más difícil del paquete y la que más versiones costó. Si vas a tocarla, lee esto entero y después [07-historial-decisiones.md](07-historial-decisiones.md), donde está lo que ya se intentó y falló.

## 1. LiveConnect no es un solo proveedor

**LiveConnect trabaja por detrás con varios proveedores de WhatsApp Business** (Gupshup, Meta directo, …). Cada uno devuelve las plantillas con una forma distinta **y acepta un identificador distinto para enviarlas**. Todo el resto de este documento sale de ahí.

| | **Gupshup** | **Meta directo** |
|---|---|---|
| Cómo se reconoce la fila | trae `elementName`, `templateType`, `containerMeta`; **no** trae `components` | trae `components` |
| Texto con los `{{n}}` | `content` (o `containerMeta.data`) | `components[].text` del BODY |
| Medio del encabezado | `templateType` = `IMAGE`/`VIDEO`/`DOCUMENT` + `mediaUrl` | componente `HEADER` con `format` + `example.header_handle` |
| Botones | `buttons` o `containerMeta.buttons` | componente `BUTTONS` |
| Idioma | `languageCode` | `language` |
| **Identificador para enviar** | **el `id` (UUID)** | **el nombre** (`name`) |

Evidencia:

- Gupshup, canal 4695: enviar con `id` = `fcbcb260-4bc2-4056-8d98-d709dd17f2c0` → `{"messageID": "…"}`. Enviar con `elementName` = `lead_expocamello` → `status:-1 "Invalid template id provided"`.
- Meta directo: el ID largo (`667058365993373_67d4976c2921a_6360`) no resuelve; el que funciona es el nombre.

`templateSendIdentifier(row)` (en `TemplateFields.ts`) decide por la **forma de la fila**: si hay `components` → nombre; si no → `id`. El selector lo usa para construir su valor **y el preSend lo recalcula** sobre la fila real del listado, de modo que un valor viejo guardado en un nodo se corrige solo.

> Si aparece un proveedor nuevo con otra forma, el cambio va en `templateSendIdentifier` y en `buildTemplateLayout`, no repartido por el nodo.

## 2. Lo que ve el usuario

La interfaz del nodo está en inglés (ver [01-arquitectura.md](01-arquitectura.md) § Idioma); el resto de este documento sigue en español, pero las etiquetas citadas abajo son las reales del código:

```
Channel Name or ID · Phone Number · Template Name or ID    ← siempre
Variable {{1}} … Variable {{10}}                            ← tantas como pida la plantilla
Header URL                                                  ← solo si lleva imagen/video/documento
▸ Additional Fields (Buttons, Additional Message, Delegate Team Name or ID,
                      Header Variables, Use Sample Data, Body Variables (Comma-Separated))
```

La etiqueta del selector dice lo que hace falta antes de elegir: `promo_48h · es · 2 variables · video`. Las aprobadas van primero; las no aprobadas llevan su estado (`PENDING`, `FAILED`).

## 3. Cómo se decide qué campos mostrar

n8n **no puede consultar el API para decidir la UI**: `displayOptions` solo mira otros parámetros del nodo. La solución es que **el valor del selector codifique lo que la plantilla necesita**:

```
<identificador>|v<nº de variables>|<FORMATO del encabezado>
6990cf14-7796-425c-88a8-bb834dd61073|v2|VIDEO
```

`encodeTemplateValue` / `decodeTemplateValue` (en `TemplateFields.ts`). Cada campo se muestra con una condición `_cnd.regex` sobre ese valor:

- `variable_3` aparece con `\|v([3-9]|\d{2,})\|` (3 o más variables).
- `variable_10` con `\|v\d{2,}\|`.
- `Header URL` se **oculta** con `['', {regex: '\|(NONE|TEXT)$'}]` — el `''` evita ofrecerla antes de elegir plantilla.

Es el mismo patrón del nodo oficial de WhatsApp de n8n, cuyo valor es `nombre|idioma`.

`decodeTemplateValue` tolera valores sin sufijo (alguien pegó el ID a mano o viene de una versión anterior) y nombres que contienen `|`.

**Verificación**: `scripts/smoke-template-fields.mjs` evalúa la visibilidad con el propio `NodeHelpers.displayParameter` de n8n, no con una relectura de los regex. Es la prueba que blinda la queja original ("siempre muestra Variables y URL aunque la plantilla no lleve ninguna de las dos").

## 4. El preSend `prepareTemplateSend`

Cuelga del campo **`numero`**. No es un capricho: **n8n no ejecuta los `preSend` de propiedades ocultas** (ver [05-lecciones-n8n.md](05-lecciones-n8n.md)). En v0.8.2 colgaba de `URL del Encabezado`, que se oculta cuando la plantilla no lleva medio — resultado: el valor codificado del selector salía **crudo** hacia el API. Debe colgar siempre de un campo que no se pueda ocultar.

Qué hace, en orden:

1. Decodifica el valor del selector y deja en `body.id_plantilla` el identificador limpio.
2. Lee las variables de los campos `variable_1..variable_10`. Si están todos vacíos, cae al respaldo CSV de Additional Fields.
3. Consulta el **listado de plantillas del canal** (`/direct/waba/getTemplates`, **no** `getTemplate` — ver [02-api-liveconnect.md](02-api-liveconnect.md)) y busca la fila por `id`, `elementName`, `name` o `templateName`. **La caché es por canal** (5 min): una consulta sirve para todas las plantillas y todos los ítems de un envío masivo.
4. Con la fila real: recalcula el identificador según el proveedor, recorta las variables a las que la plantilla declara, coloca la URL en `url_imagen_encabezado` / `url_video_encabezado` / `url_documento_encabezado` según el formato **declarado**, y valida.
5. **Si la consulta falla, no bloquea**: envía lo que el usuario configuró y que sea el API quien decida.

### Validación que enseña

En vez de un error abstracto, se nombra el hueco (mensaje real, en inglés — la interfaz del nodo lo está):

> Template "promo_48h" needs 2 variables and is missing the value of {{2}}
> *Fill in the field "Variable {{2}}" below the template selector. The template includes this example: Ana, May 12. You can also enable "Use Sample Data" in Additional Fields for a quick test.*

### Dos decisiones que parecen menores y no lo son

- **Recortar las variables a las que la plantilla declara.** Al cambiar de plantilla, n8n **conserva** lo que se escribió en los campos que ahora están ocultos. Sin el recorte, una plantilla de 2 variables se enviaría con 3.
- **No exigir la URL del encabezado si la plantilla trae su propio `mediaUrl`.** Comprobado en vivo: `lead_expocamello` es de video y se envió sin URL — el API usa el medio de la plantilla. Exigirla sería un falso bloqueo. Solo se pide cuando no hay ni URL del usuario ni medio propio.

## 5. Plantilla elegida por expresión (envío masivo)

`displayOptions` **no evalúa expresiones**: si el ID de la plantilla viene de una expresión (`{{ $json.plantilla }}`), n8n no puede saber cuántos campos de variable mostrar y no muestra ninguno. Para ese caso existe **Additional Fields → Body Variables (Comma-Separated)** (`variables_csv`), que solo se usa si los campos numerados están vacíos. Es el camino del ejemplo `examples/02-envio-masivo-plantillas-waba.json`.

## 6. Selector de plantillas

`getWabaTemplates` (en `LoadOptions.ts`):

- depende del canal (`typeOptions.loadOptionsDependsOn: ['&id_canal']`, ruta relativa para que funcione igual dentro de una colección);
- solo lista canales WhatsApp (`getWhatsAppChannels` alimenta el campo `id_canal` de esta operación);
- etiqueta con `describeTemplateNeeds` y ordena las aprobadas primero, luego alfabéticamente;
- su ID es **string** (UUID), no numérico.

## 7. Lo que sigue sin soporte

- **Carruseles** (`cards`): no se parsean.
- Botones con parámetro dinámico: se rellenan solo con "Use Sample Data"; el formato de `buttons` en el cuerpo no está documentado en el spec y se envía como mejor esfuerzo (`{index, parameter}`), sobreescribible desde Additional Fields.
- Variables del encabezado de texto: existen como campo (`variables_encabezado`) pero no se validan contra la plantilla.
