import { router, json, error, ai } from '@appdeploy/sdk';

const modeInstructions: Record<string, string> = {
  'Generate code':
    'Produce a robust, readable implementation. State assumptions briefly, then provide code and usage notes.',
  'Explain code':
    'Explain the code in clear steps, including purpose, flow, important concepts, and any potential pitfalls.',
  'Debug code':
    'Diagnose likely root causes, explain why they happen, and provide a corrected solution. Do not claim to have executed the code.',
  'README writer':
    'Write a polished GitHub README in Markdown with useful headings, features, setup, usage, configuration, and examples. Do not invent facts; mark unknown details as TODO.',
  'Release notes':
    'Write detailed release notes in Markdown with a suitable title, a concise summary, emoji section headings, features, fixes, breaking changes if applicable, and code formatting where useful. Do not invent changes not supplied by the user.',
};

export const handler = router({
  'GET /api/_healthcheck': [async () => json({ message: 'Success' })],
  'POST /api/assist': [
    async ({ body }) => {
      const input = body as { mode?: string; language?: string; task?: string };
      const mode = typeof input?.mode === 'string' ? input.mode : '';
      const language =
        typeof input?.language === 'string' ? input.language : '';
      const task = typeof input?.task === 'string' ? input.task.trim() : '';
      if (!modeInstructions[mode])
        return error('Choose a supported workflow.', 400);
      if (!language || language.length > 80)
        return error('Choose a valid programming language or stack.', 400);
      if (!task) return error('Enter a question or task first.', 400);
      if (task.length > 18000)
        return error('Please keep each prompt under 18,000 characters.', 413);
      try {
        const result = await ai.generate({
          system:
            'You are DevHub, a careful senior software engineer and technical writer. Support any programming language. Be accurate, explain assumptions, prefer secure and maintainable solutions, and never claim to have run code unless a tool actually ran it. When producing code, use fenced Markdown code blocks labelled with the language where appropriate. For release notes and documentation, use clear rich Markdown without inventing facts.',
          prompt:
            'Workflow: ' +
            mode +
            '\nLanguage or stack: ' +
            language +
            '\nInstructions: ' +
            modeInstructions[mode] +
            '\n\nUser task:\n' +
            task,
          thinkingMode: 'FAST',
          maxTokens: 2400,
          temperature: 0.3,
          cache: true,
        });
        if (!result.text?.trim())
          return error(
            'The AI service returned an empty result. Please retry.',
            502
          );
        return json({ text: result.text });
      } catch (err) {
        console.error('DevHub AI generation failed:', err);
        const failure = err as { statusCode?: number };
        if (failure?.statusCode === 429)
          return error(
            'The AI service is rate-limited. Please wait a moment and retry.',
            429
          );
        return error(
          'AI generation is temporarily unavailable. Please retry in a moment.',
          502
        );
      }
    },
  ],
});
