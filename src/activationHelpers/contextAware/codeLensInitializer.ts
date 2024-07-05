import * as vscode from "vscode";
import {
    triggerInlineCompletion,
    provideInlineCompletionItems
} from "../../providers/translationSuggestions/inlineCompletionsProvider";
import VerseCompletionCodeLensProvider from "../../providers/translationSuggestions/verseCompletionCodeLensProvider";

let statusBarItem: vscode.StatusBarItem;

export async function registerCodeLensProviders(context: vscode.ExtensionContext) {
    try {
        vscode.window.showInformationMessage("Translators Copilot is now active!");

        statusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 100);
        context.subscriptions.push(statusBarItem);

        const languages = ["scripture"];
        const disposables = languages.map((language) => {
            return vscode.languages.registerInlineCompletionItemProvider(language, {
                provideInlineCompletionItems,
            });
        });
        disposables.forEach((disposable) => context.subscriptions.push(disposable));

        const commandDisposable = vscode.commands.registerCommand(
            "extension.triggerInlineCompletion",
            async () => {
                await triggerInlineCompletion(statusBarItem);
            }
        );

        context.subscriptions.push(commandDisposable);

        // Register the manual source text selection command
        const manualSourceTextSelectionDisposable = vscode.commands.registerCommand(
            "extension.manualSourceTextSelection",
            async () => {
                // Import the function from inlineCompletionProvider
                const { triggerManualSourceSelection } = await import("../../providers/translationSuggestions/inlineCompletionsProvider");
                await triggerManualSourceSelection();
            }
        );

        context.subscriptions.push(manualSourceTextSelectionDisposable);

        // Register the CodeLensProvider
        context.subscriptions.push(
            vscode.languages.registerCodeLensProvider(
                { language: 'scripture' },
                new VerseCompletionCodeLensProvider()
            )
        );

    } catch (error) {
        console.error("Error activating extension", error);
        vscode.window.showErrorMessage("Failed to activate Translators Copilot. Please check the logs for details.");
    }
}

export function deactivate() {
    if (statusBarItem) {
        statusBarItem.dispose();
    }
}