import * as vscode from 'vscode';
import { GoogleGenAI, Type } from "@google/genai";
import { AiResponse } from './types';

// Factory class to create our custom tracker
export class AugurDebugAdapterTrackerFactory implements vscode.DebugAdapterTrackerFactory {
    createDebugAdapterTracker(session: vscode.DebugSession): vscode.ProviderResult<vscode.DebugAdapterTracker> {
        return new AugurDebugAdapterTracker(session);
    }
}

class AugurDebugAdapterTracker implements vscode.DebugAdapterTracker {
    private session: vscode.DebugSession;
    private ai: GoogleGenAI | null;
    private isProcessing = false;

    constructor(session: vscode.DebugSession) {
        this.session = session;
        console.log(`[Augur] Tracker attached to session: ${this.session.id}`);

        // 1. Read the configuration from VS Code's settings
        const config = vscode.workspace.getConfiguration('augur');
        const apiKey = config.get<string>('apiKey');

        // 2. Check if the key exists
        if (!apiKey) {
            this.ai = null; // Set ai to null if no key is found
            console.error('[Augur] API Key not found. Please set "augur.apiKey" in your settings.');
            // Show an error message to the user
            vscode.window.showErrorMessage('Augur Error: Gemini API Key not set. Please set "augur.apiKey" in your settings.');
        } else {
            // 3. Initialize the AI client with the key from settings
            this.ai = new GoogleGenAI({ apiKey: apiKey });
            console.log('[Augur] Gemini AI client initialized.');
        }
    }

    /**
     * Called when a message is received from the debug adapter.
     * This is where we listen for events like 'stopped'.
     */
    async onDidSendMessage(message: any) {
        if (message.type === 'event' && message.event === 'stopped') {
            // Gracefully exit if the AI client isn't initialized or already processing
            if (this.isProcessing || !this.ai) return;

            this.isProcessing = true;
            try {
                console.log('[Augur] Execution stopped. Reason:', message.body.reason);
                await this.handleStoppedEvent(message.body.threadId);
            } catch (error) {
                console.error('[Augur] Error processing stopped event:', error);
                vscode.window.showErrorMessage(`Augur Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
            } finally {
                this.isProcessing = false;
            }
        }
    }

    /**
     * Main logic loop: fetch context, ask AI, execute action.
     */
    private async handleStoppedEvent(threadId: number) {
        // 1. Build the "Golden Context" by actively querying the debugger
        const context = await this.buildGoldenContext(threadId);
        if (!context) {
            console.warn('[Augur] Could not build context. Skipping AI action.');
            return;
        }

        console.log('[Augur] Golden Context built. Sending to AI...');
        
        // 2. Call the AI to get the next debug action
        const aiAction = await this.getAIDebugAction(context);
        console.log(`[Augur] AI decided action: ${aiAction.tool}`, aiAction);

        // 3. Translate AI action to a DAP command and send it
        await this.executeAIAction(threadId, aiAction);
    }

    /**
     * Context Engineering Pipeline: Fetches runtime state from the debugger.
     */
    private async buildGoldenContext(threadId: number): Promise<string | null> {
        try {
            // Get stack trace
            const stackTraceResponse = await this.session.customRequest('stackTrace', { threadId, startFrame: 0, levels: 1 });
            const topFrame = stackTraceResponse.stackFrames[0];
            if (!topFrame) return null;

            // Get scopes (e.g., local, global)
            const scopesResponse = await this.session.customRequest('scopes', { frameId: topFrame.id });
            const localScope = scopesResponse.scopes.find((s: any) => s.name === 'Locals' || s.name === 'Local');
            if (!localScope) return null;

            // Get variables within the local scope
            const variablesResponse = await this.session.customRequest('variables', { variablesReference: localScope.variablesReference });
            const variables = variablesResponse.variables.reduce((acc: any, v: any) => {
                // Filter out special variables that are noisy for the LLM
                if (!v.name.startsWith('__')) {
                   acc[v.name] = v.value;
                }
                return acc;
            }, {});

            const sourceCode = await this.getSourceCode(topFrame.source, topFrame.line);

            // Format into a prompt
            const prompt = `You are an expert debugging assistant. Your goal is to decide the next best debugging action.
Based on the current state, choose a tool: 'next' (step over), 'stepIn', 'stepOut', or 'continue'.
Provide a brief, one-sentence explanation for your choice.

Current state:
- File: ${topFrame.source.path}
- Paused at line: ${topFrame.line}

Code Context:
\`\`\`
${sourceCode}
\`\`\`

Local Variables:
${JSON.stringify(variables, null, 2)}
`;
            return prompt;
        } catch (error) {
            console.error('[Augur] Failed to build golden context:', error);
            return null;
        }
    }

    private async getSourceCode(source: any, currentLine: number): Promise<string> {
        if (!source || !source.path) return "Source code not available.";
        try {
            const uri = vscode.Uri.file(source.path);
            const document = await vscode.workspace.openTextDocument(uri);
            const startLine = Math.max(0, currentLine - 6);
            const endLine = Math.min(document.lineCount, currentLine + 5);
            
            let context = '';
            for (let i = startLine; i < endLine; i++) {
                const line = document.lineAt(i);
                const prefix = (i + 1) === currentLine ? '>' : ' ';
                context += `${prefix} ${i + 1}: ${line.text}\n`;
            }
            return context;
        } catch {
            return "Could not read source file.";
        }
    }

    /**
     * Calls the Gemini API with the context and a tool schema.
     */
    private async getAIDebugAction(context: string): Promise<AiResponse> {
        if (!this.ai) {
            throw new Error('Augur AI client is not initialized. Check your API key setting.');
        }
        try {
            const response = await this.ai.models.generateContent({
                model: "gemini-2.5-flash",
                contents: context,
                config: {
                    responseMimeType: "application/json",
                    responseSchema: {
                        type: Type.OBJECT,
                        properties: {
                            tool: {
                                type: Type.STRING,
                                description: "The debugging action. Must be 'next', 'stepIn', 'stepOut', or 'continue'."
                            },
                            explanation: {
                                type: Type.STRING,
                                description: "A brief explanation for the chosen action."
                            }
                        },
                        required: ["tool", "explanation"]
                    },
                },
            });

            // --- 修复开始 ---
            // 使用可选链 (?.）并添加一个 if 检查，以防止在 response.text 未定义时崩溃
            const jsonString = response.text?.trim();
            if (!jsonString) {
                console.error('[Augur] Gemini API returned an empty or undefined response.');
                throw new Error('Failed to get decision from Gemini API: Empty response.');
            }
            // --- 修复结束 ---

            return JSON.parse(jsonString) as AiResponse;

        } catch (error) {
            console.error('[Augur] Gemini API call failed:', error);
            throw new Error('Failed to get decision from Gemini API.');
        }
    }

    /**
     * Sends the AI's chosen command back to the debug adapter.
     */
    private async executeAIAction(threadId: number, action: AiResponse) {
        // Translate tool names to DAP commands
        const command = action.tool;
        const validCommands = ['next', 'stepIn', 'stepOut', 'continue'];

        if (validCommands.includes(command)) {
            console.log(`[Augur] Executing command: ${command}`);
            await this.session.customRequest(command, { threadId });
        } else {
            console.warn(`[Augur] AI returned an invalid tool: ${command}. Defaulting to 'next'.`);
            await this.session.customRequest('next', { threadId });
        }
    }
}