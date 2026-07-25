# Glosario de traducción — n8n-nodes-liveconnect (UI en español)

## REGLAS DURAS (no negociables)

1. **NUNCA tocar**: `name` de propiedades, `value` de options/resources/operations, `routing`, `displayOptions`, `default` (salvo que el default sea un texto visible), imports, exports, estructura. SOLO se traducen textos visibles: `displayName`, `description`, `placeholder`, `hint`, `name` de las OPTIONS (el label visible), `action`.
2. **REORDENAR alfabéticamente** después de traducir: las options de `operation` por su `name` traducido; las opciones dentro de collections por su `displayName` traducido. (Regla ESLint de orden alfabético.)
3. displayName en Title Case español: "Campos Adicionales", "ID del Canal". Siglas siempre mayúsculas: ID, CRM, WABA, URL, API.
4. `action` en español, oración corta: "Crear un contacto", "Obtener varios contactos", "Enviar una plantilla".
5. Los sufijos de marca quedan en inglés: displayName de nodos "LiveConnect", "LiveConnect Proxy Trigger", "LiveConnect Callback Trigger" NO se traducen (regla ESLint exige sufijo Trigger).
6. Descripciones ya están en español — solo revisar coherencia; las pocas en inglés se traducen.
7. Indentación TABS, comillas simples, trailing commas (prettier del repo).

## Recursos (name visible → español; value NO cambia)

| value | name español |
|---|---|
| assistant | Asistente |
| automation | Automatización CRM |
| category | Categoría |
| channel | Canal |
| contact | Contacto |
| conversation | Conversación |
| crm | CRM |
| deal | Negociación |
| dealTask | Tarea de Negociación |
| group | Grupo |
| history | Historial |
| product | Producto |
| proxy | Proxy |
| quickReply | Respuesta Rápida |
| topic | Tópico |
| user | Usuario |
| waba | WhatsApp Business (WABA) |
| whatsapp | WhatsApp QR |

Orden alfabético español de resources en LiveConnect.node.ts: Asistente, Automatización CRM, Canal, Categoría, Contacto, Conversación, CRM, Grupo, Historial, Negociación, Producto, Proxy, Respuesta Rápida, Tarea de Negociación, Tópico, Usuario, WhatsApp Business (WABA), WhatsApp QR.

## Operaciones (name → español; value NO cambia)

| Inglés | Español |
|---|---|
| Create | Crear |
| Get | Obtener |
| Get Many | Obtener Varios |
| Get Many Conversations | Obtener Varias Conversaciones |
| Get Many Templates | Obtener Varias Plantillas |
| Update | Actualizar |
| Delete | Eliminar |
| Archive | Archivar |
| Remove Tags | Eliminar Etiquetas |
| Set State | Cambiar Estado |
| Check Number | Verificar Número |
| Send Message | Enviar Mensaje |
| Send File | Enviar Archivo |
| Send Template | Enviar Plantilla |
| Send Quick Reply | Enviar Respuesta Rápida |
| Get Balance | Consultar Saldo |
| Get Webhook | Consultar Webhook |
| Set Webhook | Configurar Webhook |
| Transfer | Transferir |
| Get Lead Channels | Obtener Canales de Lead |
| Get Lead Origins | Obtener Orígenes de Lead |
| Get Pipelines | Obtener Pipelines |
| Get Stages | Obtener Etapas |
| Get Attachments | Obtener Anexos |
| Get Conversation | Obtener Conversación |
| Get Messages | Obtener Mensajes |
| Get Participants | Obtener Participantes |
| Get Template | Obtener Plantilla |

## Campos comunes (displayName → español)

| Inglés | Español |
|---|---|
| Additional Fields | Campos Adicionales |
| Update Fields | Campos a Actualizar |
| Filters | Filtros |
| Search Fields | Campos de Búsqueda |
| Add Field / Add Filter (placeholder) | Agregar Campo / Agregar Filtro |
| Name | Nombre |
| Last Name | Apellidos |
| Cell Phone | Celular |
| Phone Number | Número de Teléfono |
| Email | Correo Electrónico |
| Alternate Email | Correo Alternativo |
| Address | Dirección |
| City | Ciudad |
| Country | País |
| Channel ID | ID del Canal |
| Contact ID | ID del Contacto |
| Conversation ID | ID de la Conversación |
| Firebase Conversation ID | ID de Conversación en Firebase |
| Quick Reply ID | ID de la Respuesta Rápida |
| Template ID | ID de la Plantilla |
| Pipeline ID | ID del Pipeline |
| Pipeline Stage ID | ID de la Etapa del Pipeline |
| Owner ID | ID del Responsable |
| Group ID | ID del Grupo |
| User ID | ID del Usuario |
| Tag IDs | IDs de Etiquetas |
| Message | Mensaje |
| File URL | URL del Archivo |
| File Name | Nombre del Archivo |
| File Extension | Extensión del Archivo |
| Webhook URL | URL del Webhook |
| Value | Valor |
| Currency | Moneda |
| Description | Descripción |
| Limit | Límite |
| Offset | Desplazamiento |
| Search | Búsqueda |
| Created From | Creado Desde |
| Created To | Creado Hasta |
| Archived | Archivado |
| Public | Público |
| Status | Estado |
| Dynamic Fields | Campos Dinámicos |
| Sync Tags | Sincronizar Etiquetas |
| Birthday | Fecha de Cumpleaños |
| Document Number | Número de Documento |
| Gender | Género |
| Secret | Secreto |
| Response Mode | Modo de Respuesta |
| Simplify | Simplificar |
| Return Full Response | Devolver Respuesta Completa |

Options genéricas: { name: 'No', value: 0 } / { name: 'Sí', value: 1 } (traducir 'Yes' → 'Sí').

## Notas

- Descriptions de booleans: reescribir en español natural ("Si se activa, ..."), la regla "Whether..." queda desactivada en ESLint.
- Description del Limit en español: 'Cantidad máxima de resultados a devolver'.
- Triggers: options de Response Mode → 'Inmediatamente' (onReceived), 'Usando el Nodo Respond to Webhook' (responseNode), 'Al Terminar el Último Nodo' (lastNode) — reordenar alfabético.
