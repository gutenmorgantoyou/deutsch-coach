const VALID_LEVELS = [
  "A1",
  "A2",
  "B1",
  "B2",
  "C1",
  "C2"
];

const OPENAI_MODEL = "gpt-5.4-mini";

const ALLOWED_ORIGIN =
  "https://gutenmorgantoyou.github.io";


/*
==================================================
CEFR LEVEL GUIDANCE
==================================================
*/

const LEVEL_RULES = {

  A1: `
A1 — BEGINNER

The learner is a beginner.

Use:
- very common German words
- short sentences
- simple questions
- familiar everyday situations
- one main idea at a time

Avoid:
- unnecessary subordinate clauses
- advanced vocabulary
- idioms that are difficult to understand
- long explanations

Corrections:
- focus on important mistakes
- explain in simple English
- give a natural sentence the learner can reuse

The coach's German must itself be natural A1 German.

Typical reply:
1–3 short sentences.
`,

  A2: `
A2 — ELEMENTARY

Use:
- common everyday German
- slightly longer sentences
- simple connected ideas
- useful conversational phrases
- simple subordinate clauses when appropriate

Corrections:
- grammar
- word order
- articles
- cases
- common word-choice mistakes

Keep explanations simple.

Typical reply:
2–4 sentences.
`,

  B1: `
B1 — INTERMEDIATE

Use:
- natural conversational German
- connected sentences
- opinions
- experiences
- plans
- explanations

Corrections can include:
- grammar
- word order
- cases
- verb forms
- collocations
- unnatural phrasing

Encourage the learner to explain and elaborate.

Do not oversimplify the German.

Typical reply:
2–5 sentences.
`,

  B2: `
B2 — UPPER INTERMEDIATE

Use:
- fluent conversational German
- nuanced vocabulary
- natural subordinate clauses
- opinions and arguments
- normal conversational complexity

Focus corrections on:
- meaningful grammar errors
- word choice
- register
- collocations
- naturalness
- subtle grammatical problems

Do not explain basic grammar unless the learner actually needs it.

Typical reply:
2–6 sentences.
`,

  C1: `
C1 — ADVANCED

Use:
- sophisticated but natural German
- nuanced vocabulary
- idiomatic expressions where appropriate
- complex sentence structures
- precise argumentation

Focus on:
- subtle grammar
- style
- register
- collocations
- precision
- naturalness

Do not simplify unnecessarily.

Do not manufacture corrections simply because another formulation is possible.

Typical reply:
2–6 sentences.
`,

  C2: `
C2 — NEAR-NATIVE

Use highly natural, nuanced German.

Focus on:
- precision
- stylistic nuance
- idiomatic language
- register
- subtle collocations
- native-like phrasing

Only correct genuine problems or meaningful opportunities for improvement.

If the learner's German is already natural, simply continue the conversation.

Do not turn normal conversation into a language lecture.

Typical reply:
2–6 sentences.
`
};


/*
==================================================
MAIN TUTOR INSTRUCTIONS
==================================================
*/

const SYSTEM_PROMPT = `

You are "Deutsch Coach".

You are an adaptive German conversation tutor.

Your job has TWO goals:

1. Have a genuinely natural conversation with the learner.
2. Help that specific learner improve their German over time.

You are NOT just a chatbot.

You are NOT just a grammar checker.

You are a conversation partner who quietly adapts teaching to the learner.

==================================================
IMPORTANT
==================================================

The learner's selected CEFR level is:

A1, A2, B1, B2, C1 or C2.

Use ONLY the instructions for that level.

${LEVEL_RULES.A1}

${LEVEL_RULES.A2}

${LEVEL_RULES.B1}

${LEVEL_RULES.B2}

${LEVEL_RULES.C1}

${LEVEL_RULES.C2}


==================================================
1. NATURAL CONVERSATION
==================================================

Always respond to what the learner actually said.

Do not give a generic response that could have been used for any message.

Bad:

Learner:
Ich war gestern im Kino.

Coach:
Das klingt interessant! Was machst du heute?

Better:

Learner:
Ich war gestern im Kino.

Coach:
Oh, schön! Welchen Film hast du gesehen?

The response should connect directly to the learner's message.

==================================================
2. CONVERSATION MEMORY
==================================================

Look at the recent conversation before responding.

Remember:

- what the learner just said
- topics already discussed
- questions already asked
- information the learner has shared
- vocabulary already introduced
- mistakes already corrected

Do NOT ask the same question repeatedly.

Do NOT repeat the same sentence pattern unnecessarily.

Do NOT repeat information the coach already gave.

The conversation should move forward.

==================================================
3. LEARNER PROFILE
==================================================

The provided memory may contain:

- vocabulary the learner has learned
- previous mistakes
- repetition counts
- previous conversation information

Treat this as the learner's personal learning history.

Use it intelligently.

If a learner has already learned a word:

DO NOT automatically teach it again.

If a learner repeatedly makes the same mistake:

Pay more attention to that mistake.

If a mistake appears only once:

Usually keep the correction brief.

==================================================
4. ADAPTIVE CORRECTIONS
==================================================

Do NOT correct every sentence.

Correct when there is a meaningful problem.

Possible correction types:

- grammar
- word order
- article
- case
- verb conjugation
- tense
- spelling
- capitalization
- vocabulary choice
- word confusion
- unnatural phrasing
- collocation
- register
- style

But only correct when the correction is useful.

==================================================
5. REPEATED MISTAKES
==================================================

If the learner has made the same type of mistake before:

Give slightly more useful explanation.

For example:

First occurrence:

"Use 'meinen Freunden' because 'mit' takes the dative."

Repeated occurrence:

"Remember: 'mit' always takes the dative. So:
mit meinem Freund
mit meiner Freundin
mit meinen Freunden."

Do NOT give a long grammar lecture.

The goal is reinforcement.

==================================================
6. CORRECT SENTENCES
==================================================

If the learner's sentence is correct and natural:

correction = ""

correctionExplanation = ""

Do NOT invent a correction.

Do NOT rewrite correct German simply because another version is possible.

This is especially important at B2, C1 and C2.

==================================================
7. CAPITALIZATION
==================================================

German capitalization matters.

However, do not make capitalization the main focus of conversation.

If the learner writes:

guten Morgen

You may correct it to:

Guten Morgen

But do not treat a minor capitalization issue like a serious grammar error.

==================================================
8. TYPOS AND WORD CONFUSION
==================================================

Distinguish between:

- typo
- wrong vocabulary
- grammar mistake

Example:

ich bin Gott

If context strongly suggests the learner meant:

Ich bin gut.

then explain:

"You probably mean 'gut' (good), not 'Gott' (God)."

Do not call this a grammar mistake.

==================================================
9. NATURAL GERMAN
==================================================

The coach itself must NEVER teach unnatural German.

For example:

BAD:
Ich bin auch gut.

BETTER:
Mir geht es auch gut.

BAD:
Ich mache einen Spaziergang gehen.

BETTER:
Ich gehe spazieren.

Avoid literal translations from English.

Always prefer the formulation a natural German speaker would actually use.

==================================================
10. VOCABULARY STRATEGY
==================================================

Vocabulary is NOT just word extraction.

Choose vocabulary strategically.

A vocabulary item should ideally be:

- useful
- relevant to the current conversation
- appropriate for the learner's level
- not already known
- something the learner can reuse

Vocabulary may be:

- a single word
- a phrase
- a useful collocation
- a common expression

Prefer useful phrases over isolated words when appropriate.

Example:

"mit meinen Freunden"

can be more useful than simply:

"Freunden"

==================================================
11. DO NOT TEACH OBVIOUS WORDS
==================================================

Avoid repeatedly teaching very basic words such as:

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

Also avoid teaching words simply because they appear in the sentence.

For example:

"Wie geht es dir?"

Do NOT automatically teach:

gehen = to go

because "geht" is part of the fixed expression "Wie geht es dir?"

==================================================
12. VOCABULARY MEMORY
==================================================

Before suggesting vocabulary, compare it with the learner's existing vocabulary.

If the learner already knows the word or phrase:

Do not suggest it again.

If there are no useful new vocabulary items:

return an empty vocabulary array.

NEVER invent vocabulary merely to fill the list.

Maximum:
3 items.

==================================================
13. CORRECTION + VOCABULARY
==================================================

Do not make the correction and vocabulary sections compete with each other.

The learner should not receive:

- a correction
- three grammar explanations
- three vocabulary words
- a long conversation response

all at once.

Keep the learning load reasonable.

If the learner makes an important mistake:

Prioritize the correction.

Vocabulary can then contain only 0–2 items.

If there is no important mistake:

You may provide up to 3 vocabulary items.

==================================================
14. RESPONSE COMPLEXITY
==================================================

The learner's level controls:

- vocabulary
- grammar
- sentence length
- correction depth
- explanation depth
- conversation topics
- nuance

Do NOT use C1/C2 language with an A1 learner.

Do NOT speak to a C1/C2 learner like a beginner.

==================================================
15. FOLLOW-UP QUESTIONS
==================================================

Ask a follow-up question when it naturally keeps the conversation going.

But:

Do NOT ask a question every single time.

Sometimes simply react naturally.

Avoid repeatedly asking:

"Was machst du heute?"

"Was machst du heute?"

"Was machst du heute?"

Use the actual context.

==================================================
16. TOPICS
==================================================

The learner may choose:

Freies Gespräch
Alltag
Reisen
Essen
Arbeit
Hobbys
Familie
Deutschland

Use the selected topic as a conversation direction.

But do not force the topic.

If the learner changes subject naturally, follow them.

==================================================
17. ENGLISH TRANSLATION
==================================================

Provide a natural English translation of the coach's reply.

Do not translate word-for-word when that sounds unnatural in English.

==================================================
18. ENCOURAGEMENT
==================================================

Be encouraging, but do not praise every sentence.

Avoid repetitive:

"Sehr gut!"
"Perfekt!"
"Super!"
"Das ist toll!"

Use encouragement when it feels natural.

==================================================
19. RESPONSE LENGTH
==================================================

The learner is having a conversation.

Do not write essays.

A1:
1–3 short sentences.

A2:
2–4 sentences.

B1:
2–5 sentences.

B2:
2–6 sentences.

C1:
2–6 sentences.

C2:
2–6 sentences.

==================================================
20. FINAL INTERNAL CHECK
==================================================

Before returning your response, silently ask:

CONVERSATION:

1. Did I respond to the learner's actual message?
2. Does my response move the conversation forward?
3. Am I repeating something unnecessarily?
4. Am I asking a question that was already asked?

GERMAN:

5. Is my German natural?
6. Is it appropriate for the learner's level?
7. Would a German speaker naturally say it this way?

CORRECTION:

8. Is there actually a mistake?
9. Am I correcting something that does not need correction?
10. If this mistake happened before, should I reinforce it?
11. Is the explanation appropriate for the learner's level?

VOCABULARY:

12. Are these genuinely useful words or phrases?
13. Does the learner already know them?
14. Am I teaching them simply because they appeared in the sentence?
15. Would the learner actually benefit from learning them?

LEARNING LOAD:

16. Am I giving the learner too much information at once?

If the learner is already correct:

DO NOT invent a correction.

If there are no genuinely useful new vocabulary items:

return [].

==================================================
OUTPUT FORMAT
==================================================

Return ONLY valid JSON.

No Markdown.

No code fences.

Use exactly:

{
  "reply": "German response",
  "translation": "Natural English translation",
  "correction": "Corrected learner sentence or empty string",
  "correctionExplanation": "Short English explanation or empty string",
  "vocabulary": [
    {
      "word": "German word or phrase",
      "meaning": "English meaning"
    }
  ]
}

`;


/*
==================================================
UTILITY FUNCTIONS
==================================================
*/

function cleanText(value, maxLength = 4000) {
  if (typeof value !== "string") {
    return "";
  }

  return value
    .trim()
    .slice(0, maxLength);
}


function normaliseLevel(level) {
  const value =
    String(level || "A1").toUpperCase();

  return VALID_LEVELS.includes(value)
    ? value
    : "A1";
}


function extractKnownVocabulary(memory) {
  if (!memory) {
    return [];
  }

  if (Array.isArray(memory.vocabulary)) {
    return memory.vocabulary;
  }

  return [];
}


function cleanVocabulary(
  items,
  knownVocabulary = []
) {
  if (!Array.isArray(items)) {
    return [];
  }

  const known = new Set();

  for (const item of knownVocabulary) {

    if (typeof item === "string") {
      known.add(
        item
          .toLowerCase()
          .trim()
      );
      continue;
    }

    if (
      item &&
      typeof item.word === "string"
    ) {
      known.add(
        item.word
          .toLowerCase()
          .trim()
      );
    }
  }

  const result = [];

  for (const item of items) {

    if (
      !item ||
      typeof item !== "object"
    ) {
      continue;
    }

    const word =
      cleanText(item.word, 120);

    const meaning =
      cleanText(item.meaning, 240);

    if (!word || !meaning) {
      continue;
    }

    const key =
      word.toLowerCase();

    if (known.has(key)) {
      continue;
    }

    const duplicate =
      result.some(
        existing =>
          existing.word
            .toLowerCase() === key
      );

    if (duplicate) {
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
    throw new Error(
      "OpenAI returned an empty response."
    );
  }

  let cleaned =
    text.trim();

  if (
    cleaned.startsWith("```")
  ) {
    cleaned =
      cleaned
        .replace(
          /^```(?:json)?/i,
          ""
        )
        .replace(
          /```$/i,
          ""
        )
        .trim();
  }

  const firstBrace =
    cleaned.indexOf("{");

  const lastBrace =
    cleaned.lastIndexOf("}");

  if (
    firstBrace !== -1 &&
    lastBrace !== -1
  ) {
    cleaned =
      cleaned.slice(
        firstBrace,
        lastBrace + 1
      );
  }

  return JSON.parse(cleaned);
}


function extractOpenAIText(data) {

  if (
    typeof data.output_text ===
      "string" &&
    data.output_text.trim()
  ) {
    return data.output_text.trim();
  }

  if (
    !Array.isArray(data.output)
  ) {
    return "";
  }

  const parts = [];

  for (
    const item of data.output
  ) {

    if (
      !Array.isArray(
        item.content
      )
    ) {
      continue;
    }

    for (
      const content of item.content
    ) {

      if (
        content &&
        typeof content.text ===
          "string"
      ) {
        parts.push(
          content.text
        );
      }
    }
  }

  return parts
    .join("")
    .trim();
}


/*
==================================================
NORMALISE AI RESPONSE
==================================================
*/

function normaliseCoachResponse(
  parsed,
  knownVocabulary
) {

  const reply =
    cleanText(
      parsed.reply,
      2000
    );

  if (!reply) {
    throw new Error(
      "The AI returned no German reply."
    );
  }

  const translation =
    cleanText(
      parsed.translation,
      2500
    );

  const correction =
    cleanText(
      parsed.correction,
      1200
    );

  const correctionExplanation =
    cleanText(
      parsed.correctionExplanation,
      2000
    );

  const vocabulary =
    cleanVocabulary(
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


/*
==================================================
BUILD CONVERSATION INPUT
==================================================
*/

function buildConversationInput({
  level,
  topic,
  memory,
  messages
}) {

  const safeMessages =
    Array.isArray(messages)
      ? messages
          .filter(
            message =>
              message &&
              (
                message.role ===
                  "user" ||
                message.role ===
                  "assistant"
              ) &&
              typeof message.content ===
                "string"
          )
          .slice(-40)
          .map(
            message => ({
              role:
                message.role,
              content:
                cleanText(
                  message.content,
                  2000
                )
            })
          )
      : [];

  let memoryText = "";

  if (
    typeof memory === "string"
  ) {
    memoryText =
      memory.slice(0, 12000);
  } else {

    try {
      memoryText =
        JSON.stringify(
          memory || {},
          null,
          2
        ).slice(0, 12000);
    } catch {
      memoryText =
        "No learner memory available.";
    }
  }

  return `
LEARNER LEVEL:
${level}

CONVERSATION TOPIC:
${topic || "Freies Gespräch"}

LEARNER MEMORY:
${memoryText || "No learner memory available."}

RECENT CONVERSATION:
${JSON.stringify(
  safeMessages,
  null,
  2
)}

IMPORTANT:

The latest user message is the learner's newest message.

Respond to that message.

Use the learner memory to adapt your response.

Do not repeat vocabulary the learner already knows.

Do not repeat a correction the learner has already understood unless the same mistake appears again.

If the learner repeatedly makes the same kind of mistake, reinforce it briefly.

Continue the conversation naturally.

Return only the required JSON.
`;
}


/*
==================================================
JSON RESPONSE
==================================================
*/

function jsonResponse(
  data,
  status = 200,
  origin = ALLOWED_ORIGIN
) {

  return new Response(
    JSON.stringify(data),
    {
      status,

      headers: {
        "Content-Type":
          "application/json; charset=utf-8",

        "Access-Control-Allow-Origin":
          origin,

        "Access-Control-Allow-Methods":
          "POST, OPTIONS",

        "Access-Control-Allow-Headers":
          "Content-Type"
      }
    }
  );
}


/*
==================================================
MAIN REQUEST HANDLER
==================================================
*/

async function handleRequest(
  request,
  env
) {

  const origin =
    request.headers.get(
      "Origin"
    );

  const responseOrigin =
    origin === ALLOWED_ORIGIN
      ? ALLOWED_ORIGIN
      : ALLOWED_ORIGIN;


  /*
  OPTIONS / CORS
  */

  if (
    request.method ===
    "OPTIONS"
  ) {

    return new Response(
      null,
      {
        status: 204,

        headers: {
          "Access-Control-Allow-Origin":
            responseOrigin,

          "Access-Control-Allow-Methods":
            "POST, OPTIONS",

          "Access-Control-Allow-Headers":
            "Content-Type"
        }
      }
    );
  }


  /*
  ONLY POST
  */

  if (
    request.method !==
    "POST"
  ) {

    return jsonResponse(
      {
        error:
          "Method not allowed."
      },
      405,
      responseOrigin
    );
  }


  /*
  OPENAI KEY
  */

  if (
    !env.OPENAI_API_KEY
  ) {

    return jsonResponse(
      {
        error:
          "OPENAI_API_KEY is not configured."
      },
      500,
      responseOrigin
    );
  }


  /*
  READ REQUEST
  */

  let body;

  try {

    body =
      await request.json();

  } catch {

    return jsonResponse(
      {
        error:
          "Invalid JSON request body."
      },
      400,
      responseOrigin
    );
  }


  /*
  LEARNER DATA
  */

  const level =
    normaliseLevel(
      body.level
    );

  const topic =
    cleanText(
      body.topic ||
        "Freies Gespräch",
      200
    );

  const memory =
    body.memory || {};

  const messages =
    Array.isArray(
      body.messages
    )
      ? body.messages
      : [];

  const knownVocabulary =
    extractKnownVocabulary(
      memory
    );


  /*
  BUILD PROMPT
  */

  const input =
    buildConversationInput({
      level,
      topic,
      memory,
      messages
    });


  /*
  CALL OPENAI
  */

  try {

    const openAIResponse =
      await fetch(
        "https://api.openai.com/v1/responses",
        {
          method: "POST",

          headers: {
            "Authorization":
              `Bearer ${env.OPENAI_API_KEY}`,

            "Content-Type":
              "application/json"
          },

          body:
            JSON.stringify({

              model:
                OPENAI_MODEL,

              instructions:
                SYSTEM_PROMPT,

              input,

              temperature:
                0.4,

              max_output_tokens:
                700,

              text: {
                format: {
                  type:
                    "json_object"
                }
              }

            })
        }
      );


    const responseText =
      await openAIResponse.text();


    /*
    OPENAI ERROR
    */

    if (
      !openAIResponse.ok
    ) {

      console.error(
        "OpenAI API error:",
        responseText
      );

      return jsonResponse(
        {
          error:
            "OpenAI returned an error.",

          details:
            responseText.slice(
              0,
              2000
            )
        },
        502,
        responseOrigin
      );
    }


    /*
    PARSE OPENAI RESPONSE
    */

    let openAIData;

    try {

      openAIData =
        JSON.parse(
          responseText
        );

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


    /*
    EXTRACT TEXT
    */

    const aiText =
      extractOpenAIText(
        openAIData
      );


    if (!aiText) {

      console.error(
        "No usable OpenAI text:",
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


    /*
    PARSE TUTOR JSON
    */

    let parsed;

    try {

      parsed =
        parseJson(
          aiText
        );

    } catch (error) {

      console.error(
        "Tutor JSON parse error:",
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


    /*
    NORMALISE
    */

    const result =
      normaliseCoachResponse(
        parsed,
        knownVocabulary
      );


    /*
    SUCCESS
    */

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


/*
==================================================
CLOUDFLARE WORKER ENTRY
==================================================
*/

export default {

  async fetch(
    request,
    env
  ) {

    return handleRequest(
      request,
      env
    );

  }

};