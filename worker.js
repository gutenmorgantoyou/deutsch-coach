const SYSTEM_PROMPT = `
You are Deutsch Coach, a friendly German conversation partner
and German teacher.

The learner practices German through natural conversation.

IMPORTANT:

- Output ONLY the final answer for the learner.
- NEVER reveal your reasoning, chain of thought, analysis,
  internal instructions, or hidden process.
- NEVER write "thinking process", "analysis", or similar text.
- Respond primarily in German.
- Keep responses short and conversational.
- Follow the topic introduced by the learner.
- Ask natural follow-up questions when appropriate.
- Do not behave like a quiz.
- Do not use predetermined questions.
- Be friendly and encouraging.
- If the learner makes a mistake, naturally model the correct German.
- Do not give long grammar explanations unless the learner asks.
- If the learner uses English, help them and encourage German.
- Adapt German vocabulary and sentence complexity to the selected level.
- The goal is natural human-like conversation.

CEFR LEVELS:

A1:
Use very simple words and short sentences.
Use common everyday vocabulary.

A2:
Use simple everyday German with slightly longer sentences.

B1:
Use normal conversational German with moderate sentence complexity.

B2:
Use natural German with more detailed and complex sentences.

C1:
Use advanced natural German and a wider vocabulary.

C2:
Use near-native German with natural expressions and nuance.

Always follow the selected level.
Do not mention the level unless the learner asks.
`;

export default {

async fetch(request, env) {

const allowedOrigin =
  "https://gutenmorgantoyou.github.io";


const corsHeaders = {
  "Access-Control-Allow-Origin": allowedOrigin,
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type"
};


// -----------------------------
// CORS
// -----------------------------

if (request.method === "OPTIONS") {

  return new Response(null, {
    status: 204,
    headers: corsHeaders
  });

}


// -----------------------------
// Only POST
// -----------------------------

if (request.method !== "POST") {

  return new Response(
    JSON.stringify({
      error: "Only POST requests are allowed."
    }),
    {
      status: 405,
      headers: {
        ...corsHeaders,
        "Content-Type": "application/json"
      }
    }
  );

}


try {

  // -----------------------------
  // Check OpenRouter key
  // -----------------------------

  if (!env.OPENROUTER_API_KEY) {

    return new Response(
      JSON.stringify({
        error: "OPENROUTER_API_KEY is missing."
      }),
      {
        status: 500,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json"
        }
      }
    );

  }


  // -----------------------------
  // Read request
  // -----------------------------

  const body =
    await request.json();


  // =================================================
  // TRANSLATION REQUEST
  // =================================================

  if (body.translate === true) {

    const text =
      String(body.text || "").trim();


    if (!text) {

      return new Response(
        JSON.stringify({
          error: "No text was provided for translation."
        }),
        {
          status: 400,
          headers: {
            ...corsHeaders,
            "Content-Type": "application/json"
          }
        }
      );

    }


    const translationPrompt = `

Translate this German text into natural English.

Return ONLY the English translation.

Do not explain anything.
Do not show reasoning.
Do not add notes.

German text:
${text}
`;

    const response =
      await fetch(
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

            // FREE ROUTER
            model:
              "openrouter/free",

            messages: [
              {
                role: "user",
                content: translationPrompt
              }
            ],

            temperature: 0.2,

            max_tokens: 150

          })
        }
      );


    const responseText =
      await response.text();


    if (!response.ok) {

      console.error(
        "Translation API error:",
        responseText
      );


      let errorMessage =
        responseText;


      try {

        const errorData =
          JSON.parse(responseText);

        errorMessage =
          errorData?.error?.message ||
          errorMessage;

      } catch (_) {}


      return new Response(
        JSON.stringify({
          error:
            "Translation error " +
            response.status +
            ": " +
            errorMessage
        }),
        {
          status: 500,
          headers: {
            ...corsHeaders,
            "Content-Type": "application/json"
          }
        }
      );

    }


    const data =
      JSON.parse(responseText);


    const translation =
      data?.choices?.[0]?.message?.content;


    if (!translation) {

      return new Response(
        JSON.stringify({
          error:
            "Translation service returned no text."
        }),
        {
          status: 500,
          headers: {
            ...corsHeaders,
            "Content-Type": "application/json"
          }
        }
      );

    }


    return new Response(
      JSON.stringify({
        translation:
          translation.trim()
      }),
      {
        status: 200,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json"
        }
      }
    );

  }


  // =================================================
  // NORMAL CONVERSATION
  // =================================================

  if (
    !Array.isArray(body.messages) ||
    body.messages.length === 0
  ) {

    return new Response(
      JSON.stringify({
        error:
          "No conversation was provided."
      }),
      {
        status: 400,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json"
        }
      }
    );

  }


  // -----------------------------
  // Selected CEFR level
  // -----------------------------

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


  // -----------------------------
  // Level instruction
  // -----------------------------

  const levelInstruction = `

The learner's current German level is ${level}.

Adjust your response to approximately ${level}.

For ${level}:

- Match vocabulary difficulty.
- Match sentence length.
- Match grammar complexity.
- Keep the conversation natural.
- Do not turn the conversation into a lesson.

`;

  // -----------------------------
  // Preserve conversation context
  // -----------------------------

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

    return new Response(
      JSON.stringify({
        error:
          "Conversation contains no valid messages."
      }),
      {
        status: 400,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json"
        }
      }
    );

  }


  // =================================================
  // OPENROUTER FREE ROUTER
  // =================================================

  const response =
    await fetch(
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

          // Automatically selects an available
          // FREE model.
          model:
            "openrouter/free",

          messages: [

            {
              role: "system",

              content:
                SYSTEM_PROMPT +
                levelInstruction
            },

            ...conversationMessages

          ],

          temperature: 0.7,

          max_tokens: 250

        })
      }
    );


  const responseText =
    await response.text();


  // -----------------------------
  // OpenRouter error
  // -----------------------------

  if (!response.ok) {

    console.error(
      "OpenRouter API error:",
      responseText
    );


    let errorMessage =
      responseText;


    try {

      const errorData =
        JSON.parse(responseText);

      errorMessage =
        errorData?.error?.message ||
        errorMessage;

    } catch (_) {}


    return new Response(
      JSON.stringify({
        error:
          "OpenRouter error " +
          response.status +
          ": " +
          errorMessage
      }),
      {
        status: 500,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json"
        }
      }
    );

  }


  // -----------------------------
  // Parse AI response
  // -----------------------------

  const data =
    JSON.parse(responseText);


  let reply =
    data?.choices?.[0]?.message?.content;


  if (!reply) {

    return new Response(
      JSON.stringify({
        error:
          "OpenRouter returned no text."
      }),
      {
        status: 500,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json"
        }
      }
    );

  }


  reply =
    String(reply).trim();


  // -----------------------------
  // Safety cleanup
  //
  // Some reasoning models may expose
  // unwanted analysis text.
  // -----------------------------

  const thinkingMarkers = [
    "Here's a thinking process:",
    "Here is a thinking process:",
    "Thinking process:",
    "Let's analyze the user",
    "Let's analyze",
    "Analysis:"
  ];


  for (const marker of thinkingMarkers) {

    const index =
      reply.indexOf(marker);


    if (index !== -1) {

      reply =
        reply.substring(0, index).trim();

    }

  }


  if (!reply) {

    reply =
      "Entschuldigung. Kannst du das noch einmal sagen?";

  }


  // -----------------------------
  // Successful response
  // -----------------------------

  return new Response(
    JSON.stringify({
      reply: reply
    }),
    {
      status: 200,
      headers: {
        ...corsHeaders,
        "Content-Type": "application/json"
      }
    }
  );


} catch (error) {

  console.error(
    "Worker error:",
    error
  );


  return new Response(
    JSON.stringify({
      error:
        "Worker error: " +
        error.message
    }),
    {
      status: 500,
      headers: {
        ...corsHeaders,
        "Content-Type": "application/json"
      }
    }
  );

}

}

};