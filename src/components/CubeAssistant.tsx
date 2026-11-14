import { useState, type FormEvent } from 'react';

type Message = { role: 'user' | 'assistant'; content: string };
type Props = { cubeState: string; solution: string[]; currentMove: string; progress: number };

export default function CubeAssistant({ cubeState, solution, currentMove, progress }: Props) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const send = async (event?: FormEvent, prompt?: string) => {
    event?.preventDefault();
    const content = (prompt ?? input).trim();
    if (!content || busy) return;
    const next = [...messages, { role: 'user' as const, content }];
    setMessages(next); setInput(''); setError(''); setBusy(true);
    try {
      const response = await fetch('/api/cube-assistant', {
        method: 'POST', headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify({ messages: next.slice(-12), cube: { state: cubeState, solution: solution.join(' '), currentMove, progress } }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(typeof data.error === 'string' ? data.error : 'The assistant could not respond.');
      if (typeof data.text !== 'string' || !data.text.trim()) throw new Error('The assistant returned an empty response.');
      setMessages(items => [...items, { role: 'assistant', content: data.text }]);
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Something went wrong. Please retry.'); }
    finally { setBusy(false); }
  };
  return <section className="cube-assistant" aria-labelledby="cube-assistant-title">
    <div className="cube-assistant-heading"><div><span className="step-label">GEMINI-POWERED TUTOR</span><h2 id="cube-assistant-title">AI Cube Assistant</h2><p>Learn algorithms, understand notation, and get help with your current solve.</p></div><span className="cube-ai-badge">✦ GEMINI AI</span></div>
    <div className="cube-assistant-prompts">
      <button type="button" onClick={() => void send(undefined, 'Teach me the beginner method for solving a 3×3 cube.')}>Beginner method</button>
      <button type="button" onClick={() => void send(undefined, 'Explain the CFOP method and when to use it.')}>Explain CFOP</button>
      <button type="button" onClick={() => void send(undefined, solution.length ? 'Explain my current generated solution step by step.' : 'Teach me how to read Singmaster cube notation.')}>{solution.length ? 'Explain my solution' : 'Cube notation'}</button>
    </div>
    <div className="cube-assistant-messages" aria-live="polite">
      {messages.length === 0 && <p className="cube-assistant-empty">Ask anything about solving a 3×3 Rubik’s Cube. Your current solution context is shared with the assistant when available.</p>}
      {messages.map((message, index) => <article key={index} className={'cube-chat-message ' + message.role}><b>{message.role === 'user' ? 'You' : 'TwistLab AI'}</b><p>{message.content}</p></article>)}
      {busy && <p className="cube-assistant-loading" role="status">Gemini is thinking…</p>}
    </div>
    {error && <p className="cube-assistant-error" role="alert">{error}</p>}
    <form className="cube-assistant-form" onSubmit={event => void send(event)}><input value={input} onChange={event => setInput(event.target.value)} maxLength={5000} placeholder="Ask about algorithms, moves, or solving…" aria-label="Ask the AI Cube Assistant" disabled={busy}/><button className="primary-button" type="submit" disabled={busy || !input.trim()}>Send ↗</button></form>
    <p className="cube-assistant-privacy">Do not enter passwords or API keys. Messages are sent to Gemini to generate replies.</p>
  </section>;
}
