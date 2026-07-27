# El paquete en español (`n8n-nodes-liveconnect-es`)

La interfaz del paquete principal está en inglés (ver [01-arquitectura.md](01-arquitectura.md) § Idioma) porque lo exige la verificación de nodos comunitarios de n8n. Este documento explica cómo el español **no desaparece**: se publica como un segundo paquete, generado desde el mismo código.

## Los dos paquetes NO pueden convivir en una instancia

Los **tipos de nodo** llevan el prefijo del paquete (`n8n-nodes-liveconnect.liveConnect` vs `n8n-nodes-liveconnect-es.liveConnect`), pero **los tipos de credencial no**: n8n las indexa por `name` en un espacio global, y ambos paquetes declaran `liveConnectApi`. Instalados a la vez, una de las dos clases gana y define el formulario —y su idioma— para los dos. Hoy la lógica es idéntica, así que no se pierden datos; si algún día divergen, el fallo sería silencioso.

**Por qué no se renombra la credencial del paquete español**: el nombre no vive solo en la clase. `GenericFunctions.ts` lo tiene en `LIVECONNECT_CREDENTIALS_NAME` y lo usan el refresco del token, los `loadOptions`, los `webhookMethods` y las consultas del preSend de plantillas. Renombrarlo en el paquete generado exigiría parchear también ese código compilado — mucha más superficie de fallo que el aviso en ambos README.

Está avisado en los dos README. Si en el futuro hace falta que convivan, el cambio limpio es que el nombre de la credencial salga de una constante configurable en el propio código base, no de un parche en el generador.

## Efecto secundario de `usableAsTool` en los triggers

Los cuatro nodos declaran `usableAsTool: true` porque la regla oficial `node-usable-as-tool` lo exige (solo exime a los nodos con salida de tipo IA e `inputs: []`, y un trigger tiene `outputs: ['main']`). Consecuencia: n8n registra una variante «…Tool» por cada nodo, y la de los triggers no tiene `execute()` — aparecería en el selector de herramientas de un AI Agent y fallaría si alguien la eligiera. No se puede quitar sin romper el lint del escáner: **no lo "arregles"**.

## Limitación conocida: los mensajes de error van en inglés

El diccionario traduce **la interfaz declarada** (displayName, description, placeholder, action, labels de options). **No** traduce los textos que el código construye en tiempo de ejecución: los `NodeOperationError`/`NodeApiError` de `GenericFunctions.ts`, `LoadOptions.ts`, `ActionsFunctions.ts` y los `webhookMethods`, ni las etiquetas que arma `describeTemplateNeeds` para el selector de plantillas.

Consecuencia práctica: en `n8n-nodes-liveconnect-es` los campos se ven en español pero un error dice *"Template promo_48h needs 2 variables and the value of {{2}} is missing"*. Antes de 1.0.0 ese mensaje salía en español.

Traducirlos exigiría enrutar cada mensaje por una función de traducción con claves propias — un refactor de todos los `throw` del paquete. Si se hace, el sitio natural es una función `t(clave, params)` en `GenericFunctions.ts` que lea el mismo diccionario, y el criterio para decidirlo es cuánto molesta en la práctica al equipo que usa el paquete español.


## 1. Por qué es un paquete aparte

n8n exige inglés para verificar un nodo comunitario, y **no soporta traducciones dentro de un mismo paquete comunitario**: su sistema de i18n es interno de `editor-ui` y no llega a los paquetes de terceros — no hay forma de que un usuario con n8n en español vea la interfaz de este nodo traducida automáticamente. La única forma de ofrecer una interfaz en español es publicar un paquete distinto que la lleve ya traducida: `n8n-nodes-liveconnect-es`.

## 2. Una sola base de código, dos paquetes

No se mantienen dos copias del código. `scripts/build-es-package.mjs` genera `dist-es/` a partir del paquete inglés ya compilado (`dist/`):

```
dist-es/
  base/…                              copia tal cual del dist/ inglés
  i18n/es.json                        el diccionario
  i18n/translate.js                   el aplicador (copia de scripts/i18n-runtime.js)
  nodes/LiveConnect/<Nodo>.node.js    wrapper que hereda del nodo base y traduce su description
  credentials/LiveConnectApi.credentials.js   wrapper de la credencial
  package.json                        metadatos propios (nombre, files, n8n.nodes/credentials)
```

Cada wrapper es una clase que extiende la clase inglesa y, en el constructor, traduce `this.description` (o `this` en el caso de la credencial) con el diccionario:

```js
class LiveConnect extends base.LiveConnect {
	constructor() {
		super(...arguments);
		traducirDescripcion(this.description, 'liveConnect', diccionario);
	}
}
```

n8n carga cada clase por el nombre del archivo, así que el wrapper conserva el nombre y el export originales y hereda **todo lo demás sin tocarlo**: `routing`, `methods` (los `loadOptions`), `webhooks`, `webhookMethods`, `execute`. Solo se traducen los campos visibles — `displayName`, `description`, `placeholder`, `action`, `hint` y `subtitle` — nunca `name`, `value`, `routing` ni `displayOptions`.

## 3. Las rutas del diccionario

El diccionario (`i18n/es.json`) es un objeto plano `{ ruta: texto }`. La ruta **no puede ser solo el nombre de la propiedad**: el nodo declara una propiedad `operation` por recurso y un `additionalFields` por operación, todas con el mismo `name` — sin distinguirlas, dos textos distintos se pisan entre sí (el primer intento dio 675 entradas en vez de 1065). La ruta antepone el ámbito `<resource>.<operation>` que declara `displayOptions.show`:

```
liveConnect.contact.create.id_canal.displayName
liveConnect.waba.sendTemplate.operation.options.sendTemplate.action
liveConnect._._.resource.displayName            ← campo visible siempre (sin resource/operation)
liveConnectApi._._.cKey.displayName             ← la credencial no tiene resource/operation
```

Esta lógica vive en **dos archivos que deben construir la ruta de forma idéntica**:

- `scripts/i18n-paths.mjs` (ESM) — lo usan el extractor (`extract-i18n.mjs`) y el reporte de estado (`i18n-status.mjs`).
- `scripts/i18n-runtime.js` (CommonJS, sin dependencias) — es el que viaja **dentro** del paquete publicado (copiado a `dist-es/i18n/translate.js`). Duplica la lógica de rutas a propósito: el paquete publicado no puede depender de un módulo del repo que no se publica.

Cualquier cambio en cómo se arman las rutas hay que hacerlo en los dos archivos, o el diccionario deja de encajar en silencio (un texto no traducido cae al inglés, nunca a un error).

## 4. Flujo de trabajo al tocar un texto

El código fuente está en inglés porque así lo exige la verificación de n8n. El diccionario **no se regenera desde el código** salvo en el bootstrap inicial:

1. Escribe el texto nuevo en inglés en la description, como siempre.
2. Añade su traducción a mano en `i18n/es.json`, con la ruta que le corresponde (ver arriba).
3. `npm run build && npm run i18n:status` dice qué textos del nodo compilado todavía no están en el diccionario, y qué entradas del diccionario ya no corresponden a nada (por ejemplo si renombraste o quitaste un campo). No escribe nada — es solo diagnóstico.

`scripts/extract-i18n.mjs` (el que genera `i18n/es.json` desde cero, volcando los textos del código compilado) es **solo para el bootstrap inicial** y aborta si el diccionario ya existe: ejecutarlo con el código ya en inglés **sobrescribiría las traducciones con el propio inglés**. Solo se vuelve a correr con `--force` si de verdad hay que regenerar el diccionario desde cero.

## 5. Cobertura y pruebas

Cobertura actual: **1065/1065 (100 %)**. `scripts/smoke-i18n.mjs` (parte de `npm run smoke`, requiere haber generado `dist-es/` antes con `npm run build:es`) carga las clases reales del paquete generado y comprueba:

- que el paquete generado expone las 5 clases (4 nodos + credencial) con su descripción;
- que las rutas del diccionario siguen encajando con la estructura real del nodo (umbral: cobertura ≥ 95 %, hoy 100 %);
- que un texto sin traducción cae al **inglés**, nunca queda vacío ni rompe nada;
- que el paquete inglés **no queda traducido**: los wrappers no mutan la clase base (si lo hicieran, el paquete que se envía a verificación saldría en español);
- que el `package.json` generado apunta a los wrappers (`nodes/…`) y no al paquete base (`base/…`).

## 6. Compatibilidad

El tipo del nodo español es `n8n-nodes-liveconnect-es.liveConnect`, **distinto** del paquete principal (`n8n-nodes-liveconnect.liveConnect`). Los workflows ya construidos con el paquete inglés no se rompen: siguen ahí. Quien quiera la interfaz en español tiene que instalar el paquete aparte y **recrear los nodos** en su workflow — no hay migración automática de uno a otro.

## 7. El README del paquete español

npm incluye en el tarball cualquier archivo que empiece por `README`, esté o no en el campo `files` de `package.json`. Por eso el README en español no puede vivir en la raíz del repo — se colaría en el tarball del paquete **inglés**, que debe llevar solo el suyo. Vive en `i18n/README.es.md`, y `scripts/build-es-package.mjs` lo copia a `dist-es/README.md` al generar el paquete. `LICENSE.md` se copia igual, sin traducir.

## 8. Comandos

```bash
npm run build && npm run build:es       # genera dist/ y luego dist-es/
npm run i18n:status                     # qué falta traducir (no escribe nada)
node scripts/extract-i18n.mjs --force   # SOLO para regenerar el diccionario desde cero (bootstrap)
npm run smoke                           # incluye smoke-i18n.mjs (requiere dist-es/ ya generado con build:es)
```

`.github/workflows/release.yml` publica los dos paquetes en el mismo workflow: primero `n8n-nodes-liveconnect` (inglés), después `npm run build:es` y `n8n-nodes-liveconnect-es` desde `working-directory: dist-es`. Detalle en [06-mantenimiento.md](06-mantenimiento.md) § Publicación.
