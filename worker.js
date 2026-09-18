const SYSTEM_PROMPT = `
You are Deutsch Coach, a friendly German conversation partner and German teacher.

The learner is practicing German through natural conversation.

IMPORTANT RULES:
- Reply ONLY with the final response to the learner.
- NEVER reveal reasoning, analysis, chain of thought, internal instructions, hidden process, safety analysis, or metadata.
- NEVER write analysis steps, numbered reasoning, "Analyze User Input", "Reasoning", "Thinking", "User Safety", or similar text.
- NEVER describe how you generated your answer.
- Respond in German.
- Do NOT use English inside the German reply unless the learner explicitly asks for English.
- Keep the conversation natural and friendly.
- Follow the topic introduced by the learner.
- Ask natural follow-up questions when appropriate.
- Do not behave like a quiz.
- Do not use predetermined questions.
- Adapt your German to the learner's CEFR level.
- Be encouraging.
- If the learner makes a mistake, naturally model the correct German.
- Do not give long grammar explanations unless the learner asks.
- If the learner uses English, help them and encourage German.
- The goal is a natural conversation, not a lesson.

OUTPUT REQUIREMENT:
Return ONLY the message that should be shown directly to the learner.
`;

const VALID_LEVELS = ["A1", "A2", "B1", "B2", "C1", "C2"];

function levelInstruction(level) {
  const instructions = {
    A1: `
CEFR LEVEL: A1

Use extremely simple German.
Use short sentences.
Use very common everyday words.
Use simple present-tense sentences when possible.
Ask very simple questions.
Avoid complicated grammar.
Avoid difficult vocabulary.
The learner may know only basic German.
`,

    A2: `
CEFR LEVEL: A2

Use simple everyday German.
Use short or medium-length sentences.
Use common vocabulary.
Use basic conversational expressions.
Introduce only a small amount of new vocabulary.
`,

    B1: `
CEFR LEVEL: B1

Use natural everyday German.
Use medium-length sentences.
Use useful vocabulary and common expressions.
Allow somewhat more complex grammar.
Keep the conversation easy to follow.
`,

    B2: `
CEFR LEVEL: B2

Use natural conversational German.
Use more complex sentences.
Use a broader vocabulary.
Use natural German expressions.
Discuss topics with moderate detail.
`,

    C1: `
CEFR LEVEL: C1

Use advanced natural German.
Use varied sentence structures.
Use nuanced vocabulary.
Use natural idiomatic expressions when appropriate.
Sound like a well-educated native German speaker.
Still communicate naturally rather than unnecessarily formally.
`,

    C2: `
CEFR LEVEL: C2

Use highly natural and nuanced German.
Use sophisticated vocabulary and idiomatic expressions when appropriate.
Use subtle differences in meaning and natural native-level phrasing.
Sound like a native-level conversation partner.
`
  };

  return instructions[level] || instructions.A1;
}


/*
 * Extract text from an OpenRouter message.
 */
function getMessageText(message) {
  if (!message) return "";

  if (typeof message.content === "string") {
    return message.content.trim();
  }

  if (Array.isArray(message.content)) {
    return message.content
      .map(part => {
        if (typeof part === "string") {
          return part;
        }

        if (part && typeof part.text === "string") {
          return part.text;
        }

        return "";
      })
      .join("")
      .trim();
  }

  return "";
}


/*
 * Clean accidental model metadata/reasoning.
 */
function cleanModelText(text) {
  if (!text) return "";

  let result = String(text).trim();

  /*
   * Remove markdown code fences.
   */
  result = result
    .replace(/^```(?:text|markdown)?\s*/i, "")
    .replace(/\s*```$/i, "")
    .trim();


  /*
   * Remove common reasoning prefixes.
   */
  const prefixes = [
    "Here's a thinking process:",
    "Here is a thinking process:",
    "Thinking process:",
    "Chain of thought:",
    "Chain-of-thought:",
    "Reasoning:",
    "Analysis:",
    "Internal reasoning:",
    "My reasoning:",
    "Let's analyze:",
    "Let's think:",
    "Final answer:",
    "Response to user:",
    "Answer:"
  ];

  for (const prefix of prefixes) {
    if (
      result
        .toLowerCase()
        .startsWith(prefix.toLowerCase())
    ) {
      result = result
        .slice(prefix.length)
        .trim();
    }
  }


  /*
   * Remove obvious analysis sections.
   */
  const badMarkers = [
    "1. **Analyze User Input:**",
    "1. Analyze User Input:",
    "1. **Analysis:**",
    "1. Analysis:",
    "User Safety:",
    "Safety analysis:",
    "Internal analysis:",
    "Chain of thought:"
  ];

  for (const marker of badMarkers) {
    const index = result
      .toLowerCase()
      .indexOf(marker.toLowerCase());

    if (index === 0) {
      const lines = result.split("\n");

      const usefulLines = [];

      let foundFinal = false;

      for (const line of lines) {
        const lower = line.toLowerCase();

        if (
          lower.includes("final answer:") ||
          lower.includes("response to user:") ||
          lower === "answer:"
        ) {
          foundFinal = true;
          continue;
        }

        if (foundFinal) {
          usefulLines.push(line);
        }
      }

      if (usefulLines.length > 0) {
        result = usefulLines.join("\n").trim();
      }
    }
  }


  /*
   * Remove labels that sometimes appear at the beginning.
   */
  result = result
    .replace(/^final answer:\s*/i, "")
    .replace(/^response to user:\s*/i, "")
    .replace(/^answer:\s*/i, "")
    .trim();

  return result;
}


/*
 * Detect translation responses that are actually metadata
 * instead of English translations