import * as vscode from "vscode";
// import { initializeWebviews } from "./activationHelpers/contextAware/webviewInitializers";
// import { registerCommands } from "./activationHelpers/contextAware/commands";
// import { langugeServerTS as languageServerTS } from "./activationHelpers/contextAware/tsLanguageServer";
// import { registerCodeLensProviders } from "./activationHelpers/contextAware/codeLensInitializer";

export async function activate(context: vscode.ExtensionContext) {
  const extensionToMigrateTo = "project-accelerate.codex-editor-extension";
  const message = `Extension "codex-copilot" is deprecated. Would you like to install ${extensionToMigrateTo} to continue using the same features?`;
  const installButton = 'Install';
  
  vscode.window.showWarningMessage(message, installButton).then(selection => {
    if (selection === installButton) {
      vscode.commands.executeCommand('workbench.extensions.installExtension', extensionToMigrateTo);
    }
  });
  return;
  // await initializeWebviews(context);
  // await registerCommands(context);
  // await registerCodeLensProviders(context);
  // await languageServerTS(context);
}
