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
`;


const TRANSLATION_PROMPT = `
You are a German-to-English translator.

Translate the provided German sentence into natural,
simple English.

Rules:
- Return ONLY the English translation.
- Do not add explanations.
- Do not add quotation marks.
- Keep the meaning accurate.
- Keep the translation natural and conversational.
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
         * Browser CORS preflight
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
             * --------------------------------
             * TRANSLATION REQUEST
             * --------------------------------
             */

            if (body.translate === true) {

                if (
                    typeof body.text !== "string" ||
                    body.text.trim() === ""
                ) {

                    return new Response(

                        JSON.stringify({

                            error:
                                "No text was provided for translation."

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


                const text =
                    body.text.trim();


                /*
                 * Send translation request
                 * to OpenRouter.
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

                            body:
                                JSON.stringify({

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

                                    temperature:
                                        0.2,

                                    max_tokens:
                                        100

                                })

                        }

                    );


                const responseText =
                    await response.text();


                /*
                 * OpenRouter translation error
                 */

                if (!response.ok) {

                    console.error(
                        "OpenRouter translation error:",
                        responseText
                    );


                    return new Response(

                        JSON.stringify({

                            error:
                                "OpenRouter translation error " +
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


                const translation =
                    data
                        ?.choices
                        ?.[0]
                        ?.message
                        ?.content;


                if (!translation) {

                    return new Response(

                        JSON.stringify({

                            error:
                                "OpenRouter returned no translation."

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
                 * Return English translation
                 */

                return new Response(

                    JSON.stringify({

                        translation:
                            translation.trim()

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
             * --------------------------------
             * NORMAL COACH CONVERSATION
             * --------------------------------
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
             * Keep the latest 20 messages.
             */

            const messages =
                body.messages

                    .slice(-20)

                    .map(message => ({

                        role:
                            message.role === "assistant"
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

                        body:
                            JSON.stringify({

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
             * OpenRouter returned an error.
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
             * Extract AI response.
             */

            const reply =
                data
                    ?.choices
                    ?.[0]
                    ?.message
                    ?.content;


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

                            "Content-Type":
                                "application/json"

                        }

                    }

                );

            }


            /*
             * Successful coach response.
             */

            return new Response(

                JSON.stringify({

                    reply:
                        reply.trim()

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