# JSON File Structure for Chat

## Overview

This JSON file is generated from Unfolding Word resources and is designed for use within the Chat to give it context.

## JSON File Structure

The structure of the JSON file is as follows:
```json
{
    "BOOK_NAME": {
        "VERSE": {
            "notes": [
                {
                    "note": "NOTE_TEXT",
                    "ref": "REFERENCE_TEXT"
                },
                ...
            ],
            "questions": [
                {
                    "question": "QUESTION_TEXT",
                    "response": "RESPONSE_TEXT"
                },
                ...
            ]
        },
        ...
    },
    ...
}
```
### Sections

#### Verses

- **BOOK_NAME**: The name of the book (e.g., "JUD" for Jude).
- **VERSE**: The verse reference (e.g., "1:1").
  - **notes**: A list of notes for the specified verse.
    - **note**: The note text.
    - **ref**: The reference text associated with the note.
  - **questions**: A list of questions for the specified verse.
    - **question**: The question text.
    - **response**: The response text associated with the question.

## Example

Here is an example of the JSON file content:
```json
{
    "JUD": {
        "1:1": {
            "notes": [
                {
                    "note": "Note text for Jude 1:1",
                    "ref": "Reference text for Jude 1:1"
                }
            ],
            "questions": [
                {
                    "question": "What is the question for Jude 1:1?",
                    "response": "The response to the question for Jude 1:1."
                }
            ]
        }
    }
}
```