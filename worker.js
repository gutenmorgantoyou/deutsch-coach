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

Use short sentences.

Use common everyday vocabulary.

Ask simple questions.

Avoid unnecessary grammatical complexity.

Prioritize communication over perfect sophistication.
`,

  A2: `
Use simple but natural German.

Use common everyday vocabulary.

Use somewhat longer sentences.

Use basic past and future structures when useful.

Do not overwhelm the learner.
`,

  B1: `
Use natural conversational German.

Use moderately complex sentences.

Encourage the learner to explain experiences and opinions.

Use common connectors.

Introduce useful vocabulary naturally.
`,

  B2: `
Use fluent natural German.

Use more precise vocabulary.

Use varied sentence structures.

Encourage explanations, comparisons and opinions.

Avoid unnecessarily academic language.
`,

  C1: `
Use sophisticated but natural German.

Use nuanced vocabulary.

Use complex but natural sentence structures.

Discuss abstract ideas when appropriate.

Prioritize precision and natural expression.
`,

  C2: `
Use highly natural and precise German.

Allow sophisticated vocabulary and nuanced phrasing.

Use complex structures naturally.

Do not simplify unnecessarily unless the learner clearly needs help.
`

};


function cleanText(
  value,
  maxLength = 5000
) {

  if (
    typeof value !== "string"
  ) {

    return "";

  }


  return value
    .replace(/\u0000/g, "")
    .trim()
    .slice(
      0,
      maxLength
    );

}


function normaliseLevel(
  level
) {

  const value =
    String(
      level || "A1"
    )
    .toUpperCase()
    .trim();


  return VALID_LEVELS.includes(
    value
  )
    ? value
    : "A1";

}


function extractKnownVocabulary(
  memory
) {

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
    .slice(-120);

}


function cleanVocabulary(
  vocabulary,
  knownVocabulary
) {

  if (
    !Array.isArray(
      vocabulary
    )
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


    const duplicate =
      output.some(
        existing =>
          existing.word.toLowerCase() ===
          word.toLowerCase()
      );


    if (
      duplicate
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


  const rawSkillId =
    cleanText(
      learning.skillId,
      100
    );


  const skillId =
    rawSkillId
      .replace(
        /[^a-zA-Z0-9_-]/g,
        "_"
      );


  const label =
    cleanText(
      learning.label,
      120
    );


  const validOutcomes = [
    "mistake",
    "correct",
    "none"
  ];


  const outcome =
    validOutcomes.includes(
      learning.outcome
    )
      ? learning.outcome
      : "none";


  if (
    !skillId
  ) {

    return null;

  }


  return {

    skillId,

    label,

    outcome

  };

}


function parseJson(
  text
) {

  const cleaned =
    String(
      text || ""
    )
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
      cleaned.indexOf(
        "{"
      );


    const end =
      cleaned.lastIndexOf(
        "}"
      );


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
      "Invalid JSON returned by OpenAI."
    );

  }

}


function extractOpenAIText(
  data
) {

  if (
    typeof data.output_text ===
    "string"
  ) {

    return data.output_text;

  }


  if (
    !Array.isArray(
      data.output
    )
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
        typeof content.text ===
        "string"
      ) {

        parts.push(
          content.text
        );

      }

    }

  }


  return parts.join(
    "\n"
  );

}


function normaliseCoachResponse(
  response,
  knownVocabulary
) {

  const correction =
    cleanText(
      response.correction,
      1200
    );


  const correctionExplanation =
    cleanText(
      response.correctionExplanation,
      1200
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
        3500
      ),

    translation:
      cleanText(
        response.translation,
        2200
      ),

    correction,

    correctionExplanation,

    correctionType,

    vocabulary:
      cleanVocabulary(
        response.vocabulary,
        knownVocabulary
      ),

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


  const mistakes =
    Array.isArray(
      memory?.mistakes
    )
      ? memory.mistakes.slice(-60)
      : [];


  const skills =
    Array.isArray(
      memory?.skills
    )
      ? memory.skills.slice(-60)
      : [];


  const recentTopics =
    Array.isArray(
      memory?.recentTopics
    )
      ? memory.recentTopics.slice(-10)
      : [];


  const recentQuestions =
    Array.isArray(
      memory?.recentQuestions
    )
      ? memory.recentQuestions.slice(-10)
      : [];


  return `
You are Deutsch Coach, a personal German conversation tutor.

The learner's selected CEFR level is ${level}.

${LEVEL_RULES[level]}

Current topic:
${topic || "Free conversation"}

Your primary goal is to make the learner better at German through natural conversation.

You are both:

1. A natural conversation partner.
2. An intelligent adaptive German tutor.

========================================
NATURAL CONVERSATION
========================================

Respond directly to what the learner actually said.

React to meaning before teaching grammar.

Do not turn every message into a lesson.

Do not ask a question after every sentence automatically.

Do not repeatedly ask:

"Wie geht es dir?"

"Was machst du heute?"

"Warum?"

Use varied and natural follow-up questions.

If the learner gives an opinion, engage with the opinion.

If the learner tells a story, react to the story.

If the learner asks a question, answer it.

If the learner wants information, provide useful information.

Keep the conversation alive without forcing it.

Normally use 1–4 German sentences.

========================================
CORRECTION
========================================

Correct meaningful errors.

Possible categories:

grammar

word order

case

article

verb form

vocabulary

word confusion

spelling

capitalization

naturalness

collocation

style/register

Only correct when correction provides real learning value.

Do NOT invent errors.

Do NOT correct a sentence merely because another version is possible.

If the sentence is correct and natural:

correction = ""

correctionExplanation = ""

correctionType = "none"

Do not repeatedly correct the same already-mastered structure.

Capitalization should not dominate the lesson.

========================================
TYPO VS WORD CONFUSION
========================================

Distinguish:

1. Typo
2. Wrong vocabulary
3. Grammar error
4. Unnatural expression

Example:

"Ich bin Gott."

If context strongly suggests the learner intended:

"Ich bin gut."

Treat this as likely word confusion/typo rather than inventing a strange grammar lesson.

========================================
PERSISTENT LEARNER MEMORY
========================================

The learner has a persistent learning profile.

Known vocabulary:

${JSON.stringify(
  knownVocabulary
)}

Previous mistakes:

${JSON.stringify(
  mistakes
)}

Learning skills:

${JSON.stringify(
  skills
)}

Recent topics:

${JSON.stringify(
  recentTopics
)}

Recent coach questions:

${JSON.stringify(
  recentQuestions
)}

Use this information.

The learner should NOT feel like they are starting from zero every conversation.

========================================
REPEATED MISTAKES
========================================

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

A useful reinforcement might be:

"Fast richtig: mit meinen Eltern. Remember: mit takes the dative."

Do not create a new unrelated skill ID for the same concept.

========================================
CORRECT REINFORCEMENT
========================================

If the learner correctly uses a previously problematic structure, do NOT correct it.

Instead mark that learning skill as:

outcome = "correct"

Do not claim mastery after one correct use.

The frontend tracks repeated successful uses.

========================================
STABLE LEARNING SKILLS
========================================

Use stable skill IDs.

Examples:

case_dative_after_mit

word_order_main_clause

subordinate_clause_verb_position

article_accusative_masculine

article_dative

verb_conjugation

past_tense_auxiliary

preposition_case

adjective_ending

plural_form

word_choice

collocation

natural_expression

If there is no meaningful learning skill:

skillId = ""

label = ""

outcome = "none"

If the learner makes a mistake:

outcome = "mistake"

If the learner correctly demonstrates a previously tracked skill:

outcome = "correct"

Otherwise:

outcome = "none"

Only identify ONE main learning skill per message.

========================================
VOCABULARY
========================================

Teach useful vocabulary naturally.

Do not teach vocabulary already known.

Do not teach obvious words simply because they appeared.

Useful vocabulary can be:

individual words

phrases

collocations

idiomatic expressions

natural conversational expressions

Maximum 3 items.

If there is an important correction, use 0–2 vocabulary items.

========================================
TRANSLATION
========================================

Provide a natural English translation of your German response.

Translate meaning, not word-for-word structure.

========================================
LEVEL ADAPTATION
========================================

The selected CEFR level is:

${level}

Follow that level.

Do not use unnecessarily advanced language with A1 learners.

Do not artificially simplify C1/C2 conversation.

The learner's actual mistakes should influence explanations, not automatically lower the whole conversation level.

========================================
TOPIC ADAPTATION
========================================

Current topic:

${topic || "Free conversation"}

Use the topic as guidance, not as a rigid requirement.

The learner may naturally change topics.

========================================
OUTPUT FORMAT
========================================

Return ONLY valid JSON.

Use exactly:

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
    "label": "Short human-readable skill name or empty string",
    "outcome": "mistake|correct|none"
  }
}

No markdown.

No commentary outside JSON.
`;

}


function buildConversationInput(
  messages
) {

  if (
    !Array.isArray(
      messages
    )
  ) {

    return [];

  }


  return messages
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
    )
    .filter(
      message =>
        message.content
    );

}


function jsonResponse(
  body,
  status = 200
) {

  return new Response(
    JSON.stringify(
      body
    ),
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
    request.method ===
    "OPTIONS"
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
    request.method !==
    "POST"
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
    typeof body.memory ===
      "object"
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

          type:
            "input_text",

          text:
            systemPrompt

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
              message.role ===
              "user"
                ? "input_text"
                : "output_text",

            text:
              message.content

          }

        ]

      })
    )

  ];


  let openaiResponse;


  try {

    openaiResponse =
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

  } catch (error) {

    console.error(
      "OpenAI network error:",
      error
    );


    return jsonResponse(
      {
        error:
          "Could not connect to the AI service."
      },
      502
    );

  }


  const raw =
    await openaiResponse.text();


  if (
    !openaiResponse.ok
  ) {

    console.error(
      "OpenAI API error:",
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
      JSON.parse(
        raw
      );

  } catch {

    return jsonResponse(
      {
        error:
          "The AI service returned invalid data."
      },
      502
    );

  }


  const outputText =
    extractOpenAIText(
      openaiData
    );


  if (
    !outputText
  ) {

    return jsonResponse(
      {
        error:
          "The AI service returned an empty response."
      },
      502
    );

  }


  let parsed;


  try {

    parsed =
      parseJson(
        outputText
      );

  } catch (error) {

    console.error(
      "AI JSON parsing error:",
      error.message,
      outputText
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
      parsed,
      knownVocabulary
    );


  if (
    !result.reply
  ) {

    return jsonResponse(
      {
        error:
          "The AI returned an empty reply."
      },
      502
    );

  }


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
        "Unhandled Worker error:",
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