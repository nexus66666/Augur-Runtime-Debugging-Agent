
import * as vscode from 'vscode';
import { AugurDebugAdapterTrackerFactory } from './tracker';

/**
 * This method is called when the extension is activated.
 * Activation is triggered by the `onDebug` event specified in package.json.
 */
export function activate(context: vscode.ExtensionContext) {
    console.log('Augur AI Debugger is now active.');

    // Register our factory to be called for every new debug session.
    // The '*' means it will track all debugger types (python, node, etc.).
    context.subscriptions.push(
        vscode.debug.registerDebugAdapterTrackerFactory('*', new AugurDebugAdapterTrackerFactory())
    );
}

/**
 * This method is called when the extension is deactivated.
 */
export function deactivate() {
    console.log('Augur AI Debugger has been deactivated.');
}
