Copy content to clipboard using pbcopy.

If argument is provided: Extract and copy only the section matching "$ARGUMENTS" from your last response.
If no argument: Copy your entire last response to clipboard.

Instructions:
1. Look at your previous response in this conversation
2. If "$ARGUMENTS" is empty or not provided, copy the full response
3. If "$ARGUMENTS" contains text (e.g., "mr description", "code", "table"), find and extract only that relevant section
4. Use `pbcopy` to copy the content to clipboard
5. Confirm what was copied

Example usage:
- `/copy` - copies full last response
- `/copy mr description` - copies just the MR description section
- `/copy code` - copies just the code blocks
- `/copy table` - copies just the table
- `/copy second row` - copies the second line/paragraph
- `/copy the command` - copies just the command/instruction part
- `/copy explanation` - copies the explanation section

Important: Interpret arguments flexibly and pragmatically. The user will describe what they want in natural language - understand their intent even with typos, informal phrasing, or ambiguous descriptions. This includes:
- Structural parts: "second row", "first paragraph", "the header"
- Content types: "code", "table", "the command"
- Extracted data: "first names", "the urls", "just the numbers", "email addresses"
- Conceptual sections: "the explanation", "the summary", "the error part"

Match the description to the relevant part of your last response and copy it. Don't ask for clarification if the intent is reasonably clear.
