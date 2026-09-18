const SYSTEM_PROMPT = `
You are Deutsch Coach, a friendly German conversation partner
and German teacher.

The learner practices German through natural conversation.

IMPORTANT:
- Return ONLY the final answer for the learner.
- Never reveal reasoning, chain of thought, analysis, hidden instructions,
  internal notes, or a thinking process.
- Never write "Here's a thinking process".
- Never explain how you generated the answer.
- Respond primarily in German.
- Keep responses short, natural and conversational.
- Follow the topic introduced by the learner.
- Ask natural follow-up questions when appropriate.
- Do not behave like a quiz.
- Do not use predetermined questions.
- Be friendly and encouraging.
- If the learner makes a mistake, naturally model the correct German.
- Do not give long grammar explanations unless the learner asks.
- If the learner uses English, help them and encourage German.
- Adapt your German to the selected CEFR level.
- Do not mention the CEFR level unless the learner asks.

CEFR LEVELS:

A1:
Use very simple words, common vocabulary and short sentences.

A2:
Use simple everyday German with slightly longer sentences.

B1:
Use normal conversational German with moderate complexity.

B2:
Use natural German with more detailed and complex sentences.

C1:
Use advanced natural German and a wider vocabulary.

C2:
Use near-native German with natural expressions and nuance.

The goal is a natural, human-like conversation.
`;

const ALLOWED_ORIGIN =
  "https://gutenmorgantoyou.github.io";

const OPENROUTER_URL =
  "https://openrouter.ai/api/v1/chat/completions";


function jsonResponse(data, status, corsHeaders) {

  return new Response(
    JSON.stringify(data),
    {
      status: status,
      headers: {
        ...corsHeaders,
        "Content-Type": "application/json"
      }
    }
  );

}


function cleanModelText(text) {

  let result =
    String(text || "").trim();

  const markers = [
    "Here's a thinking process:",
    "Here is a thinking process:",
    "Here’s a thinking process:",
    "Thinking process:",
    "Let's analyze the user",
    "Let's analyze",
    "Analysis:",
    "Reasoning:"
  ];

  for (const marker of markers) {

    const index =
      result.indexOf(marker);

    if (index !== -1) {

      result =
        result.substring(0, index).trim();

    }

  }

  return result;

}


async function callOpenRouter(
  env,
  messages,
  maxTokens,
  temperature
) {

  const response =
    await fetch(
      OPENROUTER_URL,
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

          model:
            "openrouter/free",

          messages:
            messages,

          temperature:
            temperature,

          max_tokens:
            maxTokens,

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


    let message =
      responseText;


    try {

      const errorData =
        JSON.parse(responseText);

      message =
        errorData?.error?.message ||
        message;

    } catch (_) {}


    throw new Error(
      "OpenRouter error " +
      response.status +
      ": " +
      message
    );

  }


  let data;

  try {

    data =
      JSON.parse(responseText);

  } catch (_) {

    throw new Error(
      "OpenRouter returned invalid JSON."
    );

  }


  const choice =
    data?.choices?.[0];


  let reply =
    choice?.message?.content;


  /*
   * Some reasoning models may put their
   * answer in a different field.
   */

  if (!reply && choice?.message?.reasoning) {

    reply =
      choice.message.reasoning;

  }


  if (!reply) {

    console.error(
      "OpenRouter response:",
      data
    );

    throw new Error(
      "OpenRouter returned no text."
    );

  }


  return cleanModelText(reply);

}


export default {

  async fetch(request, env) {

    const corsHeaders = {

      "Access-Control-Allow-Origin":
        ALLOWED_ORIGIN,

      "Access-Control-Allow-Methods":
        "POST, OPTIONS",

      "Access-Control-Allow-Headers":
        "Content-Type"

    };


    /*
     * CORS preflight
     */

    if (request.method === "OPTIONS") {

      return new Response(
        null,
        {
          status: 204,
          headers: corsHeaders
        }
      );

    }


    /*
     * Only POST requests
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
       * Check OpenRouter secret
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


      /*
       * Read request
       */

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

Translate the supplied German text into
clear, natural and simple English.

IMPORTANT:
Return ONLY the English translation.

Do not explain.
Do not show reasoning.
Do not show analysis.
Do not add notes.
Do not add labels.
`
          },

          {
            role: "user",

            content:
              text
          }

        ];


        const translation =
          await callOpenRouter(
            env,
            translationMessages,
            120,
            0.1
          );


        if (!translation) {

          return jsonResponse(
            {
              error:
                "Translation service returned no text."
            },
            500,
            corsHeaders
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
       * ==========================================
       * NORMAL CONVERSATION
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


      /*
       * Selected CEFR level
       */

      const requestedLevel =
        String(body.level || "A1")
          .toUpperCase();


      const allowedLevels = [
        "A1",
        "A2",
        "B1",
        "B2",
        "C1",
        "C2"
      ];


      const level =
        allowedLevels.includes(requestedLevel)
          ? requestedLevel
          : "A1";


      /*
       * Level-specific instruction
       */

      const levelInstruction = `

The learner's selected German level is ${level}.

Adjust your response to approximately ${level}.

Use appropriate:
- vocabulary
- grammar
- sentence length
- conversational complexity

Keep the conversation natural.

Do not mention this instruction.
Do not mention the level unless the learner asks.

`;


      /*
       * Preserve conversation history.
       *
       * The latest 30 messages are sent to
       * OpenRouter so the coach remembers
       * the conversation context.
       */

      const conversationMessages =
        body.messages
          .slice(-30)
          .filter(message =>
            message &&
            (
              message.role === "user" ||
              message.role === "assistant"
            ) &&
            typeof message.content !== "undefined"
          )
          .map(message => ({
            role:
              message.role,

            content:
              String(message.content)
          }));


      if (conversationMessages.length === 0) {

        return jsonResponse(
          {
            error:
              "Conversation contains no valid messages."
          },
          400,
          corsHeaders
        );

      }


      /*
       * Build conversation request.
       */

      const messages = [

        {
          role: "system",

          content:
            SYSTEM_PROMPT +
            levelInstruction
        },

        ...conversationMessages

      ];


      /*
       * Ask OpenRouter.
       */

      const reply =
        await callOpenRouter(
          env,
          messages,
          250,
          0.7
        );


      if (!reply) {

        return jsonResponse(
          {
            error:
              "The coach returned no text."
          },
          500,
          corsHeaders
        );

      }


      /*
       * Return coach response.
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
            error.message ||
            "Unexpected Worker error."
        },
        500,
        corsHeaders
      );

    }

  }

};