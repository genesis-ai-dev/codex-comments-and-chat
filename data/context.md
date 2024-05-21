# JSON Data Structure

This document provides an overview of the JSON data structure used for storing notes and questions related to verses from various books.

## JSON Structure

The JSON data consists of two main parts:
1. `verses`: A dictionary containing notes and questions for each verse.
2. `references`: A dictionary containing reference content.

### `verses`

The `verses` dictionary is organized by book names, with each book containing verses. Each verse has two lists: `notes` and `questions`.

- **Book Name**: The key for each book.
  - **Verse**: The key for each verse within a book.
    - **notes**: A list of note objects.
      - **note**: The note content.
      - **ref_id**: The ID of the reference associated with the note.
    - **questions**: A list of question objects.
      - **question**: The question content.
      - **response**: The response to the question.

Example:
```json
"JUD": {
    "1:1": {
        "notes": [
            {
                "note": "This is a sample note.",
                "ref_id": 1
            }
        ],
        "questions": [
            {
                "question": "What is the meaning of this verse?",
                "response": "This verse means..."
            }
        ]
    }
}
```
### `references`

The `references` dictionary stores the actual content of the references, indexed by a unique ID.

- **ID**: The unique identifier for each reference.
  - **content**: The content of the reference.

Example:
```json
"references": {
    "1": {
        "id": 1,
        "content": "This is the content of the reference."
    }
}
```