<details>
<summary>
  <h1 align="center">🇬🇧 English Version (Click to Expand)</h1>
</summary>

<div align="center">
  <a name="top-en"></a>
  <h1>🔮 Augur: AI-Enhanced Runtime Debugging Agent</h1>
  <p>
    <strong>A paradigm shift that transforms AI from a static code <em>guesser</em> into a real-time runtime <em>observer</em>.</strong>
  </p>
  <br>

<p align="center">
    <a href="LICENSE.md"><img src="https://img.shields.io/badge/License-Non--Commercial-red.svg" alt="License: Non-Commercial"></a>
    <a href="https://www.typescriptlang.org/"><img src="https://img.shields.io/badge/TypeScript-100%25-blue" alt="TypeScript"></a>
    <a href="https://reactjs.org/"><img src="https://img.shields.io/badge/Built%20with-React%20%26%20Vite-yellow" alt="React & Vite"></a>
    <a href="https://deepmind.google/technologies/gemini/"><img src="https://img.shields.io/badge/AI%20Powered%20by-Google%20Gemini-orange" alt="Powered by Gemini"></a>
    <a href="https://code.visualstudio.com/"><img src="https://img.shields.io/badge/Platform-VS%20Code-green" alt="Platform: VS Code"></a>
</p>
</div>

### 🧭 Quick Navigation
| Section                                                                                    | Description                                                                                               |
| ------------------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------- |
| [**🚀 Core Concept & Vision**](#core-concept--vision-en-detail)                        | Understand the "why" behind Augur, from static analysis to agent-driven dynamic debugging.                               |
| [**🔬 How It Works**](#how-it-works-the-autonomous-debugging-loop-en-detail)           | The technical breakdown of our Observe-Think-Act loop, powered by the Debug Adapter Protocol.           |
| [**🏛️ Architecture & Future Vision**](#architecture--future-vision-en-detail)         | The strategic choice between integrated (Mode A) and decoupled (Mode B) models.         |
| [**🎓 `augur-web-visualizer`**](#augur-web-visualizer--the-simulator-en-detail)             | An interactive web simulator to learn the core mechanics.  |
| [**⚙️ `augur-vscode-extension`**](#augur-vscode-extension--the-executor-en-detail)            | A real-world VS Code extension that autonomously debugs code. |
| [**🔌 Extending Augur**](#extending-augur-en-detail)                                       | A complete, code-level guide for adding new AI models (e.g., Claude, OpenAI).       |
| [**💡 Component Comparison**](#component-comparison-en-detail)                             | A side-by-side comparison of the two components.                       |
| [**⚡ Quick Start**](#quick-start-en-detail)                                                 | How to install and run the project.                                           |

---
<a name="core-concept--vision-en-detail"></a>
### 🚀 Core Concept & Vision

> Traditional AI programming assistants, such as early code helpers, are primarily limited to static source code analysis. This approach can only understand what the code *might* do, failing to capture its actual behavior under specific inputs and environmental conditions. This project's core principle is a **paradigm shift: from static analysis to agent-driven dynamic runtime analysis.**

Our goal is to grant a Large Language Model (LLM) a "superpower"—the ability to access the real-time internal state of a running program, just as a human developer does with an interactive debugger. This dynamic context includes critical information that static analysis can never access:

*   **Real-time Variable Values**: The actual, instantaneous values of all variables at a specific breakpoint.
*   **Function Behavior**: How functions are called, what arguments are passed, what values are returned, and how they interact.
*   **Branching Decisions**: Which `if-else` blocks or loop paths are actually taken during execution.

By integrating the LLM directly into a live debugging session, the AI is no longer a guesser based on code; it becomes a diagnostician based on real-time data. This approach empowers the LLM not just to observe but to act autonomously: suggesting or automatically executing code steps, adjusting breakpoints, and even generating comprehensive data based on live program values.

The technical pillar making this vision possible is the **Debug Adapter Protocol (DAP)**, a JSON-based protocol that acts as an abstraction layer between development tools (like VS Code) and debuggers (like `gdb` or `debugpy`). Because DAP is language- and IDE-agnostic, our AI debugger methodology is, in principle, not locked into any single language or tool.

This repository is an integrated "research and implementation" platform to validate and showcase this transformative approach through two key components:

1.  🎓 **`augur-web-visualizer`**: A React-based **visual simulator** and **educational tool**. It serves as a laboratory to safely demonstrate and visualize the core mechanics of our architecture.
2.  ⚙️ **`augur-vscode-extension`**: A fully-functional **VS Code plugin**. It is the real-world implementation of our theory, directly attaching to live debug sessions to create an autonomous debugging agent.

---
<a name="how-it-works-the-autonomous-debugging-loop-en-detail"></a>
### 🔬 How It Works: The Autonomous Debugging Loop

Augur operates on a continuous, closed-loop cycle. This "Observe-Think-Act" process is powered by intercepting and interpreting a core set of DAP messages.

<details>
<summary><strong>Step 1: 🔗 Session Hooking & Event Interception</strong></summary>

The most direct way to intercept DAP messages in VS Code is by using `DebugAdapterTrackerFactory`. When a plugin activates, it registers this factory for all debug types (`*`). For each new debug session, a `DebugAdapterTracker` object is created. Its `onDidSendMessage(m)` method is our entry point, listening for messages from the Debug Adapter to the IDE.

The single most important trigger is the **`stopped` event**. This event, sent by the debugger, signals that the program has paused due to a breakpoint, exception, or step completion. This is the signal for our AI agent to wake up and begin its work.
</details>

<details>
<summary><strong>Step 2: 🧠 Context Engineering: Building the "Golden Context"</strong></summary>

This is the most critical, non-obvious stage of the entire architecture. Raw DAP JSON messages are noisy, extremely verbose, and sub-optimal for LLM consumption. A failure in many AI agent systems is not a "model failure" but a "context failure." Therefore, we must build a **Context Engineering Pipeline**.

When a `stopped` event is received, this service:
1.  **Aggregates**: Automatically dispatches and awaits responses for `stackTrace`, `scopes`, and `variables` requests to the debugger.
2.  **Collects**: Gathers the complete dataset: a source code snippet around the breakpoint, stack information, and variable values.
3.  **Filters & Formats**: This is the core value-add. The system intelligently filters out irrelevant "runtime internal" variables (e.g., those starting with `__`) and formats the messy JSON data into a clean, token-efficient representation (like Markdown).
4.  **Constructs Prompt**: Combines the formatted dynamic data with static source code and a system instruction ("You are an AI debugging assistant...") to create the final **"Golden Context"** prompt.

A well-designed context engineering pipeline significantly reduces token consumption, speeds up inference, and dramatically improves the accuracy of the AI's diagnosis.
</details>

<details>
<summary><strong>Step 3: 🎬 Agentic Control: Decision and Action</strong></summary>

The LLM receives the "Golden Context" and is constrained (using Tool Calling or Function Calling) to return a structured action.
-   **Action Definition**: e.g., `{"tool": "stepOver", "explanation": "..."}`.
-   **Action Execution**: The `DebugAdapterTracker` receives this tool call, translates it back into a new DAP request (e.g., `session.customRequest('next', { threadId: ... })`), and sends it back to the debugger.
-   **Closing the Loop**: This action causes the program to advance to the next state, where it will inevitably hit another `stopped` event, thus starting the cycle anew.

</details>

---
<a name="architecture--future-vision-en-detail"></a>
### 🏛️ Architecture & Future Vision

A key strategic decision in building this system is the choice between two primary architectural patterns. This repository explores and validates **Mode A** while paving the way for **Mode B**.

| Feature            | Mode A: Integrated VS Code Plugin (Current)                       | Mode B: Decoupled MCP Server (Future)                             |
| ------------------ | ----------------------------------------------------------------- | ----------------------------------------------------------------- |
| **Core Principle** | The IDE plugin controls the LLM.                                  | An LLM agent controls the "debugger as a tool."                   |
| **IDE Support**    | VS Code only.                                                     | Agnostic (VS Code, Neovim, IntelliJ, CI/CD pipelines).            |
| **Language Support** | Logic can be tailored for specific languages inside the plugin. | Agnostic (dynamically loads the correct Debug Adapter).           |
| **Use Case**       | Rapid Proof of Concept, powerful in-IDE AI assistant.             | Production-grade agents, CI/CD debugging, platform-agnostic tools.|

#### Our Phased Roadmap:

-   [**✅ Phase 1: Prototype Validation (This Repository)**](#)
    -   **Goal**: Implement **Mode A (Integrated Plugin)** to rapidly validate the "Golden Context" hypothesis and build the critical Context Engineering Pipeline.
    -   **Outcome**: The `augur-vscode-extension` serves as a successful reference implementation, while the `augur-web-visualizer` acts as its educational and simulation counterpart.

-   [**➡️ Phase 2: Production Refactoring (Future Vision)**](#)
    -   **Goal**: Evolve towards **Mode B (Decoupled Service)**.
    -   **Action**: This involves extracting all context engineering and agent logic from the plugin and placing it behind a secure API. The server becomes an "AI Debugging Service." The VS Code plugin evolves into a thin client, responsible only for forwarding DAP events to this service and receiving commands. This approach minimizes initial risk while laying the foundation for a scalable, platform-agnostic architecture, which represents the true strategic value.

---
<a name="augur-web-visualizer--the-simulator-en-detail"></a>
### 🎓 `augur-web-visualizer` | The Simulator
This component is a high-fidelity web simulator designed to **visualize and teach** how an AI debugger works. It operates in two phases: first, it uses an LLM to generate a complete, static execution trace of a piece of code. Second, it allows the user to step through this pre-generated trace interactively, calling the LLM at each step to get a real-time decision based on the state at that point. This safely isolates the learning experience in the browser.
<details>
<summary><strong>📚 View Detailed Guide</strong></summary>

#### User Guide
1.  **Navigate to Directory**: `cd augur-web-visualizer`
2.  **Install Dependencies**: `npm install`
3.  **Configure API Key (Crucial Step)**:
    *   Create a file named `.env.local` in the `augur-web-visualizer` root.
    *   Add your API keys. Variable names **must** start with `VITE_`:
        ```env
        VITE_GEMINI_API_KEY=AIzaSy...your...key...
        VITE_CLAUDE_API_KEY=sk-ant-...your-key...
        ```
4.  **Start Dev Server**: `npm run dev`
5.  Open the provided URL (e.g., `http://localhost:5173`) in your browser.
</details>

---
<a name="augur-vscode-extension--the-executor-en-detail"></a>
### ⚙️ `augur-vscode-extension` | The Executor
This component is the **real-world implementation** of our "Mode A: Integrated Plugin" proposal. It's a powerful tool that attaches to any live debug session in VS Code, creating a fully autonomous debugging loop. It listens for `stopped` events, builds the "Golden Context" from the live program state, sends it to the selected LLM, and executes the returned command.
<details>
<summary><strong>📚 View Detailed Guide</strong></summary>

#### User Guide
1.  **Open Project**: Open **only** the `augur-vscode-extension` folder in VS Code.
2.  **Install Dependencies**: `npm install`
3.  **Compile TypeScript**: `npm run compile` (or `npm run watch`).
4.  **Launch Extension (Crucial Step)**:
    *   Go to the "Run and Debug" sidebar (Ctrl+Shift+D).
    *   Select **"Run Extension"** from the dropdown and press **F5**.
    *   A new **"[Extension Development Host]"** window will appear.
5.  **Configure API Key (in the ❗NEW❗ window)**:
    *   In the **[Extension Development Host]** window, open Settings (Ctrl+,).
    *   Search for `augur.model` and select your desired model from the dropdown.
    *   Search for the corresponding API key setting (e.g., `augur.geminiApiKey` or `augur.claudeApiKey`) and paste your key.
6.  **Test the Plugin (in the ❗NEW❗ window)**:
    *   Open any project you wish to debug, set a breakpoint, and start debugging (F5).
    *   When the breakpoint is hit, the extension will take over. Observe the `[Augur]` logs in the "Debug Console" of the new window.
</details>

---
<a name="extending-augur-en-detail"></a>
### 🔌 Extending Augur: A Contributor's Guide

This project is architected with extensibility in mind. Adding a new AI model is a straightforward process that follows a clear pattern.

#### The Architectural Pattern: Strategy & Factory

-   **Strategy Pattern**: Each AI model (Gemini, Claude, OpenAI...) is a self-contained "strategy." We define a common `IAgentService` interface that every strategy must implement. This ensures that the main application can work with any model without knowing its specific details.
-   **Factory Pattern**: A single function (`getAgentService` or a factory in the `tracker.ts` constructor) acts as a "manager." It reads the user's configuration and returns an instance of the requested "strategy" (the AI agent).

This decouples the application logic from the AI implementation details, making the system robust and easy to maintain.

#### Detailed Tutorial: Adding Claude 3 Sonnet

Here is a complete, code-level guide to add support for a new model.

<details>
<summary><strong>Part 1: Adding a New Model to `augur-web-visualizer`</strong></summary>

1.  **Define the Model ID**
    -   **File**: `augur-web-visualizer/src/types.ts`
    -   **Action**: Add the new model's identifier to the `AiModel` type. This makes TypeScript aware of the new option globally.
    -   **Code**:
        ```diff
        - export type AiModel = 'gemini-2.5-flash' | 'mock';
        + export type AiModel = 'gemini-2.5-flash' | 'mock' | 'claude-3-sonnet';
        ```

2.  **Create the Agent Service (The "Worker")**
    -   **File**: Create a new file at `augur-web-visualizer/src/services/agents/ClaudeAgentService.ts`.
    -   **Action**: This class will contain all logic specific to interacting with the Claude API. It must implement the `IAgentService` interface.
    -   **Example Implementation**:
        ```typescript
        // augur-web-visualizer/src/services/agents/ClaudeAgentService.ts
        import type { IAgentService, SimulationStep, AiResponse } from '../../types';

        // Helper interfaces for Claude's API structure
        interface ClaudeMessageRequest { /* ... */ }
        interface ClaudeMessageResponse { /* ... */ }

        export class ClaudeAgentService implements IAgentService {
            private apiKey: string;
            private readonly CLAUDE_API_URL = 'https://api.anthropic.com/v1/messages';

            constructor() {
                const key = import.meta.env.VITE_CLAUDE_API_KEY;
                if (!key) {
                    throw new Error("APIKeyError: VITE_CLAUDE_API_KEY is not set in .env.local");
                }
                this.apiKey = key;
            }

            async generateSimulation(code: string): Promise<SimulationStep[]> {
                // 1. Define the system prompt and JSON schema using Claude's preferred format.
                const systemPrompt = `You are an expert Python debugger...`;
                const toolSchema = { /* Claude-specific tool schema */ };
                
                // 2. Build the fetch request body.
                const requestBody: ClaudeMessageRequest = {
                    model: "claude-3-sonnet-20240229",
                    max_tokens: 4096,
                    system: systemPrompt,
                    messages: [{ role: 'user', content: `Trace this code:\n${code}` }],
                    tools: [toolSchema],
                    tool_choice: { type: 'tool', name: 'record_simulation_steps' }
                };

                // 3. Make the API call using fetch.
                const response = await fetch(this.CLAUDE_API_URL, { /* ... headers and body ... */ });
                const responseData: ClaudeMessageResponse = await response.json();
                
                // 4. Parse the response and return it in the standardized SimulationStep[] format.
                const toolCallJson = /* logic to extract JSON from responseData */;
                return toolCallJson.steps.map((step: any) => ({ ...step /* and hydrate */ }));
            }

            async getAIDebugAction(context: string): Promise<AiResponse> {
                // Similar logic as above, but for getting a single action
                // based on the provided "Golden Context".
                const decisionToolSchema = { /* schema for a single action */ };
                const requestBody: ClaudeMessageRequest = { /* ... */ };
                const response = await fetch(this.CLAUDE_API_URL, { /* ... */ });
                const responseData: ClaudeMessageResponse = await response.json();
                const toolCallJson = /* logic to extract JSON */;
                return toolCallJson as AiResponse;
            }

            // ... private helper methods ...
        }
        ```

3.  **Register the Agent in the Factory (The "Manager")**
    -   **File**: `augur-web-visualizer/src/services/aiServiceFactory.ts`
    -   **Action**: Import the new service and add it to the factory's switch statement.
    -   **Code**:
        ```diff
        import { GeminiAgentService } from './agents/GeminiAgentService';
        import { MockAgentService } from './agents/MockAgentService';
        + import { ClaudeAgentService } from './agents/ClaudeAgentService';

        // ...

        export const getAgentService = (model: AiModel): IAgentService => {
            // ... (cache logic)
            switch (model) {
                case 'gemini-2.5-flash':
                    service = new GeminiAgentService();
                    break;
                case 'mock':
                    service = new MockAgentService();
                    break;
        +       case 'claude-3-sonnet':
        +           service = new ClaudeAgentService();
        +           break;
                default:
                    // ...
            }
            // ...
        };
        ```

4.  **Expose the Model in the UI**
    -   **Files**: `augur-web-visualizer/src/locales/en.json` and `zh.json`.
        -   **Action**: Add a translation key.
        -   **Code**: `"aiModel.claude-3-sonnet": "Claude 3 Sonnet",`
    -   **File**: `augur-web-visualizer/src/components/AIModelSelector.tsx`.
        -   **Action**: Add the new model to the list that populates the dropdown.
        -   **Code**: ` { id: 'claude-3-sonnet', name: t('aiModel.claude-3-sonnet') }`

5.  **Add the API Key to Environment**
    -   **File**: `augur-web-visualizer/.env.local`
    -   **Action**: Add the new API key.
    -   **Code**: `VITE_CLAUDE_API_KEY=sk-ant-xxxxxxxx`

</details>

<details>
<summary><strong>Part 2: Adding a New Model to `augur-vscode-extension`</strong></summary>

The process is philosophically identical but adapted for the VS Code extension environment.

1.  **Update Configuration in `package.json`**
    -   **File**: `augur-vscode-extension/package.json`
    -   **Action**: Define the new model option and its API key setting for VS Code's settings UI.
    -   **Code**:
        ```diff
          "properties": {
            "augur.model": {
              "type": "string",
              "default": "gemini",
        -     "enum": ["gemini"],
        +     "enum": ["gemini", "claude"],
              "description": "Select the AI model to use for debugging."
            },
            "augur.geminiApiKey": {
              "type": "string",
              // ...
            },
        +   "augur.claudeApiKey": {
        +     "type": "string",
        +     "default": "",
        +     "description": "API Key for Anthropic Claude (Claude 3 Sonnet)."
        +   }
          }
        ```

2.  **Define Model Types**
    -   **File**: `augur-vscode-extension/src/aiService.ts`
    -   **Action**: Add the new model ID to the `AiAgentModel` type.
    -   **Code**:
        ```diff
        - export type AiAgentModel = 'gemini';
        + export type AiAgentModel = 'gemini' | 'claude';
        ```

3.  **Create the Agent Service (The "Worker")**
    -   **File**: Create `augur-vscode-extension/src/agents/ClaudeAgent.ts`.
    -   **Action**: Create a `ClaudeAgent` class that implements `IAiAgentService`. It will be similar to the web version but use `node-fetch` for API calls.
    -   **Example Implementation**:
        ```typescript
        // augur-vscode-extension/src/agents/ClaudeAgent.ts
        import fetch from 'node-fetch';
        import { AiResponse } from '../types';
        import { IAiAgentService } from '../aiService';

        export class ClaudeAgent implements IAiAgentService {
            private apiKey: string;
            // ...
            constructor(apiKey: string) {
                this.apiKey = apiKey;
            }

            async getAIDebugAction(context: string): Promise<AiResponse> {
                // Claude-specific logic to get a single debug action
                // using node-fetch in the Node.js runtime of the extension.
                // ...
                return /* standardized AiResponse */;
            }
        }
        ```

4.  **Update the Factory Logic in `tracker.ts`**
    -   **File**: `augur-vscode-extension/src/tracker.ts`
    -   **Action**: The `constructor` of `AugurDebugAdapterTracker` acts as our factory. Update it to handle the new model.
    -   **Code**:
        ```diff
        + import { ClaudeAgent } from './agents/ClaudeAgent';
        // ...
        class AugurDebugAdapterTracker implements vscode.DebugAdapterTracker {
            // ...
            constructor(session: vscode.DebugSession) {
                // ...
                const config = vscode.workspace.getConfiguration('augur');
                const selectedModel = config.get<AiAgentModel>('model');

                let apiKey: string | undefined;

                switch (selectedModel) {
                    case 'gemini':
                        // ... (existing logic)
                        break;
        +           case 'claude':
        +               apiKey = config.get<string>('claudeApiKey');
        +               if (!apiKey) {
        +                   vscode.window.showErrorMessage('Augur Error: "augur.claudeApiKey" is not set.');
        +                   this.agent = null;
        +               } else {
        +                   this.agent = new ClaudeAgent(apiKey);
        +                   console.log('[Augur] Claude Agent initialized.');
        +               }
        +               break;
                    default:
                        // ...
                }
            }
            // ...
        }
        ```

With these changes, a user can now select "claude" in their VS Code settings, provide the key, and the extension will automatically use the `ClaudeAgent` for all its operations without any other part of the code needing to change.
</details>

---
<a name="component-comparison-en-detail"></a>
### 💡 Component Comparison
| Feature           | `augur-web-visualizer` (Simulator)                                 | `augur-vscode-extension` (Executor)                                  |
| ----------------- | ------------------------------------------------------------------ | ---------------------------------------------------------------------- |
| **🎯 Goal**         | Education, Visualization, Proof of Concept                         | Practical Tool, Real-world Implementation                              |
| **🌐 Environment**  | Browser (React/Vite)                                               | VS Code (Extension Host)                                               |
| **⚙️ Workflow**   | **Two-phase**: Generate full trace, then explore.                  | **Real-time loop**: Listen → Analyze → Act.                          |
| **📦 Context**      | **Static**: Read from a pre-generated JS array.                    | **Dynamic**: Fetches real-time state via DAP.                          |
| **🔑 API Key**      | `.env.local` file (requires `VITE_` prefix)                        | VS Code Settings (`augur.geminiApiKey`, etc.)                        |
| **💎 Core Value** | Visualizes "context engineering" & AI decisions.                   | Implements the autonomous AI debugging loop.                           |

---
<a name="quick-start-en-detail"></a>
### ⚡ Quick Start

#### Prerequisites
*   Node.js (v18 or higher)
*   Visual Studio Code
*   A valid API Key for the AI model you wish to use (e.g., Google Gemini).

#### Installation & Usage
1.  **Clone the repository**:
    ```bash
    git clone https://github.com/your-username/augur-ai-debugger-project.git
    cd augur-ai-debugger-project
    ```
2.  **Choose a component**:
    Navigate into the desired component's directory (`augur-web-visualizer` or `augur-vscode-extension`).
3.  **Follow the detailed guides**:
    Follow the detailed setup and usage steps outlined within each component's section above. We recommend starting with the **Web Visualizer** to grasp the core concepts first.

<p align="right"><a href="#top-en">Back to top ↑</a></p>
</details>

<details>
<summary>
  <h1 align="center">🇨🇳 中文版 (点击展开)</h1>
</summary>

<div align="center">
  <a name="top-zh"></a>
  <h1>🔮 Augur: AI 增强型运行时调试器Agent</h1>
  <p>
    <strong>一个将 AI 从代码的“静态猜测者”转变为“运行时观察者”的范式革命。</strong>
  </p>
  <br>

<p align="center">
    <a href="LICENSE.md"><img src="https://img.shields.io/badge/License-Non--Commercial-red.svg" alt="License: Non-Commercial"></a>
    <a href="https://www.typescriptlang.org/"><img src="https://img.shields.io/badge/TypeScript-100%25-blue" alt="TypeScript"></a>
    <a href="https://reactjs.org/"><img src="https://img.shields.io/badge/Built%20with-React%20%26%20Vite-yellow" alt="React & Vite"></a>
    <a href="https://deepmind.google/technologies/gemini/"><img src="https://img.shields.io/badge/AI%20Powered%20by-Google%20Gemini-orange" alt="Powered by Gemini"></a>
    <a href="https://code.visualstudio.com/"><img src="https://img.shields.io/badge/Platform-VS%20Code-green" alt="Platform: VS Code"></a>
</p>

</div>

### 🧭 快速导航
| 板块                                                                                       | 描述                                                                                               |
| ------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------- |
| [**🚀 核心理念与愿景**](#core-concept--vision-zh-detail)                        | 理解 Augur 项目背后的核心思想：从静态分析到代理驱动的动态调试。                               |
| [**🔬 技术原理**](#how-it-works-the-autonomous-debugging-loop-zh-detail)           | “观察-思考-行动”循环的技术拆解，由调试适配器协议驱动。           |
| [**🏛️ 架构与未来愿景**](#architecture--future-vision-zh-detail)         | 集成式 (模式 A) 与解耦式 (模式 B) 的战略选择。         |
| [**🎓 `augur-web-visualizer`**](#augur-web-visualizer--the-simulator-zh-detail)             | 一个用于学习核心机制的交互式 Web 模拟器。  |
| [**⚙️ `augur-vscode-extension`**](#augur-vscode-extension--the-executor-zh-detail)            | 一个能够自主调试代码的真实 VS Code 插件。 |
| [**🔌 扩展 Augur**](#extending-augur-zh-detail)                                       | 一份完整的、代码级的贡献者指南，用于添加新的 AI 模型 (如 Claude, OpenAI)。       |
| [**💡 两大组件对比**](#component-comparison-zh-detail)                             | 两大核心组件的特性并排比较。                       |
| [**⚡ 快速开始**](#quick-start-zh-detail)                                                 | 如何安装并运行项目。                                           |

---
<a name="core-concept--vision-zh-detail"></a>
### 🚀 核心理念与愿景

> 传统的 AI 辅助编程工具，例如早期的代码助手，其分析主要局限于静态源代码。这种方法只能理解代码*可能*做什么，而无法洞察其在特定输入和环境下的实际行为。本项目的核心构造原理是实现一个**范式转变：从静态分析转向代理驱动的动态运行时分析。**

我们的目标是赋予大型语言模型 (LLM) 一种“超能力”——即访问一个正在运行的程序的实时内部状态，就像人类开发人员使用交互式调试器一样。这种动态上下文包括静态分析无法获取的关键信息：

*   **运行时变量值**: 在特定断点处所有变量的实际、即时值。
*   **函数行为**: 函数如何被调用、传递了哪些参数、返回了什么值，以及它们之间的交互。
*   **分支决策**: 在执行期间，哪些 `if-else` 块或循环路径被实际采用。

通过将 LLM 直接集成到实时调试会话中，AI 不再是基于代码的猜测者，而是基于实时数据的诊断者。这种方法使 LLM 不仅能够观察，还能自主行动：建议或自动执行代码单步执行、调整断点，甚至基于实时程序值生成综合数据。

实现这一目标的技术支柱是**调试适配器协议 (Debug Adapter Protocol, DAP)**，这是一种基于 JSON 的协议，它充当了开发工具（如 VS Code）和调试器（如 `gdb` 或 `debugpy`）之间的抽象层。因为 DAP 是语言和 IDE 无关的，所以我们的 AI 调试器方法论原则上不会被锁定在单一语言或工具上。

本仓库是一个“研究与实现”一体化的平台，通过两大关键组件来验证并展示这一变革性的方法：

1.  🎓 **`augur-web-visualizer`**: 一个基于 React 的**可视化模拟器**和**教育工具**。它是一个实验室，用于安全地演示和可视化我们架构的核心机制。
2.  ⚙️ **`augur-vscode-extension`**: 一个功能完备的 **VS Code 插件**。它是我们理论的真实世界实现，直接挂载到实时的调试会话中，创建一个自主的调试代理。

---
<a name="how-it-works-the-autonomous-debugging-loop-zh-detail"></a>
### 🔬 技术原理：自主调试循环

Augur 的运行基于一个持续的闭环。这个“观察-思考-行动”的过程由拦截和解析一组核心的 DAP 消息来驱动。

<details>
<summary><strong>步骤一：🔗 会话挂钩与事件拦截</strong></summary>

在 VS Code 中拦截 DAP 消息的最直接方法是使用 `DebugAdapterTrackerFactory`。当插件激活时，它会为所有调试类型 (`*`) 注册这个工厂。对于每一个新的调试会话，都会创建一个 `DebugAdapterTracker` 对象。该对象的 `onDidSendMessage(m)` 方法是我们的入口点，用于监听从调试适配器 (DA) 到 IDE 的消息。

其中最关键的触发器是 **`stopped` 事件**。这个由调试器发送的事件，标志着程序因断点、异常或单步执行完成而暂停。这正是我们的 AI 代理唤醒并开始工作的信号。
</details>

<details>
<summary><strong>步骤二：🧠 上下文工程：构建“黄金上下文”</strong></summary>

这是整个架构中最关键、最不显而易见的阶段。原始的 DAP JSON 消息充满了噪音、极其冗长，并且对于 LLM 来说不是最佳的输入。许多 AI 代理系统的失败不是“模型失败”，而是“上下文失败”。因此，我们必须构建一个**“上下文工程流水线”**。

当收到 `stopped` 事件时，该服务将：
1.  **聚合**: 自动发出并等待 `stackTrace`、`scopes` 和 `variables` 请求的响应。
2.  **收集**: 整合完整的数据集（断点附近的源代码片段、堆栈信息、变量值）。
3.  **过滤与格式化**: 这是核心价值所在。系统必须智能地过滤掉无关的“运行时内部变量”（例如以 `__` 开头的变量），并将杂乱的 JSON 数据格式化为干净、Token 高效的表示（例如 Markdown）。
4.  **构建提示**: 将格式化后的动态数据与静态源代码、系统指令（“你是一个 AI 调试助手...”）相结合，创建最终的**“黄金上下文”**提示。

一个设计精良的上下文工程流水线将显著降低 Token 消耗、加快推理速度，并极大地提高 AI 诊断的准确性。
</details>

<details>
<summary><strong>步骤三：🎬 代理控制：决策与行动</strong></summary>

LLM 接收到“黄金上下文”后，将被约束（通过工具调用/函数调用）以返回一个结构化的动作。
-   **动作定义**: 例如 `{"tool": "stepOver", "explanation": "..."}`。
-   **动作执行**: `DebugAdapterTracker` 接收此工具调用，将其翻译回一个新的 DAP 请求（例如 `session.customRequest('next', { threadId: ... })`），并发送回调试器。
-   **闭环**: 这个动作导致程序进入下一个状态，并不可避免地触发另一个 `stopped` 事件，从而重新开始这个循环。

</details>

---
<a name="architecture--future-vision-zh-detail"></a>
### 🏛️ 架构与未来愿景

构建此系统时的一个关键战略决策是架构模式的选择。本仓库探索并验证了**模式 A**，同时为**模式 B** 铺平了道路。

| 特性           | 模式 A：集成式 VS Code 插件 (当前)                       | 模式 B：解耦式 MCP 服务器 (未来)                           |
| -------------- | -------------------------------------------------------- | ---------------------------------------------------------- |
| **核心原理**   | IDE 插件控制 LLM。                                       | LLM 代理控制“调试器即工具”。                               |
| **IDE 支持**   | 仅限 VS Code。                                           | 不可知 (VS Code, Neovim, IntelliJ, CI/CD 流水线)。         |
| **语言支持**   | 可在插件内部为特定语言定制逻辑。                         | 不可知 (动态加载正确的调试适配器)。                        |
| **应用场景**   | 快速原型验证，强大的 IDE 内部 AI 助手。                  | 生产级代理，CI/CD 调试，平台无关的工具。                   |

#### 我们的分阶段路线图：

-   [**✅ 阶段一：原型验证 (本仓库)**](#)
    -   **目标**: 实现**模式 A (集成式插件)**，以快速验证“黄金上下文”假说并构建关键的上下文工程流水线。
    -   **成果**: `augur-vscode-extension` 是一个成功的参考实现，而 `augur-web-visualizer` 则是其教学和模拟的对应物。

-   [**➡️ 阶段二：生产重构 (未来愿景)**](#)
    -   **目标**: 向**模式 B (解耦式服务)** 演进。
    -   **行动**: 这包括将所有上下文工程和代理逻辑从插件中剥离出来，放到一个安全的 API 后面。该服务器成为“AI 调试服务”。VS Code 插件演变为一个瘦客户端，仅负责将 DAP 事件转发到该服务并接收命令。这种方法可以在最大限度降低初始风险的同时，为构建一个可扩展、平台无关的架构（这才是真正的战略价值所在）奠定基础。

---
<a name="augur-web-visualizer--the-simulator-zh-detail"></a>
### 🎓 `augur-web-visualizer` | 教学模拟器
此组件是一个高保真的 Web 模拟器，旨在**可视化和教学** AI 调试器的工作原理。它分两阶段工作：首先，它使用 LLM 为一段代码生成一个完整的、静态的执行轨迹。其次，它允许用户交互式地单步浏览这个预先生成好的轨迹，并在每一步调用 LLM 以根据该点的状态获得实时决策。这在浏览器中安全地隔离了学习体验。
<details>
<summary><strong>📚 查看详细指南</strong></summary>

#### 使用指南
1.  **导航到目录**: `cd augur-web-visualizer`
2.  **安装依赖**: `npm install`
3.  **配置 API 密钥 (关键步骤)**:
    *   在 `augur-web-visualizer` 根目录下创建一个新文件，命名为 `.env.local`。
    *   添加您的 API 密钥。**变量名必须以 `VITE_` 开头**：
        ```env
        VITE_GEMINI_API_KEY=AIzaSy...your...key...
        VITE_CLAUDE_API_KEY=sk-ant-...your-key...
        ```
4.  **启动开发服务器**: `npm run dev`
5.  在浏览器中打开 Vite 提示的地址 (通常是 `http://localhost:5173`)。
</details>

---
<a name="augur-vscode-extension--the-executor-zh-detail"></a>
### ⚙️ `augur-vscode-extension` | 真实执行器
此组件是我们技术提案中**“模式 A：集成式插件”的真实世界实现**。它是一个能挂载到 VS Code 中任何实时调试会话的强大工具，创建了一个完全自主的调试闭环。它监听 `stopped` 事件，从实时程序状态中构建“黄金上下文”，将其发送给选定的 LLM，并执行返回的命令。
<details>
<summary><strong>📚 查看详细指南</strong></summary>

#### 使用指南
1.  **单独打开项目**: 使用 VS Code **单独打开** `augur-vscode-extension` 这个文件夹。
2.  **安装依赖**: `npm install`
3.  **编译 TypeScript**: `npm run compile` (或 `npm run watch`)。
4.  **启动插件 (关键步骤)**:
    *   转到“运行和调试”侧边栏 (Ctrl+Shift+D)。
    *   从顶部的下拉菜单中选择 **"Run Extension"**，然后按下 **F5**。
    *   一个名为 **“[Extension Development Host]”** 的新 VS Code 窗口将启动。
5.  **配置 API 密钥 (在 ❗新❗ 窗口中)**:
    *   在 **[Extension Development Host]** (新窗口) 中，打开设置 (Ctrl+,)。
    *   搜索 `augur.model` 并从下拉菜单中选择您想用的模型。
    *   搜索对应的 API 密钥设置项 (例如 `augur.geminiApiKey` 或 `augur.claudeApiKey`) 并粘贴您的密钥。
6.  **测试插件 (在 ❗新❗ 窗口中)**:
    *   打开任何您想调试的项目，设置断点并启动调试 (F5)。
    *   当代码命中该断点时，插件将自动接管。在新窗口的“调试控制台”中观察 `[Augur]` 日志。
</details>

---
<a name="extending-augur-zh-detail"></a>
### 🔌 扩展 Augur: 贡献者指南

本项目在架构上为可扩展性而设计。添加一个新的 AI 模型是一个遵循清晰模式的简单过程。

#### 架构模式：策略与工厂

-   **策略模式 (Strategy)**: 每一个 AI 模型（Gemini, Claude, OpenAI...）都是一个独立的、可互换的“策略”。我们定义了一个通用的 `IAgentService` 接口，这是所有策略都必须实现的“契约”。这确保了主应用程序可以与任何模型一起工作，而无需了解其具体细节。
-   **工厂模式 (Factory)**: 一个单一的函数 (`getAgentService` 或在 `tracker.ts` 构造函数中的工厂逻辑) 扮演着“经理”的角色。它读取用户的配置，并返回所请求的“策略”（即 AI 代理）的实例。

这种设计将应用逻辑与 AI 实现细节解耦，使系统健壮且易于维护。

#### 详细教程：添加 Claude 3 Sonnet

这是一个完整的、代码级的指南，用于添加对新模型的支持。

<details>
<summary><strong>第 1 部分：在 `augur-web-visualizer` 中添加新模型</strong></summary>

1.  **定义模型 ID**
    -   **文件**: `augur-web-visualizer/src/types.ts`
    -   **操作**: 将新模型的标识符添加到 `AiModel` 类型中。这使得 TypeScript 在全局范围内都能识别这个新选项。
    -   **代码**:
        ```diff
        - export type AiModel = 'gemini-2.5-flash' | 'mock';
        + export type AiModel = 'gemini-2.5-flash' | 'mock' | 'claude-3-sonnet';
        ```

2.  **创建代理服务 (即“工人”)**
    -   **文件**: 在 `augur-web-visualizer/src/services/agents/` 目录下创建新文件 `ClaudeAgentService.ts`。
    -   **操作**: 这个类将包含与 Claude API 交互的所有特定逻辑。它必须实现 `IAgentService` 接口。
    -   **实现示例**:
        ```typescript
        // augur-web-visualizer/src/services/agents/ClaudeAgentService.ts
        import type { IAgentService, SimulationStep, AiResponse } from '../../types';

        // 用于 Claude API 结构的辅助接口
        interface ClaudeMessageRequest { /* ... */ }
        interface ClaudeMessageResponse { /* ... */ }

        export class ClaudeAgentService implements IAgentService {
            private apiKey: string;
            private readonly CLAUDE_API_URL = 'https://api.anthropic.com/v1/messages';

            constructor() {
                const key = import.meta.env.VITE_CLAUDE_API_KEY;
                if (!key) {
                    throw new Error("APIKeyError: VITE_CLAUDE_API_KEY 未在 .env.local 中设置");
                }
                this.apiKey = key;
            }

            async generateSimulation(code: string): Promise<SimulationStep[]> {
                // 1. 使用 Claude 的首选格式定义系统提示和 JSON schema。
                const systemPrompt = `你是一个专家级的 Python 调试器...`;
                const toolSchema = { /* Claude 特定的工具 schema */ };
                
                // 2. 构建 fetch 请求体。
                const requestBody: ClaudeMessageRequest = {
                    model: "claude-3-sonnet-20240229",
                    max_tokens: 4096,
                    system: systemPrompt,
                    messages: [{ role: 'user', content: `追踪这段代码:\n${code}` }],
                    tools: [toolSchema],
                    tool_choice: { type: 'tool', name: 'record_simulation_steps' }
                };

                // 3. 使用 fetch 发起 API 调用。
                const response = await fetch(this.CLAUDE_API_URL, { /* ... headers 和 body ... */ });
                const responseData: ClaudeMessageResponse = await response.json();
                
                // 4. 解析响应，并以标准化的 SimulationStep[] 格式返回。
                const toolCallJson = /* 从 responseData 提取 JSON 的逻辑 */;
                return toolCallJson.steps.map((step: any) => ({ ...step /* 并补充数据 */ }));
            }

            async getAIDebugAction(context: string): Promise<AiResponse> {
                // 与上面类似，但用于根据提供的“黄金上下文”获取单个动作。
                const decisionToolSchema = { /* 用于单个动作的 schema */ };
                const requestBody: ClaudeMessageRequest = { /* ... */ };
                const response = await fetch(this.CLAUDE_API_URL, { /* ... */ });
                const responseData: ClaudeMessageResponse = await response.json();
                const toolCallJson = /* 提取 JSON 的逻辑 */;
                return toolCallJson as AiResponse;
            }

            // ... 私有辅助方法 ...
        }
        ```

3.  **在工厂中注册代理 (即“经理”)**
    -   **文件**: `augur-web-visualizer/src/services/aiServiceFactory.ts`
    -   **操作**: 导入新服务并将其添加到工厂的 switch 语句中。
    -   **代码**:
        ```diff
        import { GeminiAgentService } from './agents/GeminiAgentService';
        import { MockAgentService } from './agents/MockAgentService';
        + import { ClaudeAgentService } from './agents/ClaudeAgentService';

        // ...

        export const getAgentService = (model: AiModel): IAgentService => {
            // ... (缓存逻辑)
            switch (model) {
                case 'gemini-2.5-flash':
                    service = new GeminiAgentService();
                    break;
                case 'mock':
                    service = new MockAgentService();
                    break;
        +       case 'claude-3-sonnet':
        +           service = new ClaudeAgentService();
        +           break;
                default:
                    // ...
            }
            // ...
        };
        ```

4.  **在 UI 中暴露模型选项**
    -   **文件**: `augur-web-visualizer/src/locales/en.json` 和 `zh.json`。
        -   **操作**: 添加翻译键。
        -   **代码**: `"aiModel.claude-3-sonnet": "Claude 3 Sonnet",`
    -   **文件**: `augur-web-visualizer/src/components/AIModelSelector.tsx`。
        -   **操作**: 将新模型添加到填充下拉列表的数组中。
        -   **代码**: ` { id: 'claude-3-sonnet', name: t('aiModel.claude-3-sonnet') }`

5.  **在环境中添加 API 密钥**
    -   **文件**: `augur-web-visualizer/.env.local`
    -   **操作**: 添加新的 API 密钥。
    -   **代码**: `VITE_CLAUDE_API_KEY=sk-ant-xxxxxxxx`

</details>

<details>
<summary><strong>第 2 部分：在 `augur-vscode-extension` 中添加新模型</strong></summary>

这个过程在理念上完全相同，但为 VS Code 插件环境做了适配。

1.  **在 `package.json` 中更新配置**
    -   **文件**: `augur-vscode-extension/package.json`
    -   **操作**: 为 VS Code 的设置 UI 定义新模型选项及其 API 密钥设置。
    -   **代码**:
        ```diff
          "properties": {
            "augur.model": {
              "type": "string",
              "default": "gemini",
        -     "enum": ["gemini"],
        +     "enum": ["gemini", "claude"],
              "description": "选择用于调试的 AI 模型。"
            },
            "augur.geminiApiKey": {
              "type": "string",
              // ...
            },
        +   "augur.claudeApiKey": {
        +     "type": "string",
        +     "default": "",
        +     "description": "Anthropic Claude (Claude 3 Sonnet) 的 API 密钥。"
        +   }
          }
        ```

2.  **定义模型类型**
    -   **文件**: `augur-vscode-extension/src/aiService.ts`
    -   **操作**: 将新模型 ID 添加到 `AiAgentModel` 类型中。
    -   **代码**:
        ```diff
        - export type AiAgentModel = 'gemini';
        + export type AiAgentModel = 'gemini' | 'claude';
        ```

3.  **创建代理服务 (即“工人”)**
    -   **文件**: 创建 `augur-vscode-extension/src/agents/ClaudeAgent.ts`。
    -   **操作**: 创建一个 `ClaudeAgent` 类并使其 `implements IAiAgentService`。它将与 Web 版本类似，但在插件的 Node.js 运行时中使用 `node-fetch` 进行 API 调用。
    -   **实现示例**:
        ```typescript
        // augur-vscode-extension/src/agents/ClaudeAgent.ts
        import fetch from 'node-fetch';
        import { AiResponse } from '../types';
        import { IAiAgentService } from '../aiService';

        export class ClaudeAgent implements IAiAgentService {
            private apiKey: string;
            // ...
            constructor(apiKey: string) {
                this.apiKey = apiKey;
            }

            async getAIDebugAction(context: string): Promise<AiResponse> {
                // 获取单个调试动作的 Claude 特定逻辑，
                // 在插件的 Node.js 运行时中使用 node-fetch。
                // ...
                return /* 标准化的 AiResponse */;
            }
        }
        ```

4.  **更新 `tracker.ts` 中的工厂逻辑**
    -   **文件**: `augur-vscode-extension/src/tracker.ts`
    -   **操作**: `AugurDebugAdapterTracker` 的 `constructor` 扮演了我们的工厂角色。更新它以处理新模型。
    -   **代码**:
        ```diff
        + import { ClaudeAgent } from './agents/ClaudeAgent';
        // ...
        class AugurDebugAdapterTracker implements vscode.DebugAdapterTracker {
            // ...
            constructor(session: vscode.DebugSession) {
                // ...
                const config = vscode.workspace.getConfiguration('augur');
                const selectedModel = config.get<AiAgentModel>('model');

                let apiKey: string | undefined;

                switch (selectedModel) {
                    case 'gemini':
                        // ... (现有逻辑)
                        break;
        +           case 'claude':
        +               apiKey = config.get<string>('claudeApiKey');
        +               if (!apiKey) {
        +                   vscode.window.showErrorMessage('Augur 错误: "augur.claudeApiKey" 未设置。');
        +                   this.agent = null;
        +               } else {
        +                   this.agent = new ClaudeAgent(apiKey);
        +                   console.log('[Augur] Claude Agent 已初始化。');
        +               }
        +               break;
                    default:
                        // ...
                }
            }
            // ...
        }
        ```

完成这些更改后，用户现在可以在他们的 VS Code 设置中选择 "claude"，提供密钥，插件将自动使用 `ClaudeAgent` 进行所有操作，而代码的任何其他部分都无需更改。
</details>

---
<a name="component-comparison-zh-detail"></a>
### 💡 两大组件对比
| 特性           | `augur-web-visualizer` (教学模拟器)                                 | `augur-vscode-extension` (真实执行器)                                  |
| -------------- | ------------------------------------------------------------------- | ---------------------------------------------------------------------- |
| **🎯 目标**      | 教学、可视化、概念验证                                              | 实用工具、真实世界实现                                                 |
| **🌐 环境**      | 浏览器 (React/Vite)                                                 | VS Code (插件开发宿主)                                                 |
| **⚙️ 工作流**    | **两阶段**: 先生成完整轨迹，再交互浏览。                              | **实时循环**: 监听→分析→行动。                                          |
| **📦 上下文**    | **静态的**: 从预生成的 JS 数组中读取。                              | **动态的**: 通过 DAP 实时获取状态。                                      |
| **🔑 API Key** | `.env.local` 文件 (需 `VITE_` 前缀)                                 | VS Code 设置 (`augur.geminiApiKey` 等)                                   |
| **💎 核心价值** | 可视化“上下文工程”与 AI 决策。                                      | 实现自主 AI 调试闭环。                                                 |

---
<a name="quick-start-zh-detail"></a>
### ⚡ 快速开始

#### 先决条件
*   Node.js (v18 或更高版本)
*   Visual Studio Code
*   您希望使用的 AI 模型的有效 API 密钥 (例如 Google Gemini)。

#### 安装与使用
1.  **克隆仓库**:
    ```bash
    git clone https://github.com/your-username/augur-ai-debugger-project.git
    cd augur-ai-debugger-project
    ```
2.  **选择一个组件**:
    进入您想探索的组件目录 (`augur-web-visualizer` 或 `augur-vscode-extension`)。
3.  **遵循详细指南**:
    遵循上方各组件章节内的详细安装和使用步骤。我们建议从 **Web 模拟器** 开始，以直观地理解项目的核心概念。

<p align="right"><a href="#top-zh">返回顶部 ↑</a></p>
</details>
