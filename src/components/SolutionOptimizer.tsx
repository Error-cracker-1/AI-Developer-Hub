import { useMemo, useState } from 'react';
import { applyMoves, SOLVED } from '../lib/cube';

type Props = { initialState: string; moves: string[] };
type Move = { face: string; amount: number };

function parseMove(token: string): Move | null {
  const face = token[0];
  if (!'URFDLB'.includes(face)) return null;
  return { face, amount: token.endsWith('2') ? 2 : token.endsWith("'") ? 3 : 1 };
}

function formatMove(move: Move): string {
  return move.amount === 1 ? move.face : move.amount === 2 ? move.face + '2' : move.face + "'";
}

function optimizeSequence(moves: string[]): string[] {
  const result: Move[] = [];
  for (const token of moves) {
    const next = parseMove(token);
    if (!next) continue;
    const previous = result[result.length - 1];
    if (previous?.face === next.face) {
      previous.amount = (previous.amount + next.amount) % 4;
      if (previous.amount === 0) result.pop();
    } else {
      result.push({ ...next });
    }
  }
  return result.map(formatMove);
}

function qtm(moves: string[]) {
  return moves.reduce((total, move) => total + (move.endsWith('2') ? 2 : 1), 0);
}

export default function SolutionOptimizer({ initialState, moves }: Props) {
  const [copied, setCopied] = useState(false);
  const analysis = useMemo(() => {
    const optimized = optimizeSequence(moves);
    const verified = applyMoves(initialState, optimized) === SOLVED;
    const beforeQtm = qtm(moves);
    const afterQtm = qtm(optimized);
    return {
      optimized,
      verified,
      beforeQtm,
      afterQtm,
      saved: moves.length - optimized.length,
      reduction: moves.length ? Math.round((moves.length - optimized.length) / moves.length * 100) : 0,
      halfTurns: moves.filter(move => move.endsWith('2')).length,
      quarterTurns: moves.filter(move => !move.endsWith('2')).length,
    };
  }, [initialState, moves]);

  const copyOptimized = async () => {
    try {
      await navigator.clipboard.writeText(analysis.optimized.join(' '));
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      setCopied(false);
    }
  };

  if (!analysis.verified) return null;

  return <section className="solution-optimizer" aria-label="Solution efficiency analysis">
    <div className="optimizer-heading">
      <div><span className="current-kicker">MOVE EFFICIENCY LAB</span><h3>Solution optimization</h3></div>
      <span className="optimizer-verified">✓ Re-verified</span>
    </div>
    <p className="optimizer-intro">A safe notation pass combines consecutive turns of the same face. The optimized sequence is replayed against your starting cube before it is shown.</p>
    <div className="optimizer-comparison">
      <div><span>ORIGINAL HTM</span><strong>{moves.length}</strong><small>{analysis.beforeQtm} QTM</small></div>
      <div><span>OPTIMIZED HTM</span><strong>{analysis.optimized.length}</strong><small>{analysis.afterQtm} QTM</small></div>
      <div><span>HTM REDUCTION</span><strong>{analysis.saved > 0 ? '−' : ''}{analysis.saved}</strong><small>{analysis.reduction}% fewer moves</small></div>
    </div>
    <div className="optimizer-breakdown">
      <span>{analysis.halfTurns} half-turns</span><span>{analysis.quarterTurns} quarter-turns</span><span>{analysis.saved > 0 ? 'Simplifications found' : 'Already normalized'}</span>
    </div>
    <label className="optimizer-label">VERIFIED OPTIMIZED ALGORITHM</label>
    <code className="optimizer-algorithm">{analysis.optimized.join(' ') || 'Already solved — no moves required.'}</code>
    <div className="optimizer-footer">
      <span>{analysis.saved > 0 ? 'Equivalent sequence; same final cube state.' : 'No adjacent same-face turns could be combined.'}</span>
      <button className="secondary-button" onClick={copyOptimized} disabled={!analysis.optimized.length}>{copied ? 'Copied ✓' : 'Copy optimized'}</button>
    </div>
    <p className="optimizer-caveat">This is a local sequence simplifier, not a globally optimal solver. HTM counts notation moves; QTM counts a half-turn as two quarter-turns. A shorter sequence is only claimed when the verified reduction is non-zero.</p>
  </section>;
}
