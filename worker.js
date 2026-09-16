const SYSTEM_PROMPT = `
You are Deutsch Coach, a friendly German conversation partner
and German teacher.

The learner wants to practice German by having a natural conversation.

Rules:
- Respond primarily in German.
- Keep responses short and conversational.
- Follow the topic the learner introduces.
- Ask natural follow-up questions when appropriate.
- Do not behave like a quiz.
- Do not use predetermined questions.
- Adapt your German to the learner's apparent level.
- Be friendly and encouraging.
- If the learner makes a small mistake, don't stop the conversation
  for a long grammar explanation.
- When useful, naturally model the correct German.
- If the learner uses English, help them and encourage German.
- The goal is a natural human-like conversation.

Return only the coach's response.
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

      if (!env.GEMINI_API_KEY) {

        return new Response(
          JSON.stringify({
            error: "GEMINI_API_KEY is missing in Cloudflare."
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

      if (!Array.isArray(body.messages) ||
          body.messages.length === 0) {

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

      const messages =
        body.messages.slice(-20);

      const contents = messages.map(message => ({
        role:
          message.role === "assistant"
            ? "model"
            : "user",

        parts: [
          {
            text: String(message.content)
          }
        ]
      }));

      const model = "gemini-3.6-flash";

      const url =
        `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${env.GEMINI_API_KEY}`;

      const response = await fetch(url, {

        method: "POST",

        headers: {
          "Content-Type": "application/json"
        },

        body: JSON.stringify({

          systemInstruction: {
            parts: [
              {
                text: SYSTEM_PROMPT
              }
            ]
          },

          contents: contents,

          generationConfig: {
            temperature: 0.8,
            maxOutputTokens: 250
          }

        })

      });

      const responseText =
        await response.text();

      if (!response.ok) {

        console.error(
          "Gemini API error:",
          responseText
        );

        return new Response(
          JSON.stringify({
            error:
              "Gemini error " +
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

      const reply =
        data?.candidates?.[0]?.content?.parts?.[0]?.text;

      if (!reply) {

        return new Response(
          JSON.stringify({
            error:
              "Gemini returned no text: " +
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

      return new Response(
        JSON.stringify({
          reply: reply.trim()
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