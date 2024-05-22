import * as vscode from 'vscode';

interface Note {
    note: string;
    ref_id: number;
}

interface Question {
    question: string;
    response: string;
}

interface VerseData {
    notes: Note[];
    questions: Question[];
}

interface References {
    [id: number]: {
        id: number;
        content: string;
    };
}

interface Verses {
    [book: string]: {
        [verse: string]: VerseData;
    };
}

interface ChatContext {
    verses: Verses;
    references: References;
}
class VerseDataReader {
    private data: ChatContext = { verses: {}, references: {} };

    constructor(private extensionContext: vscode.ExtensionContext) {}

    public async loadJSON(filePath: string): Promise<void> {
        const fileUri = vscode.Uri.file(this.extensionContext.asAbsolutePath(filePath));
        const fileContents = await vscode.workspace.fs.readFile(fileUri);
        this.data = JSON.parse(new TextDecoder().decode(fileContents));
    }

    public getVerseData(book: string, verse: string): string {
        if (!this.data.verses[book] || !this.data.verses[book][verse]) {
            return `No data found for ${book} ${verse}`;
        }

        const verseData = this.data.verses[book][verse];
        let result = `Notes for ${book} ${verse}:\n`;

        for (const note of verseData.notes) {
            const refContent = this.data.references[note.ref_id]?.content || 'Reference content not found';
            result += `- Note: ${note.note}\n  Reference: ${refContent}\n`;
        }

        result += `\nQuestions for ${book} ${verse}:\n`;

        for (const question of verseData.questions) {
            result += `- Question: ${question.question}\n  Response: ${question.response}\n`;
        }

        return result;
    }
}

// Export the VerseDataReader class for use in other scripts
export { VerseDataReader };