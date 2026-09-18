const SYSTEM_PROMPT = `
You are Deutsch Coach, a friendly German conversation partner and German teacher.

The learner is practicing German through natural conversation.

Rules:
- Respond primarily in German.
- Respond ONLY with the final answer to the learner.
- NEVER reveal your reasoning, chain of thought, analysis, or internal process.
- NEVER say things like "thinking process", "analysis", "reasoning", or "step 1".
- Keep responses short and conversational.
- Follow the topic the learner introduces.
- Ask natural follow-up questions when appropriate.
- Do not behave like a quiz.
- Do not use predetermined questions.
- Adapt your German to the learner's CEFR level.
- Be friendly and encouraging.
- If the learner makes a mistake, naturally model the correct German.
- Do not give long grammar explanations unless the learner asks.
- If the learner uses English, help them and encourage German.
- The goal is a natural conversation, not a lesson.
`;

const VALID_LEVELS = ["A1", "A2", "B1", "B2", "C1", "C2"];

function levelInstruction(level) {
  const instructions = {
    A1: `
Use very simple German.
Use short sentences.
Use common everyday words.
Ask simple questions.
Avoid complicated grammar.
`,

    A2: `
Use simple everyday German.
Use short to medium sentences.
Use common vocabulary.
Occasionally introduce slightly new vocabulary.
`,

    B1: `
Use natural everyday German.
Use medium-length sentences.
Introduce useful vocabulary and natural expressions.
`,

    B2: `
Use natural conversational German.
Use somewhat more complex sentences.
Use a broader vocabulary and natural expressions.
`,

    C1: `
Use advanced natural German.
Use nuanced vocabulary and varied sentence structures.
Sound like a natural educated German speaker.
`,

    C2: `
Use highly natural and nuanced German.
Use sophisticated vocabulary and idiomatic expressions when appropriate.
Sound like a native-level conversation partner.
`
  };

  return instructions[level] || instructions.A1;
}

function cleanModelText(text) {
  if (!text) return "";

  let result = String(text).trim();

  // Remove common reasoning prefixes if a model accidentally includes them.
  const markers = [
    "Here's a thinking process:",
    "Here is a thinking process:",
    "Thinking process:",
    "Chain of thought:",
    "Reasoning:",
    "Analysis:"
  ];

  for (const marker of markers) {
    const index = result.toLowerCase().indexOf(marker.toLowerCase());

    if (index === 0) {
      result = result.slice(marker.length).trim();
    }
  }

  return result.trim();
}

function getMessageText(message) {
  if (!message) return "";

  if (typeof message.content === "string") {
    return message.content.trim();
  }

  if (Array.isArray(message.content)) {
    return message.content
      .map(part => {
        if (typeof part === "string") return part;

        if (
          part &&
          typeof part.text === "string"
        ) {
          return part.text;
        }

        return "";
      })
      .join("")
      .trim();
  }

  return "";
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
        model: "openrouter/free",

        messages,

        temperature: 0.7,

        max_tokens: 300,

        // Ask OpenRouter to keep reasoning out of the returned answer.
        reasoning: {
          exclude: true
        }
      })
    }
  );

  const responseText = await response.text();

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
    "OpenRouter response:",
    JSON.stringify(data)
  );

  return data;
}

function jsonResponse(data, status, corsHeaders) {
  return new Response(
    JSON.stringify(data),
    {
      status,

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

    if (request.method === "OPTIONS") {
      return new Response(null, {
        status: 204,
        headers: corsHeaders
      });
    }

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
       * ==========================================
       * TRANSLATION REQUEST
       * ==========================================
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

Translate the supplied German text into natural,
clear English.

Rules:
- Return ONLY the English translation.
- Do not explain anything.
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
            translation
          },
          200,
          corsHeaders
        );
      }

      /*
       * ==========================================
       * NORMAL COACH REQUEST
       * ==========================================
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

      const level =
        VALID_LEVELS.includes(body.level)
          ? body.level
          : "A1";

      /*
       * Keep conversation context.
       * The UI can display German-only history,
       * while the Worker receives the conversation.
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

      const messages = [
        {
          role: "system",

          content:
            SYSTEM_PROMPT +
            "\n\nThe learner's CEFR level is " +
            level +
            ".\n" +
            levelInstruction(level)
        },

        ...conversation
      ];

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

      return jsonResponse(
        {
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
            (error?.message ||
              "Unknown error")
        },
        500,
        corsHeaders
      );
    }
  }
};