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
- If the learner makes a small mistake, naturally model the correct German.
- Do not give long grammar explanations unless the learner asks.
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

    // Handle browser CORS preflight
    if (request.method === "OPTIONS") {
      return new Response(null, {
        status: 204,
        headers: corsHeaders
      });
    }

    // Only POST is allowed
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

      // Check API key
      if (!env.GEMINI_API_KEY) {
        return new Response(
          JSON.stringify({
            error: "GEMINI_API_KEY is missing."
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

      // Read request
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

      // Keep the latest 20 messages
      const conversation = body.messages
        .slice(-20)
        .map(message => {

          const speaker =
            message.role === "assistant"
              ? "Deutsch Coach"
              : "Lerner";

          return `${speaker}: ${String(message.content)}`;

        })
        .join("\n");

      const input = `
${SYSTEM_PROMPT}

Here is the conversation so far:

${conversation}

Continue the conversation naturally.

Respond only as Deutsch Coach.
`;

      // Gemini Interactions API
      const url =
        "https://generativelanguage.googleapis.com/v1beta/interactions";

      const response = await fetch(url, {

        method: "POST",

        headers: {
          "Content-Type": "application/json",
          "x-goog-api-key": env.GEMINI_API_KEY
        },

        body: JSON.stringify({

          model: "gemini-3.6-flash",

          input: input,

          /*
           * Force the inference placement to
           * Google Cloud US East 4.
           */
          placement: {
            region: "gcp:us-east-4"
          }

        })

      });

      const responseText =
        await response.text();

      // Gemini returned an error
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

      // Extract Gemini response
      let reply = "";

      if (data.output_text) {

        reply = data.output_text;

      } else if (Array.isArray(data.outputs)) {

        for (const output of data.outputs) {

          if (
            output &&
            output.type === "text" &&
            output.text
          ) {
            reply = output.text;
            break;
          }

        }

      } else if (Array.isArray(data.steps)) {

        for (const step of data.steps) {

          if (
            step &&
            step.type === "model_output" &&
            Array.isArray(step.content)
          ) {

            for (const content of step.content) {

              if (
                content.type === "text" &&
                content.text
              ) {
                reply = content.text;
                break;
              }

            }

          }

          if (reply) {
            break;
          }
        }
      }

      // No response text
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

      // Success
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