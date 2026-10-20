type Props = { moves: string[]; step: number; mode: 'fast' | 'guided'; onSelect: (index: number) => void };
export default function SolutionSteps({ moves, step, mode, onSelect }: Props) {
  if (!moves.length) return <div className="empty-solution"><span className="empty-icon">↗</span><h3>Your solution will appear here</h3><p>Scramble the cube or enter your sticker colors, then choose Solve cube.</p></div>;
  const stageSize = mode === 'guided' ? Math.max(1, Math.ceil(moves.length / 7)) : moves.length;
  return <div className="solution-steps">{mode === 'guided' && <p className="guided-note">Guided view groups the verified solution into smaller sections. It is not a separate layer-by-layer beginner algorithm.</p>}<div className="move-chip-list">{moves.map((move, index) => { const stage = Math.min(7, Math.floor(index / stageSize) + 1); return <button key={index} onClick={() => onSelect(index)} className={`move-chip ${index === step ? 'active' : ''} ${index < step ? 'done' : ''}`} title={`Jump to move ${index + 1}`}>{mode === 'guided' && index % stageSize === 0 && <small>PART {stage}</small>}{move}</button>; })}</div></div>;
}
