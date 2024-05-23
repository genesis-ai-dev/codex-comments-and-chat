import { useState, useEffect } from 'react';
import {
  VSCodeButton,
  VSCodeDropdown,
  VSCodeOption,
} from '@vscode/webview-ui-toolkit/react';
import { ChatInputTextForm } from '../components/ChatInputTextForm';
import DeleteButtonWithConfirmation from '../components/DeleteButtonWithConfirmation';
import { WebviewHeader } from '../components/WebviewHeader';
import { MessageItem } from '../components/MessageItem';
import '../App.css';
import {
  ChatMessageThread,
  ChatMessageWithContext,
  ChatPostMessages,
} from '../../../../types';
import { v4 as uuidv4 } from 'uuid';
import { ChatRoleLabel } from '../common';

// const FLASK_ENDPOINT = 'http://localhost:5554';

const vscode = acquireVsCodeApi();

function messageWithContext({
  messageHistory,
  userPrompt,
  selectedText,
  contextItems,
}: {
  messageHistory: string;
  userPrompt: string;
  selectedText?: string;
  contextItems?: string[];
}): ChatMessageWithContext {
  let content = `### Instructions:\nPlease use the context below to respond to the user's message. If you know the answer, be concise. If the answer is in the context, please quote the wording of the source. If the answer is not in the context, avoid making up anything, but you can use general Bible knowledge from a devout Christian perspective.`;

  if (selectedText || (contextItems && contextItems?.length > 0)) {
    content += `\n\n### Context:`;
  }

  if (selectedText) {
    content += `\nThe user has selected the following text in their current document:\n${selectedText}`;
  }

  if (contextItems && contextItems?.length > 0) {
    content += `\n\nAnd here are some other relevant context items from their project and reference resources:\n${contextItems.join(
      '\n',
    )}`;
  }

  if (messageHistory) {
    content += `\n\n### Chat History:\n${messageHistory}`;
  }

  content += `\n\n### User's message: ${userPrompt}`;

  return {
    // FIXME: since we're passing in the conversation history, should we be using a completions endpoint rather than a chat one?
    role: 'user',
    content: content,
    createdAt: new Date().toISOString(),
  };
}

function App() {
  // const systemMessage: ChatMessageWithContext = {
  //   role: "system",
  //   content:
  //     "This is a chat between a helpful Bible translation assistant and a Bible translator. The assistant will provide helpful answers and suggestions to the translator, often relying on the translator's current project and reference resources. The translator will ask questions and provide context to the assistant. The translator's aim is to be consistent and faithful in a fairly literalistic rendering of the source text.",
  //   createdAt: new Date().toISOString(),
  //   // TODO: allow user to modify the system message
  // };
  // const dummyUserMessage: ChatMessageWithContext = {
  //   role: "user",
  //   content: "How do we normally translate cases like this?",
  //   createdAt: new Date().toISOString(),
  // };
  // const dummyAssistantMessage: ChatMessageWithContext = {
  //   role: "assistant",
  //   content: "Let me check your current translation drafts...",
  //   createdAt: new Date().toISOString(),
  // };
  const [pendingMessage, setPendingMessage] =
    useState<ChatMessageWithContext>();
  const [selectedTextContext, setSelectedTextContext] = useState<string>('');
  const [currentlyActiveVref, setCurrentlyActiveVref] = useState<string>('');
  // const [currentVerseNotes, setCurrentVerseNotes] = useState<string>('');
  const [contextItems, setContextItems] = useState<string[]>([]); // TODO: fetch from RAG server
  const [messageLog, setMessageLog] = useState<ChatMessageWithContext[]>([
    // systemMessage,
    // dummyUserMessage,
    // dummyAssistantMessage,
  ]);

  const [currentMessageThreadId, setCurrentMessageThreadId] = useState<string>(
    uuidv4(),
  );

  const [availableMessageThreads, setAvailableMessageThreads] =
    useState<ChatMessageThread[]>();

  const SHOW_SENDER_ROLE_LABELS = false;

  async function fetchContextItems(query: string): Promise<string[]> {
    // try {
    //   // FIXME: finish implementing this function.
    //   // The Flask server is either crashing or not starting sometimes
    //   // and we need a more graceful way to handle using context items.

    //   // Also, need to truncate retrieved items to reasonable length based on count
    //   // and length of the items.
    //   const response = await fetch(
    //     `${FLASK_ENDPOINT}/search?db_name=.codex&query=${encodeURIComponent(
    //       query,
    //     )}`,
    //   );
    //   if (!response.ok) {
    //     throw new Error(`Server error: ${response.status}`);
    //   }
    //   const data = await response.json();
    //   if (!Array.isArray(data) || data.length === 0) {
    //     return [];
    //   }
    //   return data.map(
    //     (item) => `${item.book} ${item.chapter}:${item.verse} - ${item.text}`,
    //   );
    // } catch (error) {
    //   console.error('Failed to fetch context items due to an error:', error);
    //   vscode.postMessage({
    //     command: 'notifyUserError',
    //     message: `Failed to fetch context items due to an error: ${
    //       (error as Error).message
    //     }`,
    //   } as ChatPostMessages);
    //   return [];
    // }
    console.log('fetchContextItems', query); // FIXME: remove this - just for using the argument
    // return currentVerseNotes ? [currentVerseNotes] : [];
    return [];
  }

  function formatMessageLogToString(
    messages: ChatMessageWithContext[],
  ): string {
    return messages
      .map((message) => {
        return `${ChatRoleLabel[message.role]}: ${message.content}`;
      })
      .join('\n');
  }

  function getResponseToUserNewMessage(newMessageTextContent: string) {
    const contextItemsFromState = contextItems;
    const pendingMessage: ChatMessageWithContext = {
      role: 'user',
      content: newMessageTextContent,
      createdAt: new Date().toISOString(),
      context: {
        selectedText: selectedTextContext,
        currentVref: currentlyActiveVref,
        relevantContextItemsFromEmbeddings: contextItemsFromState,
        // verseNotes: currentVerseNotes,
      },
    };
    const updatedMessageLog = [...messageLog, pendingMessage];

    const formattedPrompt: ChatMessageWithContext[] = [
      messageWithContext({
        messageHistory: formatMessageLogToString(messageLog),
        userPrompt: newMessageTextContent,
        selectedText: selectedTextContext,
        contextItems: contextItemsFromState,
      }),
    ];
    setMessageLog(updatedMessageLog);
    vscode.postMessage({
      command: 'fetch',
      messages: JSON.stringify(formattedPrompt),
    } as ChatPostMessages);
  }

  async function handleSubmit(submittedMessageValue: string) {
    try {
      const contextItemsFromServer = await fetchContextItems(
        submittedMessageValue,
      );
      setContextItems(contextItemsFromServer);
      getResponseToUserNewMessage(submittedMessageValue);
      setSelectedTextContext('');
      setCurrentlyActiveVref('');
    } catch (error) {
      console.error('Failed to fetch context items due to an error:', error);
      vscode.postMessage({
        command: 'error',
        message: `Failed to fetch context items. ${JSON.stringify(error)}`,
        messages: [],
      } as unknown as ChatPostMessages);
    }
  }

  function handleSettingsButtonClick() {
    vscode.postMessage({
      command: 'openSettings',
    } as ChatPostMessages);
  }

  useEffect(() => {
    // FIXME: add a progress ring while fetching threads
    vscode.postMessage({
      command: 'fetchThread',
    } as ChatPostMessages);
  }, []);

  useEffect(() => {
    vscode.postMessage({
      command: 'updateMessageThread',
      messages: messageLog,
      threadId: currentMessageThreadId,
    } as ChatPostMessages);
  }, [messageLog.length]);

  useEffect(() => {
    if (
      currentMessageThreadId &&
      availableMessageThreads &&
      availableMessageThreads?.length > 0
    ) {
      setMessageLog(
        availableMessageThreads.find(
          (messageThread) => messageThread.id === currentMessageThreadId,
        )?.messages || [],
      );
    }
  }, [currentMessageThreadId]);

  // FIXME: use loading state to show/hide a progress ring while
  window.addEventListener(
    'message',
    (event: MessageEvent<ChatPostMessages>) => {
      const message = event.data; // The JSON data our extension sent
      switch (message?.command) {
        case 'select':
          // FIXME: this is being invoked every time a new token is rendered
          if (message.textDataWithContext) {
            console.log('Received a select command in ChatView', message);
            const {
              completeLineContent,
              selectedText,
              vrefAtStartOfLine,
              verseNotes,
            } = message.textDataWithContext;

            const strippedCompleteLineContent = vrefAtStartOfLine
              ? completeLineContent?.replace(vrefAtStartOfLine, '').trim()
              : completeLineContent?.trim();

            const selectedTextContextString =
              selectedText !== ''
                ? `${selectedText} (${vrefAtStartOfLine})`
                : `${strippedCompleteLineContent} (${vrefAtStartOfLine})`;
            // if (verseNotes !== null) {
            // setCurrentVerseNotes(verseNotes ?? '');
            setContextItems(
              verseNotes?.split('\n\n').filter(
                // Let's filter out empty notes and notes that are URIs to .json files
                (note) => note !== '' && !/^[^\n]*\.json$/.test(note), // FIXME: we should simply avoid passing in the URI to the .json file in the first place
              ) ?? [],
            );
            // }
            setSelectedTextContext(selectedTextContextString);
            setCurrentlyActiveVref(vrefAtStartOfLine ?? '');
          }
          break;
        case 'response': {
          if (!message.finished) {
            const messageContent =
              (pendingMessage?.content || '') + (message.text || '');
            setPendingMessage({
              role: 'assistant',
              content: messageContent,
              createdAt: new Date().toISOString(),
            });
          } else {
            if (pendingMessage) {
              setMessageLog([...messageLog, pendingMessage]);
            }
            setPendingMessage(undefined);
          }
          break;
        }
        case 'threadsFromWorkspace':
          if (message.content) {
            const messageThreadArray = message.content;
            const lastMessageThreadId =
              messageThreadArray[messageThreadArray.length - 1]?.id;
            const messageThreadsExist = !!lastMessageThreadId;
            if (messageThreadsExist) {
              setAvailableMessageThreads(
                messageThreadArray.filter((thread) => !thread.deleted),
              );
            }

            let messageThreadIdToUse: string;

            if (currentMessageThreadId) {
              messageThreadIdToUse = currentMessageThreadId;
            } else if (messageThreadsExist) {
              messageThreadIdToUse = lastMessageThreadId;
            } else {
              messageThreadIdToUse = uuidv4();
            }

            setCurrentMessageThreadId(messageThreadIdToUse);

            const messageThreadForContext = messageThreadArray.find(
              (thread) => thread.id === messageThreadIdToUse,
            );

            if (
              messageThreadForContext?.messages?.length &&
              messageThreadForContext?.messages?.length > 0
            ) {
              setMessageLog(messageThreadForContext.messages);
            }
          }
          break;
        default:
          break;
      }
    },
  );

  function markChatThreadAsDeleted(messageThreadIdToMarkAsDeleted: string) {
    vscode.postMessage({
      command: 'deleteThread',
      threadId: messageThreadIdToMarkAsDeleted,
    } as ChatPostMessages);
  }

  function clearChat() {
    setCurrentMessageThreadId(uuidv4());
    setMessageLog([]);
  }

  interface ClearChatButtonProps {
    callback: () => void;
  }

  const DeleteChatButton: React.FC<ClearChatButtonProps> = ({ callback }) => (
    <DeleteButtonWithConfirmation handleDeleteButtonClick={callback} />
  );
  interface NavigateChatHistoryProps {
    callback: (newMessageThreadId: string) => void;
  }
  const NavigateChatHistoryButton: React.FC<NavigateChatHistoryProps> = () => {
    return (
      <>
        <VSCodeButton
          aria-label="Start New Thread"
          appearance="icon"
          title="⨁"
          onClick={() => {
            clearChat();
          }}
          style={{
            backgroundColor: 'var(--vscode-button-background)',
            color: 'var(--vscode-button-foreground)',
          }}
        >
          <i className="codicon codicon-add"></i>
        </VSCodeButton>
        {availableMessageThreads && availableMessageThreads?.length > 0 && (
          <VSCodeDropdown
            value={currentMessageThreadId}
            // disabled={!selectedBook}
            onInput={(e: any) => {
              console.log({ e });
              console.log((e.target as HTMLSelectElement).value);
              setCurrentMessageThreadId((e.target as HTMLSelectElement).value);
              vscode.postMessage({
                command: 'fetchThread',
              } as ChatPostMessages);
            }}
          >
            {availableMessageThreads?.map((messageThread) => {
              const firstUserMessage = messageThread.messages.find(
                (message) => message.role === 'user',
              )?.content;

              return (
                <VSCodeOption
                  key={messageThread.id}
                  selected={messageThread.id === currentMessageThreadId}
                  value={messageThread.id}
                >
                  {messageThread.threadTitle ||
                    firstUserMessage ||
                    new Date(messageThread.createdAt).toLocaleTimeString()}
                </VSCodeOption>
              );
            })}
          </VSCodeDropdown>
        )}
        <VSCodeButton
          aria-label="Settings"
          appearance="icon"
          title="⚙️"
          onClick={handleSettingsButtonClick}
          style={{
            backgroundColor: 'var(--vscode-button-background)',
            color: 'var(--vscode-button-foreground)',
          }}
        >
          <i className="codicon codicon-settings-gear"></i>
        </VSCodeButton>
      </>
    );
  };
  //   const currentMessageThreadTitle = availableMessageThreads?.find(
  //     (messageThread) => messageThread.id === currentMessageThreadId
  //   )?.threadTitle;
  return (
    <main
      style={{
        display: 'flex',
        flexDirection: 'column',
        height: '100vh',
        width: '100%',
        backgroundImage:
          'linear-gradient(45deg, var(--vscode-sideBar-background), transparent)',
        backgroundSize: 'cover',
        overflowX: 'hidden',
      }}
    >
      <WebviewHeader
      // title={currentMessageThreadTitle || "Translator's Copilot Chat"}
      >
        <div
          style={{
            display: 'flex',
            gap: 3,
            width: '95%',
          }}
        >
          <NavigateChatHistoryButton
            callback={(newMessageThreadId) => {
              setCurrentMessageThreadId(newMessageThreadId);
            }}
          />
          <DeleteChatButton
            callback={() => {
              markChatThreadAsDeleted(currentMessageThreadId);
              const threadIdThatIsNotBeingDeleted =
                availableMessageThreads?.find(
                  (thread) => thread.id !== currentMessageThreadId,
                )?.id;
              if (threadIdThatIsNotBeingDeleted) {
                setCurrentMessageThreadId(threadIdThatIsNotBeingDeleted);
              } else {
                clearChat();
              }
            }}
          />
        </div>
      </WebviewHeader>
      <div
        className="chat-container"
        style={{
          flex: 1,
          overflowY: 'auto',
          overflowX: 'hidden',
          gap: '0.5em',
          flexDirection: 'column',
          padding: '1em',
          display: 'flex',
          width: '100%',
          boxSizing: 'border-box',
        }}
      >
        {messageLog.map((messageLogItem, index) => (
          <MessageItem
            key={index}
            messageItem={messageLogItem}
            showSenderRoleLabels={SHOW_SENDER_ROLE_LABELS}
          />
        ))}
        {pendingMessage?.role === 'assistant' &&
        pendingMessage?.content.length > 0 ? (
          <MessageItem messageItem={pendingMessage} />
        ) : null}
      </div>
      <ChatInputTextForm
        contextItems={contextItems}
        selectedText={selectedTextContext}
        handleSubmit={handleSubmit}
        vscode={vscode}
      />
    </main>
  );
}

export default App;
