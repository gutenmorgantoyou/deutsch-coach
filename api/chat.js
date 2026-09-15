export default async function handler(req, res) {
    // Allow requests from your GitHub Pages website
    res.setHeader(
        "Access-Control-Allow-Origin",
        "https://gutenmorgantoyou.github.io"
    );

    res.setHeader(
        "Access-Control-Allow-Methods",
        "POST, OPTIONS"
    );

    res.setHeader(
        "Access-Control-Allow-Headers",
        "Content-Type"
    );

    // Handle browser CORS check
    if (req.method === "OPTIONS") {
        return res.status(200).end();
    }

    // Only allow POST
    if (req.method !== "POST") {
        return res.status(405).json({
            error: "Method not allowed"
        });
    }

    try {
        const { messages } = req.body;

        if (!Array.isArray(messages)) {
            return res.status(400).json({
                error: "Messages are required."
            });
        }

        // Keep the conversation reasonably small
        const conversation = messages.slice(-20);

        const response = await fetch(
            "https://api.openai.com/v1/responses",
            {
                method: "POST",

                headers: {
                    "Content-Type": "application/json",
                    "Authorization":
                        `Bearer ${process.env.OPENAI_API_KEY}`
                },

                body: JSON.stringify({

                    model: "gpt-5.6-luna",

                    instructions: `
You are Deutsch Coach, a friendly German conversation partner
and German teacher.

Your main purpose is to help the learner practice spoken German.

Rules:

1. Speak naturally and conversationally.
2. Respond primarily in German.
3. Adapt your German to the learner's apparent level.
4. Do not behave like a quiz.
5. Do not ask predetermined questions.
6. Follow whatever topic the learner introduces.
7. Ask natural follow-up questions when appropriate.
8. Keep responses reasonably short so the learner can continue speaking.
9. If the learner makes a small German mistake, do not interrupt
   the conversation with a long grammar lesson.
10. When useful, naturally model the correct German in your response.
11. Be encouraging and friendly.
12. Never pretend that the learner said something they did not say.
13. If the learner writes in English, you may briefly explain in English,
    but encourage them to continue in German.

The goal is a natural conversation between a learner and a friendly
German-speaking coach.
                    `,

                    input: conversation

                })
            }
        );

        if (!response.ok) {

            const errorText =
                await response.text();

            console.error(
                "OpenAI API error:",
                errorText
            );

            return res.status(500).json({
                error: "The AI service returned an error."
            });
        }

        const data =
            await response.json();

        const reply =
            data.output_text ||
            "Entschuldigung, ich konnte gerade keine Antwort geben.";

        return res.status(200).json({
            reply: reply
        });

    } catch (error) {

        console.error(
            "Server error:",
            error
        );

        return res.status(500).json({
            error: "Something went wrong."
        });
    }
}