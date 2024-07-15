import * as vscode from "vscode";
import axios from "axios";
import {
  CompletionConfig,
  readMetadataJson,
  findVerseRef,
  getAdditionalResources,
  findSourceText,
} from "../providers/translationSuggestions/inlineCompletionsProvider";

const abort = false;

interface VerseData {
  sourceLanguageName: string;
  verseRef: string;
  sourceVerse: string;
  currentVerse: string;
  similarPairs: string;
  otherResources: string;
  sourceChapter: string;
  surroundingContext: string;
}

export async function verseCompletion(
  document: vscode.TextDocument,
  position: vscode.Position,
  config: CompletionConfig,
  token: vscode.CancellationToken
): Promise<string> {
  const verseData = await getVerseData(config, document, position);
  if (token.isCancellationRequested) {
    return "";
  }
  return await completeVerse(config, verseData);
}

async function getVerseData(
  config: CompletionConfig,
  document: vscode.TextDocument,
  position: vscode.Position
): Promise<VerseData> {
  const verseRef = await findVerseRef();

  console.log({ verseRef });

  console.log("getting verse data.");

  const verseData: Partial<VerseData> = {};
  const missingResources: string[] = [];

  try {
    const metadata = await readMetadataJson();
    verseData.sourceLanguageName =
      metadata.languages.find((lang: any) => lang.projectStatus === "source")
        ?.refName || "Unknown";

    verseData.verseRef = (await findVerseRef()) || "";
    if (!verseData.verseRef) {
      missingResources.push("verse reference");
    }

    const sourceTextFilePath = await findSourceText();
    if (!sourceTextFilePath) {
      missingResources.push("source text file");
      verseData.sourceVerse = "Source verse unavailable";
    } else {
      try {
        verseData.sourceVerse = await findSourceVerse(
          sourceTextFilePath,
          verseData.verseRef
        );
      } catch (error) {
        console.warn(`Error finding source verse: ${error}`);
        verseData.sourceVerse = "Source verse unavailable";
        missingResources.push("source verse");
      }
    }

    const textBeforeCursor = preprocessDocument(
      document.getText(new vscode.Range(new vscode.Position(0, 0), position))
    );
    verseData.currentVerse = extractCurrentVerse(
      textBeforeCursor,
      verseData.verseRef
    );

    try {
      verseData.similarPairs = await getSimilarPairs(
        verseData.verseRef,
        config.contextSize,
        config.sourceBookWhitelist
      );
      console.log(config.sourceBookWhitelist);
    } catch (error) {
      console.warn(`Error getting similar pairs: ${error}`);
      verseData.similarPairs = "Similar pairs unavailable";
      missingResources.push("similar pairs");
    }

    try {
      verseData.otherResources = await getAdditionalResources(
        verseData.verseRef
      );
    } catch (error) {
      console.warn(`Error getting additional resources: ${error}`);
      verseData.otherResources = "Additional resources unavailable";
      missingResources.push("additional resources");
    }

    try {
      if (sourceTextFilePath !== null)
        verseData.sourceChapter = await getSourceChapter(
          sourceTextFilePath,
          verseData.verseRef
        );
    } catch (error) {
      console.warn(`Error getting source chapter: ${error}`);
      verseData.sourceChapter = "Source chapter unavailable";
      missingResources.push("source chapter");
    }

    try {
      if (sourceTextFilePath !== null)
        verseData.surroundingContext = await getSurroundingContext(
          sourceTextFilePath,
          verseData.verseRef,
          config.contextSize
        );
    } catch (error) {
      console.warn(`Error getting surrounding context: ${error}`);
      verseData.surroundingContext = "Surrounding context unavailable";
      missingResources.push("surrounding context");
    }
  } catch (error) {
    console.error("Error in getVerseData", error);
  }

  Object.keys(verseData).forEach((key) => {
    const keyTyped = key as keyof VerseData;
    if (verseData[keyTyped] === undefined) {
      console.warn(`${key} is undefined in verseData`);
      verseData[keyTyped] = `${key} unavailable` as any;
      missingResources.push(key);
    }
  });

  if (missingResources.length > 0) {
    vscode.window.showWarningMessage(
      `Some resources are unavailable: ${missingResources.join(
        ", "
      )}. Completion may be less accurate.`
    );
  }

  console.log({ verseData });
  return verseData as VerseData;
}

async function findSourceVerse(
  sourceTextFilePath: string,
  verseRef: string
): Promise<string> {
  try {
    if (!sourceTextFilePath) {
      throw new Error("Source file not specified.");
    }
    const workspaceFolders = vscode.workspace.workspaceFolders;
    if (!workspaceFolders) {
      throw new Error("No workspace folder is open.");
    }
    const fileUri = vscode.Uri.file(sourceTextFilePath);
    const fileData = await vscode.workspace.fs.readFile(fileUri);
    const fileContents = Buffer.from(fileData).toString("utf-8");
    const verseRegex = new RegExp(`^${verseRef}.*$`, "m");
    const match = fileContents.match(verseRegex);
    if (match) {
      return match[0];
    } else {
      throw new Error(
        `Verse ${verseRef} not found in the source language Bible.`
      );
    }
  } catch (error) {
    console.error("Error reading source language Bible", error);
    throw new Error(`Error reading source language Bible: ${error}`);
  }
}

function getSimilarDrafts(
  verseRef: string,
  similarPairsCount: number,
  sourceBookWhitelist: string
): Promise<any> {
  return Promise.resolve(
    vscode.commands.executeCommand(
      "codex-editor-extension.pythonMessenger",
      "getSimilarDrafts",
      verseRef,
      similarPairsCount,
      sourceBookWhitelist
    )
  );
}

function preprocessDocument(text: string): string {
  return text.replace(/\s+/g, " ").trim();
}

function extractCurrentVerse(text: string, verseRef: string): string {
  if (!verseRef) return "";
  const verseRefPosition = text.indexOf(verseRef);
  if (verseRefPosition !== -1) {
    return verseRef + text.substring(verseRefPosition + verseRef.length);
  }
  return "";
}

async function getSimilarPairs(
  verseRef: string,
  contextSize: string,
  sourceBookWhitelist: string
): Promise<string> {
  let similarPairsCount;
  switch (contextSize) {
    case "small":
      similarPairsCount = 5;
      break;
    case "medium":
      similarPairsCount = 7;
      break;
    case "large":
      similarPairsCount = 10;
      break;
    default:
      console.warn(
        `Unknown context size: ${contextSize}. Defaulting to large.`
      );
      similarPairsCount = 10;
  }

  try {
    const result = await Promise.race([
      getSimilarDrafts(verseRef, similarPairsCount, sourceBookWhitelist),
      new Promise<any>((_, reject) =>
        setTimeout(() => reject(new Error("Request timed out")), 2000)
      ),
    ]);

    if (Array.isArray(result)) {
      // Remove the element containing the verseRef
      const filteredResult = result.filter(
        (item) => !JSON.stringify(item).includes(verseRef)
      );

      const toRet = filteredResult
        .map((item) => JSON.stringify(item, null, 2))
        .join("\n\n");
      return toRet;
    } else {
      throw new Error("Unexpected result format from getSimilarDrafts");
    }
  } catch (error) {
    console.error("Error getting similar pairs", error);
    return "";
  }
}

async function getSourceChapter(
  sourceTextFilePath: string,
  verseRef: string
): Promise<string> {
  try {
    if (sourceTextFilePath === null) {
      throw new Error("Source text file not initialized.");
    }

    const [book, chapterVerse] = verseRef.split(" ");
    const chapter = chapterVerse.split(":")[0];

    const fileUri = vscode.Uri.file(sourceTextFilePath);
    const sourceContent = await vscode.workspace.fs.readFile(fileUri);
    const text = new TextDecoder().decode(sourceContent);

    const chapterStart = text.indexOf(`${book} ${chapter}:1`);
    if (chapterStart === -1) {
      throw new Error(`Chapter start not found for ${book} ${chapter}`);
    }

    const nextChapterStart = text.indexOf(`${book} ${parseInt(chapter) + 1}:1`);

    return text.substring(
      chapterStart,
      nextChapterStart !== -1 ? nextChapterStart : undefined
    );
  } catch (error) {
    console.error(`Error getting source chapter for ${verseRef}`, error);
    if (error instanceof vscode.FileSystemError) {
      throw new Error(`Failed to read source text file: ${error.message}`);
    }
    throw error;
  }
}

async function getSurroundingContext(
  sourceTextFilePath: string,
  verseRef: string,
  contextSize: string
): Promise<string> {
  let surroundingVerseCount;
  switch (contextSize) {
    case "small":
      surroundingVerseCount = 3;
      break;
    case "medium":
      surroundingVerseCount = 5;
      break;
    case "large":
      surroundingVerseCount = 7;
      break;
    default:
      console.warn(
        `Unknown context size: ${contextSize}. Defaulting to medium.`
      );
      surroundingVerseCount = 5;
  }

  try {
    if (sourceTextFilePath === null) {
      throw new Error("Source text file not initialized.");
    }

    const n = surroundingVerseCount;

    const [book, chapterVerse] = verseRef.split(" ");
    const [chapter, verse] = chapterVerse.split(":").map(Number);

    const versePairs: { ref: string; source: string; target: string | null }[] =
      [];
    const verseRefs = await getVerseRefs(
      sourceTextFilePath,
      book,
      chapter,
      verse,
      n
    );

    for (const ref of verseRefs) {
      try {
        const sourceVerse = await findSourceVerseForContext(
          sourceTextFilePath,
          ref
        );
        let targetVerse = await findTargetVerse(ref);
        if (targetVerse && targetVerse.trim() === ref) {
          targetVerse = null;
        }

        if (targetVerse && targetVerse.trim() === ref) {
          targetVerse = null;
        }

        if (targetVerse) {
          const newlineIndex = targetVerse.indexOf("\n");
          if (newlineIndex !== -1) {
            targetVerse = targetVerse.substring(0, newlineIndex);
          }
        }

        if (sourceVerse && targetVerse) {
          versePairs.push({
            ref: ref,
            source: sourceVerse.includes(ref + " ")
              ? sourceVerse.replace(ref + " ", "")
              : sourceVerse.replace(ref, ""),
            target: targetVerse.includes(ref + " ")
              ? targetVerse.replace(ref + " ", "")
              : targetVerse.replace(ref, ""),
          });
        }
      } catch (error) {
        console.warn(`Error processing verse ${ref}: ${error}`);
      }
    }

    return versePairs.map((pair) => JSON.stringify(pair, null, 2)).join("\n\n");
  } catch (error) {
    console.error(`Error getting surrounding context for ${verseRef}`, error);
    throw error;
  }
}

async function getVerseRefs(
  sourceTextFilePath: string,
  book: string,
  chapter: number,
  verse: number,
  n: number
): Promise<string[]> {
  const refs = [];
  let currentBook = book;
  let currentChapter = chapter;
  let currentVerse = verse;

  for (let i = 0; i < n; i++) {
    currentVerse--;
    if (currentVerse < 1) {
      currentChapter--;
      if (currentChapter < 1) {
        break;
      }
      currentVerse = await getLastVerse(
        sourceTextFilePath,
        currentBook,
        currentChapter
      );
    }
    refs.unshift(`${currentBook} ${currentChapter}:${currentVerse}`);
  }

  currentBook = book;
  currentChapter = chapter;
  currentVerse = verse;
  refs.push(`${currentBook} ${currentChapter}:${currentVerse}`);

  for (let i = 0; i < Math.floor(n / 2); i++) {
    currentVerse++;
    const lastVerse = await getLastVerse(
      sourceTextFilePath,
      currentBook,
      currentChapter
    );
    if (currentVerse > lastVerse) {
      currentChapter++;
      const lastChapter = await getLastChapter(sourceTextFilePath, currentBook);
      if (currentChapter > lastChapter) {
        break;
      }
      currentVerse = 1;
    }
    refs.push(`${currentBook} ${currentChapter}:${currentVerse}`);
  }

  console.log({ refs });
  return refs;
}

async function getLastChapter(
  sourceTextFilePath: string,
  book: string
): Promise<number> {
  if (!sourceTextFilePath) {
    throw new Error("Source text file path is not initialized.");
  }
  const fileUri = vscode.Uri.file(sourceTextFilePath);
  const content = await vscode.workspace.fs.readFile(fileUri);
  const text = new TextDecoder().decode(content);
  const lines = text.split("\n");
  let lastChapter = 0;
  for (const line of lines) {
    if (line.startsWith(book)) {
      const [, chapterVerse] = line.split(" ");
      const [chapter] = chapterVerse.split(":");
      lastChapter = Math.max(lastChapter, parseInt(chapter));
    }
  }
  return lastChapter;
}

async function getLastVerse(
  sourceTextFilePath: string,
  book: string,
  chapter: number
): Promise<number> {
  if (!sourceTextFilePath) {
    throw new Error("Source text file path is not initialized.");
  }
  const fileUri = vscode.Uri.file(sourceTextFilePath);
  const content = await vscode.workspace.fs.readFile(fileUri);
  const text = new TextDecoder().decode(content);
  const lines = text.split("\n");
  let lastVerse = 0;
  for (const line of lines) {
    if (line.startsWith(`${book} ${chapter}:`)) {
      const [, chapterVerse] = line.split(" ");
      const [, verse] = chapterVerse.split(":");
      lastVerse = Math.max(lastVerse, parseInt(verse));
    }
  }
  return lastVerse;
}

async function findSourceVerseForContext(
  sourceTextFilePath: string,
  verseRef: string
): Promise<string | null> {
  try {
    const fileUri = vscode.Uri.file(sourceTextFilePath);
    const sourceContent = await vscode.workspace.fs.readFile(fileUri);
    const text = new TextDecoder().decode(sourceContent);

    const verseStart = text.indexOf(verseRef);
    if (verseStart === -1) {
      return null;
    }

    const verseEnd = text.indexOf("\n", verseStart);
    return text
      .substring(verseStart, verseEnd !== -1 ? verseEnd : undefined)
      .trim();
  } catch (error) {
    console.error(`Error finding source verse for context: ${verseRef}`, error);
    return null;
  }
}

async function findTargetVerse(verseRef: string): Promise<string | null> {
  const workspaceFolders = vscode.workspace.workspaceFolders;
  if (!workspaceFolders) {
    throw new Error("No workspace folder is open.");
  }

  const [book, chapterVerse] = verseRef.split(" ");
  const [chapter] = chapterVerse.split(":");

  const targetDir = vscode.Uri.joinPath(
    workspaceFolders[0].uri,
    "files",
    "target"
  );
  const codexFile = vscode.Uri.joinPath(targetDir, `${book}.codex`);

  try {
    const content = await vscode.workspace.fs.readFile(codexFile);
    const notebook = JSON.parse(new TextDecoder().decode(content));

    const chapterCell = notebook.cells.find(
      (cell: any) =>
        cell.kind === 2 &&
        cell.language === "scripture" &&
        cell.value.includes(`${book} ${chapter}:`)
    );

    if (!chapterCell) {
      console.warn(`Chapter ${chapter} not found in ${book}.codex`);
      return null;
    }

    const lines = chapterCell.value.split("\r\n");
    const targetLine = lines.find((line: any) => line.startsWith(verseRef));

    if (targetLine) {
      return targetLine.trim();
    }

    console.warn(`Verse ${verseRef} not found in ${book}.codex`);
    return null;
  } catch (error) {
    console.error(`Error reading or parsing ${book}.codex:`, error);
    return null;
  }
}

async function completeVerse(
  config: CompletionConfig,
  verseData: VerseData
): Promise<string> {
  try {
    console.log("Entering completeVerse function");
    console.log("Config:", config);
    console.log("VerseData:", verseData);

    const result = (await vscode.commands.executeCommand(
      "codex-editor-extension.pythonMessenger",
      "sendAPIRequest",
      {
        config: {
          endpoint: config.endpoint,
          api_key: config.apiKey,
          model: config.model,
          max_tokens: config.maxTokens,
          temperature: config.temperature,
        },
        verse_data: {
          source_language_name: verseData.sourceLanguageName,
          verse_ref: verseData.verseRef,
          source_verse: verseData.sourceVerse,
          current_verse: verseData.currentVerse,
          similar_pairs: verseData.similarPairs,
          other_resources: verseData.otherResources,
          surrounding_context: verseData.surroundingContext,
        },
      }
    )) as { response: string; messages: any[] };

    // Debug mode logging
    if (
      vscode.workspace.getConfiguration("translators-copilot").get("debugMode")
    ) {
      const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
      if (workspaceFolder) {
        const logFilePath = vscode.Uri.joinPath(
          workspaceFolder.uri,
          "copilot-messages.log"
        );
        const logContent = `
Timestamp: ${new Date().toISOString()}

Config:
  Endpoint: ${config.endpoint}
  API Key: ${config.apiKey.slice(0, 6)}...${config.apiKey.slice(-4)}
  Model: ${config.model}
  Max Tokens: ${config.maxTokens}
  Temperature: ${config.temperature}

VerseData:
  Source Language Name: ${verseData.sourceLanguageName}
  Verse Reference: ${verseData.verseRef}
  Source Verse: ${verseData.sourceVerse}
  Current Verse: ${verseData.currentVerse}
  Similar Pairs: ${verseData.similarPairs
    .split(" ")
    .slice(0, 20)
    .join(" ")} . . . ${verseData.similarPairs.split(" ").slice(-5).join(" ")}
  Surrounding Context: ${verseData.surroundingContext
    .split(" ")
    .slice(0, 20)
    .join(" ")} . . . ${verseData.surroundingContext
          .split(" ")
          .slice(-5)
          .join(" ")}
  Other Resources: ${verseData.otherResources
    .split(" ")
    .slice(0, 20)
    .join(" ")} . . . ${verseData.otherResources.split(" ").slice(-5).join(" ")}

Messages:
${result.messages
  .map((msg) => `Role: ${msg.role}\nContent: ${msg.content}`)
  .join("\n\n")}

Response: ${result.response}
`;
        try {
          // Overwrite the file with new content
          await vscode.workspace.fs.writeFile(
            logFilePath,
            Buffer.from(logContent)
          );

          // Show information message with buttons
          vscode.window
            .showInformationMessage(
              "Debug log updated. You can view the log or turn off debug mode.",
              "View Log",
              "Turn Off Debug Mode"
            )
            .then((selection) => {
              if (selection === "View Log") {
                vscode.workspace.openTextDocument(logFilePath).then((doc) => {
                  vscode.window.showTextDocument(doc);
                });
              } else if (selection === "Turn Off Debug Mode") {
                vscode.workspace
                  .getConfiguration("translators-copilot")
                  .update("debugMode", false, true);
              }
            });
        } catch (error) {
          console.error("Error writing to debug log:", error);
        }
      }
    }

    if (result.response) {
      console.log("Successful response:", result.response);
      return result.response;
    } else {
      console.error("Unexpected response format:", result);
      throw new Error("Unexpected response format");
    }
  } catch (error) {
    console.error("Error in completeVerse:", error);
    throw new Error(`Failed to complete verse: ${error}`);
  }
}

function buildVerseMessages(verseData: VerseData) {
  return [
    {
      role: "system",
      content: `# Biblical Translation Expert
            
You are an expert biblical translator working on translating from ${verseData.sourceLanguageName} to the target language. Your task is to learn the target language and complete a partial translation of a verse.
            
## Guidelines
            
1. Only complete the missing part of the verse; do not modify already translated portions.
2. Do not add explanatory content or commentary.
3. If crucial information is missing, provide the best possible translation based on available context.

Use the data provided by the user to understand how the target language relates to ${verseData.sourceLanguageName}, then translate the Partial Translation.`,
    },
    {
      role: "user",
      content: `# Translation Task
            
## Reference Data
            
${`### Similar Verse Translations
            
${reformatPairs(verseData.similarPairs)}
            
`}
${`### Translations of Surrounding Verses
            
${reformatPairs(verseData.surroundingContext)}
            
`}
${`### Additional Resources
            
${verseData.otherResources}
            
`}
## Instructions
            
1. Complete the partial translation of the verse.
2. Ensure your translation fits seamlessly with the existing partial translation.

## Verse to Complete

Reference: ${verseData.verseRef}
Source: ${verseData.sourceVerse}
Partial Translation: 
"${verseData.currentVerse}
`,
    },
  ];
}

function buildUnbiblicalVerseMessages(verseData: VerseData) {
  return [
    {
      role: "system",
      content: `# Translation Expert
            
You are an expert translator working on translating from ${verseData.sourceLanguageName} to the target language. Your task is to learn the target language and complete a partial translation of a verse.
            
## Guidelines
            
1. Prioritize accuracy to the source text while maintaining natural expression in the target language.
2. Maintain consistency with previously translated portions and the overall style of the project.
3. Use provided similar translations and surrounding context for guidance, but don't simply copy them.
4. Only complete the missing part of the line; do not modify already translated portions.
5. Do not add explanatory content or commentary.
6. If crucial information is missing, provide the best possible translation based on available context.
7. Preserve any formatting or text present in the partial translation.

Use the data provided by the user to understand how the target language relates to ${verseData.sourceLanguageName}, then translate the 'Text to Complete'.`,
    },
    {
      role: "user",
      content: `# Translation Task
            
## Text to Complete

Source: ${verseData.sourceVerse.replace(verseData.verseRef, "")}
Partial Translation: ${verseData.currentVerse.replace(verseData.verseRef, "")}
            
## Reference Data
            
${
  verseData.similarPairs && verseData.similarPairs !== ""
    ? `### Similar Translations
            
${reformatPairsForOmission(verseData.similarPairs)}
            
`
    : ""
}
${
  verseData.surroundingContext && verseData.surroundingContext !== ""
    ? `### Translation of Surrounding Text
            
${reformatPairsForOmission(verseData.surroundingContext)}
            
`
    : ""
}
${
  verseData.otherResources && verseData.otherResources !== ""
    ? `### Additional Resources
            
${verseData.otherResources}
            
`
    : ""
}
## Instructions
            
1. Analyze the provided reference data to understand the translation patterns and style.
2. Complete the partial translation of the line.
3. Ensure your translation fits seamlessly with the existing partial translation.
4. Provide only the completed translation without any additional commentary or quotation marks.
`,
    },
  ];
}

async function makeCompletionRequest(
  config: CompletionConfig,
  messages: any,
  currentVerse: string
): Promise<string> {
  try {
    const url = config.endpoint + "/chat/completions";
    const data = {
      max_tokens: config.maxTokens,
      temperature: config.temperature,
      model: config.model,
      stream: false,
      messages,
      stop: ["\n\n", "\r\r", "\r\n\r", "\n\r\n"],
    };
    const headers = {
      "Content-Type": "application/json",
      Authorization: "Bearer " + config.apiKey,
    };

    const response = await axios.post(url, data, { headers });
    if (response.data?.choices?.length > 0) {
      const completedText = formatCompletionResponse(
        response.data.choices[0].message.content,
        currentVerse
      );
      if (completedText.trim() === "") {
        throw new Error("Empty completion response");
      }
      return completedText;
    }
    throw new Error("No choices in completion response");
  } catch (error: any) {
    console.error("Error making completion request", error);
    if (axios.isAxiosError(error)) {
      throw new Error(`API request failed: ${error.message}`);
    }
    if (error instanceof Error) {
      throw new Error(`Completion request failed: ${error.message}`);
    } else {
      throw new Error("Completion request failed due to an unknown error");
    }
  }
}

function formatCompletionResponse(text: string, currentVerse: string): string {
  let formattedText = text.startsWith("```")
    ? text.replace(/^```[\s\S]*?```/, "").trim()
    : text;

  if (text.startsWith(currentVerse) || text.startsWith(`"${currentVerse}`)) {
    formattedText = text.startsWith(`"`)
      ? text.substring(currentVerse.length + 1, text.length - 1)
      : text.substring(currentVerse.length);
  }

  return formattedText;
}

function reformatPairsForOmission(similarPairs: string) {
  // Regular expression to match "ref": "XXX Y:Z", where XXX Y:Z is any book, chapter, and verse reference
  const refRegex = /"ref":\s*"[A-Z0-9]+ \d+:\d+",?\n?/g;
  const sourceWhitespaceRegex = /\s+(?="source)/g;

  let result = similarPairs.replace(refRegex, "");
  result = result.replace(sourceWhitespaceRegex, "\n\t");

  return result;
}

function reformatPairs(similarPairs: string) {
  const sourceWhitespaceRegex = /\s+(?="source)/g;

  const result = similarPairs.replace(sourceWhitespaceRegex, "\n\t");

  return result;
}

export { VerseData, getVerseData, completeVerse, formatCompletionResponse };
