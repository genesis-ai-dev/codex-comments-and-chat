import * as vscode from "vscode";
import { initializeWebviews } from "./activationHelpers/contextAware/webviewInitializers";
import { registerCommands } from "./activationHelpers/contextAware/commands";
// import { langugeServerTS as languageServerTS } from "./activationHelpers/contextAware/tsLanguageServer";
import { registerCodeLensProviders } from "./activationHelpers/contextAware/codeLensInitializer";

export async function activate(context: vscode.ExtensionContext) {
  await initializeWebviews(context);
  await registerCommands(context);
  await registerCodeLensProviders(context);
  // await languageServerTS(context);
}
