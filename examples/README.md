# Example Workflows — n8n-nodes-liveconnect

Importable workflows showing real use cases for the LiveConnect node.

## How to import

In n8n: **Workflow → ⋯ (menu) → Import from File** and select the `.json` file. Then:

1. Assign your **LiveConnect API** credential on each LiveConnect node (they show up marked in red).
2. For the chatbots (03/04): assign your **OpenAI** credential on the model node.
3. Follow the yellow note (sticky note) in each workflow: it has the IDs you need to replace.

## The workflows

| # | File | What it does |
|---|---|---|
| 01 | `01-configurar-webhook-proxy.json` | **Step 0 for the chatbots**: registers your n8n webhook URL on the LiveConnect channel (`Proxy · Set Webhook`). |
| 02 | `02-envio-masivo-plantillas-waba.json` | Bulk WABA template sending in batches with pace control. Replace the demo list with Sheets/DB. |
| 03 | `03-chatbot-ia.json` | Support chatbot with AI Agent (OpenAI) + per-conversation memory. Replies via `Proxy · Send Message`. |
| 04 | `04-chatbot-ia-crm.json` | Sales chatbot: the agent uses the LiveConnect node as a **tool** to look up the contact and **create the deal in the CRM** once it qualifies the lead. |
| 05 | `05-reporte-diario-conversaciones.json` | Daily 7:00 report with conversation history metrics (total, by channel, by agent). |
| 06 | `06-verificar-numero-crear-contacto.json` | Validated signup: verifies the number on WhatsApp, creates the contact, opens a conversation, and sends a welcome message. |
| 07 | `07-chatbot-callback-trigger.json` | Chatbot with the **LiveConnect Callback Trigger** (v0.2.0+): a rules engine that responds with `data.actions` and the mandatory closing `input`. |
| 08 | `08-mensajes-proxy-trigger.json` | Incoming messages with the **LiveConnect Proxy Trigger** (v0.2.0+): automatic channel webhook registration + auto-reply. |
| 09 | `09-chatbot-callback-visual.json` | **No-code** chatbot (v0.4.0+): the **LiveConnect Callback Response** node builds the actions visually and responds to the webhook itself. |
| 10 | `10-chatbot-ia-switch-respuestas.json` | Full chatbot: **Callback Trigger → AI Agent (GPT) that classifies → Switch by intent → a different response per branch** (sales, support with delegation to a human, scheduling, and general). |

## Requirement for workflow 04 (node as an AI tool)

For the AI Agent to be able to use community nodes as tools, the n8n server needs the environment variable:

```bash
N8N_COMMUNITY_PACKAGES_ALLOW_TOOL_USAGE=true
```

(In Docker: add it to the container's `environment` and restart).

## LiveConnect webhook payload (chatbots)

When you configure the channel webhook (workflow 01), LiveConnect sends a POST with this structure (main fields):

```json
{
	"chat": {
		"id": "ZMXRQ38...",          // conversation ID (used to reply)
		"id_canal": 67095,
		"contacto": { "id": "...", "nombre": "...", "celular": "..." }
	},
	"inputs": { "mensaje_inicial": "Hello!" },  // first turn
	"userInput": "I want information"          // following turns
}
```

Parsing rule (already included in the examples' Code node): `mensaje = userInput || inputs.mensaje_inicial`.

## IDs you will need

| Data | How to get it with the node |
|---|---|
| Channel ID | `Channel · Get Many` |
| WABA template ID | `WABA · Get Many Templates` |
| Pipeline and stage ID | `CRM · Get Pipelines` / `CRM · Get Stages` |
| Lead origin ID | `CRM · Get Lead Origins` |
| User ID (owner) | `User · Get Many` |
| Team ID | `Team · Get Many` |
