import * as vscode from 'vscode';
import { getWorkSpaceFolder } from '../../utils';

const ROOT_PATH = getWorkSpaceFolder();

const PATHS_TO_POPULATE = [
	// "metadata.json", // This is where we store the project metadata in scripture burrito format, but we create this using the project initialization command
	{ filePath: "comments.json", defaultContent: "" }, // This is where we store the VS Code comments api comments, such as on .bible files
	{ filePath: "notebook-comments.json", defaultContent: "[]" }, // We can't use the VS Code comments api for notebooks (.codex files), so a second files avoids overwriting conflicts
	{ filePath: "chat-threads.json", defaultContent: "[]" }, // This is where chat thread conversations are saved
  ];

export async function registerCommands(context: vscode.ExtensionContext) {
	context.subscriptions.push(
		vscode.commands.registerCommand(
			"codex-chat-and-comments.createFiles",
			async () => {
				if (ROOT_PATH) {
					vscode.window.showInformationMessage(
						"Checking for missing project files..."
					);
					for (const fileToPopulate of PATHS_TO_POPULATE) {
						const fullPath = vscode.Uri.joinPath(
							vscode.Uri.file(ROOT_PATH),
							fileToPopulate.filePath
						);
						try {
							await vscode.workspace.fs.stat(fullPath);
						} catch (error) {
							// Determine if the missing path is a file or a directory based on its name
							if (fileToPopulate.filePath.includes(".")) {
								// Assuming it's a file if there's an extension
								vscode.window.showInformationMessage(
									`Creating file: ${fileToPopulate.filePath}`
								);
								await vscode.workspace.fs.writeFile(
									fullPath,
									new TextEncoder().encode(fileToPopulate.defaultContent || "")
								); // Create an empty file
							} else {
								// Assuming it's a directory if there's no file extension
								vscode.window.showInformationMessage(
									`Creating directory: ${fileToPopulate.filePath}`
								);
								await vscode.workspace.fs.createDirectory(fullPath);
							}
						}
					}
				}
			}
		)
	);
}

