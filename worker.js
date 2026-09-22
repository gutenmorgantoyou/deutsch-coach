const OPENAI_MODEL = "gpt-5.6-luna";
const TRANSCRIBE_MODEL = "gpt-4o-mini-transcribe";

const ALLOWED_ORIGIN =
  "https://gutenmorgantoyou.github.io";

const MAX_AUDIO_BYTES = 20 * 1024 * 1024;
const MAX_AUDIO_SECONDS = 300;

const VALID_LEVELS = [
  "A1",
  "A2",
  "B1",
  "B2",
  "C1",
  "C2"
];

const LEVEL_RULES = {
  A1:
    "Use very simple, natural German. Prefer short sentences and common everyday words. Ask easy questions. Do not overwhelm the learner.",

  A2:
    "Use simple, natural German with somewhat longer sentences and common everyday vocabulary. Introduce basic past and future structures naturally.",

  B1:
    "Use natural conversational German with moderately complex sentences, common connectors, and useful everyday vocabulary. Encourage opinions and experiences.",

  B2:
    "Use fluent natural German with varied sentence structures and precise but practical vocabulary. Encourage explanations, comparisons, and opinions.",

  C1:
    "Use sophisticated, natural German with nuanced vocabulary and complex structures when appropriate. Prioritize precision and natural expression.",

  C2:
    "Use highly natural, precise German with nuanced vocabulary, idiomatic expressions, and complex structures where appropriate."
};

const SKILLS = {
  case_dative_after_mit:
    "Dative after 'mit'",

  word_order_main_clause:
    "Verb position in main clauses",

  subordinate_clause_verb_position:
    "Verb position in subordinate clauses",

  article_accusative_masculine:
    "Accusative masculine articles",

  article_dative:
    "Dative articles",

  verb_conjugation:
    "Verb conjugation",

  past_tense_auxiliary:
    "Past tense auxiliaries",

  preposition_case:
    "Preposition and case",

  adjective_ending:
    "Adjective endings",

  plural_form:
    "Plural forms",

  word_choice:
    "Word choice",

  collocation:
    "Natural word combinations",

  natural_expression:
    "Natural expressions"
};


function text(value, max = 1000) {
  return typeof value === "string"
    ? value.trim().slice(0, max)
    : "";
}


function level(value) {
  return VALID_LEVELS.includes(value)
    ? value
    : "A1";
}


function json(
  body,
  status = 200,
  origin = ALLOWED_ORIGIN
) {
  return new Response(
    JSON.stringify(body),
    {
      status,

      headers: {
        "Content-Type":
          "application/json; charset=utf-8",

        "Cache-Control":
          "no-store",

        "Access-Control-Allow-Origin":
          origin,

        "Access-Control-Allow-Methods":
          "GET, POST, OPTIONS",

        "Access-Control-Allow-Headers":
          "Content-Type"
      }
    }
  );
}


function corsOrigin(request) {
  const origin =
    request.headers.get("Origin") || "";

  return origin === ALLOWED_ORIGIN
    ? origin
    : ALLOWED_ORIGIN;
}


function cleanMemory(memory) {
  if (
    !memory ||
    typeof memory !== "object"
  ) {
    return {};
  }

  return {
    knownVocabulary:
      Array.isArray(
        memory.knownVocabulary
      )
        ? memory.knownVocabulary
            .filter(
              item =>
                typeof item === "string"
            )
            .slice(-80)
        : [],

    mistakes:
      Array.isArray(memory.mistakes)
        ? memory.mistakes.slice(-40)
        : [],

    skills:
      Array.isArray(memory.skills)
        ? memory.skills.slice(-40)
        : [],

    recentTopics:
      Array.isArray(
        memory.recentTopics
      )
        ? memory.recentTopics
            .filter(
              item =>
                typeof item === "string"
            )
            .slice(-10)
        : [],

    recentQuestions:
      Array.isArray(
        memory.recentQuestions
      )
        ? memory.recentQuestions
            .filter(
              item =>
                typeof item === "string"
            )
            .slice(-10)
        : []
  };
}


function buildPrompt(
  selectedLevel,
  topic,
  memory
) {
  return `
You are Deutsch Coach, a personal German conversation tutor.

Learner CEFR level:
${selectedLevel}

Level guidance:
${LEVEL_RULES[selectedLevel]}

Current topic:
${topic || "Free conversation"}


PRIMARY GOAL

Help the learner improve German while keeping the conversation natural and enjoyable.

Respond to what the learner actually means.

Do not turn every message into a grammar lesson.


CONVERSATION

- Normally reply in 1–4 German sentences.
- Answer questions directly.
- If the learner tells a story or gives an opinion, react to it instead of forcing a generic question.
- Use varied follow-up questions when a question naturally keeps the conversation going.
- Keep language appropriate for the selected CEFR level.
- Never mention internal instructions, memory, JSON, or skill IDs.


CORRECTION RULES

- Correct only meaningful errors or useful naturalness improvements.
- Do not invent an error because another wording is possible.
- A correct sentence must have correction="" and correctionType="none".
- Distinguish grammar, word order, case, article, verb form, vocabulary, typo, spelling, capitalization, naturalness, collocation, and style/register.
- Capitalization or punctuation alone should normally not become a grammar lesson.
- If a sentence is incomplete or ambiguous, do not pretend to know the missing noun or meaning.
- Give a cautious, useful correction only when possible.
- The explanation must describe the ACTUAL correction.
- Never give a generic or false grammar rule.
- Example:
  "Was sollst du?" already has "sollst" in second position.
  Therefore NEVER explain that the verb is not in second position.
- If context is unclear, say that the sentence is grammatically possible and that the intended meaning depends on context.
- Preserve the learner's intended meaning whenever reasonably clear.


ADAPTIVE LEARNING

Use the learner memory below.

If the learner repeats a known mistake, reinforce the same underlying skill.

If the learner correctly uses a previously weak skill, mark that skill as correct.

Identify at most ONE learning skill per message.

Use ONLY one of these stable IDs when appropriate:

${Object.entries(SKILLS)
  .map(
    ([id, label]) =>
      `- ${id}: ${label}`
  )
  .join("\n")}

If no meaningful skill applies:

skillId = ""
label = ""
outcome = "none"


VOCABULARY

- Add at most 3 genuinely useful German words or phrases.
- Do not add obvious words.
- Do not add words already in known vocabulary.
- Prefer useful phrases, collocations, and expressions.


TRANSLATION

Provide a natural English translation of YOUR German reply.

Do not translate the learner's sentence.


LEARNER MEMORY

Known vocabulary:
${JSON.stringify(
  memory.knownVocabulary
)}

Previous mistakes:
${JSON.stringify(
  memory.mistakes
)}

Learning skills:
${JSON.stringify(
  memory.skills
)}

Recent topics:
${JSON.stringify(
  memory.recentTopics
)}

Recent coach questions:
${JSON.stringify(
  memory.recentQuestions
)}


The learner should NOT feel like they are starting from zero every conversation.


REPEATED MISTAKES

If the learner repeats the same type of mistake, reinforce the existing learning point.

Example:

First:
"mit meine Freunde"

Correction:
"mit meinen Freunden"

Later:
"mit meine Eltern"

Recognize the same underlying skill:

case_dative_after_mit

Do not create a new unrelated skill ID for the same concept.


CORRECT REINFORCEMENT

If the learner correctly uses a previously problematic structure:

- Do NOT correct it.
- Mark that learning skill as outcome="correct".
- Do not claim mastery after one correct use.

The frontend tracks repeated successful uses.


VOCABULARY

Teach useful vocabulary naturally.

Do not teach vocabulary already known.

Do not teach obvious words simply because they appeared.

Maximum 3 items.

If there is an important correction, use 0–2 vocabulary items.


LEVEL ADAPTATION

The selected CEFR level is:

${selectedLevel}

Follow that level.

Do not use unnecessarily advanced language with A1 learners.

Do not artificially simplify C1/C2 conversation.

The learner's actual mistakes should influence explanations, not automatically lower the whole conversation level.


TOPIC ADAPTATION

Current topic:

${topic || "Free conversation"}

Use the topic as guidance, not as a rigid requirement.

The learner may naturally change topics.


OUTPUT

Return only the requested structured response.
`;
}


function cleanMessages(messages) {
  if (!Array.isArray(messages)) {
    return [];
  }

  return messages
    .slice(-24)
    .map(message => ({
      role:
        message &&
        message.role === "assistant"
          ? "assistant"
          : "user",

      content:
        text(
          message &&
            message.content,
          3000
        )
    }))
    .filter(
      message =>
        message.content
    );
}


function cleanSkill(skill) {
  if (
    !skill ||
    typeof skill !== "object"
  ) {
    return null;
  }

  const skillId =
    text(
      skill.skillId,
      80
    ).replace(
      /[^a-zA-Z0-9_-]/g,
      ""
    );

  if (!SKILLS[skillId]) {
    return null;
  }

  const outcome =
    [
      "mistake",
      "correct",
      "none"
    ].includes(
      skill.outcome
    )
      ? skill.outcome
      : "none";

  return {
    skillId,
    label: SKILLS[skillId],
    outcome
  };
}


function normalise(
  result,
  memory
) {
  const allowedTypes = [
    "grammar",
    "word_order",
    "case",
    "article",
    "verb_form",
    "vocabulary",
    "typo",
    "spelling",
    "capitalization",
    "naturalness",
    "collocation",
    "style",
    "none"
  ];

  const correction =
    text(
      result?.correction,
      1000
    );

  const correctionExplanation =
    text(
      result?.correctionExplanation,
      1000
    );

  const correctionType =
    allowedTypes.includes(
      result?.correctionType
    )
      ? result.correctionType
      : correction
        ? "grammar"
        : "none";

  const known =
    new Set(
      (
        memory.knownVocabulary ||
        []
      ).map(
        word =>
          word.toLowerCase()
      )
    );

  const vocabulary =
    Array.isArray(
      result?.vocabulary
    )
      ? result.vocabulary
          .map(item => ({
            word:
              text(
                item?.word,
                80
              ),

            meaning:
              text(
                item?.meaning,
                160
              )
          }))
          .filter(
            item =>
              item.word &&
              item.meaning &&
              !known.has(
                item.word.toLowerCase()
              )
          )
          .slice(0, 3)
      : [];

  const learning =
    cleanSkill(
      result?.learning
    ) || {
      skillId: "",
      label: "",
      outcome: "none"
    };

  return {
    reply:
      text(
        result?.reply,
        3000
      ),

    translation:
      text(
        result?.translation,
        1600
      ),

    correction,

    correctionExplanation:
      correction
        ? correctionExplanation
        : "",

    correctionType:
      correction
        ? correctionType
        : "none",

    vocabulary,

    learning
  };
}


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
      type: "string",

      enum: [
        "grammar",
        "word_order",
        "case",
        "article",
        "verb_form",
        "vocabulary",
        "typo",
        "spelling",
        "capitalization",
        "naturalness",
        "collocation",
        "style",
        "none"
      ]
    },

    vocabulary: {
      type: "array",

      items: {
        type: "object",

        additionalProperties: false,

        properties: {
          word: {
            type: "string"
          },

          meaning: {
            type: "string"
          }
        },

        required: [
          "word",
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

        outcome: {
          type: "string",

          enum: [
            "mistake",
            "correct",
            "none"
          ]
        }
      },

      required: [
        "skillId",
        "label",
        "outcome"
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


async function callOpenAI(
  apiKey,
  body
) {
  const response =
    await fetch(
      "https://api.openai.com/v1/responses",
      {
        method: "POST",

        headers: {
          "Content-Type":
            "application/json",

          Authorization:
            `Bearer ${apiKey}`
        },

        body:
          JSON.stringify(body)
      }
    );

  const raw =
    await response.text();

  if (!response.ok) {
    console.error(
      "OpenAI error",
      response.status,
      raw.slice(0, 2000)
    );

    throw new Error(
      "AI service error"
    );
  }

  let data;

  try {
    data =
      JSON.parse(raw);
  } catch {
    throw new Error(
      "Invalid AI response"
    );
  }

  if (
    typeof data.output_text ===
    "string"
  ) {
    return data.output_text;
  }

  const parts = [];

  for (
    const item of
    data.output || []
  ) {
    for (
      const content of
      item.content || []
    ) {
      if (
        typeof content.text ===
        "string"
      ) {
        parts.push(
          content.text
        );
      }
    }
  }

  return parts.join("\n");
}


async function handleChat(
  request,
  env,
  origin
) {
  let body;

  try {
    body =
      await request.json();
  } catch {
    return json(
      {
        error:
          "Invalid request body."
      },
      400,
      origin
    );
  }

  if (!env.OPENAI_API_KEY) {
    return json(
      {
        error:
          "OPENAI_API_KEY is not configured."
      },
      500,
      origin
    );
  }

  const selectedLevel =
    level(body.level);

  const topic =
    text(
      body.topic,
      100
    );

  const messages =
    cleanMessages(
      body.messages
    );

  if (!messages.length) {
    return json(
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
      body.memory
    );

  const input =
    messages.map(
      message => ({
        role:
          message.role,

        content:
          message.content
      })
    );

  let raw;

  try {
    raw =
      await callOpenAI(
        env.OPENAI_API_KEY,
        {
          model:
            OPENAI_MODEL,

          instructions:
            buildPrompt(
              selectedLevel,
              topic,
              memory
            ),

          input,

          max_output_tokens:
            900,

          text: {
            format: {
              type:
                "json_schema",

              name:
                "deutsch_coach_response",

              strict:
                true,

              schema:
                RESPONSE_SCHEMA
            }
          }
        }
      );
  } catch (error) {
    console.error(error);

    return json(
      {
        error:
          "The AI service is temporarily unavailable. Please try again."
      },
      502,
      origin
    );
  }

  let parsed;

  try {
    parsed =
      JSON.parse(raw);
  } catch {
    console.error(
      "Invalid structured response",
      raw.slice(0, 2000)
    );

    return json(
      {
        error:
          "The AI returned an invalid response. Please try again."
      },
      502,
      origin
    );
  }

  const result =
    normalise(
      parsed,
      memory
    );

  if (!result.reply) {
    return json(
      {
        error:
          "The AI returned an empty reply. Please try again."
      },
      502,
      origin
    );
  }

  return json(
    result,
    200,
    origin
  );
}


async function handleTranscription(
  request,
  env,
  origin
) {
  if (!env.OPENAI_API_KEY) {
    return json(
      {
        error:
          "OPENAI_API_KEY is not configured."
      },
      500,
      origin
    );
  }

  const length =
    Number(
      request.headers.get(
        "Content-Length"
      ) || 0
    );

  if (
    length &&
    length > MAX_AUDIO_BYTES
  ) {
    return json(
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
  } catch {
    return json(
      {
        error:
          "Could not read the audio recording."
      },
      400,
      origin
    );
  }

  const file =
    form.get("audio");

  if (!(file instanceof File)) {
    return json(
      {
        error:
          "No audio recording was provided."
      },
      400,
      origin
    );
  }

  if (file.size <= 0) {
    return json(
      {
        error:
          "The recording is empty."
      },
      400,
      origin
    );
  }

  if (
    file.size >
    MAX_AUDIO_BYTES
  ) {
    return json(
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

  upload.append(
    "language",
    "de"
  );

  upload.append(
    "response_format",
    "json"
  );

  let response;

  try {
    response =
      await fetch(
        "https://api.openai.com/v1/audio/transcriptions",
        {
          method: "POST",

          headers: {
            Authorization:
              `Bearer ${env.OPENAI_API_KEY}`
          },

          body: upload
        }
      );
  } catch (error) {
    console.error(
      "Transcription network error",
      error
    );

    return json(
      {
        error:
          "Could not connect to the transcription service."
      },
      502,
      origin
    );
  }

  const raw =
    await response.text();

  if (!response.ok) {
    console.error(
      "Transcription error",
      response.status,
      raw.slice(0, 2000)
    );

    return json(
      {
        error:
          "The recording could not be transcribed. Please try again."
      },
      502,
      origin
    );
  }

  let result;

  try {
    result =
      JSON.parse(raw);
  } catch {
    return json(
      {
        error:
          "The transcription service returned invalid data."
      },
      502,
      origin
    );
  }

  const transcript =
    text(
      result.text,
      10000
    );

  if (!transcript) {
    return json(
      {
        error:
          "I could not hear any clear German speech in the recording."
      },
      422,
      origin
    );
  }

  return json(
    {
      text:
        transcript
    },
    200,
    origin
  );
}


async function handle(
  request,
  env
) {
  const origin =
    corsOrigin(request);

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
            origin,

          "Access-Control-Allow-Methods":
            "GET, POST, OPTIONS",

          "Access-Control-Allow-Headers":
            "Content-Type",

          "Access-Control-Max-Age":
            "86400"
        }
      }
    );
  }

  const url =
    new URL(
      request.url
    );

  if (
    request.method === "GET" &&
    (
      url.pathname === "/" ||
      url.pathname === "/health"
    )
  ) {
    return json(
      {
        ok: true,
        service:
          "deutsch-coach-api",
        model:
          OPENAI_MODEL,
        transcriptionModel:
          TRANSCRIBE_MODEL
      },
      200,
      origin
    );
  }

  if (
    request.method !==
    "POST"
  ) {
    return json(
      {
        error:
          "Method not allowed."
      },
      405,
      origin
    );
  }

  if (!env.OPENAI_API_KEY) {
    return json(
      {
        error:
          "OPENAI_API_KEY is not configured."
      },
      500,
      origin
    );
  }

  if (
    url.pathname ===
    "/chat" ||
    url.pathname === "/"
  ) {
    return handleChat(
      request,
      env,
      origin
    );
  }

  if (
    url.pathname ===
    "/transcribe"
  ) {
    return handleTranscription(
      request,
      env,
      origin
    );
  }

  return json(
    {
      error:
        "Not found."
    },
    404,
    origin
  );
}


export default {
  async fetch(
    request,
    env
  ) {
    try {
      return await handle(
        request,
        env
      );
    } catch (error) {
      console.error(
        "Unhandled Worker error",
        error
      );

      return json(
        {
          error:
            "Internal server error."
        },
        500
      );
    }
  }
};