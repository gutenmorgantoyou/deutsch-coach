const OPENAI_MODEL = "gpt-5.6-luna";
const TRANSCRIBE_MODEL = "gpt-4o-mini-transcribe";

const ALLOWED_ORIGIN =
  "https://gutenmorgantoyou.github.io";

const MAX_AUDIO_BYTES =
  20 * 1024 * 1024;

const MAX_JSON_BYTES =
  200 * 1024;

const MAX_MESSAGES =
  24;

const MAX_MESSAGE_LENGTH =
  4000;

/* =========================================================
   CEFR RULES
========================================================= */

const LEVEL_RULES = {
  A1: `
Use very simple German.
Short sentences.
Common everyday words.
Avoid unnecessary grammar complexity.
Ask simple follow-up questions.
`,

  A2: `
Use simple everyday German.
Keep sentences reasonably short.
Introduce slightly more vocabulary but remain accessible.
`,

  B1: `
Use natural everyday German at B1 level.
Allow moderately complex sentences.
Correct important mistakes without overwhelming the learner.
`,

  B2: `
Use natural German around B2 level.
Use richer vocabulary and more natural sentence structures.
Explain meaningful errors clearly.
`,

  C1: `
Use advanced, natural German.
Use precise vocabulary and nuanced expressions.
Correct subtle grammar and style problems when useful.
`,

  C2: `
Use highly natural, precise German.
Allow sophisticated vocabulary and nuanced expression.
Focus on idiomatic and stylistic accuracy.
`
};

/* =========================================================
   SKILLS
========================================================= */

const SKILLS = {
  case_dative_after_mit:
    "Dativ nach „mit“",

  word_order_main_clause:
    "Wortstellung im Hauptsatz",

  subordinate_clause_verb_position:
    "Verbposition im Nebensatz",

  article_accusative_masculine:
    "Artikel im Akkusativ",

  article_dative:
    "Artikel im Dativ",

  verb_conjugation:
    "Verbkonjugation",

  past_tense_auxiliary:
    "Hilfsverb im Perfekt",

  preposition_case:
    "Präposition und Kasus",

  adjective_ending:
    "Adjektivendung",

  plural_form:
    "Pluralbildung",

  word_choice:
    "Wortwahl",

  collocation:
    "Typische Wortverbindungen",

  natural_expression:
    "Natürliches Deutsch"
};

/* =========================================================
   RESPONSE SCHEMA
========================================================= */

const RESPONSE_SCHEMA = {
  type: "object",

  additionalProperties: false,

  properties: {
    reply: {
      type: "string"
    },

    translation: {
      type: "string"
    },

    correction: {
      type: "string"
    },

    correctionExplanation: {
      type: "string"
    },

    correctionType: {
      type: "string"
    },

    vocabulary: {
      type: "array",

      items: {
        type: "object",

        additionalProperties: false,

        properties: {
          german: {
            type: "string"
          },

          meaning: {
            type: "string"
          }
        },

        required: [
          "german",
          "meaning"
        ]
      }
    },

    learning: {
      type: "object",

      additionalProperties: false,

      properties: {
        skillId: {
          type: "string"
        },

        label: {
          type: "string"
        },

        correct: {
          type: "boolean"
        }
      },

      required: [
        "skillId",
        "label",
        "correct"
      ]
    }
  },

  required: [
    "reply",
    "translation",
    "correction",
    "correctionExplanation",
    "correctionType",
    "vocabulary",
    "learning"
  ]
};

/* =========================================================
   BASIC HELPERS
========================================================= */

function text(value, fallback = "") {
  return typeof value === "string"
    ? value.trim()
    : fallback;
}

function json(value) {
  return JSON.stringify(value);
}

function corsHeaders(origin) {
  return {
    "Access-Control-Allow-Origin": origin,
    "Access-Control-Allow-Methods":
      "GET, POST, OPTIONS",

    "Access-Control-Allow-Headers":
      "Content-Type, Authorization",

    "Access-Control-Max-Age":
      "86400",

    "Vary": "Origin"
  };
}

function response(
  body,
  status = 200,
  origin = ALLOWED_ORIGIN
) {
  return new Response(
    json(body),
    {
      status,

      headers: {
        ...corsHeaders(origin),
        "Content-Type":
          "application/json; charset=utf-8",

        "Cache-Control":
          "no-store"
      }
    }
  );
}

function getCorsOrigin(request) {
  const origin =
    request.headers.get("Origin");

  if (origin === ALLOWED_ORIGIN) {
    return ALLOWED_ORIGIN;
  }

  /*
   * For direct browser testing, we still return the
   * production origin. The actual API remains protected
   * by the server-side API key.
   */
  return ALLOWED_ORIGIN;
}

function clamp(value, min, max) {
  return Math.max(
    min,
    Math.min(max, value)
  );
}

/* =========================================================
   DATA CLEANING
========================================================= */

function cleanSkill(value) {
  const raw =
    text(value);

  const aliases = {
    "Verb position in main clauses":
      "word_order_main_clause",

    "Verb position in main clause":
      "word_order_main_clause",

    "Verb position in subordinate clauses":
      "subordinate_clause_verb_position",

    "Dative after 'mit'":
      "case_dative_after_mit",

    "Dative after mit":
      "case_dative_after_mit",

    "Dativ nach „mit“":
      "case_dative_after_mit"
  };

  const id =
    aliases[raw] || raw;

  if (SKILLS[id]) {
    return id;
  }

  return "";
}

function cleanMemory(memory) {
  if (!memory || typeof memory !== "object") {
    return {
      knownVocabulary: [],
      mistakes: [],
      profile: []
    };
  }

  const knownVocabulary =
    Array.isArray(memory.knownVocabulary)
      ? memory.knownVocabulary
          .slice(-100)
          .map(item => {
            if (typeof item === "string") {
              return {
                word: item.slice(0, 100)
              };
            }

            if (
              item &&
              typeof item === "object"
            ) {
              return {
                word:
                  text(
                    item.word ||
                    item.german
                  ).slice(0, 100),

                meaning:
                  text(
                    item.meaning ||
                    item.translation ||
                    item.english
                  ).slice(0, 150)
              };
            }

            return null;
          })
          .filter(Boolean)
      : [];

  const mistakes =
    Array.isArray(memory.mistakes)
      ? memory.mistakes
          .slice(-50)
          .map(item => ({
            userText:
              text(item?.userText)
                .slice(0, 500),

            correction:
              text(item?.correction)
                .slice(0, 500),

            explanation:
              text(item?.explanation)
                .slice(0, 500)
          }))
          .filter(
            item =>
              item.userText ||
              item.correction
          )
      : [];

  const profile =
    Array.isArray(memory.profile)
      ? memory.profile
          .slice(-30)
          .map(item => ({
            id:
              cleanSkill(
                item?.id ||
                item?.skill
              ),

            label:
              text(item?.label)
                .slice(0, 150),

            attempts:
              clamp(
                Number(item?.attempts || 0),
                0,
                10000
              ),

            correct:
              clamp(
                Number(item?.correct || 0),
                0,
                10000
              )
          }))
          .filter(item => item.id)
      : [];

  return {
    knownVocabulary,
    mistakes,
    profile
  };
}

function cleanMessages(messages) {
  if (!Array.isArray(messages)) {
    return [];
  }

  return messages
    .slice(-MAX_MESSAGES)
    .map(message => {
      const role =
        message?.role === "assistant"
          ? "assistant"
          : "user";

      const content =
        text(message?.content)
          .slice(0, MAX_MESSAGE_LENGTH);

      return {
        role,
        content
      };
    })
    .filter(message => message.content);
}

/* =========================================================
   SYSTEM PROMPT
========================================================= */

function buildPrompt(
  level,
  topic,
  memory
) {
  const rules =
    LEVEL_RULES[level] ||
    LEVEL_RULES.B1;

  return `
You are Deutsch Coach, a friendly German language
conversation partner and teacher.

The learner's CEFR level is ${level}.
The current topic is ${topic}.

${rules}

Your main goal is to help the learner communicate
naturally in German.

CONVERSATION RULES:

1. Reply primarily in German.

2. Keep the conversation natural.
Do not sound like a textbook.

3. Ask a useful follow-up question when appropriate.

4. Do not correct every tiny issue if doing so would
make the conversation unnatural.

5. If there is an important grammar or vocabulary error,
provide a short correction.

6. If the learner's sentence is already correct, leave
the correction field empty.

7. Do not invent errors.

8. Do not change correct German merely because another
version is possible.

9. NEVER claim that a verb is in the wrong position if
it is already in the correct position.

10. In particular:
"Was sollst du?" already has "sollst" in second position.
Therefore NEVER explain that the verb is not in second
position for this sentence.

11. Keep explanations appropriate for the learner's level.

12. Vocabulary should normally contain only 0-3 genuinely
useful words or expressions.

13. Do not repeatedly teach words already present in the
known vocabulary unless there is a good reason.

14. The translation field should give a concise English
meaning of the coach's reply, not a word-by-word analysis.

LEARNING PROFILE:

Use one stable skill ID whenever a grammar or language
skill is clearly relevant.

Available skill IDs:

${Object.entries(SKILLS)
  .map(([id, label]) =>
    `${id}: ${label}`
  )
  .join("\n")}

If no specific skill is relevant, use:
skillId = "natural_expression"

Set learning.correct to true only when the learner
demonstrated the skill correctly.

Set it to false when the learner made a meaningful
mistake related to the selected skill.

MEMORY:

Known vocabulary:
${json(memory.knownVocabulary)}

Recent mistakes:
${json(memory.mistakes)}

Learning profile:
${json(memory.profile)}

Return ONLY the requested structured response.
`;
}

/* =========================================================
   OPENAI RESPONSE EXTRACTION
========================================================= */

function extractResponseText(result) {
  if (
    result &&
    typeof result.output_text === "string"
  ) {
    return result.output_text;
  }

  const parts = [];

  if (
    result &&
    Array.isArray(result.output)
  ) {
    for (const item of result.output) {
      if (
        item &&
        Array.isArray(item.content)
      ) {
        for (const content of item.content) {
          if (
            content &&
            typeof content.text === "string"
          ) {
            parts.push(content.text);
          }
        }
      }
    }
  }

  return parts.join("\n").trim();
}

function parseStructuredJSON(result) {
  const raw =
    extractResponseText(result);

  if (!raw) {
    throw new Error(
      "OpenAI returned an empty response."
    );
  }

  try {
    return JSON.parse(raw);
  } catch (_) {
    /*
     * Sometimes a model response can contain a JSON code
     * fence. Remove only the fence, then try again.
     */
    const cleaned =
      raw
        .replace(/^```json\s*/i, "")
        .replace(/^```\s*/i, "")
        .replace(/\s*```$/i, "")
        .trim();

    try {
      return JSON.parse(cleaned);
    } catch (error) {
      console.error(
        "Could not parse structured response:",
        raw
      );

      throw new Error(
        "The AI returned an invalid response."
      );
    }
  }
}

/* =========================================================
   NORMALIZE AI RESPONSE
========================================================= */

function normalizeAIResponse(result) {
  const vocabulary =
    Array.isArray(result?.vocabulary)
      ? result.vocabulary
          .slice(0, 5)
          .map(item => ({
            german:
              text(
                item?.german ||
                item?.word
              ).slice(0, 100),

            meaning:
              text(
                item?.meaning ||
                item?.translation ||
                item?.english
              ).slice(0, 150)
          }))
          .filter(
            item =>
              item.german
          )
      : [];

  const learning =
    result?.learning &&
    typeof result.learning === "object"
      ? {
          skillId:
            cleanSkill(
              result.learning.skillId ||
              result.learning.id ||
              result.learning.skill
            ) ||
            "natural_expression",

          label:
            text(
              result.learning.label
            ).slice(0, 150) ||
            SKILLS.natural_expression,

          correct:
            result.learning.correct === true
        }
      : {
          skillId:
            "natural_expression",

          label:
            SKILLS.natural_expression,

          correct: false
        };

  return {
    reply:
      text(result?.reply) ||
      "Entschuldigung, ich habe gerade keine Antwort.",

    translation:
      text(result?.translation),

    correction:
      text(result?.correction),

    correctionExplanation:
      text(result?.correctionExplanation),

    correctionType:
      text(result?.correctionType),

    vocabulary,

    learning
  };
}

/* =========================================================
   OPENAI CHAT
========================================================= */

async function callOpenAIChat(
  env,
  level,
  topic,
  messages,
  memory
) {
  const prompt =
    buildPrompt(
      level,
      topic,
      memory
    );

  const response =
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

        body: JSON.stringify({
          model: OPENAI_MODEL,

          instructions: prompt,

          input: messages.map(message => ({
            role: message.role,
            content: message.content
          })),

          max_output_tokens: 900,

          text: {
            format: {
              type: "json_schema",

              name:
                "deutsch_coach_response",

              strict: true,

              schema:
                RESPONSE_SCHEMA
            }
          }
        })
      }
    );

  const raw =
    await response.text();

  let parsed = null;

  try {
    parsed =
      raw
        ? JSON.parse(raw)
        : null;
  } catch (_) {
    parsed = null;
  }

  if (!response.ok) {
    console.error(
      "OpenAI chat error:",
      response.status,
      raw
    );

    const upstream =
      text(
        parsed?.error?.message
      );

    throw new Error(
      upstream
        ? `OpenAI error: ${upstream}`
        : `OpenAI request failed (${response.status}).`
    );
  }

  if (!parsed) {
    throw new Error(
      "OpenAI returned an empty response."
    );
  }

  return normalizeAIResponse(
    parseStructuredJSON(parsed)
  );
}

/* =========================================================
   CHAT HANDLER
========================================================= */

async function handleChat(
  request,
  env,
  origin
) {
  if (!env.OPENAI_API_KEY) {
    return response(
      {
        error:
          "OPENAI_API_KEY is not configured in Cloudflare."
      },
      500,
      origin
    );
  }

  const contentLength =
    Number(
      request.headers.get(
        "Content-Length"
      ) || 0
    );

  if (
    contentLength &&
    contentLength > MAX_JSON_BYTES
  ) {
    return response(
      {
        error:
          "The request is too large."
      },
      413,
      origin
    );
  }

  let body;

  try {
    body =
      await request.json();
  } catch (_) {
    return response(
      {
        error:
          "Invalid JSON request."
      },
      400,
      origin
    );
  }

  const level =
    [
      "A1",
      "A2",
      "B1",
      "B2",
      "C1",
      "C2"
    ].includes(body?.level)
      ? body.level
      : "B1";

  const topic =
    text(
      body?.topic,
      "Freies Gespräch"
    ).slice(0, 100);

  const messages =
    cleanMessages(
      body?.messages
    );

  if (!messages.length) {
    return response(
      {
        error:
          "No conversation messages provided."
      },
      400,
      origin
    );
  }

  const memory =
    cleanMemory(
      body?.memory
    );

  try {
    const result =
      await callOpenAIChat(
        env,
        level,
        topic,
        messages,
        memory
      );

    return response(
      result,
      200,
      origin
    );

  } catch (error) {
    console.error(
      "Chat handler error:",
      error
    );

    return response(
      {
        error:
          error?.message ||
          "The AI service returned an error."
      },
      502,
      origin
    );
  }
}

/* =========================================================
   TRANSCRIPTION ERROR CLEANING
========================================================= */

function safeOpenAIError(raw) {
  if (!raw) {
    return "";
  }

  try {
    const parsed =
      JSON.parse(raw);

    const message =
      text(
        parsed?.error?.message
      );

    if (message) {
      return message;
    }

    return "";
  } catch (_) {
    return "";
  }
}

/* =========================================================
   TRANSCRIPTION
========================================================= */

async function handleTranscription(
  request,
  env,
  origin
) {
  if (!env.OPENAI_API_KEY) {
    return response(
      {
        error:
          "OPENAI_API_KEY is not configured in Cloudflare."
      },
      500,
      origin
    );
  }

  const contentLength =
    Number(
      request.headers.get(
        "Content-Length"
      ) || 0
    );

  if (
    contentLength &&
    contentLength > MAX_AUDIO_BYTES
  ) {
    return response(
      {
        error:
          "The recording is too large. Please record a shorter message."
      },
      413,
      origin
    );
  }

  let form;

  try {
    form =
      await request.formData();
  } catch (error) {
    console.error(
      "FormData error:",
      error
    );

    return response(
      {
        error:
          "The audio upload could not be read."
      },
      400,
      origin
    );
  }

  const file =
    form.get("audio");

  if (!(file instanceof File)) {
    return response(
      {
        error:
          "No audio recording was received."
      },
      400,
      origin
    );
  }

  if (!file.size) {
    return response(
      {
        error:
          "The audio recording is empty."
      },
      400,
      origin
    );
  }

  if (
    file.size > MAX_AUDIO_BYTES
  ) {
    return response(
      {
        error:
          "The recording is too large. Please record a shorter message."
      },
      413,
      origin
    );
  }

  const upload =
    new FormData();

  upload.append(
    "file",
    file,
    file.name ||
      "recording.webm"
  );

  upload.append(
    "model",
    TRANSCRIBE_MODEL
  );

  /*
   * Tell the transcription model the expected language.
   */
  upload.append(
    "language",
    "de"
  );

  let openAIResponse;

  try {
    openAIResponse =
      await fetch(
        "https://api.openai.com/v1/audio/transcriptions",
        {
          method: "POST",

          headers: {
            "Authorization":
              `Bearer ${env.OPENAI_API_KEY}`
          },

          body: upload
        }
      );
  } catch (error) {
    console.error(
      "OpenAI transcription network error:",
      error
    );

    return response(
      {
        error:
          "Could not connect to the OpenAI transcription service."
      },
      502,
      origin
    );
  }

  const raw =
    await openAIResponse.text();

  if (!openAIResponse.ok) {
    console.error(
      "OpenAI transcription error:",
      openAIResponse.status,
      raw
    );

    const upstream =
      safeOpenAIError(raw);

    let message =
      "The recording could not be transcribed.";

    if (upstream) {
      message +=
        " " + upstream;
    }

    return response(
      {
        error: message
      },
      502,
      origin
    );
  }

  let result;

  try {
    result =
      JSON.parse(raw);
  } catch (_) {
    console.error(
      "Invalid transcription response:",
      raw
    );

    return response(
      {
        error:
          "The transcription service returned an invalid response."
      },
      502,
      origin
    );
  }

  const transcript =
    text(result?.text);

  if (!transcript) {
    return response(
      {
        error:
          "No speech was detected in the recording."
      },
      200,
      origin
    );
  }

  return response(
    {
      text: transcript
    },
    200,
    origin
  );
}

/* =========================================================
   HEALTH
========================================================= */

function healthResponse(origin) {
  return response(
    {
      ok: true,
      service: "Deutsch Coach API",
      chatModel: OPENAI_MODEL,
      transcriptionModel:
        TRANSCRIBE_MODEL,
      timestamp:
        new Date().toISOString()
    },
    200,
    origin
  );
}

/* =========================================================
   WORKER
========================================================= */

export default {
  async fetch(request, env) {
    const origin =
      getCorsOrigin(request);

    if (
      request.method === "OPTIONS"
    ) {
      return new Response(
        null,
        {
          status: 204,
          headers:
            corsHeaders(origin)
        }
      );
    }

    const url =
      new URL(request.url);

    try {
      if (
        request.method === "GET" &&
        url.pathname === "/health"
      ) {
        return healthResponse(
          origin
        );
      }

      if (
        request.method === "GET" &&
        url.pathname === "/"
      ) {
        return response(
          {
            ok: true,
            service:
              "Deutsch Coach API"
          },
          200,
          origin
        );
      }

      if (
        request.method === "POST" &&
        url.pathname === "/chat"
      ) {
        return await handleChat(
          request,
          env,
          origin
        );
      }

      if (
        request.method === "POST" &&
        url.pathname === "/transcribe"
      ) {
        return await handleTranscription(
          request,
          env,
          origin
        );
      }

      return response(
        {
          error:
            "Not found."
        },
        404,
        origin
      );

    } catch (error) {
      console.error(
        "Unhandled Worker error:",
        error
      );

      return response(
        {
          error:
            "The server encountered an unexpected error."
        },
        500,
        origin
      );
    }
  }
};