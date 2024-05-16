import React, { useState } from 'react';
import {
  VSCodeButton,
  VSCodeTextArea,
  VSCodeTextField,
} from '@vscode/webview-ui-toolkit/react';
import { ContextItemList } from './ContextItemList';
import { userPrompts } from '../userPrompts';
import { ChatLanguages } from '../../../../types';

type CommentTextFormProps = {
  handleSubmit: (comment: string) => void;
  contextItems: string[];
  selectedText: string;
};

export const ChatInputTextForm: React.FC<CommentTextFormProps> = ({
  handleSubmit,
  contextItems,
  selectedText,
}) => {
  const [showDefaultQuestions, setShowDefaultQuestions] = useState(true);
  const [chatLanguage, setChatLanguage] = useState<ChatLanguages>(
    ChatLanguages.English,
  );
  console.log({ setChatLanguage });
  return (
    <form
      className="chat-input"
      style={{
        position: 'sticky',
        bottom: 0,
        width: '100%',
        display: 'flex',
        flexDirection: 'column',
        gap: '0.25em',
        alignItems: 'center',
        paddingInline: '0.5em',
        background: 'var(--vscode-sideBar-background)',
      }}
      onSubmit={(e) => {
        e.preventDefault();
        const formData = new FormData(e.target as HTMLFormElement);
        const formValue = formData.get('chatInput') as string;
        console.log('Form submitted with value:', formValue);
        handleSubmit(formValue);
        (e.target as HTMLFormElement).reset();
      }}
    >
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: '0.5em',
          width: '100%',
        }}
      >
        <ContextItemList contextItems={contextItems} />
        {selectedText && (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'stretch',
              gap: '0.5em',
              width: '100%',
            }}
          >
            <i
              className="codicon codicon-whole-word"
              title="Selected Text Indicator"
            ></i>
            <VSCodeTextArea
              readOnly
              title="Selected Text"
              cols={1000}
              value={selectedText}
              placeholder="Select some text in the editor..."
            ></VSCodeTextArea>
          </div>
        )}
        {showDefaultQuestions && (
          <div>
            {userPrompts.questions.map((prompt) => (
              <button
                key={prompt.tag}
                onClick={() => handleSubmit(prompt.question[chatLanguage])}
              >
                {prompt.question[chatLanguage]}
              </button>
            ))}
          </div>
        )}
      </div>

      <div
        style={{
          display: 'flex',
          flexDirection: 'row',
          gap: '0.25em',
          width: '100%',
          paddingBottom: '0.5em',
        }}
      >
        <VSCodeButton
          appearance="icon"
          aria-label="Attach"
          onClick={() => setShowDefaultQuestions(!showDefaultQuestions)}
          style={{
            backgroundColor: showDefaultQuestions
              ? 'var(--vscode-button-background-active)'
              : 'var(--vscode-button-background)',
            color: showDefaultQuestions
              ? 'var(--vscode-button-foreground-active)'
              : 'var(--vscode-button-foreground)',
          }}
        >
          <i className="codicon codicon-add"></i>
        </VSCodeButton>
        <VSCodeTextField
          name="chatInput"
          placeholder="Type a message..."
          style={{
            flexGrow: 1,
            width: '100%',
            borderRadius: '5em',
          }}
        />
        <VSCodeButton appearance="icon" type="submit">
          <i className="codicon codicon-send"></i>
        </VSCodeButton>
        <VSCodeButton
          appearance="icon"
          aria-label="Record"
          onClick={() => console.log('Record clicked')}
        >
          <i className="codicon codicon-mic"></i>
        </VSCodeButton>
      </div>
    </form>
  );
};
