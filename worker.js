const OPENAI_MODEL = "gpt-5.6-luna";

const TRANSCRIBE_MODEL =
  "gpt-4o-mini-transcribe";

const ALLOWED_ORIGIN =
  "https://gutenmorgantoyou.github.io";

const MAX_AUDIO_BYTES =
  20 * 1024 * 1024;

const MAX_JSON_BYTES =
  200 * 1024;

const MAX_MESSAGES =
  24;

const MAX_MESSAGE_LENGTH =
  4000;


/* --------------------------------
   CORS
-------------------------------- */

function corsHeaders() {

  return {
    "Access-Control-Allow-Origin":
      ALLOWED_ORIGIN,

    "Access-Control-Allow-Methods":
      "GET, POST, OPTIONS",

    "Access-Control-Allow-Headers":
      "Content-Type",

    "Access-Control-Max-Age":
      "86400"
  };
}


function jsonResponse(
  data,
  status = 200
) {

  return new Response(
    JSON.stringify(data),
    {
      status,

      headers: {
        ...corsHeaders(),

        "Content-Type":
          "application/json; charset=utf-8"
      }
    }
  );
}


/* --------------------------------
   Main
-------------------------------- */

export default {

  async fetch(request, env) {

    if (
      request.method ===
      "OPTIONS"
    ) {

      return new Response(
        null,
        {
          status: 204,
          headers:
            corsHeaders()
        }
      );
    }

    const url =
      new URL(
        request.url
      );

    try {

      if (
        url.pathname ===
        "/health"
      ) {

        return jsonResponse({
          ok: true,
          service:
            "deutsch-coach-api"
        });
      }

      if (
        url.pathname ===
        "/"
      ) {

        return jsonResponse({
          ok: true,
          service:
            "Deutsch Coach API"
        });
      }

      if (
        url.pathname ===
        "/chat"
      ) {

        if (
          request.method !==
          "POST"
        ) {

          return jsonResponse(
            {
              error:
                "Method not allowed."
            },
            405
          );
        }

        return handleChat(
          request,
          env
        );
      }

      if (
        url.pathname ===
        "/transcribe"
      ) {

        if (
          request.method !==
          "POST"
        ) {

          return jsonResponse(
            {
              error:
                "Method not allowed."
            },
            405
          );
        }

        return handleTranscription(
          request,
          env
        );
      }

      return jsonResponse(
        {
          error:
            "Not found."
        },
        404
      );

    } catch (error) {

      return jsonResponse(
        {
          error:
            error.message ||
            "Internal server error."
        },
        500
      );
    }
  }
};


/* --------------------------------
   Chat
-------------------------------- */

async function handleChat(
  request,
  env
) {

  if (!env.OPENAI_API_KEY) {

    return jsonResponse(
      {
        error:
          "OPENAI_API_KEY is not configured."
      },
      500
    );
  }

  const contentLength =
    Number(
      request.headers.get(
        "content-length"
      ) || 0
    );

  if (
    contentLength >
    MAX_JSON_BYTES
  ) {

    return jsonResponse(
      {
        error:
          "Request is too large."
      },
      413
    );
  }

  const body =
    await request.json();

  const level =
    normalizeLevel(
      body.level
    );

  const topic =
    cleanString(
      body.topic,
      100
    ) || "Freies Gespräch";

  const repeatedGreeting =
    body.repeatedGreeting === true;

  const messages =
    cleanMessages(
      body.messages
    );

  if (!messages.length) {

    return jsonResponse(
      {
        error:
          "Keine Nachricht vorhanden."
      },
      400
    );
  }

  const systemPrompt =
    buildSystemPrompt({
      level,
      topic,
      repeatedGreeting
    });

  const input = [
    {
      role: "system",
      content: systemPrompt
    },

    ...messages
  ];

  const response =
    await fetch(
      "https://api.openai.com/v1/responses",
      {
        method: "POST",

        headers: {
          "Authorization":
            `Bearer ${env.OPENAI_API_KEY}`,

          "Content-Type":
            "application/json"
        },

        body: JSON.stringify({

          model:
            OPENAI_MODEL,

          input,

          max_output_tokens:
            1200
        })
      }
    );

  const rawText =
    await response.text();

  if (!response.ok) {

    return jsonResponse(
      {
        error:
          extractOpenAIError(
            rawText
          )
      },
      response.status
    );
  }

  let openAIResult;

  try {

    openAIResult =
      JSON.parse(rawText);

  } catch {

    return jsonResponse(
      {
        error:
          "Ungültige Antwort von OpenAI."
      },
      502
    );
  }

  const outputText =
    extractOutputText(
      openAIResult
    );

  if (!outputText) {

    return jsonResponse(
      {
        error:
          "OpenAI returned no text."
      },
      502
    );
  }

  const result =
    parseCoachResponse(
      outputText
    );

  return jsonResponse(
    result
  );
}


/* --------------------------------
   System prompt
-------------------------------- */

function buildSystemPrompt({
  level,
  topic,
  repeatedGreeting
}) {

  return `
Du bist "Deutsch Coach", ein geduldiger und natürlicher Deutschlehrer.

Der Lernende befindet sich auf Niveau:
${level}

Aktuelles Thema:
${topic}

Ziel:
Führe ein natürliches Gespräch auf Deutsch.
Antworte so, dass der Lernende weiterreden möchte.

WICHTIG:
Die Antwort soll nicht wie ein Lehrbuch klingen.

ANTWORTLÄNGE:
- A1/A2: kurze, einfache Sätze.
- B1: natürliche, klare Sätze.
- B2: natürlich und etwas abwechslungsreicher.
- C1/C2: natürlich und anspruchsvoller.

GESPRÄCH:
- Stelle bei Bedarf eine kurze Anschlussfrage.
- Wiederhole nicht unnötig exakt dieselbe Begrüßung.
- Wenn der Lernende "Hallo", "Guten Morgen" usw. sagt, behandle das als normale Gesprächsfortsetzung.
- Eine normale Begrüßung ist NICHT automatisch ein Lernfortschritt bei einer Grammatikfähigkeit.

${repeatedGreeting
  ? `
Der Lernende hat gerade eine sehr ähnliche Begrüßung wiederholt.

Bitte:
- antworte freundlich,
- führe das Gespräch weiter,
- erfinde KEIN neues Lernerfolgsergebnis,
- zähle die Begrüßung NICHT als erfolgreiche Grammatikübung.
`
  : ""}

KORREKTUREN:

Korrigiere nur dann, wenn wirklich eine sinnvolle sprachliche Korrektur vorhanden ist.

Behandle offensichtliche Speech-to-Text-Probleme vorsichtig.

Wenn der Satz bereits korrekt und natürlich ist:
- correction muss "" sein.
- mistake muss null sein.

Beispiel:

User:
"Mir geht es gut."

Das ist korrekt.

Du darfst NICHT daraus eine künstliche Korrektur machen.

WICHTIGES BEISPIEL:

"Was sollst du?"

ist grammatisch korrekt.

"sollst" steht bereits an Position 2.

Behaupte daher NIEMALS, dass in
"Was sollst du?"
das Verb nicht an zweiter Stelle steht.

LERNPROFIL:

Das Lernprofil soll echte Lernfortschritte messen.

Eine bloße erfolgreiche Unterhaltung ist KEIN Lernereignis.

Setze:

learning.isMeaningful = false

bei:
- Begrüßungen
- Small Talk ohne konkrete Sprachübung
- einfachen korrekten Standardsätzen
- wiederholten Sätzen
- allgemeinen positiven Antworten
- "Hallo"
- "Guten Morgen"
- "Danke"
- "Ja"
- "Nein"
- ähnlichen Routineantworten

Setze learning.isMeaningful = true NUR wenn eine konkrete sprachliche Fähigkeit sichtbar geübt oder korrigiert wurde.

Beispiele:
- Verbkonjugation
- Wortstellung
- Nebensatzstellung
- Kasus
- Artikel
- Präposition + Kasus
- Adjektivendung
- Plural
- Wortwahl
- Kollokation
- eine klar erkennbare natürliche Formulierung

Wenn keine konkrete Fähigkeit betroffen ist:

skillId = "none"
label = ""
isMeaningful = false

Wenn eine konkrete Fähigkeit betroffen ist, benutze eine stabile skillId aus dieser Liste:

case_dative_after_mit
word_order_main_clause
subordinate_clause_verb_position
article_accusative_masculine
article_dative
verb_conjugation
past_tense_auxiliary
preposition_case
adjective_ending
plural_form
word_choice
collocation
natural_expression

WICHTIG:
"natural_expression" darf nicht als Standard-Fallback für jede normale Unterhaltung verwendet werden.

Wenn eine konkrete Fähigkeit geübt wird:
correct = true oder false.

Wenn keine konkrete Fähigkeit geübt wird:
correct = false
isMeaningful = false

WÖRTER:

Gib nur wenige wirklich nützliche neue deutsche Wörter zurück.

Keine Funktionswörter wie:
"der", "die", "das", "und", "ist", "ich", "du".

Keine Duplikate.

ÜBERSETZUNG:

translation soll eine kurze englische Übersetzung der deutschen Coach-Antwort enthalten.

Diese Übersetzung wird nur angezeigt.
Sie gehört NICHT zum Gesprächsverlauf.

AUSGABE:

Antworte ausschließlich als gültiges JSON.

Format:

{
  "reply": "Deine deutsche Antwort",
  "translation": "English translation",
  "correction": "",
  "mistake": null,
  "words": [],
  "learningNote": "",
  "learning": {
    "skillId": "none",
    "label": "",
    "correct": false,
    "isMeaningful": false
  }
}

Wenn eine Korrektur vorhanden ist:

"correction":
"Richtig wäre: Mir geht es gut."

"mistake":
{
  "original": "Mir geht gut",
  "correction": "Mir geht es gut",
  "explanation": "Bei 'Mir geht es gut' braucht man 'es'."
}

Wenn keine Korrektur vorhanden ist:

"correction": ""
"mistake": null

Keine Markdown-Codeblöcke.
Kein zusätzlicher Text außerhalb des JSON.
`;
}


/* --------------------------------
   Clean messages
-------------------------------- */

function cleanMessages(
  messages
) {

  if (
    !Array.isArray(messages)
  ) {
    return [];
  }

  return messages
    .slice(-MAX_MESSAGES)
    .filter(message => {

      if (!message) {
        return false;
      }

      if (
        message.role !== "user" &&
        message.role !== "assistant"
      ) {
        return false;
      }

      return Boolean(
        cleanString(
          message.content,
          MAX_MESSAGE_LENGTH
        )
      );
    })
    .map(message => ({
      role:
        message.role,

      content:
        cleanString(
          message.content,
          MAX_MESSAGE_LENGTH
        )
    }));
}


/* --------------------------------
   Parse OpenAI output
-------------------------------- */

function extractOutputText(
  result
) {

  if (
    typeof result.output_text ===
    "string"
  ) {

    return result.output_text;
  }

  if (
    Array.isArray(result.output)
  ) {

    let text = "";

    for (
      const item of result.output
    ) {

      if (
        !Array.isArray(
          item.content
        )
      ) {
        continue;
      }

      for (
        const content
        of item.content
      ) {

        if (
          content.type ===
            "output_text" &&
          typeof content.text ===
            "string"
        ) {

          text +=
            content.text;
        }
      }
    }

    return text;
  }

  return "";
}


/* --------------------------------
   Parse coach JSON
-------------------------------- */

function parseCoachResponse(
  text
) {

  let cleaned =
    text.trim();

  cleaned =
    cleaned
      .replace(
        /^```json\s*/i,
        ""
      )
      .replace(
        /^```\s*/i,
        ""
      )
      .replace(
        /\s*```$/i,
        ""
      )
      .trim();

  let parsed;

  try {

    parsed =
      JSON.parse(cleaned);

  } catch {

    /*
      Safe fallback if the model accidentally
      returns normal text.
    */

    return {
      reply:
        cleaned,

      translation:
        "",

      correction:
        "",

      mistake:
        null,

      words:
        [],

      learningNote:
        "",

      learning: {
        skillId:
          "none",

        label:
          "",

        correct:
          false,

        isMeaningful:
          false
      }
    };
  }

  return normalizeCoachResponse(
    parsed
  );
}


/* --------------------------------
   Normalize coach response
-------------------------------- */

function normalizeCoachResponse(
  value
) {

  const learning =
    value &&
    typeof value.learning ===
      "object"
      ? value.learning
      : {};

  const meaningful =
    learning.isMeaningful ===
      true &&
    typeof learning.skillId ===
      "string" &&
    learning.skillId !==
      "none";

  return {

    reply:
      cleanString(
        value.reply,
        4000
      ) ||
      "Erzähl mir mehr.",

    translation:
      cleanString(
        value.translation,
        1000
      ),

    correction:
      cleanString(
        value.correction,
        1000
      ),

    mistake:
      normalizeMistake(
        value.mistake
      ),

    words:
      normalizeWords(
        value.words
      ),

    learningNote:
      meaningful
        ? cleanString(
            value.learningNote,
            1000
          )
        : "",

    learning: {

      skillId:
        meaningful
          ? learning.skillId
          : "none",

      label:
        meaningful
          ? cleanString(
              learning.label,
              200
            )
          : "",

      correct:
        meaningful &&
        learning.correct ===
          true,

      isMeaningful:
        meaningful
    }
  };
}


/* --------------------------------
   Mistake
-------------------------------- */

function normalizeMistake(
  mistake
) {

  if (
    !mistake ||
    typeof mistake !==
      "object"
  ) {
    return null;
  }

  const original =
    cleanString(
      mistake.original,
      1000
    );

  const correction =
    cleanString(
      mistake.correction,
      1000
    );

  if (
    !original ||
    !correction ||
    normalizeText(
      original
    ) ===
    normalizeText(
      correction
    )
  ) {

    return null;
  }

  return {

    original,

    correction,

    explanation:
      cleanString(
        mistake.explanation,
        1000
      )
  };
}


/* --------------------------------
   Words
-------------------------------- */

function normalizeWords(
  words
) {

  if (
    !Array.isArray(words)
  ) {
    return [];
  }

  const result = [];

  for (
    const word of words
  ) {

    const clean =
      cleanString(
        word,
        100
      );

    if (
      !clean ||
      clean.length < 2
    ) {
      continue;
    }

    const exists =
      result.some(
        existing =>
          normalizeText(
            existing
          ) ===
          normalizeText(
            clean
          )
      );

    if (!exists) {
      result.push(clean);
    }
  }

  return result.slice(0, 8);
}


/* --------------------------------
   Transcription
-------------------------------- */

async function handleTranscription(
  request,
  env
) {

  if (!env.OPENAI_API_KEY) {

    return jsonResponse(
      {
        error:
          "OPENAI_API_KEY is not configured."
      },
      500
    );
  }

  const contentLength =
    Number(
      request.headers.get(
        "content-length"
      ) || 0
    );

  if (
    contentLength >
    MAX_AUDIO_BYTES
  ) {

    return jsonResponse(
      {
        error:
          "Audio file is too large."
      },
      413
    );
  }

  const formData =
    await request.formData();

  const file =
    formData.get("file");

  if (
    !file ||
    typeof file.arrayBuffer !==
      "function"
  ) {

    return jsonResponse(
      {
        error:
          "No audio file received."
      },
      400
    );
  }

  if (
    file.size >
    MAX_AUDIO_BYTES
  ) {

    return jsonResponse(
      {
        error:
          "Audio file is too large."
      },
      413
    );
  }

  const openAIForm =
    new FormData();

  openAIForm.append(
    "file",
    file,
    file.name ||
      "recording.webm"
  );

  openAIForm.append(
    "model",
    TRANSCRIBE_MODEL
  );

  openAIForm.append(
    "language",
    "de"
  );

  const response =
    await fetch(
      "https://api.openai.com/v1/audio/transcriptions",
      {
        method: "POST",

        headers: {
          "Authorization":
            `Bearer ${env.OPENAI_API_KEY}`
        },

        body:
          openAIForm
      }
    );

  const rawText =
    await response.text();

  if (!response.ok) {

    return jsonResponse(
      {
        error:
          extractOpenAIError(
            rawText
          )
      },
      response.status
    );
  }

  let result;

  try {

    result =
      JSON.parse(rawText);

  } catch {

    return jsonResponse(
      {
        error:
          "Ungültige Transkriptionsantwort."
      },
      502
    );
  }

  return jsonResponse({
    text:
      cleanString(
        result.text,
        MAX_MESSAGE_LENGTH
      )
  });
}


/* --------------------------------
   Utilities
-------------------------------- */

function cleanString(
  value,
  maxLength
) {

  if (
    typeof value !==
      "string"
  ) {
    return "";
  }

  return value
    .trim()
    .slice(
      0,
      maxLength
    );
}


function normalizeText(
  value
) {

  return String(value || "")
    .toLowerCase()
    .trim()
    .replace(
      /\s+/g,
      " "
    );
}


function normalizeLevel(
  level
) {

  const allowed = [
    "A1",
    "A2",
    "B1",
    "B2",
    "C1",
    "C2"
  ];

  return allowed.includes(
    level
  )
    ? level
    : "B1";
}


function extractOpenAIError(
  raw
) {

  try {

    const parsed =
      JSON.parse(raw);

    if (
      parsed &&
      parsed.error &&
      parsed.error.message
    ) {

      return parsed.error.message;
    }

  } catch {
    // Ignore JSON parsing failure.
  }

  return (
    raw ||
    "OpenAI request failed."
  );
}