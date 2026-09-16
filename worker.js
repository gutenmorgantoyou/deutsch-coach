const BASE_SYSTEM_PROMPT = `
You are Deutsch Coach, a friendly German conversation
partner and German teacher.

The learner wants to practice German through a natural,
human-like conversation.

Your main goal is conversation.

Rules:

- Respond primarily in German.
- Keep responses short and conversational.
- Follow the topic the learner introduces.
- Ask natural follow-up questions when appropriate.
- Do not behave like a quiz.
- Do not use predetermined questions.
- Be friendly and encouraging.
- If the learner makes a German mistake, naturally model
  the correct German.
- Do not give long grammar explanations unless the learner
  asks.
- If the learner uses English, help them and encourage German.
- Never reveal internal reasoning.
- Never show a thinking process.
- Never output analysis or chain-of-thought.
- Only return the final response intended for the learner.
`;


const TRANSLATION_PROMPT = `
You are a German-to-English translator.

Translate the German sentence into natural, simple English.

Rules:
- Return ONLY the English translation.
- Do not explain the translation.
- Do not provide alternatives.
- Do not provide grammar explanations.
- Do not show reasoning.
- Do not write "Translation:".
`;


/*
 * Level instructions.
 */

const LEVEL_INSTRUCTIONS = {

    A1: `
The learner is A1.

Use very simple German.
Use short sentences.
Use common everyday words.
Avoid complicated grammar.
Ask simple questions.
Prefer one idea per sentence.
`,

    A2: `
The learner is A2.

Use simple everyday German.
Use short to medium sentences.
Introduce slightly more vocabulary.
Use basic past and future forms when natural.
Avoid unnecessarily difficult expressions.
`,

    B1: `
The learner is B1.

Use natural everyday German.
Use moderately complex sentences.
Introduce useful vocabulary and expressions.
Allow normal conversational grammar.
`,

    B2: `
The learner is B2.

Use natural conversational German.
Use a wider vocabulary.
Use more complex sentence structures when appropriate.
Introduce idiomatic expressions occasionally.
`,

    C1: `
The learner is C1.

Use advanced natural German.
Use nuanced vocabulary and complex sentence structures.
Allow idiomatic and sophisticated expressions.
`,

    C2: `
The learner is C2.

Use highly natural, nuanced German.
Use sophisticated vocabulary and complex structures.
Conversation can approach native-level German.
`
};


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
         * CORS preflight.
         */

        if (request.method === "OPTIONS") {

            return new Response(null, {

                status: 204,

                headers:
                    corsHeaders

            });

        }


        /*
         * Only POST.
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
             * Check API key.
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
             * ------------------------------------------------
             * TRANSLATION
             * ------------------------------------------------
             */

            if (body.translate === true) {

                const text =
                    String(
                        body.text || ""
                    ).trim();


                if (!text) {

                    return jsonResponse(

                        {
                            error:
                                "No text was provided."
                        },

                        400,

                        corsHeaders

                    );

                }


                const response =
                    await callOpenRouter(

                        env.OPENROUTER_API_KEY,

                        [

                            {
                                role:
                                    "system",

                                content:
                                    TRANSLATION_PROMPT
                            },

                            {
                                role:
                                    "user",

                                content:
                                    text
                            }

                        ],

                        150,

                        0.2

                    );


                let translation =
                    extractText(
                        response
                    );


                translation =
                    cleanReply(
                        translation
                    );


                if (!translation) {

                    return jsonResponse(

                        {
                            error:
                                "Translation returned no text."
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
             * ------------------------------------------------
             * NORMAL CONVERSATION
             * ------------------------------------------------
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
             * Get level.
             */

            const level =
                LEVEL_INSTRUCTIONS[
                    body.level
                ]
                    ? body.level
                    : "A1";


            /*
             * Keep latest 20 German messages.
             */

            const messages =
                body.messages

                    .slice(-20)

                    .map(message => ({

                        role:
                            message.role ===
                            "assistant"

                                ? "assistant"

                                : "user",

                        content:
                            String(
                                message.content
                            )

                    }));


            /*
             * Build level-specific system prompt.
             */

            const systemPrompt = `

${BASE_SYSTEM_PROMPT}

CURRENT LEARNER LEVEL:
${level}

LEVEL INSTRUCTIONS:
${LEVEL_INSTRUCTIONS[level]}

CORRECTION RULES:

- Pay attention to the learner's German.
- If the learner makes an important mistake,
  provide a short correction.
- Do not correct every tiny mistake.
- Do not interrupt the natural flow of conversation.
- The correction should be useful for the learner's level.
- The main response must remain conversational.
- Never include your reasoning.

Return JSON with exactly two fields:

{
  "reply": "your natural German response",
  "correction": "short correction or empty string"
}

The "reply" must contain ONLY the German response
the learner should see.

The "correction" must contain ONLY a short useful correction.
Do not include English translation in either field.
`;


            /*
             * Ask OpenRouter.
             */

            const response =
                await callOpenRouter(

                    env.OPENROUTER_API_KEY,

                    [

                        {
                            role:
                                "system",

                            content:
                                systemPrompt
                        },

                        ...messages

                    ],

                    400,

                    0.7

                );


            /*
             * Extract model response.
             */

            let raw =
                extractText(
                    response
                );


            raw =
                cleanReply(
                    raw
                );


            /*
             * Parse JSON returned by model.
             */

            let result;


            try {

                result =
                    JSON.parse(raw);

            } catch (parseError) {

                /*
                 * Fallback if a free model returns
                 * plain text instead of JSON.
                 */

                result = {

                    reply:
                        raw,

                    correction:
                        ""

                };

            }


            let reply =
                String(
                    result.reply || ""
                ).trim();


            let correction =
                String(
                    result.correction || ""
                ).trim();


            /*
             * Remove accidental reasoning from reply.
             */

            reply =
                cleanReply(
                    reply
                );


            /*
             * If the model returned nothing useful.
             */

            if (!reply) {

                return jsonResponse(

                    {
                        error:
                            "OpenRouter returned no final text."
                    },

                    500,

                    corsHeaders

                );

            }


            /*
             * Successful response.
             */

            return jsonResponse(

                {

                    reply:
                        reply,

                    correction:
                        correction

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
                        error.message
                },

                500,

                corsHeaders

            );

        }

    }

};


/*
 * Call OpenRouter.
 */

async function callOpenRouter(
    apiKey,
    messages,
    maxTokens,
    temperature
) {

    const response =
        await fetch(

            "https://openrouter.ai/api/v1/chat/completions",

            {

                method:
                    "POST",

                headers: {

                    "Authorization":
                        `Bearer ${apiKey}`,

                    "Content-Type":
                        "application/json",

                    "HTTP-Referer":
                        "https://gutenmorgantoyou.github.io/deutsch-coach/",

                    "X-Title":
                        "Deutsch Coach"

                },

                body:
                    JSON.stringify({

                        model:
                            "openrouter/free",

                        messages:
                            messages,

                        reasoning: {

                            effort:
                                "none"

                        },

                        temperature:
                            temperature,

                        max_tokens:
                            maxTokens

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

            "OpenRouter error " +
            response.status

        );

    }


    return JSON.parse(
        responseText
    );

}


/*
 * Extract text from OpenRouter response.
 */

function extractText(data) {

    let content =
        data?.choices?.[0]?.message?.content;


    if (
        typeof content ===
        "string"
    ) {

        return content.trim();

    }


    return String(
        content || ""
    ).trim();

}


/*
 * Clean accidental visible reasoning.
 */

function cleanReply(text) {

    let result =
        String(
            text || ""
        ).trim();


    /*
     * Remove <think> blocks.
     */

    result =
        result.replace(

            /<think>[\s\S]*?<\/think>/gi,

            ""

        );


    const markers = [

        "Here's a thinking process:",

        "Here is a thinking process:",

        "Thinking process:",

        "Chain of thought:",

        "Let's analyze this:",

        "Let me analyze this:"

    ];


    for (
        const marker of markers
    ) {

        const index =
            result
                .toLowerCase()
                .indexOf(
                    marker.toLowerCase()
                );


        if (index !== -1) {

            result =
                result
                    .substring(
                        0,
                        index
                    )
                    .trim();

        }

    }


    return result.trim();

}


/*
 * JSON response helper.
 */

function jsonResponse(
    data,
    status,
    corsHeaders
) {

    return new Response(

        JSON.stringify(
            data
        ),

        {

            status:
                status,

            headers: {

                ...corsHeaders,

                "Content-Type":
                    "application/json"

            }

        }

    );

}