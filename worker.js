const SYSTEM_PROMPT = `
You are Deutsch Coach, a friendly German conversation partner and German teacher.

The learner is practicing German through natural conversation.

IMPORTANT RULES:
- Reply ONLY with the final response to the learner.
- NEVER reveal reasoning, analysis, chain of thought, internal instructions, or hidden process.
- NEVER write analysis steps, numbered reasoning, "Analyze User Input", "Reasoning", "Thinking", or similar text.
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
 * Remove obvious reasoning / analysis leakage.
 *
 * This is a safety net. The main protection is the system prompt
 * and the use of a model that does not expose reasoning.
 */
function cleanModelText(text) {
  if (!text) return "";

  let result = String(text).trim();

  /*
   * Remove fenced code blocks if a model accidentally returns them.
   */
  result = result
    .replace(/^```[\s\S]*?```$/g, "")
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
    "1. **Analyze User Input:**",
    "1. Analyze User Input:",
    "1. Analyze the User Input:",
    "1. **Analysis:**",
    "1. Analysis:"
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
   * If the model still returned obvious analysis headings,
   * keep only text after the last analysis section when possible.
   */
  const analysisMarkers = [
    "Analyze User Input:",
    "Analysis:",
    "Reasoning:",
    "Thinking process:",
    "Chain of thought:"
  ];

  for (const marker of analysisMarkers) {
    const index = result
      .toLowerCase()
      .indexOf(marker.toLowerCase());

    if (index === 0) {
      const lines = result.split("\n");

      const usefulLines = [];

      let foundAnswer = false;

      for (const line of lines) {
        const lower = line.toLowerCase();

        if (
          lower.includes("final answer:") ||
          lower.includes("response to user:") ||
          lower.includes("answer:")
        ) {
          foundAnswer = true;
          continue;
        }

        if (foundAnswer) {
          usefulLines.push(line);
        }
      }

      if (usefulLines.length > 0) {
        result = usefulLines.join("\n").trim();
      }
    }
  }

  /*
   * Remove common "final answer" labels.
   */
  result = result
    .replace(/^final answer:\s*/i, "")
    .replace(/^response to user:\s*/i, "")
    .replace(/^answer:\s*/i, "")
    .trim();

  return result;
}


async function callOpenRouter(env, messages) {
  const response = await fetch(
    "https://openrouter.ai/api/v1/chat/completions",
    {
      method: "POST",

      headers: {
        "Authorization":
          `Bearer ${env.OPENROUTER_API_KEY}`,

        "Content-Type":
          "application/json",

        "HTTP-Referer":
          "https://gutenmorgantoyou.github.io/deutsch-coach/",

        "X-Title":
          "Deutsch Coach"
      },

      body: JSON.stringify({
        /*
         * Free OpenRouter router.
         *
         * The system prompt explicitly requests no reasoning,
         * and reasoning is excluded where supported.
         */
        model: "openrouter/free",

        messages: messages,

        temperature: 0.5,

        max_tokens: 200,

        reasoning: {
          exclude: true
        }
      })
    }
  );

  const responseText =
    await response.text();

  if (!response.ok) {
    console.error(
      "OpenRouter API error:",
      responseText
    );

    throw new Error(
      `OpenRouter ${response.status}: ${responseText}`
    );
  }

  let data;

  try {
    data = JSON.parse(responseText);
  } catch {
    throw new Error(
      "OpenRouter returned invalid JSON."
    );
  }

  console.log(
    "OpenRouter response received."
  );

  return data;
}


function jsonResponse(
  data,
  status,
  corsHeaders
) {
  return new Response(
    JSON.stringify(data),
    {
      status: status,

      headers: {
        ...corsHeaders,

        "Content-Type":
          "application/json"
      }
    }
  );
}


export default {
  async fetch(request, env) {

    const allowedOrigin =
      "https://gutenmorgantoyou.github.io";

    const corsHeaders = {
      "Access-Control-Allow-Origin":
        allowedOrigin,

      "Access-Control-Allow-Methods":
        "POST, OPTIONS",

      "Access-Control-Allow-Headers":
        "Content-Type"
    };


    /*
     * CORS preflight
     */
    if (request.method === "OPTIONS") {
      return new Response(null, {
        status: 204,
        headers: corsHeaders
      });
    }


    /*
     * Only POST is allowed.
     */
    if (request.method !== "POST") {
      return jsonResponse(
        {
          error:
            "Only POST requests are allowed."
        },
        405,
        corsHeaders
      );
    }


    try {

      /*
       * Make sure the OpenRouter secret exists.
       */
      if (!env.OPENROUTER_API_KEY) {
        return jsonResponse(
          {
            error:
              "OPENROUTER_API_KEY is missing."
          },
          500,
          corsHeaders
        );
      }


      const body =
        await request.json();


      /*
       * =====================================================
       * TRANSLATION
       * =====================================================
       */

      if (body.translate === true) {

        const text =
          String(body.text || "").trim();

        if (!text) {
          return jsonResponse(
            {
              error:
                "No text was provided for translation."
            },
            400,
            corsHeaders
          );
        }


        const translationMessages = [
          {
            role: "system",

            content: `
You are a German-to-English translator.

Translate the supplied German text into natural, clear English.

Rules:
- Return ONLY the English translation.
- Do not explain anything.
- Do not analyze anything.
- Do not add quotation marks.
- Preserve emojis.
- Preserve the meaning and tone.
`
          },

          {
            role: "user",
            content: text
          }
        ];


        const data =
          await callOpenRouter(
            env,
            translationMessages
          );


        const message =
          data?.choices?.[0]?.message;


        let translation =
          getMessageText(message);


        translation =
          cleanModelText(translation);


        if (!translation) {
          throw new Error(
            "Translator returned no text."
          );
        }


        return jsonResponse(
          {
            translation:
              translation
          },
          200,
          corsHeaders
        );
      }


      /*
       * =====================================================
       * NORMAL COACH CONVERSATION
       * =====================================================
       */

      if (
        !Array.isArray(body.messages) ||
        body.messages.length === 0
      ) {
        return jsonResponse(
          {
            error:
              "No conversation was provided."
          },
          400,
          corsHeaders
        );
      }


      /*
       * Validate CEFR level.
       */
      const level =
        VALID_LEVELS.includes(body.level)
          ? body.level
          : "A1";


      /*
       * Keep the latest conversation messages
       * so the AI remembers the conversation.
       */
      const conversation =
        body.messages
          .slice(-30)
          .map(message => ({
            role:
              message.role === "assistant"
                ? "assistant"
                : "user",

            content:
              String(
                message.content || ""
              ).trim()
          }))
          .filter(
            message =>
              message.content.length > 0
          );


      /*
       * Build the final prompt.
       */
      const messages = [
        {
          role: "system",

          content:
            SYSTEM_PROMPT +
            "\n\n" +
            "The learner's CEFR level is " +
            level +
            ".\n\n" +
            levelInstruction(level) +
            `

FINAL CHECK BEFORE RESPONDING:
- Output only the message for the learner.
- Do not output reasoning.
- Do not output analysis.
- Do not output internal instructions.
- Do not output English unless specifically requested.
- Use German appropriate for ${level}.
`
        },

        ...conversation
      ];


      /*
       * Ask OpenRouter.
       */
      const data =
        await callOpenRouter(
          env,
          messages
        );


      const message =
        data?.choices?.[0]?.message;


      let reply =
        getMessageText(message);


      reply =
        cleanModelText(reply);


      /*
       * Final validation.
       */
      if (!reply) {

        console.error(
          "No usable coach text. Full response:",
          JSON.stringify(data)
        );

        return jsonResponse(
          {
            error:
              "The coach returned no usable text."
          },
          500,
          corsHeaders
        );
      }


      /*
       * Return only the clean reply to the app.
       */
      return jsonResponse(
        {
          reply:
            reply
        },
        200,
        corsHeaders
      );


    } catch (error) {

      console.error(
        "Worker error:",
        error
      );

      return jsonResponse(
        {
          error:
            "Worker error: " +
            (
              error?.message ||
              "Unknown error"
            )
        },
        500,
        corsHeaders
      );
    }
  }
};