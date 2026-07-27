# n8n-nodes-liveconnect

Community node for [n8n](https://n8n.io) that integrates the **LiveConnect public API** — omnichannel messaging and CRM: contacts, conversations, WhatsApp QR, WhatsApp Business API (WABA), CRM deals, tasks and automations, product catalog, AI assistants, conversation history and more.

It covers all 58 operations of the [public OpenAPI specification](https://cdn.liveconnect.chat/liveconnect/public-openapi.json) (token issuing is handled automatically by the credential), plus **two triggers** — conversation proxy notifications and chatbot (Flowbot) callbacks — and a node that builds callback responses visually.

> This package is being prepared for submission to the n8n verified community nodes program.

> ⚠️ **Do not install `n8n-nodes-liveconnect` and `n8n-nodes-liveconnect-es` in the same n8n instance.** Node types are namespaced per package, but **credential types are not**: both packages declare a credential named `liveConnectApi`, so one of them would win and define the credential form (and its language) for both. Pick one package per instance.

## What is LiveConnect

[LiveConnect](https://liveconnect.chat) is an omnichannel customer communication platform: it centralizes WhatsApp, Facebook, Instagram, Telegram and web chat conversations, routes them to agents or bots, and includes a CRM with deals, tasks and automations. This node lets n8n read from and write to that platform.

## Features

- **58 operations** across 18 resources, all derived from the official OpenAPI spec.
- **Two triggers**: conversation proxy notifications (registers its own webhook) and Flowbot callbacks (synchronous response).
- **Visual callback response builder** — compose the bot's actions without a Code node.
- **Dynamic dropdowns** for every ID field (channels, teams, agents, pipelines, stages, lead origins, categories, assistants, WABA templates), loaded from your own account.
- **WhatsApp template sending** that shows exactly the fields the chosen template needs, and validates before calling the API.
- **Automatic session-token lifecycle**: issued, cached and renewed transparently.
- Usable as an **AI Agent tool** (`usableAsTool`).

## Requirements

- n8n 1.82 or newer (self-hosted, or n8n Cloud once the node is verified).
- Node.js 20.15 or newer.
- A LiveConnect account with API access (account key and private key).

## Installation

### Verified community nodes panel

Once the node is verified, install it from **Settings → Community Nodes → Browse** and search for `n8n-nodes-liveconnect`.

### Self-hosted n8n

**Settings → Community Nodes → Install**, then enter `n8n-nodes-liveconnect`.

Manual install:

```bash
cd ~/.n8n/nodes
npm install n8n-nodes-liveconnect
```

## Credentials

Create a **LiveConnect API** credential with:

| Field | Description |
|---|---|
| Account Key (cKey) | LiveConnect account hash |
| Private Key (privateKey) | LiveConnect account private key |

The node calls `POST /account/token` on your behalf, caches the session JWT and sends it in the `PageGearToken` header. The token lives for about 10 minutes and is renewed automatically before it expires.

## Resources and operations

| Resource | Operations |
|---|---|
| **Assistant** | Get Many, Create, Update |
| **Topic** | Get Many, Create, Update (assistant memories) |
| **Category** | Get Many, Create, Update |
| **Product** | Get Many, Create, Update |
| **Channel** | Get Many |
| **Contact** | Get Many, Get, Create, Update, Remove Tags |
| **Conversation** | Create |
| **CRM** | Get Lead Origins, Get Lead Channels, Get Pipelines, Get Stages |
| **CRM Automation** | Create, Update, Delete |
| **Deal** | Create, Update, Archive |
| **Deal Task** | Create, Update, Delete |
| **Team** | Get Many |
| **History** | Get Many Conversations, Get Conversation, Get Messages, Get Participants, Get Attachments |
| **Proxy** | Get Webhook, Set Webhook, Send Message, Send File, Send Quick Reply, Transfer, Get Balance |
| **Quick Reply** | Create, Update |
| **User** | Get Many, Get, Set State |
| **WhatsApp Business (WABA)** | Get Many Templates, Get Template, Send Template, Send Quick Reply |
| **WhatsApp QR** | Check Number, Send Message, Send File, Send Quick Reply |

## Triggers

### LiveConnect Proxy Trigger

Fires on **conversation proxy notifications**. It manages the channel webhook by itself: it registers it (`POST /proxy/setWebhook`) when the workflow is activated and removes it when deactivated. Leave the Secret field empty and it generates a secure one, then validates every incoming notification against it.

> ⚠️ LiveConnect allows **one webhook per channel**. Do not activate two workflows with the same Channel ID — they overwrite each other's registration. "Listen for test event" also replaces the production webhook while it listens.

### LiveConnect Callback Trigger

Receives **chatbot (Flowbot) callbacks**. Activate the workflow and paste the trigger's Production URL into your Flowbot's callback action. The trigger validates the secret (query string or header) and outputs a simplified event: the user message (resolving the first turn from `inputs.mensaje_inicial`), a stable session ID for memory, whether it is the first turn, whether a human agent is in the conversation, contact data, inputs, intent and the raw payload.

Both triggers expose a **Webhook Path** field, so you can give each one a readable URL when you run several bots.

#### The callback requires a synchronous response

LiveConnect expects the actions in the same HTTP response:

```json
{ "status": 1, "status_message": "Ok", "data": { "actions": [
  { "type": "sendText", "text": "Hi! How can I help you?" },
  { "type": "input", "input": "" }
] } }
```

The easy way is the **LiveConnect Callback Response** node: it builds the actions from the editor (text, image, file, tag, variables, delegation, contact update), applies the closing rule and answers the webhook itself — no Code node, no Respond to Webhook. See [`examples/09-chatbot-callback-visual.json`](examples/09-chatbot-callback-visual.json).

**Closing rule:** always end with an `input` action (an empty one works). Without it LiveConnect abandons the callback and never calls again. The only exception is delegating to a human (`userDelegate` / `teamDelegate`). Supported action types: `sendText`, `sendImage`, `sendFile`, `addTag`, `userDelegate`, `teamDelegate`, `addVar`, `setVar`, `input`, `updateContact`.

## Dynamic dropdowns

ID fields (channel, team, agent, pipeline, stage, lead origin, category, assistant, WABA template) are **dropdowns loaded from your own LiveConnect account**, so you never have to look up IDs by hand. Stages are filtered by the selected pipeline, and templates by the selected WhatsApp channel. To pass an ID from another node, switch the field to expression mode.

## Sending a WhatsApp template

This is the operation that combines the most data, so the node does the work for you:

1. Pick the **Channel** (only WhatsApp channels are listed) and the **Template**. The dropdown label already tells you what it needs: `promo_48h · es · 2 variables · video`.
2. **Exactly** the fields that template requires appear: `Variable {{1}}`, `Variable {{2}}`… and the header URL only when the template carries an image, video or document. A template with neither shows neither.
3. Run the step. If something is missing, the error names it: *"Template promo_48h needs 2 variables and the value of {{2}} is missing"*.

Shortcuts:

- **Additional Fields → Use Sample Data**: fills whatever you left empty with the sample values the template ships with, so you can send yourself a test without typing anything.
- **Bulk sending with a different template per row**: put an expression in the template field and pass the values through *Additional Fields → Body Variables (Comma-Separated)*, in `{{1}}, {{2}}…` order. See [`examples/02-envio-masivo-plantillas-waba.json`](examples/02-envio-masivo-plantillas-waba.json).

## Using the node as an AI Agent tool

The node is marked `usableAsTool`, so an AI Agent can call any of its operations directly, and fields accept the `$fromAI()` expression so the model can fill them in. [`examples/04-chatbot-ia-crm.json`](examples/04-chatbot-ia-crm.json) shows an agent that creates CRM deals out of a WhatsApp conversation.

## API response format

LiveConnect always answers with `{ status, status_message, data }`, where `status > 0` means success and `status < 0` means error — **even when the HTTP status is 200**:

- On `status < 0` the node throws, surfacing the API message in n8n.
- By default the node returns only `data` (one item per element when it is an array).
- Enable **Return Full Response** to get the whole envelope.

## Notes

- Files (Send File) are sent by **public URL**, never as binary data.
- Base URL: `https://api.liveconnect.chat/prod`.

## Examples

Ready-to-import workflows live in [`examples/`](examples/): bulk WABA template sending, an AI chatbot with per-conversation memory, an AI sales bot that creates CRM deals using this node as an agent tool, a daily conversation report, validated contact creation, and callback bots built both with and without code. See [examples/README.md](examples/README.md).

## Development

```bash
npm install --ignore-scripts   # plain `npm install` fails: isolated-vm does not build on Node >= 26
npm run build                  # tsc + icons
npm run lint                   # official n8n community-node lint rules
npm run verify                 # diffs the compiled node against the LiveConnect OpenAPI spec
npm run smoke                  # smoke tests (triggers, callback response, token, dropdowns, templates)
npm run scan                   # official n8n community package scanner (runs against the published package)
```

Before changing the code, read [`docs/`](docs/): it documents the API behaviour the spec does not, the n8n runtime pitfalls this package hit, and the designs that were discarded and why. Start with [docs/README.md](docs/README.md). Those development notes are kept in Spanish; everything shipped to users is in English.

## Links

- LiveConnect: <https://liveconnect.chat>
- Public API (OpenAPI): <https://cdn.liveconnect.chat/liveconnect/public-openapi.json>
- Repository: <https://github.com/Exus-Agencia-Web/liveconnect-n8n>
- Report an issue: <https://github.com/Exus-Agencia-Web/liveconnect-n8n/issues>
- n8n community nodes: <https://docs.n8n.io/integrations/community-nodes/>

## License

[MIT](LICENSE.md)
