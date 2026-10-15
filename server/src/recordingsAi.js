// Proxy de Gemini para Grabaciones Colaborativas.
// La clave vive SOLO en el servidor (GEMINI_API_KEY), patrón igual que
// GOOGLE_CLIENT_ID/SECRET de gcal.js. El navegador nunca habla con Google.
//
// Modos:
//  - Audio  → generateContent con inline_data (límite ~20 MB por request).
//  - Texto  → generateContent con partes de texto (notas + transcripts).

const GEMINI_BASE = 'https://generativelanguage.googleapis.com/v1beta/models';
const INLINE_MAX_BYTES = 19 * 1024 * 1024; // margen bajo el límite de ~20 MB

export function geminiConfigured() {
  return Boolean(process.env.GEMINI_API_KEY);
}

export function geminiModel() {
  return process.env.GEMINI_MODEL || 'gemini-2.5-flash';
}

async function generateContent(parts, { temperature = 0.2 } = {}) {
  const key = process.env.GEMINI_API_KEY;
  if (!key) throw new Error('GEMINI_API_KEY no configurada');

  const res = await fetch(`${GEMINI_BASE}/${geminiModel()}:generateContent`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-goog-api-key': key,
    },
    body: JSON.stringify({
      contents: [{ parts }],
      generationConfig: { temperature, maxOutputTokens: 8192 },
    }),
  });
  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new Error(`Gemini respondió ${res.status}: ${body.slice(0, 300)}`);
  }
  const data = await res.json();
  const text = (data?.candidates?.[0]?.content?.parts || [])
    .map((p) => p.text || '')
    .join('')
    .trim();
  if (!text) throw new Error('Gemini devolvió una respuesta vacía');
  return text;
}

/** Transcribe un buffer de audio (webm/ogg/mp4/mpeg/wav) a texto plano en español. */
export async function geminiTranscribe(audioBuffer, mime) {
  if (audioBuffer.length > INLINE_MAX_BYTES) {
    throw new Error('El audio supera el límite de 20 MB para transcripción automática');
  }
  const prompt = [
    'Transcribe fielmente este archivo de audio en español.',
    'Devuelve SOLO el texto transcrito, sin comentarios, sin introducción y sin timestamps.',
    'Si el audio no contiene voz legible, responde exactamente: [sin voz legible]',
  ].join(' ');
  return generateContent([
    { inline_data: { mime_type: mime, data: audioBuffer.toString('base64') } },
    { text: prompt },
  ]);
}

/** Resume las contribuciones/transcripts de un grupo. Devuelve texto en español. */
export async function geminiSummarize(corpusText) {
  const prompt = [
    'Eres el asistente de un equipo que dejó notas y transcripciones de reuniones en un espacio colaborativo.',
    'Resume el contenido en español con esta estructura en Markdown:',
    '## Resumen ejecutivo (3-5 líneas)',
    '## Puntos clave',
    '## Acuerdos y pendientes',
    'Sé concreto; si falta información, dilo brevemente. No inventes datos.',
    '',
    'CONTENIDO DEL EQUIPO:',
    '---------------------',
    corpusText,
  ].join('\n');
  return generateContent([{ text: prompt }], { temperature: 0.3 });
}

/**
 * Genera un cuestionario de opción múltiple a partir del corpus del grupo.
 * Devuelve { questions: [{ question, options[], answer, explanation }] }.
 */
export async function geminiQuiz(corpusText, count = 8) {
  const n = Math.max(3, Math.min(15, Math.round(count)));
  const prompt = [
    `Crea un cuestionario de opción múltiple en español con exactamente ${n} preguntas sobre el siguiente contenido de un equipo (notas y transcripciones de reuniones).`,
    'Cada pregunta debe tener 4 opciones; exactamente una es correcta.',
    'Devuelve SOLO un JSON válido, sin markdown ni comentarios, con esta forma exacta:',
    '{"questions":[{"question":"...","options":["a","b","c","d"],"answer":0,"explanation":"..."}]}',
    '- "answer" es el índice (0-3) de la opción correcta.',
    '- "explanation" es una frase breve (opcional pero recomendada).',
    'No inventes datos que no estén en el contenido.',
    '',
    'CONTENIDO DEL EQUIPO:',
    '---------------------',
    corpusText.slice(0, 120000),
  ].join('\n');

  const raw = await generateContent([{ text: prompt }], { temperature: 0.4 });
  const cleaned = raw.replace(/^```(?:json)?\s*/i, '').replace(/\s*```\s*$/, '').trim();
  let data;
  try {
    data = JSON.parse(cleaned);
  } catch {
    throw new Error('El modelo devolvió un cuestionario que no es JSON válido');
  }
  const questions = Array.isArray(data?.questions) ? data.questions.slice(0, n) : [];
  const valid = questions
    .map((q) => {
      const options = Array.isArray(q?.options) ? q.options.map((o) => String(o)).slice(0, 6) : [];
      const answer = Number.isInteger(q?.answer) ? q.answer : -1;
      return {
        question: String(q?.question || '').slice(0, 500),
        options,
        answer,
        explanation: String(q?.explanation || '').slice(0, 400),
      };
    })
    .filter((q) => q.question && q.options.length >= 2 && q.answer >= 0 && q.answer < q.options.length);

  if (valid.length === 0) throw new Error('El modelo devolvió un cuestionario sin preguntas válidas');
  return { questions: valid };
}
