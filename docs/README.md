# Documentación de desarrollo — n8n-nodes-liveconnect

Esta carpeta es la **memoria del proyecto**: todo lo que se descubrió probando contra el API real de LiveConnect y contra el runtime de n8n, incluido lo que **no** funcionó. Está escrita para que cualquier persona (o cualquier sesión de un agente) pueda retomar el desarrollo sin repetir los mismos errores.

El `README.md` de la raíz es para quien **usa** el nodo. Esto es para quien lo **mantiene**.

## Índice

| Documento | Qué contiene | Léelo antes de… |
|---|---|---|
| [01-arquitectura.md](01-arquitectura.md) | Los 4 nodos, la credencial, el diseño declarativo, qué archivo hace qué | tocar cualquier cosa |
| [02-api-liveconnect.md](02-api-liveconnect.md) | Comportamiento real del API: envelope, `status < 0`, ciclo de vida del token, respuestas anidadas, endpoints con rarezas | añadir o cambiar operaciones |
| [03-plantillas-waba.md](03-plantillas-waba.md) | Plantillas de WhatsApp: proveedores (Gupshup / Meta), qué identificador acepta cada uno, cómo se decide la UI, el preSend | tocar `Enviar Plantilla` |
| [04-triggers-y-callbacks.md](04-triggers-y-callbacks.md) | Proxy Trigger, Callback Trigger (contrato del Flowbot) y el nodo de respuesta visual | tocar triggers o respuestas de callback |
| [05-lecciones-n8n.md](05-lecciones-n8n.md) | Trampas del framework n8n que costaron versiones enteras | cualquier cambio de UI, routing, auth o ESLint |
| [06-mantenimiento.md](06-mantenimiento.md) | Flujo desde el OpenAPI, contrato de las descriptions, pruebas, build, verificación de n8n y publicación | actualizar el spec o publicar |
| [07-historial-decisiones.md](07-historial-decisiones.md) | Qué se intentó en cada versión y por qué se descartó | proponer un rediseño |
| [08-paquete-espanol.md](08-paquete-espanol.md) | Por qué el español es un paquete aparte (`n8n-nodes-liveconnect-es`), cómo se genera desde el mismo código y el diccionario `i18n/es.json` | tocar cualquier texto visible del nodo, o el paquete español |

## Reglas que no se negocian

1. **La fuente de verdad es el OpenAPI**: <https://cdn.liveconnect.chat/liveconnect/public-openapi.json>. No se inventan campos ni endpoints. `npm run verify` compara el nodo compilado con el spec.
2. **El spec no lo cuenta todo.** Lo que el API hace de verdad (y no está documentado) vive en [02-api-liveconnect.md](02-api-liveconnect.md). Si descubres algo nuevo, va ahí.
3. **Nada se da por bueno sin probarlo contra el API real.** Varias versiones se publicaron con supuestos razonables y falsos: ver [07-historial-decisiones.md](07-historial-decisiones.md).
4. **Antes de publicar**: `npm run build && npm run lint && npm run verify && npm run smoke`, todo en verde.
5. **La interfaz del paquete principal está en inglés** (lo exige la verificación de nodos comunitarios de n8n); `name`/`value` internos jamás cambian. El español se publica como paquete aparte, `n8n-nodes-liveconnect-es`, generado desde este mismo código. Detalle en [06-mantenimiento.md](06-mantenimiento.md) y [08-paquete-espanol.md](08-paquete-espanol.md).

## Cómo mantener esta documentación

Estos documentos valen lo que valga su actualidad. Reglas de mantenimiento:

- **Cuándo actualizar** — en el mismo cambio (mismo commit) que:
  - descubre un comportamiento del API que el spec no documenta → `02-api-liveconnect.md`;
  - descubre una trampa del runtime de n8n → `05-lecciones-n8n.md`;
  - cambia la UI o el flujo de una operación → el documento del tema (p. ej. `03-plantillas-waba.md`);
  - añade, quita o renombra un archivo/nodo/método → `01-arquitectura.md`;
  - cambia el proceso de build, pruebas o publicación → `06-mantenimiento.md`;
  - **descarta** un diseño (propio o heredado) → `07-historial-decisiones.md`, diciendo **por qué** falló. Un diseño descartado sin explicación se vuelve a intentar.
- **Qué escribir**: el hecho verificado y **cómo se verificó** ("probado en vivo contra el canal 4695", "confirmado en `routing-node.ts:804`"). Una afirmación sin origen no sirve para decidir.
- **Qué NO escribir**: lo que el código ya dice solo (firmas, listas de campos), ni narración de la sesión ("luego intenté…"). Aquí van **conclusiones**, no bitácoras.
- **Referencias al core de n8n**: cita archivo y línea, pero avisa de que las líneas se mueven entre versiones — la que vale es la afirmación, no el número.
- **Al corregir algo que aquí decía lo contrario**: bórralo o táchalo explícitamente. Dos afirmaciones opuestas en dos documentos son peores que ninguna.
- **Versiones**: al publicar, añade la entrada correspondiente en `07-historial-decisiones.md`. Es el changelog razonado del proyecto.
- **`CLAUDE.md` (raíz)** es el resumen operativo que los agentes cargan automáticamente: cuando cambies algo aquí que contradiga ese resumen, actualiza los dos. `CLAUDE.md` debe quedarse corto y apuntar a esta carpeta.
