import Constants from 'expo-constants';

const OPENROUTER_API_KEY =
  (Constants.expoConfig?.extra?.OPENROUTER_API_KEY as string) ||
  process.env.OPENROUTER_API_KEY ||
  process.env.EXPO_PUBLIC_OPENROUTER_API_KEY ||
  '';

const GOOGLE_API_KEY =
  (Constants.expoConfig?.extra?.GOOGLE_API_KEY as string) ||
  (Constants.expoConfig?.extra?.GEMINI_API_KEY as string) ||
  process.env.GOOGLE_API_KEY ||
  process.env.GEMINI_API_KEY ||
  process.env.EXPO_PUBLIC_GOOGLE_API_KEY ||
  '';

const ANTHROPIC_API_KEY =
  (Constants.expoConfig?.extra?.ANTHROPIC_API_KEY as string) ||
  process.env.ANTHROPIC_API_KEY ||
  '';

const OPENROUTER_MODELS = [
  'nvidia/nemotron-3.5-lightning:free',
  'liquid/lfm-2.5-2.6b:free',
  'nvidia/nemotron-3.5-super-vl:free',
  'cohere/north-mini-code:free',
  'recursive/flint-v1.0:free',
];
const GOOGLE_MODELS = [
  'gemini-2.0-flash',
  'gemini-1.5-flash',
  'gemini-flash-latest',
];
const ANTHROPIC_MODEL = 'claude-sonnet-4-20250514';

export const isAIConfigured = Boolean(OPENROUTER_API_KEY || GOOGLE_API_KEY || ANTHROPIC_API_KEY);

export interface QuizQuestion {
  question: string;
  options: string[];
  correctIndex: number;
  explanation: string;
}

export interface Flashcard {
  front: string;
  back: string;
  hint?: string;
}

export interface StudyPlanEntry {
  day: string;
  focus: string;
  activities: string[];
}

export interface StudyPlan {
  title: string;
  entries: StudyPlanEntry[];
}

async function callOpenRouter(systemPrompt: string, userPrompt: string): Promise<string> {
  if (!OPENROUTER_API_KEY) {
    throw new Error('OPENROUTER_API_KEY not set');
  }

  let lastError: Error | null = null;

  for (const model of OPENROUTER_MODELS) {
    try {
      const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
          'HTTP-Referer': 'https://studymate.app',
          'X-Title': 'StudyMate',
        },
        body: JSON.stringify({
          model,
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userPrompt },
          ],
          temperature: 0.7,
          max_tokens: 4096,
        }),
      });

      if (!response.ok) {
        const body = await response.text();
        lastError = new Error(`OpenRouter API error ${response.status} (${model}): ${body}`);
        if (response.status === 404 || response.status === 429 || response.status === 503) continue;
        throw lastError;
      }

      const data = await response.json();
      const text = data.choices?.[0]?.message?.content ?? '';
      if (!text) {
        lastError = new Error(`Empty response from ${model}`);
        continue;
      }
      return text.trim();
    } catch (err) {
      lastError = err instanceof Error ? err : new Error(String(err));
      continue;
    }
  }

  throw lastError || new Error('All OpenRouter models failed');
}

async function callGoogle(systemPrompt: string, userPrompt: string): Promise<string> {
  if (!GOOGLE_API_KEY) {
    throw new Error('GOOGLE_API_KEY not set');
  }

  let lastError: Error | null = null;

  for (const model of GOOGLE_MODELS) {
    try {
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${GOOGLE_API_KEY}`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            systemInstruction: { parts: [{ text: systemPrompt }] },
            contents: [{ role: 'user', parts: [{ text: userPrompt }] }],
            generationConfig: { temperature: 0.7, maxOutputTokens: 4096 },
          }),
        },
      );

      if (!response.ok) {
        const body = await response.text();
        lastError = new Error(`Google AI API error ${response.status} (${model}): ${body}`);
        if (response.status === 404 || response.status === 503) continue;
        throw lastError;
      }

      const data = await response.json();
      const text = data.candidates?.[0]?.content?.parts?.[0]?.text ?? '';
      if (!text) {
        lastError = new Error(`Empty response from ${model}`);
        continue;
      }
      return text.trim();
    } catch (err) {
      lastError = err instanceof Error ? err : new Error(String(err));
      continue;
    }
  }

  throw lastError || new Error('All Google AI models failed');
}

async function callAnthropic(systemPrompt: string, userPrompt: string): Promise<string> {
  if (!ANTHROPIC_API_KEY) {
    throw new Error('ANTHROPIC_API_KEY not set');
  }

  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': ANTHROPIC_API_KEY,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: ANTHROPIC_MODEL,
      max_tokens: 4096,
      system: systemPrompt,
      messages: [{ role: 'user', content: userPrompt }],
    }),
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Anthropic API error ${response.status}: ${body}`);
  }

  const data = await response.json();
  const text = data.content?.[0]?.text ?? '';
  return text.trim();
}

async function callAI(systemPrompt: string, userPrompt: string): Promise<string> {
  if (OPENROUTER_API_KEY) {
    try {
      return await callOpenRouter(systemPrompt, userPrompt);
    } catch (err) {
      if (GOOGLE_API_KEY) {
        try { return await callGoogle(systemPrompt, userPrompt); } catch {}
      }
      if (ANTHROPIC_API_KEY) {
        try { return await callAnthropic(systemPrompt, userPrompt); } catch {}
      }
      throw err;
    }
  }
  if (GOOGLE_API_KEY) {
    try {
      return await callGoogle(systemPrompt, userPrompt);
    } catch (err) {
      if (ANTHROPIC_API_KEY) return await callAnthropic(systemPrompt, userPrompt);
      throw err;
    }
  }
  if (ANTHROPIC_API_KEY) {
    return await callAnthropic(systemPrompt, userPrompt);
  }
  throw new Error('No AI API key configured. Add OPENROUTER_API_KEY, GOOGLE_API_KEY, or ANTHROPIC_API_KEY to .env');
}

const callClaude = callAI;

export async function generateQuiz(
  subject: string,
  topic: string,
  count: number,
): Promise<QuizQuestion[]> {
  const systemPrompt =
    'You are an expert educator. Generate study quizzes for university students. ' +
    'Return ONLY valid JSON — no markdown, no explanation. ' +
    'Format: {"questions": [{"question": "...", "options": ["A", "B", "C", "D"], "correctIndex": 0, "explanation": "..."}]}';

  const userPrompt = `Generate ${count} multiple-choice questions about "${topic}" in the subject "${subject}".
Each question must have exactly 4 options, one correct answer, and a brief explanation.
Make the questions appropriate for a university-level student.`;

  const raw = await callClaude(systemPrompt, userPrompt);
  const jsonMatch = raw.match(/\{[\s\S]*\}/);
  if (!jsonMatch) throw new Error('Could not parse quiz response');

  const parsed = JSON.parse(jsonMatch[0]) as { questions: QuizQuestion[] };
  return parsed.questions;
}

export async function generateFlashcards(
  subject: string,
  topic: string,
  count: number,
): Promise<Flashcard[]> {
  const systemPrompt =
    'You are an expert educator. Generate study flashcards for university students. ' +
    'Return ONLY valid JSON — no markdown, no explanation. ' +
    'Format: {"cards": [{"front": "...", "back": "...", "hint": "..."}]}';

  const userPrompt = `Generate ${count} flashcards about "${topic}" in the subject "${subject}".
Each card has a "front" (concept/question) and a "back" (answer/explanation).
Include a short "hint" for cards that need one.
Make the cards useful for self-quizzing before exams.`;

  const raw = await callClaude(systemPrompt, userPrompt);
  const jsonMatch = raw.match(/\{[\s\S]*\}/);
  if (!jsonMatch) throw new Error('Could not parse flashcard response');

  const parsed = JSON.parse(jsonMatch[0]) as { cards: Flashcard[] };
  return parsed.cards;
}

export async function generateStudyPlan(
  subject: string,
  topics: string[],
  weeks: number,
  availability: { day: number; start: string; end: string }[],
): Promise<StudyPlan> {
  const systemPrompt =
    'You are an expert study coach. Generate a study plan for university students. ' +
    'Return ONLY valid JSON — no markdown, no explanation. ' +
    'Format: {"title": "...", "entries": [{"day": "Monday", "focus": "...", "activities": ["..."]}]}';

  const availText = availability
    .map((a) => ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][a.day] + ' ' + a.start + '-' + a.end)
    .join(', ');

  const userPrompt = `Create a ${weeks}-week study plan for "${subject}" covering these topics: ${topics.join(', ')}.
The student is available at: ${availText}.
Each entry should have a day, a focus topic, and 2-3 short activities.
Spread topics across the weeks and keep the workload realistic.`;

  const raw = await callClaude(systemPrompt, userPrompt);
  const jsonMatch = raw.match(/\{[\s\S]*\}/);
  if (!jsonMatch) throw new Error('Could not parse study plan response');

  const parsed = JSON.parse(jsonMatch[0]) as StudyPlan;
  return parsed;
}

// ---------------------------------------------------------------------------
// Text-based generation — for uploaded notes / PDFs
// ---------------------------------------------------------------------------

export async function generateQuizFromText(
  text: string,
  count: number,
): Promise<QuizQuestion[]> {
  const systemPrompt =
    'You are an expert educator. Generate study quizzes for university students. ' +
    'Return ONLY valid JSON — no markdown, no explanation. ' +
    'Format: {"questions": [{"question": "...", "options": ["A", "B", "C", "D"], "correctIndex": 0, "explanation": "..."}]}';

  const userPrompt = `Based on the following notes, generate ${count} multiple-choice questions.
Each question must have exactly 4 options, one correct answer, and a brief explanation.
Make the questions appropriate for a university-level student.

NOTES:
${text.slice(0, 8000)}`;

  const raw = await callClaude(systemPrompt, userPrompt);
  const jsonMatch = raw.match(/\{[\s\S]*\}/);
  if (!jsonMatch) throw new Error('Could not parse quiz response');

  const parsed = JSON.parse(jsonMatch[0]) as { questions: QuizQuestion[] };
  return parsed.questions;
}

export async function generateFlashcardsFromText(
  text: string,
  count: number,
): Promise<Flashcard[]> {
  const systemPrompt =
    'You are an expert educator. Generate study flashcards for university students. ' +
    'Return ONLY valid JSON — no markdown, no explanation. ' +
    'Format: {"cards": [{"front": "...", "back": "...", "hint": "..."}]}';

  const userPrompt = `Based on the following notes, generate ${count} flashcards.
Each card has a "front" (concept/question) and a "back" (answer/explanation).
Include a short "hint" for cards that need one.
Make the cards useful for self-quizzing before exams.

NOTES:
${text.slice(0, 8000)}`;

  const raw = await callClaude(systemPrompt, userPrompt);
  const jsonMatch = raw.match(/\{[\s\S]*\}/);
  if (!jsonMatch) throw new Error('Could not parse flashcard response');

  const parsed = JSON.parse(jsonMatch[0]) as { cards: Flashcard[] };
  return parsed.cards;
}

export async function summarizeNotes(text: string): Promise<string> {
  const systemPrompt =
    'You are a study assistant. Summarize the following notes concisely for a university student. ' +
    'Focus on key concepts, definitions, and important facts. Return plain text.';

  const userPrompt = `Summarize these notes:\n\n${text.slice(0, 8000)}`;

  return callClaude(systemPrompt, userPrompt);
}
