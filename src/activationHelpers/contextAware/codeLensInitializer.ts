import * as vscode from "vscode";
import {
  triggerInlineCompletion,
  provideInlineCompletionItems,
  triggerManualSourceSelection,
} from "../../providers/translationSuggestions/inlineCompletionsProvider";
import VerseCompletionCodeLensProvider from "../../providers/translationSuggestions/verseCompletionCodeLensProvider";

let statusBarItem: vscode.StatusBarItem;
let serverReady = false;

export async function registerCodeLensProviders(
  context: vscode.ExtensionContext
) {
  await initializeExtension(context);
}

async function initializeExtension(context: vscode.ExtensionContext) {
  await checkVerseCompletionReady();

  try {
    setupStatusBar(context);
    registerLanguageProviders(context);
    registerCommands(context);
    vscode.window.showInformationMessage("Translators Copilot is now active!");
  } catch (error) {
    handleActivationError(error);
  }
}

function setupStatusBar(context: vscode.ExtensionContext) {
  statusBarItem = vscode.window.createStatusBarItem(
    vscode.StatusBarAlignment.Right,
    100
  );
  context.subscriptions.push(statusBarItem);
}

function registerLanguageProviders(context: vscode.ExtensionContext) {
  const languages = ["scripture"];
  languages.forEach((language) => {
    const disposable = vscode.languages.registerInlineCompletionItemProvider(
      language,
      { provideInlineCompletionItems }
    );
    context.subscriptions.push(disposable);
  });

  context.subscriptions.push(
    vscode.languages.registerCodeLensProvider(
      { language: "scripture" },
      new VerseCompletionCodeLensProvider()
    )
  );
}

function registerCommands(context: vscode.ExtensionContext) {
  context.subscriptions.push(
    vscode.commands.registerCommand("extension.triggerInlineCompletion", () =>
      triggerInlineCompletion(statusBarItem)
    ),
    vscode.commands.registerCommand(
      "extension.manualSourceTextSelection",
      triggerManualSourceSelection
    )
  );
}

function handleActivationError(error: unknown) {
  console.error("Error activating extension", error);
  vscode.window.showErrorMessage(
    "Failed to activate Translators Copilot. Please check the logs for details."
  );
}

// async function waitForServerReady() {
//   const timeout = 2 * 60 * 1000; // 2 minutes timeout
//   const startTime = Date.now();

//   while (!serverReady) {
//     if (Date.now() - startTime > timeout) {
//       throw new Error(
//         "Server not ready after 2 minutes. Activation timed out."
//       );
//     }
//     await new Promise((resolve) => setTimeout(resolve, 1000)); // Check every second
//   }
// }

async function checkVerseCompletionReady() {
  const startTime = Date.now();
  const timeout = 2 * 60 * 1000; // 2 minutes timeout
  const refs = ["GEN 1:1", "EXO 1:7", "MAT 1:5"];
  let attempt = 0;

  const statusBarItem = createLoadingStatusBarItem();

  while (!serverReady && Date.now() - startTime <= timeout) {
    try {
      const result = await pingServer(refs[attempt % refs.length]);
      if (isServerReady(result)) {
        serverReady = true;
        break;
      }
    } catch (error) {
      console.log("Server is not ready yet:", error);
    }
    attempt++;
    await new Promise((resolve) => setTimeout(resolve, 2000));
  }

  handleServerReadyStatus(statusBarItem, startTime, timeout);
}

function createLoadingStatusBarItem() {
  const item = vscode.window.createStatusBarItem(
    vscode.StatusBarAlignment.Left,
    100
  );
  item.text = "$(sync~spin) Initializing Copilot Extension...";
  item.show();
  return item;
}

async function pingServer(ref: string) {
  console.log("Pinging server...");
  return vscode.commands.executeCommand(
    "codex-editor-extension.pythonMessenger",
    "checkAPIHandlerReadiness",
    ref
  ) as Promise<
    [{ response: string }, { ref: string; source: string; target: string }]
  >;
}

function isServerReady(
  result: [
    { response: string },
    { ref: string; source: string; target: string }
  ]
) {
  return (
    result[0].response === "pong" &&
    result[1].source.length > 0 &&
    result[1].target.length > 0
  );
}

function handleServerReadyStatus(
  statusBarItem: vscode.StatusBarItem,
  startTime: number,
  timeout: number
) {
  if (!serverReady && Date.now() - startTime > timeout) {
    showServerNotReadyError();
  } else {
    console.log("Server is ready.");
  }
  statusBarItem.hide();
  statusBarItem.dispose();
}

function showServerNotReadyError() {
  vscode.window
    .showErrorMessage(
      "Server is not ready for inline completion after 2 minutes. Consider reinstalling the associated extensions.",
      "Reinstall"
    )
    .then((selection) => {
      if (selection === "Reinstall") {
        vscode.commands.executeCommand(
          "codex-project-manager.reinstallExtensions",
          [
            "project-accelerate.codex-copilot",
            "project-accelerate.codex-editor-extension",
          ]
        );
      }
    });
  serverReady = true;
}

export function getServerReadyStatus() {
  return serverReady;
}

export function deactivate() {
  if (statusBarItem) {
    statusBarItem.dispose();
  }
}
