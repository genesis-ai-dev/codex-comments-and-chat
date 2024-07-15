import * as vscode from "vscode";
import {
  triggerInlineCompletion,
  provideInlineCompletionItems,
} from "../../providers/translationSuggestions/inlineCompletionsProvider";
import VerseCompletionCodeLensProvider from "../../providers/translationSuggestions/verseCompletionCodeLensProvider";

let statusBarItem: vscode.StatusBarItem;
let serverReady = false;

checkVerseCompletionReady();

export async function registerCodeLensProviders(
  context: vscode.ExtensionContext
) {
  // Wait for the server to be ready
  await waitForServerReady();

  try {
    vscode.window.showInformationMessage("Translators Copilot is now active!");

    statusBarItem = vscode.window.createStatusBarItem(
      vscode.StatusBarAlignment.Right,
      100
    );
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
        const { triggerManualSourceSelection } = await import(
          "../../providers/translationSuggestions/inlineCompletionsProvider"
        );
        await triggerManualSourceSelection();
      }
    );

    context.subscriptions.push(manualSourceTextSelectionDisposable);

    // Register the CodeLensProvider
    context.subscriptions.push(
      vscode.languages.registerCodeLensProvider(
        { language: "scripture" },
        new VerseCompletionCodeLensProvider()
      )
    );
  } catch (error) {
    console.error("Error activating extension", error);
    vscode.window.showErrorMessage(
      "Failed to activate Translators Copilot. Please check the logs for details."
    );
  }
}

async function waitForServerReady() {
  const timeout = 2 * 60 * 1000; // 2 minutes timeout
  const startTime = Date.now();

  while (!getServerReadyStatus()) {
    if (Date.now() - startTime > timeout) {
      throw new Error(
        "Server not ready after 2 minutes. Activation timed out."
      );
    }
    await new Promise((resolve) => setTimeout(resolve, 1000)); // Check every second
  }
}

export function getServerReadyStatus() {
  return serverReady;
}

async function checkVerseCompletionReady() {
  const startTime = Date.now();
  const timeout = 2 * 60 * 1000; // 2 minutes in milliseconds
  const refs: string[] = ["GEN 1:1", "EXO 1:7", "MAT 1:5"];
  let n = 0;

  console.log("Checking if server is ready...");
  while (!serverReady) {
    if (Date.now() - startTime > timeout) {
      vscode.window.showErrorMessage(
        "Server is not ready for inline completion after 2 minutes. Consider reloading the window."
      );
      return;
    }

    try {
      console.log("Checking if server is ready...");
      const result = await vscode.commands.executeCommand(
        "codex-editor-extension.pythonMessenger",
        "isAPIHandlerReady",
        refs[n % 3]
      );
      if (result) {
        serverReady = true;
        break;
      }
    } catch (error) {
      console.log("Server is not ready yet:", error);
    }
    n++;
    await new Promise((resolve) => setTimeout(resolve, 2000));
  }
  console.log("Server is ready. You can now use inline completion.");
}

export function deactivate() {
  if (statusBarItem) {
    statusBarItem.dispose();
  }
}
