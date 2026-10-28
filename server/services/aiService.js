import Groq from 'groq-sdk';

const MODEL = process.env.GROQ_MODEL || 'openai/gpt-oss-120b';

const SENTIMENTS = ['Positive', 'Neutral', 'Negative'];
const CATEGORIES = [
  'Instructor',
  'Platform Bug',
  'Pricing',
  'Course Content',
  'Customer Support',
];

const SYSTEM_PROMPT = `You are an expert feedback analyst for an ed-tech company. You classify feedback written by parents and students.

Analyze the feedback and respond ONLY with a valid JSON object in exactly this shape:
{ "sentiment": "...", "category": "...", "summary": "...", "confidenceScore": 0.95 }

Rules:
- "sentiment" must be exactly one of: "Positive", "Neutral", "Negative".
- "category" must be exactly one of: "Instructor", "Platform Bug", "Pricing", "Course Content", "Customer Support".
- "summary" must be a single concise sentence (max 25 words) summarizing the feedback.
- "confidenceScore" must be a number between 0.0 and 1.0 indicating how confident you are in the classification.
- Output JSON only. No markdown, no commentary.`;

let groqClient = null;

const getClient = () => {
  const key = process.env.GROQ_API_KEY;
  if (!key || /your_|dummy|replace/i.test(key)) return null;
  if (!groqClient) {
    groqClient = new Groq({ apiKey: process.env.GROQ_API_KEY });
  }
  return groqClient;
};

const clamp = (n, min, max) => Math.min(max, Math.max(min, n));

const matchEnum = (value, allowed) => {
  if (typeof value !== 'string') return null;
  const found = allowed.find((a) => a.toLowerCase() === value.trim().toLowerCase());
  return found || null;
};

const NEGATIVE_WORDS = [
  'bad', 'terrible', 'awful', 'worst', 'hate', 'poor', 'disappointed', 'disappointing',
  'frustrating', 'frustrated', 'slow', 'broken', 'bug', 'crash', 'crashes', 'crashed',
  'error', 'fails', 'failed', 'failing', 'useless', 'waste', 'expensive', 'overpriced',
  'confusing', 'unhelpful', 'rude', 'never', 'not working', "doesn't work", "can't",
  'cannot', 'unresponsive', 'ignored', 'refund', 'angry', 'boring', 'glitch', 'stuck',
];

const POSITIVE_WORDS = [
  'good', 'great', 'excellent', 'amazing', 'love', 'loved', 'fantastic', 'wonderful',
  'helpful', 'best', 'awesome', 'happy', 'perfect', 'clear', 'engaging', 'recommend',
  'thank', 'thanks', 'brilliant', 'improved', 'easy', 'enjoy', 'enjoyed', 'impressed',
  'worth', 'affordable', 'smooth', 'responsive',
];

const CATEGORY_KEYWORDS = {
  'Platform Bug': [
    'bug', 'crash', 'crashes', 'crashed', 'error', 'glitch', 'login', 'log in', 'loading',
    'freeze', 'freezes', 'frozen', 'app', 'website', 'video not', 'not loading', 'broken',
    'stuck', 'lag', 'laggy', 'buffering', 'payment page', 'screen', 'server',
  ],
  Pricing: [
    'price', 'pricing', 'expensive', 'cost', 'costly', 'fee', 'fees', 'subscription',
    'afford', 'affordable', 'cheap', 'discount', 'refund', 'money', 'payment', 'overpriced',
    'worth',
  ],
  Instructor: [
    'teacher', 'instructor', 'tutor', 'professor', 'mentor', 'faculty', 'lecturer',
    'teaches', 'teaching', 'explains', 'explained', 'explanation', 'coach',
  ],
  'Customer Support': [
    'support', 'customer service', 'helpdesk', 'help desk', 'ticket', 'respond', 'response',
    'reply', 'replied', 'agent', 'representative', 'contacted', 'email', 'call back', 'hotline',
  ],
  'Course Content': [
    'course', 'content', 'lesson', 'lessons', 'curriculum', 'syllabus', 'module', 'modules',
    'material', 'materials', 'assignment', 'assignments', 'quiz', 'quizzes', 'topic',
    'topics', 'chapter', 'chapters', 'exercise', 'exercises', 'homework', 'notes',
  ],
};

const countMatches = (text, words) =>
  words.reduce((acc, w) => (text.includes(w) ? acc + 1 : acc), 0);

/**
 * Deterministic keyword-based fallback classifier.
 * Never throws; used when Groq key is missing, rate limited, or errors.
 */
export const heuristicAnalyze = (text, rating) => {
  const lower = String(text || '').toLowerCase();

  const neg = countMatches(lower, NEGATIVE_WORDS);
  const pos = countMatches(lower, POSITIVE_WORDS);

  let score = pos - neg;
  if (typeof rating === 'number' && rating >= 1 && rating <= 5) {
    if (rating >= 4) score += 1;
    else if (rating <= 2) score -= 1;
  }

  let sentiment = 'Neutral';
  if (score > 0) sentiment = 'Positive';
  else if (score < 0) sentiment = 'Negative';

  let category = 'Course Content';
  let best = 0;
  for (const [cat, words] of Object.entries(CATEGORY_KEYWORDS)) {
    const matches = countMatches(lower, words);
    if (matches > best) {
      best = matches;
      category = cat;
    }
  }

  const cleaned = String(text || '').replace(/\s+/g, ' ').trim();
  const summary = cleaned.length > 120 ? `${cleaned.slice(0, 117)}...` : cleaned;

  const strength = Math.abs(score) + best;
  const confidenceScore = Number(clamp(0.5 + strength * 0.07, 0.5, 0.8).toFixed(2));

  return { sentiment, category, summary, confidenceScore };
};

/**
 * Analyze a piece of feedback with Groq (JSON mode).
 * Falls back to heuristic analysis on any failure so the server never crashes.
 */
export const analyzeFeedback = async (text, rating) => {
  const client = getClient();

  if (!client) {
    return heuristicAnalyze(text, rating);
  }

  try {
    const completion = await client.chat.completions.create({
  model: MODEL,
  temperature: 0.1,
  max_tokens: 1500,
  ...(MODEL.startsWith('openai/gpt-oss') ? { reasoning_effort: 'low' } : {}),
  response_format: { type: 'json_object' },
  messages: [
    { role: 'system', content: SYSTEM_PROMPT },
    { role: 'user', content: `Feedback to analyze:\n"""${String(text).slice(0, 2000)}"""` },
  ],
});

    const content = completion?.choices?.[0]?.message?.content;
    if (!content) throw new Error('Empty response from Groq');

    const parsed = JSON.parse(content);

    const sentiment = matchEnum(parsed.sentiment, SENTIMENTS);
    const category = matchEnum(parsed.category, CATEGORIES);

    if (!sentiment || !category) {
      throw new Error('Groq returned out-of-schema sentiment/category');
    }

    const rawConfidence = Number(parsed.confidenceScore);
    const confidenceScore = Number.isFinite(rawConfidence)
      ? Number(clamp(rawConfidence, 0, 1).toFixed(2))
      : 0.75;

    const summary =
      typeof parsed.summary === 'string' && parsed.summary.trim()
        ? parsed.summary.trim().slice(0, 300)
        : heuristicAnalyze(text, rating).summary;

    return { sentiment, category, summary, confidenceScore };
  } catch (error) {
    console.warn(`⚠️  Groq analysis failed (${error.message}). Using heuristic fallback.`);
    return heuristicAnalyze(text, rating);
  }
};