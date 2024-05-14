"use strict";

import * as vscode from "vscode";
import { registerChatProvider } from "../../providers/chat/customChatWebviewProvider";
import { registerCommentsWebviewProvider } from "../../providers/commentsWebview/customCommentsWebviewProvider";
import { registerCommentsProvider } from "../../providers/commentsProvider";

export async function initializeWebviews(context: vscode.ExtensionContext) {
    registerChatProvider(context);
    registerCommentsWebviewProvider(context);
    registerCommentsProvider(context);
}