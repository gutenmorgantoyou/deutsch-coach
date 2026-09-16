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
- Never reveal your internal reasoning.
- Never show a thinking process.
- Never explain how you generated your answer.
- Never output analysis, planning, chain-of-thought, or self-criticism.
- Only return the final conversational response that the learner should see.
`;


const TRANSLATION_PROMPT = `
You are a German-to-English translator.

Translate the user's German sentence into natural,
simple English.

Rules:
- Return ONLY the English translation.
- Do not explain the translation.
- Do not provide alternatives.
- Do not provide grammar explanations.
- Do not show reasoning.
- Do not write "Translation:".
`;


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

                headers:
                    corsHeaders

            });

        }


        /*
         * Only POST requests
         */

        if (request.method !== "POST") {

            return new Response(

                JSON.stringify({

                    error:
                        "Only POST requests are allowed."

                }),

                {

                    status: 405,

                    headers: {

                        ...corsHeaders,

                        "Content-Type":
                            "application/json"

                    }

                }

            );

        }


        try {

            /*
             * Check OpenRouter secret
             */

            if (!env.OPENROUTER_API_KEY) {

                return new Response(

                    JSON.stringify({

                        error:
                            "OPENROUTER_API_KEY is missing."

                    }),

                    {

                        status: 500,

                        headers: {

                            ...corsHeaders,

                            "Content-Type":
                                "application/json"

                        }

                    }

                );

            }


            /*
             * Read request
             */

            const body =
                await request.json();


            /*
             * ------------------------------------------------
             * TRANSLATION REQUEST
             * ------------------------------------------------
             *
             * This is used only to display English underneath
             * the German conversation.
             *
             * It is NOT added to conversation history.
             */

            if (body.translate === true) {

                const text =
                    String(body.text || "").trim();


                if (!text) {

                    return new Response(

                        JSON.stringify({

                            error:
                                "No text was provided."

                        }),

                        {

                            status: 400,

                            headers: {

                                ...corsHeaders,

                                "Content-Type":
                                    "application/json"

                            }

                        }

                    );

                }


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

                                model:
                                    "openrouter/free",

                                messages: [

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


                                /*
                                 * Ask the model not to use
                                 * visible reasoning.
                                 */

                                reasoning: {

                                    effort:
                                        "none"

                                },


                                temperature:
                                    0.2,


                                max_tokens:
                                    150

                            })

                        }

                    );


                const responseText =
                    await response.text();


                if (!response.ok) {

                    console.error(
                        "OpenRouter translation error:",
                        responseText
                    );


                    return new Response(

                        JSON.stringify({

                            error:
                                "OpenRouter translation error " +
                                response.status

                        }),

                        {

                            status: 500,

                            headers: {

                                ...corsHeaders,

                                "Content-Type":
                                    "application/json"

                            }

                        }

                    );

                }


                const data =
                    JSON.parse(
                        responseText
                    );


                let translation =
                    data?.choices?.[0]?.message?.content;


                /*
                 * Some models may return an object/array.
                 * Convert it safely to text.
                 */

                if (
                    typeof translation !==
                    "string"
                ) {

                    translation =
                        String(
                            translation || ""
                        );

                }


                translation =
                    translation.trim();


                if (!translation) {

                    return new Response(

                        JSON.stringify({

                            error:
                                "Translation returned no text."

                        }),

                        {

                            status: 500,

                            headers: {

                                ...corsHeaders,

                                "Content-Type":
                                    "application/json"

                            }

                        }

                    );

                }


                return new Response(

                    JSON.stringify({

                        translation:
                            translation

                    }),

                    {

                        status: 200,

                        headers: {

                            ...corsHeaders,

                            "Content-Type":
                                "application/json"

                        }

                    }

                );

            }


            /*
             * ------------------------------------------------
             * NORMAL CONVERSATION REQUEST
             * ------------------------------------------------
             */

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

                            "Content-Type":
                                "application/json"

                        }

                    }

                );

            }


            /*
             * Keep conversation history.
             *
             * English translations are NOT included because
             * the index.html only stores German conversation
             * messages in this array.
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
             * Send conversation to OpenRouter.
             */

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

                            model:
                                "openrouter/free",


                            messages: [

                                {

                                    role:
                                        "system",

                                    content:
                                        SYSTEM_PROMPT

                                },

                                ...messages

                            ],


                            /*
                             * Important:
                             * ask OpenRouter for no reasoning.
                             */

                            reasoning: {

                                effort:
                                    "none"

                            },


                            temperature:
                                0.7,


                            max_tokens:
                                300

                        })

                    }

                );


            const responseText =
                await response.text();


            /*
             * OpenRouter error
             */

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

                            "Content-Type":
                                "application/json"

                        }

                    }

                );

            }


            const data =
                JSON.parse(
                    responseText
                );


            /*
             * Get final AI response.
             */

            let reply =
                data?.choices?.[0]?.message?.content;


            if (
                typeof reply !==
                "string"
            ) {

                reply =
                    String(
                        reply || ""
                    );

            }


            reply =
                reply.trim();


            /*
             * Safety cleanup.
             *
             * If a model ignores the instruction and includes
             * a visible reasoning section, remove common
             * reasoning markers before displaying it.
             */

            reply =
                cleanReply(reply);


            if (!reply) {

                return new Response(

                    JSON.stringify({

                        error:
                            "OpenRouter returned no final text."

                    }),

                    {

                        status: 500,

                        headers: {

                            ...corsHeaders,

                            "Content-Type":
                                "application/json"

                        }

                    }

                );

            }


            /*
             * Successful conversation response.
             */

            return new Response(

                JSON.stringify({

                    reply:
                        reply

                }),

                {

                    status: 200,

                    headers: {

                        ...corsHeaders,

                        "Content-Type":
                            "application/json"

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

                        "Content-Type":
                            "application/json"

                    }

                }

            );

        }

    }

};


/*
 * Remove common visible reasoning formats.
 *
 * This is only a fallback. The main protection is the
 * system prompt + reasoning: { effort: "none" }.
 */

function cleanReply(text) {

    let result =
        String(text || "").trim();


    /*
     * Remove <think>...</think> blocks.
     */

    result =
        result.replace(
            /<think>[\s\S]*?<\/think>/gi,
            ""
        );


    /*
     * Remove common "thinking process" sections.
     */

    const markers = [

        "Here's a thinking process:",

        "Here is a thinking process:",

        "Thinking process:",

        "Chain of thought:",

        "Analysis:",

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
                result.substring(
                    0,
                    index
                ).trim();

        }

    }


    /*
     * Remove accidental markdown-style
     * reasoning headings at the beginning.
     */

    result =
        result.replace(
            /^(analysis|reasoning|thinking)\s*:\s*/i,
            ""
        );


    return result.trim();

}