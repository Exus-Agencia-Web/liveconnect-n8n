# Workflows de ejemplo — n8n-nodes-liveconnect

Workflows importables que muestran casos de uso reales del nodo LiveConnect.

## Cómo importar

En n8n: **Workflow → ⋯ (menú) → Import from File** y selecciona el `.json`. Luego:

1. Asigna tu credencial **LiveConnect API** en cada nodo LiveConnect (aparecen marcados en rojo).
2. Para los chatbots (03/04): asigna tu credencial **OpenAI** en el nodo del modelo.
3. Sigue la nota amarilla (sticky note) de cada workflow: ahí están los IDs que debes reemplazar.

## Los workflows

| # | Archivo | Qué hace |
|---|---|---|
| 01 | `01-configurar-webhook-proxy.json` | **Paso 0 de los chatbots**: registra la URL de tu webhook n8n en el canal de LiveConnect (`Proxy · Set Webhook`). |
| 02 | `02-envio-masivo-plantillas-waba.json` | Envío masivo de plantillas WABA por lotes con control de ritmo. Reemplaza la lista demo por Sheets/DB. |
| 03 | `03-chatbot-ia.json` | Chatbot de soporte con AI Agent (OpenAI) + memoria por conversación. Responde por `Proxy · Send Message`. |
| 04 | `04-chatbot-ia-crm.json` | Chatbot vendedor: el agente usa el nodo LiveConnect como **herramienta** para buscar el contacto y **crear la negociación en el CRM** cuando califica el lead. |
| 05 | `05-reporte-diario-conversaciones.json` | Reporte diario 7:00 con métricas del historial de conversaciones (total, por canal, por agente). |
| 06 | `06-verificar-numero-crear-contacto.json` | Alta validada: verifica el número en WhatsApp, crea contacto, abre conversación y envía bienvenida. |

## Requisito para el workflow 04 (nodo como herramienta de IA)

Para que el AI Agent pueda usar nodos comunitarios como tools, el servidor n8n necesita la variable de entorno:

```bash
N8N_COMMUNITY_PACKAGES_ALLOW_TOOL_USAGE=true
```

(En Docker: agrégala al `environment` del contenedor y reinicia).

## Payload del webhook de LiveConnect (chatbots)

Cuando configuras el webhook del canal (workflow 01), LiveConnect envía POST con esta estructura (campos principales):

```json
{
	"chat": {
		"id": "ZMXRQ38...",          // ID de la conversación (para responder)
		"id_canal": 67095,
		"contacto": { "id": "...", "nombre": "...", "celular": "..." }
	},
	"inputs": { "mensaje_inicial": "Hola!" },  // primer turno
	"userInput": "quiero información"          // turnos siguientes
}
```

Regla de parseo (ya incluida en el nodo Code de los ejemplos): `mensaje = userInput || inputs.mensaje_inicial`.

## IDs que vas a necesitar

| Dato | Cómo obtenerlo con el nodo |
|---|---|
| ID de canal | `Channel · Get Many` |
| ID de plantilla WABA | `WABA · Get Many Templates` |
| ID de pipeline y etapa | `CRM · Get Pipelines` / `CRM · Get Stages` |
| ID de origen de lead | `CRM · Get Lead Origins` |
| ID de usuario (responsable) | `User · Get Many` |
| ID de grupo/equipo | `Group · Get Many` |
