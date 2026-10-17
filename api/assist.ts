import type { VercelRequest, VercelResponse } from '@vercel/node';

const modeInstructions: Record<string, string> = {
  'Generate code': 'Produce a robust, readable implementation. State assumptions briefly, then provide code and usage notes.',
  'Explain code': 'Explain the code in clear steps, including purpose, flow, important concepts, and potential pitfalls.',
  'Debug code': 'Diagnose likely root causes, explain why they happen, and provide a corrected solution. Do not claim to have executed the code.',
  'README writer': 'Write a polished GitHub README in Markdown with headings, features, setup, usage, configuration, and examples. Do not invent facts; mark unknown details as TODO.',
  'Release notes': 'Write detailed release notes in Markdown with a suitable title, concise summary, emoji section headings, features, fixes, breaking changes if applicable, and code formatting where useful. Do not invent changes not supplied by the user.',
};

const systemInstruction = [
  'You are DevHub, a careful senior software engineer and technical writer.',
  'Support any programming language. Be accurate and explain assumptions.',
  'Prefer secure, maintainable solutions. Never claim to have run code unless a tool actually ran it.',
  'Use fenced Markdown code blocks labelled with the language where appropriate.',
  'For documentation and release notes, use clear, rich Markdown without inventing facts.',
].join(' ');

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Cache-Control', 'no-store');

  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed. Use POST.' });
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return res.status(503).json({
      error: 'AI is not configured yet. Add GEMINI_API_KEY to the Vercel project environment variables, then redeploy.',
    });
  }

  const input = typeof req.body === 'string'
    ? (() => { try { return JSON.parse(req.body); } catch { return null; } })()
    : req.body;
  const mode = typeof input?.mode === 'string' ? input.mode : '';
  const language = typeof input?.language === 'string' ? input.language.trim() : '';
  const task = typeof input?.task === 'string' ? input.task.trim() : '';

  if (!modeInstructions[mode]) {
    return res.status(400).json({ error: 'Choose a supported workflow.' });
  }
  if (!language || language.length > 80) {
    return res.status(400).json({ error: 'Choose a valid programming language or stack.' });
  }
  if (!task) {
    return res.status(400).json({ error: 'Enter a question or task first.' });
  }
  if (task.length > 18000) {
    return res.status(413).json({ error: 'Please keep each prompt under 18,000 characters.' });
  }

  try {
    const response = await fetch(
      'https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash-lite:generateContent',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-goog-api-key': apiKey,
        },
        body: JSON.stringify({
          systemInstruction: { parts: [{ text: systemInstruction }] },
          contents: [{
            role: 'user',
            parts: [{
              text: `Workflow: ${mode}\nLanguage or stack: ${language}\nInstructions: ${modeInstructions[mode]}\n\nUser task:\n${task}`,
            }],
          }],
          generationConfig: { temperature: 0.3, maxOutputTokens: 2400 },
        }),
      },
    );

    const data = await response.json().catch(() => ({})) as {
      candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
      error?: { message?: string };
    };

    if (!response.ok) {
      console.error('Gemini API request failed:', response.status, data.error?.message);
      if (response.status === 429) {
        return res.status(429).json({ error: 'The AI service is rate-limited. Wait a moment and try again.' });
      }
      if (response.status === 401 || response.status === 403) {
        return res.status(502).json({ error: 'Gemini rejected the API key or its permissions. Check GEMINI_API_KEY in Vercel.' });
      }
      return res.status(502).json({ error: 'The AI service could not complete the request. Please try again.' });
    }

    const text = data.candidates?.[0]?.content?.parts
      ?.map(part => part.text ?? '')
      .join('')
      .trim();

    if (!text) {
      return res.status(502).json({ error: 'The AI service returned an empty response. Please try again.' });
    }
    return res.status(200).json({ text });
  } catch (error) {
    console.error('DevHub AI generation failed:', error);
    return res.status(502).json({ error: 'AI generation is temporarily unavailable. Please retry in a moment.' });
  }
}
