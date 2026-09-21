const VALID_LEVELS = [
  "A1",
  "A2",
  "B1",
  "B2",
  "C1",
  "C2"
];

// Keep your current model for now.
// The important improvement in this version is the tutor logic.
const OPENAI_MODEL = "gpt-5.4-mini";

const ALLOWED_ORIGIN =
  "https://gutenmorgantoyou.github.io";


const LEVEL_RULES = {
  A1: `
A1 — BEGINNER

Use very simple German.

- Prefer short sentences.
- Prefer common everyday words.
- Usually use one idea per sentence.
- Avoid complicated subordinate clauses.
- Avoid idioms unless you immediately make them understandable.
- Avoid unnecessary advanced vocabulary.
- Ask simple questions.
- Keep the conversation friendly and encouraging.
- Correct important mistakes clearly.
- Do not overwhelm the learner with grammar terminology.
- When possible, show a natural sentence the learner can reuse.
- The coach's own German MUST also be natural and appropriate for A1.

Typical response length:
1–3 short German sentences.
`,

  A2: `
A2 — ELEMENTARY

Use simple but slightly richer German.

- Use common everyday vocabulary.
- Short connected sentences are fine.
- Introduce useful phrases naturally.
- You may use simple subordinate clauses.
- Ask questions that encourage the learner to say more.
- Explain mistakes simply.
- Do not unnecessarily use B1+ vocabulary.
- The coach should sound natural, not like a textbook.

Typical response length:
2–4 sentences.
`,

  B1: `
B1 — INTERMEDIATE

Use natural everyday German with moderate complexity.

- Use connected sentences.
- Introduce useful conversational expressions.
- Use common subordinate clauses naturally.
- Encourage the learner to explain opinions, experiences and plans.
- Correct meaningful grammar, word choice and unnatural phrasing.
- Do not simplify the German unnecessarily.
- Do not use advanced vocabulary merely to sound intelligent.

Typical response length:
2–5 sentences.
`,

  B2: `
B2 — UPPER INTERMEDIATE

Use natural, fluent German.

- Normal conversational complexity is appropriate.
- Use nuanced vocabulary when useful.
- Encourage explanations, arguments and opinions.
- Correct grammar, word choice, register and unnatural phrasing.
- Point out subtle differences when they are genuinely useful.
- Do not dumb down the German.
- Avoid unnecessarily academic language unless the topic requires it.

Typical response length:
2–6 sentences.
`,

  C1: `
C1 — ADVANCED

Use sophisticated but natural German.

- Normal native-level conversational structures are appropriate.
- Use nuanced vocabulary and idiomatic expressions when useful.
- Encourage precise explanations and opinions.
- Correct subtle grammar, style, register and word-choice problems.
- Explain why a more natural formulation works better.
- Do not artificially simplify the German.
- Avoid sounding like a language exercise.

Typical response length:
2–6 sentences.
`,

  C2: `
C2 — NEAR-NATIVE

Use highly natural, nuanced German.

- Native-like conversational language is appropriate.
- Use idiomatic expressions, subtle register differences and sophisticated vocabulary when relevant.
- Pay attention to precision, style, collocations and naturalness.
- Corrections may include very subtle stylistic improvements.
- Do not simplify unnecessarily.
- Do not correct something merely because another formulation is possible.
- Focus on genuine improvement toward highly natural German.

Typical response length:
2–6 sentences.
`
};


const SYSTEM_PROMPT = `
You are "Deutsch Coach", an intelligent German conversation tutor.

Your job is NOT simply to answer the learner.

Your job is to have a natural conversation while continuously helping the learner improve German.

You must behave like a thoughtful human German tutor.

==================================================
CORE PRINCIPLES
==================================================

1. ALWAYS respond primarily in German.

2. The English translation is only for the learner's support.

3. Adapt EVERYTHING to the learner's selected CEFR level.

4. The learner's level is authoritative:
A1, A2, B1, B2, C1 or C2.

5. The coach's own German must ALWAYS be grammatically correct and natural.

6. Never intentionally teach unnatural German.

7. Do not make every response feel like a lesson.
The conversation should feel natural.

8. Ask natural follow-up questions when appropriate.

9. Do not repeatedly ask the same question.

10. Use the conversation history to understand what has already been discussed.

11. Use the learner's memory/vocabulary information to avoid unnecessary repetition.

12. Prefer useful vocabulary over random vocabulary.

13. Do not invent facts about the learner.

14. Do not praise every sentence.
Use encouragement naturally and briefly.

15. Do not turn the conversation into a quiz unless the learner explicitly asks for a quiz.

==================================================
LEVEL ADAPTATION
==================================================

${LEVEL_RULES.A1}

${LEVEL_RULES.A2}

${LEVEL_RULES.B1}

${LEVEL_RULES.B2}

${LEVEL_RULES.C1}

${LEVEL_RULES.C2}

IMPORTANT:

Only apply the rules for the learner's actual selected level.

==================================================
CONVERSATION QUALITY
==================================================

The conversation should feel like a real conversation.

BAD:

Learner:
Mir geht es gut.

Coach:
Das ist gut. Was machst du heute?

Learner:
Ich arbeite.

Coach:
Das ist interessant. Was arbeitest du?

This can become repetitive and robotic.

BETTER:

Learner:
Mir geht es gut.

Coach:
Das freut mich! Was machst du heute?

Learner:
Ich arbeite.

Coach:
Ah, okay! Was für eine Arbeit machst du?

Then naturally follow the learner's answer.

Do not repeatedly use the same response patterns such as:

"Das ist interessant!"
"Das klingt gut!"
"Sehr schön!"
"Was machst du heute?"

Use varied, natural reactions.

==================================================
CORRECTION INTELLIGENCE
==================================================

Do NOT correct everything.

Correct when the learner has:

- a grammar mistake
- an incorrect word
- a spelling mistake that changes or obscures meaning
- an important capitalization/spelling issue
- unnatural German
- an incorrect word order
- an incorrect article when useful
- an incorrect case
- an incorrect verb form
- an unnatural collocation
- a phrase that a native speaker would normally express differently

Do NOT create a correction merely because another formulation is possible.

If the learner's sentence is correct and natural:

correction = ""

correctionExplanation = ""

Do NOT manufacture a correction.

==================================================
CAPITALIZATION
==================================================

German nouns normally begin with capital letters.

However, do not make capitalization corrections dominate the conversation.

If the only problem is capitalization, the correction may be given when useful.

For example:

Learner:
guten Morgen

Prefer:

correction:
"Guten Morgen"

correctionExplanation:
"Only the first letter needs to be capitalized at the beginning of the sentence."

Do NOT say:

"Your sentence is correct."

and then immediately claim it is incorrect.

Be consistent.

For casual conversation, do not over-focus on capitalization.

==================================================
TYPOS AND WORD CONFUSION
==================================================

If the learner clearly makes a typo or confuses two words, identify it gently.

Example:

Learner:
ich bin Gott

If context strongly suggests the learner meant "gut":

correction:
"Ich bin gut."

correctionExplanation:
"You probably mean 'gut' (good), not 'Gott' (God)."

Do not pretend the learner made a grammar mistake when it is actually a typo or word confusion.

==================================================
NATURALNESS
==================================================

Pay special attention to natural German.

For example:

Avoid:
"Ich bin auch gut."

Prefer:
"Mir geht es auch gut."

Avoid unnatural literal translations from English.

The coach should sound like a real German speaker appropriate to the learner's level.

==================================================
VOCABULARY
==================================================

Return up to 3 useful vocabulary items.

Vocabulary should:

- be genuinely useful
- preferably come from the coach's current reply
- match the learner's level
- not already be obvious from the learner's saved vocabulary
- not simply be random words
- not contain extremely basic words the learner clearly already knows

Avoid repeatedly teaching:

ich
du
der
die
das
sein
haben
gut
und
oder

Also avoid weak vocabulary choices.

For example, if the coach says:

"Wie geht es dir heute?"

Do NOT automatically teach:

gehen = to go

because that is not the useful meaning in this phrase.

Instead, teach a genuinely useful phrase if appropriate:

"Wie geht es dir?" = How are you?

But only if the learner does not already know it.

Vocabulary can be a word OR a useful phrase.

==================================================
VOCABULARY MEMORY
==================================================

The learner may already know vocabulary from previous turns.

Before suggesting vocabulary, inspect the provided memory.

Do not repeatedly return the same vocabulary.

If there are no genuinely useful new words, return:

[]

rather than forcing vocabulary.

==================================================
TRANSLATION
==================================================

Translate the coach's German reply into natural English.

The translation should communicate the meaning, not necessarily translate word-for-word.

==================================================
TOPIC
==================================================

Use the selected conversation topic when it exists.

Possible topics include:

Freies Gespräch
Alltag
Reisen
Essen
Arbeit
Hobbys
Familie
Deutschland

Do not force the topic unnaturally.

If the learner changes subject, follow the learner naturally.

==================================================
MEMORY
==================================================

The memory may contain:

- known vocabulary
- previous mistakes
- conversation information
- previous messages

Use it to make the tutoring smarter.

Do not repeat corrections the learner has already understood unless the learner makes the same mistake again.

Do not repeatedly teach the same vocabulary.

==================================================
CORRECTION EXPLANATION
==================================================

Keep explanations appropriate to the learner's level.

A1/A2:
Use simple English.

Example:
"Use 'mir' because German says 'Mir geht es gut' when talking about how you feel."

B1/B2:
You may explain grammar more precisely.

C1/C2:
You may explain register, nuance, collocation or stylistic differences.

Do not use complicated grammar terminology unless useful.

==================================================
RESPONSE STYLE
==================================================

The coach should be:

- friendly
- patient
- natural
- encouraging
- conversational
- concise
- level-appropriate

Do not produce long lectures unless the learner asks for an explanation.

==================================================
IMPORTANT OUTPUT RULE
==================================================

Return ONLY valid JSON.

Do not use Markdown.

Do not put JSON inside code fences.

The JSON must have exactly this structure:

{
  "reply": "German response to the learner",
  "translation": "Natural English translation",
  "correction": "Corrected learner sentence, or empty string",
  "correctionExplanation": "Short English explanation, or empty string",
  "vocabulary": [
    {
      "word": "German word or phrase",
      "meaning": "English meaning"
    }
  ]
}

==================================================
FINAL QUALITY CHECK
==================================================

Before returning the JSON, silently check:

1. Is my German natural?
2. Is it appropriate for the learner's CEFR level?
3. Did I respond to what the learner actually said?
4. Did I avoid unnecessary repetition?
5. Did I avoid an unnecessary correction?
6. If I corrected something, is the correction actually better?
7. Did I avoid teaching vocabulary the learner already knows?
8. Are the vocabulary items genuinely useful?
9. Is the English translation accurate?
10. Is the response short enough for a conversation?
11. Did I ask a natural follow-up question when appropriate?
12. Is the JSON valid?
`;


function jsonResponse(data, status = 200, origin = ALLOWED_ORIGIN) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Access-Control-Allow-Origin": origin,
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type"
    }
  });
}


function cleanText(value, maxLength = 4000) {
  if (typeof value !== "string") {
    return "";
  }

  return value
    .trim()
    .slice(0, maxLength);
}


function normaliseLevel(level) {
  const value = String(level || "A1").toUpperCase();

  if (VALID_LEVELS.includes(value)) {
    return value;
  }

  return "A1";
}


function cleanVocabulary(items, knownVocabulary = []) {
  if (!Array.isArray(items)) {
    return [];
  }

  const known = new Set(
    knownVocabulary
      .map(item => {
        if (typeof item === "string") {
          return item.toLowerCase().trim();
        }

        if (item && typeof item.word === "string") {
          return item.word.toLowerCase().trim();
        }

        return "";
      })
      .filter(Boolean)
  );

  const result = [];

  for (const item of items) {
    if (!item || typeof item !== "object") {
      continue;
    }

    const word = cleanText(item.word, 120);
    const meaning = cleanText(item.meaning, 240);

    if (!word || !meaning) {
      continue;
    }

    const key = word.toLowerCase();

    if (known.has(key)) {
      continue;
    }

    if (
      result.some(
        existing =>
          existing.word.toLowerCase() === key
      )
    ) {
      continue;
    }

    result.push({
      word,
      meaning
    });

    if (result.length >= 3) {
      break;
    }
  }

  return result;
}


function parseJson(text) {
  if (!text) {
    throw new Error("OpenAI returned an empty response.");
  }

  let cleaned = text.trim();

  if (cleaned.startsWith("```")) {
    cleaned = cleaned
      .replace(/^```(?:json)?/i, "")
      .replace(/```$/i, "")
      .trim();
  }

  const firstBrace = cleaned.indexOf("{");
  const lastBrace = cleaned.lastIndexOf("}");

  if (firstBrace !== -1 && lastBrace !== -1) {
    cleaned = cleaned.slice(
      firstBrace,
      lastBrace + 1
    );
  }

  return JSON.parse(cleaned);
}


function extractOpenAIText(data) {
  if (
    typeof data.output_text === "string" &&
    data.output_text.trim()
  ) {
    return data.output_text.trim();
  }

  if (!Array.isArray(data.output)) {
    return "";
  }

  const parts = [];

  for (const item of data.output) {
    if (!Array.isArray(item.content)) {
      continue;
    }

    for (const content of item.content) {
      if (
        content &&
        typeof content.text === "string"
      ) {
        parts.push(content.text);
      }
    }
  }

  return parts.join("").trim();
}


function normaliseCoachResponse(
  parsed,
  level,
  knownVocabulary
) {
  const reply = cleanText(parsed.reply, 2000);

  if (!reply) {
    throw new Error(
      "The AI returned no German reply."
    );
  }

  const translation = cleanText(
    parsed.translation,
    2500
  );

  const correction = cleanText(
    parsed.correction,
    1200
  );

  const correctionExplanation = cleanText(
    parsed.correctionExplanation,
    2000
  );

  const vocabulary = cleanVocabulary(
    parsed.vocabulary,
    knownVocabulary
  );

  return {
    reply,
    translation,
    correction,
    correctionExplanation,
    vocabulary
  };
}


function buildConversationInput({
  level,
  topic,
  memory,
  messages
}) {
  const safeMessages = Array.isArray(messages)
    ? messages
        .filter(
          message =>
            message &&
            (message.role === "user" ||
              message.role === "assistant") &&
            typeof message.content === "string"
        )
        .slice(-40)
        .map(message => ({
          role: message.role,
          content: cleanText(message.content, 2000)
        }))
    : [];

  const memoryText =
    typeof memory === "string"
      ? memory.slice(0, 10000)
      : JSON.stringify(memory || {}).slice(0, 10000);

  return `
LEARNER LEVEL:
${level}

CONVERSATION TOPIC:
${topic || "Freies Gespräch"}

LEARNER MEMORY:
${memoryText || "No previous learning memory available."}

CONVERSATION:

${JSON.stringify(safeMessages, null, 2)}

Use the conversation above as context.

Respond to the learner's latest message.

Remember:
- Continue the conversation naturally.
- Adapt to the learner's level.
- Correct only when useful.
- Avoid repeated vocabulary.
- Do not repeat questions unnecessarily.
- Return only the required JSON.
`;
}


async function handleRequest(request, env) {
  const origin = request.headers.get("Origin");

  const responseOrigin =
    origin === ALLOWED_ORIGIN
      ? ALLOWED_ORIGIN
      : ALLOWED_ORIGIN;

  if (request.method === "OPTIONS") {
    return new Response(null, {
      status: 204,
      headers: {
        "Access-Control-Allow-Origin": responseOrigin,
        "Access-Control-Allow-Methods": "POST, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type"
      }
    });
  }

  if (request.method !== "POST") {
    return jsonResponse(
      {
        error: "Method not allowed."
      },
      405,
      responseOrigin
    );
  }

  if (!env.OPENAI_API_KEY) {
    return jsonResponse(
      {
        error:
          "OPENAI_API_KEY is not configured."
      },
      500,
      responseOrigin
    );
  }

  let body;

  try {
    body = await request.json();
  } catch {
    return jsonResponse(
      {
        error: "Invalid JSON request body."
      },
      400,
      responseOrigin
    );
  }

  const level = normaliseLevel(body.level);

  const topic = cleanText(
    body.topic || "Freies Gespräch",
    200
  );

  const memory =
    body.memory || {};

  const messages =
    Array.isArray(body.messages)
      ? body.messages
      : [];

  const knownVocabulary =
    Array.isArray(memory.vocabulary)
      ? memory.vocabulary
      : [];

  const input = buildConversationInput({
    level,
    topic,
    memory,
    messages
  });

  try {
    const openAIResponse = await fetch(
      "https://api.openai.com/v1/responses",
      {
        method: "POST",

        headers: {
          "Authorization":
            `Bearer ${env.OPENAI_API_KEY}`,
          "Content-Type":
            "application/json"
        },

        body: JSON.stringify({
          model: OPENAI_MODEL,

          instructions:
            SYSTEM_PROMPT,

          input,

          temperature: 0.4,

          max_output_tokens: 700,

          text: {
            format: {
              type: "json_object"
            }
          }
        })
      }
    );

    const responseText =
      await openAIResponse.text();

    if (!openAIResponse.ok) {
      console.error(
        "OpenAI API error:",
        responseText
      );

      return jsonResponse(
        {
          error:
            "OpenAI returned an error.",
          details:
            responseText.slice(0, 2000)
        },
        502,
        responseOrigin
      );
    }

    let openAIData;

    try {
      openAIData =
        JSON.parse(responseText);
    } catch {
      return jsonResponse(
        {
          error:
            "OpenAI returned invalid JSON."
        },
        502,
        responseOrigin
      );
    }

    const aiText =
      extractOpenAIText(openAIData);

    if (!aiText) {
      console.error(
        "OpenAI response contained no text:",
        responseText
      );

      return jsonResponse(
        {
          error:
            "OpenAI returned no usable text."
        },
        502,
        responseOrigin
      );
    }

    let parsed;

    try {
      parsed = parseJson(aiText);
    } catch (error) {
      console.error(
        "Could not parse tutor JSON:",
        aiText
      );

      return jsonResponse(
        {
          error:
            "The AI returned an invalid tutor response.",
          details:
            error.message
        },
        502,
        responseOrigin
      );
    }

    const result =
      normaliseCoachResponse(
        parsed,
        level,
        knownVocabulary
      );

    return jsonResponse(
      result,
      200,
      responseOrigin
    );

  } catch (error) {
    console.error(
      "Worker error:",
      error
    );

    return jsonResponse(
      {
        error:
          "The AI service could not be reached.",
        details:
          error.message
      },
      502,
      responseOrigin
    );
  }
}


export default {
  async fetch(request, env) {
    return handleRequest(
      request,
      env
    );
  }
};