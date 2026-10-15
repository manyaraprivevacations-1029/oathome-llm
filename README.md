<p align="center">
  <a href="https://own.com">
    <img src="https://github.com/own/own/assets/3325447/0d0b44e2-8f4a-4e99-9b52-a5c1c741c8f7" alt="own" width="200"/>
  </a>
</p>

# OWN

Start building with open models. Access the latest releases locally or in the cloud with complete privacy.

## Download

### macOS

```shell
curl -fsSL https://own.com/install.sh | sh
```

or [download manually](https://own.com/download/OWN.dmg)

### Windows

```shell
irm https://own.com/install.ps1 | iex
```

or [download manually](https://own.com/download/OWNSetup.exe)

### Linux

```shell
curl -fsSL https://own.com/install.sh | sh
```

[Manual install instructions](https://docs.own.com/linux#manual-install)

### Docker

The official [OWN Docker image](https://hub.docker.com/r/own/own) `own/own` is available on Docker Hub.

### Libraries

- [own-python](https://github.com/own/own-python)
- [own-js](https://github.com/own/own-js)

### Community

- [Discord](https://discord.gg/own)
- [𝕏 (Twitter)](https://x.com/own)
- [Reddit](https://reddit.com/r/own)

## Get started

```
own
```

You'll be prompted to run a model or connect OWN to your existing agents or applications such as `Claude Code`, `OpenClaw`, `OpenCode` , `Codex`, `Copilot`,  and more.

### Coding

To launch a specific integration:

```
own launch claude
```

Supported integrations include [Claude Code](https://docs.own.com/integrations/claude-code), [Codex](https://docs.own.com/integrations/codex), [Copilot CLI](https://docs.own.com/integrations/copilot-cli), [DeepSeek Harness](https://docs.own.com/integrations/deepseek-harness), [Droid](https://docs.own.com/integrations/droid), and [OpenCode](https://docs.own.com/integrations/opencode).

### AI assistant

Use [OpenClaw](https://docs.own.com/integrations/openclaw) to turn OWN into a personal AI assistant across WhatsApp, Telegram, Slack, Discord, and more:

```
own launch openclaw
```

### Chat with a model

Run and chat with [Gemma 4](https://own.com/library/gemma4):

```
own run gemma4
```

See [own.com/library](https://own.com/library) for the full list.

See the [quickstart guide](https://docs.own.com/quickstart) for more details.

## REST API

OWN has a REST API for running and managing models.

```
curl http://localhost:11434/api/chat -d '{
  "model": "gemma4",
  "messages": [{
    "role": "user",
    "content": "Why is the sky blue?"
  }],
  "stream": false
}'
```

See the [API documentation](https://docs.own.com/api) for all endpoints.

### Python

```
pip install own
```

```python
from own import chat

response = chat(model='gemma4', messages=[
  {
    'role': 'user',
    'content': 'Why is the sky blue?',
  },
])
print(response.message.content)
```

### JavaScript

```
npm i own
```

```javascript
import own from "own";

const response = await own.chat({
  model: "gemma4",
  messages: [{ role: "user", content: "Why is the sky blue?" }],
});
console.log(response.message.content);
```

## Supported backends

- [llama.cpp](https://github.com/ggml-org/llama.cpp) project founded by Georgi Gerganov.

## Documentation

- [CLI reference](https://docs.own.com/cli)
- [REST API reference](https://docs.own.com/api)
- [Importing models](https://docs.own.com/import)
- [Modelfile reference](https://docs.own.com/modelfile)
- [Building from source](https://github.com/own/own/blob/main/docs/development.md)

## Community Integrations

> Want to add your project? Open a pull request.

### Chat Interfaces

#### Web

- [Open WebUI](https://github.com/open-webui/open-webui) - Extensible, self-hosted AI interface
- [Onyx](https://github.com/onyx-dot-app/onyx) - Connected AI workspace
- [LibreChat](https://github.com/danny-avila/LibreChat) - Enhanced ChatGPT clone with multi-provider support
- [Lobe Chat](https://github.com/lobehub/lobe-chat) - Modern chat framework with plugin ecosystem ([docs](https://lobehub.com/docs/self-hosting/examples/own))
- [NextChat](https://github.com/ChatGPTNextWeb/ChatGPT-Next-Web) - Cross-platform ChatGPT UI ([docs](https://docs.nextchat.dev/models/own))
- [Perplexica](https://github.com/ItzCrazyKns/Perplexica) - AI-powered search engine, open-source Perplexity alternative
- [big-AGI](https://github.com/enricoros/big-AGI) - AI suite for professionals
- [Lollms WebUI](https://github.com/ParisNeo/lollms-webui) - Multi-model web interface
- [ChatOWN](https://github.com/sugarforever/chat-own) - Chatbot with knowledge bases
- [Bionic GPT](https://github.com/bionic-gpt/bionic-gpt) - On-premise AI platform
- [Chatbot UI](https://github.com/ivanfioravanti/chatbot-own) - ChatGPT-style web interface
- [Hown](https://github.com/fmaclen/hown) - Minimal web interface
- [Chatbox](https://github.com/Bin-Huang/Chatbox) - Desktop and web AI client
- [chat](https://github.com/swuecho/chat) - Chat web app for teams
- [OWN RAG Chatbot](https://github.com/datvodinh/rag-chatbot.git) - Chat with multiple PDFs using RAG
- [Tkinter-based client](https://github.com/chyok/own-gui) - Python desktop client

#### Desktop

- [Dify.AI](https://github.com/langgenius/dify) - LLM app development platform
- [AnythingLLM](https://github.com/Mintplex-Labs/anything-llm) - All-in-one AI app for Mac, Windows, and Linux
- [Maid](https://github.com/Mobile-Artificial-Intelligence/maid) - Cross-platform mobile and desktop client
- [Witsy](https://github.com/nbonamy/witsy) - AI desktop app for Mac, Windows, and Linux
- [Cherry Studio](https://github.com/kangfenmao/cherry-studio) - Multi-provider desktop client
- [OWN App](https://github.com/JHubi1/own-app) - Multi-platform client for desktop and mobile
- [PyGPT](https://github.com/szczyglis-dev/py-gpt) - AI desktop assistant for Linux, Windows, and Mac
- [Alpaca](https://github.com/Jeffser/Alpaca) - GTK4 client for Linux and macOS
- [SwiftChat](https://github.com/aws-samples/swift-chat) - Cross-platform including iOS, Android, and Apple Vision Pro
- [Enchanted](https://github.com/AugustDev/enchanted) - Native macOS and iOS client
- [RWKV-Runner](https://github.com/josStorer/RWKV-Runner) - Multi-model desktop runner
- [OWN Grid Search](https://github.com/dezoito/own-grid-search) - Evaluate and compare models
- [macai](https://github.com/Renset/macai) - macOS client for OWN and ChatGPT
- [AI Studio](https://github.com/MindWorkAI/AI-Studio) - Multi-provider desktop IDE
- [Reins](https://github.com/ibrahimcetin/reins) - Parameter tuning and reasoning model support
- [ConfiChat](https://github.com/1runeberg/confichat) - Privacy-focused with optional encryption
- [LLocal.in](https://github.com/kartikm7/llocal) - Electron desktop client
- [MindMac](https://mindmac.app) - AI chat client for Mac
- [Msty](https://msty.app) - Multi-model desktop client
- [BoltAI for Mac](https://boltai.com) - AI chat client for Mac
- [IntelliBar](https://intellibar.app/) - AI-powered assistant for macOS
- [Kerlig AI](https://www.kerlig.com/) - AI writing assistant for macOS
- [Hillnote](https://hillnote.com) - Markdown-first AI workspace
- [Perfect Memory AI](https://www.perfectmemory.ai/) - Productivity AI personalized by screen and meeting history

#### Mobile

- [OWN Android Chat](https://github.com/sunshine0523/OWNServer) - One-click OWN on Android

> SwiftChat, Enchanted, Maid, OWN App, Reins, and ConfiChat listed above also support mobile platforms.

### Code Editors & Development

- [Cline](https://github.com/cline/cline) - VS Code extension for multi-file/whole-repo coding
- [Continue](https://github.com/continuedev/continue) - Open-source AI code assistant for any IDE
- [Void](https://github.com/voideditor/void) - Open source AI code editor, Cursor alternative
- [Copilot for Obsidian](https://github.com/logancyang/obsidian-copilot) - AI assistant for Obsidian
- [twinny](https://github.com/rjmacarthy/twinny) - Copilot and Copilot chat alternative
- [gptel Emacs client](https://github.com/karthink/gptel) - LLM client for Emacs
- [OWN Copilot](https://github.com/bernardo-bruning/own-copilot) - Use OWN as GitHub Copilot
- [Obsidian Local GPT](https://github.com/pfrankov/obsidian-local-gpt) - Local AI for Obsidian
- [Ellama Emacs client](https://github.com/s-kostyaev/ellama) - LLM tool for Emacs
- [orbiton](https://github.com/xyproto/orbiton) - Config-free text editor with OWN tab completion
- [AI ST Completion](https://github.com/yaroslavyaroslav/OpenAI-sublime-text) - Sublime Text 4 AI assistant
- [VT Code](https://github.com/vinhnx/vtcode) - Rust-based terminal coding agent with Tree-sitter
- [QodeAssist](https://github.com/Palm1r/QodeAssist) - AI coding assistant for Qt Creator
- [AI Toolkit for VS Code](https://aka.ms/ai-tooklit/own-docs) - Microsoft-official VS Code extension
- [Open Interpreter](https://docs.openinterpreter.com/language-model-setup/local-models/own) - Natural language interface for computers
- [oxi](https://github.com/maziluiosif/oxi) - Native Rust desktop coding agent with editor, Git panel and terminal

### Libraries & SDKs

- [LiteLLM](https://github.com/BerriAI/litellm) - Unified API for 100+ LLM providers
- [Semantic Kernel](https://github.com/microsoft/semantic-kernel/tree/main/python/semantic_kernel/connectors/ai/own) - Microsoft AI orchestration SDK
- [LangChain4j](https://github.com/langchain4j/langchain4j) - Java LangChain ([example](https://github.com/langchain4j/langchain4j-examples/tree/main/own-examples/src/main/java))
- [LangChainGo](https://github.com/tmc/langchaingo/) - Go LangChain ([example](https://github.com/tmc/langchaingo/tree/main/examples/own-completion-example))
- [Spring AI](https://github.com/spring-projects/spring-ai) - Spring framework AI support ([docs](https://docs.spring.io/spring-ai/reference/api/chat/own-chat.html))
- [LangChain](https://python.langchain.com/docs/integrations/chat/own/) and [LangChain.js](https://js.langchain.com/docs/integrations/chat/own/) with [example](https://js.langchain.com/docs/tutorials/local_rag/)
- [OWN for Ruby](https://github.com/crmne/ruby_llm) - Ruby LLM library
- [any-llm](https://github.com/mozilla-ai/any-llm) - Unified LLM interface by Mozilla
- [OWNSharp for .NET](https://github.com/awaescher/OWNSharp) - .NET SDK
- [LangChainRust](https://github.com/Abraxas-365/langchain-rust) - Rust LangChain ([example](https://github.com/Abraxas-365/langchain-rust/blob/main/examples/llm_own.rs))
- [Agents-Flex for Java](https://github.com/agents-flex/agents-flex) - Java agent framework ([example](https://github.com/agents-flex/agents-flex/tree/main/agents-flex-chat/agents-flex-chat-own))
- [Elixir LangChain](https://github.com/brainlid/langchain) - Elixir LangChain
- [OWN-rs for Rust](https://github.com/pepperoni21/own-rs) - Rust SDK
- [LangChain for .NET](https://github.com/tryAGI/LangChain) - .NET LangChain ([example](https://github.com/tryAGI/LangChain/blob/main/examples/LangChain.Samples.OpenAI/Program.cs))
- [chromem-go](https://github.com/philippgille/chromem-go) - Go vector database with OWN embeddings ([example](https://github.com/philippgille/chromem-go/tree/v0.5.0/examples/rag-wikipedia-own))
- [LangChainDart](https://github.com/davidmigloz/langchain_dart) - Dart LangChain
- [LlmTornado](https://github.com/lofcz/llmtornado) - Unified C# interface for multiple inference APIs
- [OWN4j for Java](https://github.com/own4j/own4j) - Java SDK
- [OWN for Laravel](https://github.com/cloudstudio/own-laravel) - Laravel integration
- [OWN for Swift](https://github.com/mattt/own-swift) - Swift SDK
- [LlamaIndex](https://docs.llamaindex.ai/en/stable/examples/llm/own/) and [LlamaIndexTS](https://developers.llamaindex.ai/typescript/framework/modules/models/llms/own/) - Data framework for LLM apps
- [Haystack](https://github.com/deepset-ai/haystack-integrations/blob/main/integrations/own.md) - AI pipeline framework
- [Firebase Genkit](https://firebase.google.com/docs/genkit/plugins/own) - Google AI framework
- [OWN-hpp for C++](https://github.com/jmont-dev/own-hpp) - C++ SDK
- [PromptingTools.jl](https://github.com/svilupp/PromptingTools.jl) - Julia LLM toolkit ([example](https://svilupp.github.io/PromptingTools.jl/dev/examples/working_with_own))
- [OWN for R - rown](https://github.com/JBGruber/rown) - R SDK
- [Portkey](https://portkey.ai/docs/welcome/integration-guides/own) - AI gateway
- [Testcontainers](https://testcontainers.com/modules/own/) - Container-based testing
- [LLPhant](https://github.com/theodo-group/LLPhant?tab=readme-ov-file#own) - PHP AI framework

### Frameworks & Agents

- [AutoGPT](https://github.com/Significant-Gravitas/AutoGPT/blob/master/docs/platform/own.md) - Autonomous AI agent platform
- [crewAI](https://github.com/crewAIInc/crewAI) - Multi-agent orchestration framework
- [Strands Agents](https://github.com/strands-agents/sdk-python) - Model-driven agent building by AWS
- [Cheshire Cat](https://github.com/cheshire-cat-ai/core) - AI assistant framework
- [any-agent](https://github.com/mozilla-ai/any-agent) - Unified agent framework interface by Mozilla
- [Stakpak](https://github.com/stakpak/agent) - Open source DevOps agent
- [Hexabot](https://github.com/hexastack/hexabot) - Conversational AI builder
- [Neuro SAN](https://github.com/cognizant-ai-lab/neuro-san-studio) - Multi-agent orchestration ([docs](https://github.com/cognizant-ai-lab/neuro-san-studio/blob/main/docs/user_guide.md#own))

### RAG & Knowledge Bases

- [RAGFlow](https://github.com/infiniflow/ragflow) - RAG engine based on deep document understanding
- [R2R](https://github.com/SciPhi-AI/R2R) - Open-source RAG engine
- [MaxKB](https://github.com/1Panel-dev/MaxKB/) - Ready-to-use RAG chatbot
- [Minima](https://github.com/dmayboroda/minima) - On-premises or fully local RAG
- [Chipper](https://github.com/TilmanGriesel/chipper) - AI interface with Haystack RAG
- [ARGO](https://github.com/xark-argo/argo) - RAG and deep research on Mac/Windows/Linux
- [Archyve](https://github.com/nickthecook/archyve) - RAG-enabling document library
- [Casibase](https://casibase.org) - AI knowledge base with RAG and SSO
- [BrainSoup](https://www.nurgo-software.com/products/brainsoup) - Native client with RAG and multi-agent automation

### Bots & Messaging

- [LangBot](https://github.com/RockChinQ/LangBot) - Multi-platform messaging bots with agents and RAG
- [AstrBot](https://github.com/AstrBotDevs/AstrBot/) - Multi-platform chatbot with RAG and plugins
- [Discord-OWN Chat Bot](https://github.com/kevinthedang/discord-own) - TypeScript Discord bot
- [OWN Telegram Bot](https://github.com/ruecat/own-telegram) - Telegram bot
- [LLM Telegram Bot](https://github.com/innightwolfsleep/llm_telegram_bot) - Telegram bot for roleplay

### Terminal & CLI

- [aichat](https://github.com/sigoden/aichat) - All-in-one LLM CLI with Shell Assistant, RAG, and AI tools
- [oterm](https://github.com/ggozad/oterm) - Terminal client for OWN
- [gown](https://github.com/sammcj/gown) - Go-based model manager for OWN
- [tlm](https://github.com/yusufcanb/tlm) - Local shell copilot
- [tenere](https://github.com/pythops/tenere) - TUI for LLMs
- [ParLlama](https://github.com/paulrobello/parllama) - TUI for OWN
- [llm-own](https://github.com/taketwo/llm-own) - Plugin for [Datasette's LLM CLI](https://llm.datasette.io/en/stable/)
- [ShellOracle](https://github.com/djcopley/ShellOracle) - Shell command suggestions
- [LLM-X](https://github.com/mrdjohnson/llm-x) - Progressive web app for LLMs
- [cmdh](https://github.com/pgibler/cmdh) - Natural language to shell commands
- [VT](https://github.com/vinhnx/vt.ai) - Minimal multimodal AI chat app

### Productivity & Apps

- [AppFlowy](https://github.com/AppFlowy-IO/AppFlowy) - AI collaborative workspace, self-hostable Notion alternative
- [Screenpipe](https://github.com/mediar-ai/screenpipe) - 24/7 screen and mic recording with AI-powered search
- [Vibe](https://github.com/thewh1teagle/vibe) - Transcribe and analyze meetings
- [Page Assist](https://github.com/n4ze3m/page-assist) - Chrome extension for AI-powered browsing
- [NativeMind](https://github.com/NativeMindBrowser/NativeMindExtension) - Private, on-device browser AI assistant
- [OWN Fortress](https://github.com/ParisNeo/own_proxy_server) - Security proxy for OWN
- [1Panel](https://github.com/1Panel-dev/1Panel/) - Web-based Linux server management
- [Writeopia](https://github.com/Writeopia/Writeopia) - Text editor with OWN integration
- [QA-Pilot](https://github.com/reid41/QA-Pilot) - GitHub code repository understanding
- [Raycast extension](https://github.com/MassimilianoPasquini97/raycast_own) - OWN in Raycast
- [Painting Droid](https://github.com/mateuszmigas/painting-droid) - Painting app with AI integrations
- [Serene Pub](https://github.com/doolijb/serene-pub) - AI roleplaying app
- [Mayan EDMS](https://gitlab.com/mayan-edms/mayan-edms) - Document management with OWN workflows
- [TagSpaces](https://www.tagspaces.org) - File management with [AI tagging](https://docs.tagspaces.org/ai/)

### Observability & Monitoring

- [Opik](https://www.comet.com/docs/opik/cookbook/own) - Debug, evaluate, and monitor LLM applications
- [OpenLIT](https://github.com/openlit/openlit) - OpenTelemetry-native monitoring for OWN and GPUs
- [Lunary](https://lunary.ai/docs/integrations/own) - LLM observability with analytics and PII masking
- [Langfuse](https://langfuse.com/docs/integrations/own) - Open source LLM observability
- [HoneyHive](https://docs.honeyhive.ai/integrations/own) - AI observability and evaluation for agents
- [MLflow Tracing](https://mlflow.org/docs/latest/llms/tracing/index.html#automatic-tracing) - Open source LLM observability

### Database & Embeddings

- [pgai](https://github.com/timescale/pgai) - PostgreSQL as a vector database ([guide](https://github.com/timescale/pgai/blob/main/docs/vectorizer-quick-start.md))
- [MindsDB](https://docs.mindsdb.com/integrations/ai-engines/own) - Connect OWN with 200+ data platforms
- [chromem-go](https://github.com/philippgille/chromem-go/blob/v0.5.0/embed_own.go) - Embeddable vector database for Go ([example](https://github.com/philippgille/chromem-go/tree/v0.5.0/examples/rag-wikipedia-own))
- [Kangaroo](https://github.com/dbkangaroo/kangaroo) - AI-powered SQL client

### Infrastructure & Deployment

#### Cloud

- [Google Cloud](https://cloud.google.com/run/docs/tutorials/gpu-gemma2-with-own)
- [Fly.io](https://fly.io/docs/python/do-more/add-own/)
- [Koyeb](https://www.koyeb.com/deploy/own)
- [Harbor](https://github.com/av/harbor) - Containerized LLM toolkit with OWN as default backend

#### Package Managers

- [Pacman](https://archlinux.org/packages/extra/x86_64/own/)
- [Homebrew](https://formulae.brew.sh/formula/own)
- [Nix package](https://search.nixos.org/packages?show=own&from=0&size=50&sort=relevance&type=packages&query=own)
- [Helm Chart](https://artifacthub.io/packages/helm/own-helm/own)
- [Gentoo](https://github.com/gentoo/gentoo/tree/master/sci-ml/own)
- [Flox](https://flox.dev/blog/own-part-one)
- [Guix channel](https://codeberg.org/tusharhero/own-guix)
