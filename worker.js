const SYSTEM_PROMPT = `
You are Deutsch Coach, a friendly German conversation partner
and German teacher.

The learner wants to practice German by having a natural,
human-like conversation.

Rules:

- Respond primarily in German.
- Keep responses short and conversational.
- Follow the topic the learner introduces.
- Ask natural follow-up questions when appropriate.
- Do not behave like a quiz.
- Do not use predetermined questions.
- Adapt your German to the learner's level.
- Be friendly and encouraging.
- If the learner makes a mistake, naturally model the correct German.
- Do not give long grammar explanations unless the learner asks.
- If the learner uses English, help them and encourage German.
- The goal is a natural conversation, not a lesson.

IMPORTANT:
For every response, return ONLY valid JSON in exactly this format:

{
"reply": "German response",
"replyEnglish": "English translation of the German response",
"userEnglish": "English translation of the learner's latest message"
}

Do not use markdown.
Do not put the JSON inside code fences.
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

if (request.method === "OPTIONS") {
  return new Response(null, {
    status: 204,
    headers: corsHeaders
  });
}

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

  const body = await request.json();

  if (
    !Array.isArray(body.messages) ||
    body.messages.length === 0
  ) {
    return new Response(
      JSON.stringify({
        error: "No conversation was provided."
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

  const messages = body.messages
    .slice(-20)
    .map(message => ({
      role:
        message.role === "assistant"
          ? "assistant"
          : "user",
      content: String(message.content)
    }));

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

        messages: [
          {
            role: "system",
            content: SYSTEM_PROMPT
          },
          ...messages
        ],

        temperature: 0.7,

        max_tokens: 400
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

    return new Response(
      JSON.stringify({
        error:
          "OpenRouter error " +
          response.status +
          ": " +
          responseText
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

  const rawReply =
    data?.choices?.[0]?.message?.content;

  if (!rawReply) {

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

  let result;

  try {

    let cleaned =
      rawReply.trim();

    if (cleaned.startsWith("```")) {
      cleaned =
        cleaned
          .replace(/^```json\s*/i, "")
          .replace(/^```\s*/i, "")
          .replace(/\s*```$/i, "")
          .trim();
    }

    result =
      JSON.parse(cleaned);

  } catch (parseError) {

    console.error(
      "JSON parsing error:",
      parseError,
      rawReply
    );

    return new Response(
      JSON.stringify({
        error:
          "AI returned an invalid response format."
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

  if (
    !result.reply ||
    !result.replyEnglish ||
    !result.userEnglish
  ) {
    return new Response(
      JSON.stringify({
        error:
          "AI response is missing translation fields."
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
      reply: String(result.reply).trim(),
      replyEnglish:
        String(result.replyEnglish).trim(),
      userEnglish:
        String(result.userEnglish).trim()
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