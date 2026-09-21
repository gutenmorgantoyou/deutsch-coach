const OPENAI_MODEL = "gpt-5.4-mini";

const ALLOWED_ORIGIN =
  "https://gutenmorgantoyou.github.io";


const VALID_LEVELS = [
  "A1",
  "A2",
  "B1",
  "B2",
  "C1",
  "C2"
];


const LEVEL_RULES = {

  A1: `
Use very simple German.
Short sentences.
Common everyday vocabulary.
Ask simple questions.
Avoid unnecessary grammar complexity.
`,

  A2: `
Use simple but natural German.
Use common everyday vocabulary.
Introduce slightly longer sentences.
Use basic past and future structures when appropriate.
`,

  B1: `
Use natural conversational German.
Use moderately complex sentences.
Encourage the learner to explain opinions and experiences.
Use common connectors and useful vocabulary.
`,

  B2: `
Use fluent natural German.
Use more precise vocabulary and varied sentence structures.
Encourage explanations, comparisons and opinions.
Avoid unnecessarily academic language.
`,

  C1: `
Use sophisticated but natural German.
Use nuanced vocabulary and complex sentence structures.
Discuss abstract ideas when appropriate.
Prioritize natural expression and precision.
`,

  C2: `
Use highly natural and precise German.
Allow sophisticated vocabulary, nuanced phrasing and complex structures.
Do not simplify unnecessarily unless the learner clearly needs help.
`
};


function cleanText(value, maxLength = 5000) {

  if (
    typeof value !== "string"
  ) {

    return "";

  }

  return value
    .replace(/\u0000/g, "")
    .trim()
    .slice(0, maxLength);

}


function normaliseLevel(level) {

  const value =
    String(level || "A1")
      .toUpperCase()
      .trim();

  return VALID_LEVELS.includes(value)
    ? value
    : "A1";

}


function extractKnownVocabulary(memory) {

  if (
    !memory ||
    !Array.isArray(
      memory.knownVocabulary
    )
  ) {

    return [];

  }

  return memory.knownVocabulary
    .filter(
      item =>
        typeof item === "string"
    )
    .map(
      item =>
        item.trim()
    )
    .filter(Boolean)
    .slice(-100);

}


function cleanVocabulary(
  vocabulary,
  knownVocabulary
) {

  if (
    !Array.isArray(vocabulary)
  ) {

    return [];

  }


  const known =
    new Set(
      knownVocabulary.map(
        word =>
          word.toLowerCase()
      )
    );


  const output = [];


  for (
    const item of vocabulary
  ) {

    if (
      !item ||
      typeof item !== "object"
    ) {

      continue;

    }


    const word =
      cleanText(
        item.word,
        100
      );


    const meaning =
      cleanText(
        item.meaning,
        200
      );


    if (
      !word ||
      !meaning
    ) {

      continue;

    }


    if (
      known.has(
        word.toLowerCase()
      )
    ) {

      continue;

    }


    if (
      output.some(
        existing =>
          existing.word.toLowerCase() ===
          word.toLowerCase()
      )
    ) {

      continue;

    }


    output.push({

      word,

      meaning

    });


    if (
      output.length >= 3
    ) {

      break;

    }

  }


  return output;

}


function cleanLearning(
  learning
) {

  if (
    !learning ||
    typeof learning !== "object"
  ) {

    return null;

  }


  const skillId =
    cleanText(
      learning.skillId,
      100
    )
    .replace(
      /[^a-zA-Z0-9_-]/g,
      "_"
    );


  if (!skillId) {

    return null;

  }


  const allowedOutcomes = [
    "mistake",
    "correct",
    "none"
  ];


  const outcome =
    allowedOutcomes.includes(
      learning.outcome
    )
      ? learning.outcome
      : "none";


  return {

    skillId,

    label:
      cleanText(
        learning.label,
        120
      ),

    outcome

  };

}


function parseJson(text) {

  const cleaned =
    String(text || "")
      .trim()
      .replace(
        /^```json/i,
        ""
      )
      .replace(
        /^```/i,
        ""
      )
      .replace(
        /```$/i,
        ""
      )
      .trim();


  try {

    return JSON.parse(
      cleaned
    );

  } catch {

    const start =
      cleaned.indexOf("{");

    const end =
      cleaned.lastIndexOf("}");


    if (
      start >= 0 &&
      end > start
    ) {

      return JSON.parse(
        cleaned.slice(
          start,
          end + 1
        )
      );

    }


    throw new Error(
      "OpenAI returned invalid JSON."
    );

  }

}


function extractOpenAIText(data) {

  if (
    typeof data.output_text === "string"
  ) {

    return data.output_text;

  }


  if (
    Array.isArray(data.output)
  ) {

    const parts = [];


    for (
      const item of data.output
    ) {

      if (
        !Array.isArray(item.content)
      ) {

        continue;

      }


      for (
        const content of item.content
      ) {

        if (
          typeof content.text === "string"
        ) {

          parts.push(
            content.text
          );

        }

      }

    }


    if (parts.length) {

      return parts.join("\n");

    }

  }


  return "";

}


function normaliseCoachResponse(
  response,
  knownVocabulary
) {

  const vocabulary =
    cleanVocabulary(
      response.vocabulary,
      knownVocabulary
    );


  const correction =
    cleanText(
      response.correction,
      1000
    );


  const correctionExplanation =
    cleanText(
      response.correctionExplanation,
      1000
    );


  const correctionType =
    cleanText(
      response.correctionType,
      80
    );


  const learning =
    cleanLearning(
      response.learning
    );


  return {

    reply:
      cleanText(
        response.reply,
        3000
      ),

    translation:
      cleanText(
        response.translation,
        2000
      ),

    correction,

    correctionExplanation,

    correctionType,

    vocabulary,

    learning

  };

}


function buildSystemPrompt(
  level,
  topic,
  memory
) {

  const knownVocabulary =
    extractKnownVocabulary(
      memory
    );


  const previousMistakes =
    Array.isArray(
      memory?.mistakes
    )
      ? memory.mistakes
      : [];


  const skills =
    Array.isArray(
      memory?.skills
    )
      ? memory.skills
      : [];


  const recentTopics =
    Array.isArray(
      memory?.recentTopics
    )
      ? memory.recentTopics
      : [];


  const recentQuestions =
    Array.isArray(
      memory?.recentQuestions
    )
      ? memory.recentQuestions
      : [];


  return `
You are Deutsch Coach, a personal German conversation tutor.

The learner's selected CEFR level is ${level}.

${LEVEL_RULES[level]}

Current conversation topic:
${topic || "Free conversation"}

Your job is to behave like a natural human-like German conversation partner AND an intelligent language tutor.

IMPORTANT:
The learner's selected level is the target difficulty.
Do not suddenly use unnecessarily difficult language simply because higher-level rules exist elsewhere in this prompt.

========================================
CONVERSATION
========================================

Respond directly to what the learner actually said.

Do not always ask the same type of question.

Avoid repetitive:
"Wie geht es dir?"
"Was machst du heute?"
"Warum?"

Use natural follow-up questions only when they help the conversation.

If the learner says something interesting, react to it.

Do not turn every message into a grammar lesson.

The conversation should feel natural.

========================================
CORRECTION INTELLIGENCE
========================================

Correct meaningful mistakes.

Possible mistake types include:

- grammar
- word order
- article
- case
- verb form
- spelling
- capitalization
- vocabulary
- word confusion
- unnatural phrasing
- collocation
- register/style

Do NOT correct a sentence that is already correct and natural.

Do NOT invent mistakes.

Do not over-focus on capitalization.

Distinguish between:

1. Typo
2. Vocabulary/word confusion
3. Grammar error
4. Unnatural but grammatically possible phrasing

If the learner's sentence is correct, leave correction empty.

========================================
ADAPTIVE LEARNING
========================================

The learner has a persistent learning profile.

Known vocabulary:
${JSON.stringify(
  knownVocabulary
)}

Previous mistakes:
${JSON.stringify(
  previousMistakes
)}

Tracked learning skills:
${JSON.stringify(
  skills
)}

Recent topics:
${JSON.stringify(
  recentTopics
)}

Recent questions asked by the coach:
${JSON.stringify(
  recentQuestions
)}

Use this information intelligently.

If the learner repeatedly makes the same type of mistake, recognize the pattern.

Example:

First:
"mit meine Freunde"

Correct:
"mit meinen Freunden"

Later:
"mit meine Eltern"

The correction should reinforce the existing pattern instead of giving a completely unrelated explanation.

For example:
"Fast richtig: mit meinen Eltern. Remember: mit takes the dative."

However, if the learner later correctly says:
"mit meinen Freunden"

do NOT correct it again.

Instead, mark the related learning skill as a correct use.

Do not claim mastery after one correct use.

The frontend will track repeated success.

========================================
LEARNING SKILLS
========================================

When a meaningful grammar or language skill is involved, identify ONE stable skill.

Examples:

case_dative_after_mit

word_order_main_clause

subordinate_clause_verb_position

article_accusative_masculine

past_tense_auxiliary

verb_conjugation

preposition_case

adjective_ending

plural_form

word_choice

collocation

natural_expression

If no meaningful skill is involved, use:

skillId: ""

outcome: "none"

If the learner made a mistake involving the skill:

outcome = "mistake"

If the learner correctly demonstrates a previously tracked skill:

outcome = "correct"

Otherwise:

outcome = "none"

Use stable skill IDs.

Do not create a different skill ID every time the same grammar concept appears.

========================================
VOCABULARY
========================================

Suggest only useful vocabulary.

Do not teach words the learner already knows.

Do not add obvious beginner words just because they appeared.

Useful vocabulary can include:

- individual words
- phrases
- collocations
- natural expressions

Maximum 3 new vocabulary items.

If there is an important correction, vocabulary can be 0–2 items.

========================================
TRANSLATION
========================================

Provide a natural English translation of your German reply.

Do not translate word-for-word if that sounds unnatural.

========================================
RESPONSE STYLE
========================================

Keep replies concise enough for conversation.

Normally respond with around 1–4 German sentences.

Do not write essays unless the learner clearly asks for one.

========================================
OUTPUT
========================================

Return ONLY valid JSON.

Use exactly this structure:

{
  "reply": "German response",
  "translation": "Natural English translation",
  "correction": "Corrected learner sentence or empty string",
  "correctionExplanation": "Short English explanation or empty string",
  "correctionType": "grammar|word_order|case|vocabulary|spelling|capitalization|naturalness|typo|style|none",
  "vocabulary": [
    {
      "word": "German word or phrase",
      "meaning": "English meaning"
    }
  ],
  "learning": {
    "skillId": "stable_skill_id_or_empty",
    "label": "Short skill name or empty string",
    "outcome": "mistake|correct|none"
  }
}

Do not include markdown.

Do not include comments outside JSON.
`;
}


function buildConversationInput(
  messages
) {

  const safeMessages =
    Array.isArray(messages)
      ? messages
      : [];


  return safeMessages
    .slice(-40)
    .map(
      message => {

        const role =
          message.role === "assistant"
            ? "assistant"
            : "user";


        return {

          role,

          content:
            cleanText(
              message.content,
              4000
            )

        };

      }
    );

}


function jsonResponse(
  body,
  status = 200
) {

  return new Response(
    JSON.stringify(body),
    {

      status,

      headers: {

        "Content-Type":
          "application/json",

        "Access-Control-Allow-Origin":
          ALLOWED_ORIGIN,

        "Access-Control-Allow-Methods":
          "POST, OPTIONS",

        "Access-Control-Allow-Headers":
          "Content-Type"

      }

    }
  );

}


async function handleRequest(
  request,
  env
) {

  if (
    request.method === "OPTIONS"
  ) {

    return new Response(
      null,
      {

        status: 204,

        headers: {

          "Access-Control-Allow-Origin":
            ALLOWED_ORIGIN,

          "Access-Control-Allow-Methods":
            "POST, OPTIONS",

          "Access-Control-Allow-Headers":
            "Content-Type"

        }

      }
    );

  }


  if (
    request.method !== "POST"
  ) {

    return jsonResponse(
      {
        error:
          "Method not allowed."
      },
      405
    );

  }


  if (
    !env.OPENAI_API_KEY
  ) {

    return jsonResponse(
      {
        error:
          "OPENAI_API_KEY is not configured."
      },
      500
    );

  }


  let body;


  try {

    body =
      await request.json();

  } catch {

    return jsonResponse(
      {
        error:
          "Invalid request body."
      },
      400
    );

  }


  const level =
    normaliseLevel(
      body.level
    );


  const topic =
    cleanText(
      body.topic,
      200
    );


  const messages =
    buildConversationInput(
      body.messages
    );


  if (
    !messages.length
  ) {

    return jsonResponse(
      {
        error:
          "No conversation messages provided."
      },
      400
    );

  }


  const memory =
    body.memory &&
    typeof body.memory === "object"
      ? body.memory
      : {};


  const systemPrompt =
    buildSystemPrompt(
      level,
      topic,
      memory
    );


  const input = [

    {

      role: "developer",

      content: [
        {
          type: "input_text",
          text: systemPrompt
        }
      ]

    },

    ...messages.map(
      message => ({

        role:
          message.role,

        content: [

          {

            type:
              message.role === "user"
                ? "input_text"
                : "output_text",

            text:
              message.content

          }

        ]

      })
    )

  ];


  const openaiResponse =
    await fetch(
      "https://api.openai.com/v1/responses",
      {

        method: "POST",

        headers: {

          "Content-Type":
            "application/json",

          "Authorization":
            `Bearer ${env.OPENAI_API_KEY}`

        },

        body:
          JSON.stringify({

            model:
              OPENAI_MODEL,

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


  const raw =
    await openaiResponse.text();


  if (
    !openaiResponse.ok
  ) {

    console.error(
      "OpenAI error:",
      raw
    );


    return jsonResponse(
      {
        error:
          "The AI service returned an error."
      },
      502
    );

  }


  let openaiData;


  try {

    openaiData =
      JSON.parse(raw);

  } catch {

    return jsonResponse(
      {
        error:
          "Invalid response from AI service."
      },
      502
    );

  }


  const outputText =
    extractOpenAIText(
      openaiData
    );


  if (!outputText) {

    return jsonResponse(
      {
        error:
          "The AI service returned an empty response."
      },
      502
    );

  }


  let coachResponse;


  try {

    coachResponse =
      parseJson(
        outputText
      );

  } catch (error) {

    console.error(
      "JSON parse error:",
      error.message
    );


    return jsonResponse(
      {
        error:
          "The AI returned an invalid response format."
      },
      502
    );

  }


  const knownVocabulary =
    extractKnownVocabulary(
      memory
    );


  const result =
    normaliseCoachResponse(
      coachResponse,
      knownVocabulary
    );


  return jsonResponse(
    result
  );

}


export default {

  async fetch(
    request,
    env
  ) {

    try {

      return await handleRequest(
        request,
        env
      );

    } catch (error) {

      console.error(
        "Worker error:",
        error
      );


      return jsonResponse(
        {
          error:
            "Internal server error."
        },
        500
      );

    }

  }

};