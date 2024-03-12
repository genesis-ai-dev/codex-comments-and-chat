import * as vscode from "vscode";
import { VerseRefGlobalState, SelectedTextDataWithContext } from "../types";
type GlobalStateUpdate =
  | { key: "verseRef"; value: VerseRefGlobalState }
  | { key: "uri"; value: string }
  | { key: "currentLineSelection"; value: SelectedTextDataWithContext };

type GlobalStateKey = GlobalStateUpdate["key"];
type GlobalStateValue<K extends GlobalStateKey> = Extract<
  GlobalStateUpdate,
  { key: K }
>["value"];

const extensionId = "project-accelerate.shared-state-store";

export async function initializeGlobalState() {
  let storeListener: <K extends GlobalStateKey>(
    keyForListener: K,
    callBack: (value: GlobalStateValue<K>) => void
  ) => void;

  let updateGlobalState: (update: GlobalStateUpdate) => void;
  const extension = vscode.extensions.getExtension(extensionId);
  console.log({ extension });
  if (!extension) {
    console.log(`Extension ${extensionId} not found.`);
  } else {
    const api = await extension.activate();
    if (!api) {
      console.log(`Extension ${extensionId} does not expose an API.`);
    } else {
      // console.log("this worked", { api, storeListener, updateGlobalState });
      // if (!storeListener) {
      storeListener = api.storeListener;
      // }
      // if (!updateGlobalState) {
      updateGlobalState = api.updateStoreState;
      // }
      return { storeListener, updateGlobalState };
    }
  }
}

// initializeGlobalState().catch(console.error);
// console.log("after initializeGlobalState");
