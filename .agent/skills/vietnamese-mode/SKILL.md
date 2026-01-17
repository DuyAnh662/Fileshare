name: vietnamese-mode
description: >
  Enforce Vietnamese language usage for all interactions. 
  
  RULES:
  1. ALL conversations, responses, and reasoning must be in Vietnamese.
  2. When generating, editing, or reading **Markdown (.md) files**, the content MUST be in Vietnamese. 
  3. Do NOT skip translating documentation within Markdown files. 
  4. Keep technical terms (e.g., "API", "Request", "Deploy") in English if commonly used, but explain them in Vietnamese.
  5. Use this skill immediately when the user greets in Vietnamese or asks for documentation.

command: python check_lang.py