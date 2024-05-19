import * as vscode from 'vscode';
import { getWorkSpaceFolder } from '../../utils';
import { QuickPickItem } from 'vscode';

enum MainChatLanguage {
	English = "English",
	Tamil = "தமிழ் (Tamil)",
	Telugu = "తెలుగు (Telugu)",
	Kannada = "ಕನ್ನಡ (Kannada)",
	Hindi = "हिन्दी (Hindi)",
	Gujarati = "ગુજરાતી (Gujarati)",
	Spanish = "Español (Spanish)",
	French = "Français (French)",
	German = "Deutsch (German)",
	Italian = "Italiano (Italian)",
	Dutch = "Nederlands (Dutch)",
	Portuguese = "Português (Portuguese)",
	Russian = "Русский (Russian)",
	Chinese = "中文 (Chinese)",
	Japanese = "日本語 (Japanese)",
	Korean = "한국어 (Korean)",
	Arabic = "العربية (Arabic)",
	Turkish = "Türkçe (Turkish)",
	Vietnamese = "Tiếng Việt (Vietnamese)",
	Thai = "ไทย (Thai)",
	Indonesian = "Bahasa Indonesia (Indonesian)",
	Malay = "Bahasa Melayu (Malay)",
	Filipino = "Filipino (Filipino)",
	Bengali = "বাংলা (Bengali)",
	Punjabi = "ਪੰਜਾਬੀ (Punjabi)",
	Marathi = "मराठी (Marathi)",
	Odia = "ଓଡ଼ିଆ (Odia)",
	Kiswahili = "Swahili (Kiswahili)",
	Urdu = "اردو (Urdu)",
	Persian = "فارسی (Persian)",
	Hausa = "Hausa",
	Amharic = "አማርኛ (Amharic)",
	Javanese = "ꦧꦱꦗꦮ (Javanese)",
	Burmese = "မြန်မာဘာသာ (Burmese)",
	Swedish = "Svenska (Swedish)",
	Norwegian = "Norsk (Norwegian)",
	Finnish = "Suomi (Finnish)",
	Danish = "Dansk (Danish)",
	Hebrew = "עברית (Hebrew)",
	Ukrainian = "Українська (Ukrainian)",
	Polish = "Polski (Polish)",
	Romanian = "Română (Romanian)",
	Czech = "Čeština (Czech)",
	Hungarian = "Magyar (Hungarian)",
	Greek = "Ελληνικά (Greek)",
	Serbian = "Српски (Serbian)",
	Croatian = "Hrvatski (Croatian)",
	Bulgarian = "Български (Bulgarian)",
	Slovak = "Slovenčina (Slovak)",
	Malayalam = "മലയാളം (Malayalam)",
	Sinhala = "සිංහල (Sinhala)",
	Khmer = "ភាសាខ្មែរ (Khmer)",
	Lao = "ພາສາລາວ (Lao)"
}

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
	context.subscriptions.push(
		vscode.commands.registerCommand('translators-copilot.setMainChatLanguage', async () => {
			const options: vscode.QuickPickItem[] = Object.values(MainChatLanguage).map(language => ({
				label: language,
			}));

			const selectedLanguage = await vscode.window.showQuickPick(options, {
				placeHolder: 'Select the main chat language for Translator\'s Copilot',
			});

			if (selectedLanguage) {
				await vscode.workspace.getConfiguration('translators-copilot').update('main_chat_language', selectedLanguage.label as MainChatLanguage, vscode.ConfigurationTarget.Workspace);
				vscode.window.showInformationMessage(`Main chat language set to ${selectedLanguage.label}`);
			}
		}));
	context.subscriptions.push(
		vscode.commands.registerCommand('translators-copilot.setLLMApiKey', async () => {
			const apiKey = await vscode.window.showInputBox({
				placeHolder: 'Enter your LLM API Key',
			});
		})
	);
}

