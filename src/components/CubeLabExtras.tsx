import { useEffect, useMemo, useRef, useState } from 'react';
import { randomScramble } from '../lib/cube';

type Tab = 'practice' | 'algorithms' | 'stats';
type RecordEntry = { date: string; seconds: number; scramble: string; moves: number };
const KEY = 'twistlab-cube-lab-v3';
const ALGORITHMS = [
  { name: 'Right trigger', category: 'Beginner · Corner insertion', moves: "R U R' U'", use: 'A foundational trigger for moving pieces while restoring much of the cube.' },
  { name: 'Left trigger', category: 'Beginner · Mirror trigger', moves: "L' U' L U", use: 'The mirrored trigger for left-side practice.' },
  { name: 'Sune', category: 'OLL · Orientation', moves: "R U R' U R U2 R'", use: 'A common last-layer orientation pattern. Learn the setup and recognize the case first.' },
  { name: 'Anti-Sune', category: 'OLL · Orientation', moves: "R U2 R' U' R U' R'", use: 'A useful Sune variation for last-layer recognition drills.' },
  { name: 'T-perm', category: 'PLL · Permutation', moves: "R U R' U' R' F R2 U' R' U' R U R' F'", use: 'A popular last-layer permutation algorithm; practice slowly before increasing speed.' },
  { name: 'U-perm practice', category: 'PLL · Permutation', moves: "R U' R U R U R U' R' U' R2", use: 'A practice sequence for studying last-layer edge cycles. Verify the exact case before timed use.' }
];
function readRecords(): RecordEntry[] {
  try { const value = JSON.parse(localStorage.getItem(KEY) || '[]'); return Array.isArray(value) ? value : []; } catch { return []; }
}
function formatTime(value: number) {
  const minutes = Math.floor(value / 60);
  return minutes ? minutes + ':' + String(Math.floor(value % 60)).padStart(2, '0') + '.' + String(Math.floor((value % 1) * 100)).padStart(2, '0') : value.toFixed(2) + 's';
}
export default function CubeLabExtras() {
  const [tab, setTab] = useState<Tab>('practice');
  const [scramble, setScramble] = useState(() => randomScramble(20).join(' '));
  const [records, setRecords] = useState<RecordEntry[]>(readRecords);
  const [running, setRunning] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [startedAt, setStartedAt] = useState(0);
  const [selectedAlgorithm, setSelectedAlgorithm] = useState(0);
  const [query, setQuery] = useState('');
  const [copied, setCopied] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const startedRef = useRef(0);
  useEffect(() => {
    if (!running) return;
    const tick = window.setInterval(() => setElapsed((performance.now() - startedRef.current) / 1000), 31);
    return () => window.clearInterval(tick);
  }, [running]);
  useEffect(() => { try { localStorage.setItem(KEY, JSON.stringify(records.slice(0, 200))); } catch { /* storage may be unavailable */ } }, [records]);
  const filtered = useMemo(() => ALGORITHMS.filter(a => (a.name + ' ' + a.category + ' ' + a.moves).toLowerCase().includes(query.toLowerCase())), [query]);
  const best = records.length ? Math.min(...records.map(r => r.seconds)) : null;
  const average = records.length ? records.reduce((sum, r) => sum + r.seconds, 0) / records.length : null;
  const start = () => { startedRef.current = performance.now(); setStartedAt(Date.now()); setElapsed(0); setRunning(true); setShowConfirm(false); };
  const stop = () => { const seconds = (performance.now() - startedRef.current) / 1000; setElapsed(seconds); setRunning(false); setRecords(prev => [{ date: new Date().toISOString(), seconds, scramble, moves: scramble.split(/\s+/).filter(Boolean).length }, ...prev].slice(0, 200)); };
  const copy = async (value: string) => { try { await navigator.clipboard.writeText(value); setCopied(true); window.setTimeout(() => setCopied(false), 1400); } catch { setCopied(false); } };
  const newScramble = () => { setScramble(randomScramble(20).join(' ')); setElapsed(0); setRunning(false); setShowConfirm(false); };
  const clearRecords = () => { setRecords([]); setShowConfirm(false); };
  return <section className="lab-suite panel">
    <div className="lab-suite-head"><div><span className="step-label">03 / TRAINING STUDIO</span><h2>Make every solve count.</h2><p>Practice, study algorithms, and track your personal progress. Your training records stay in this browser.</p></div><div className="lab-mark">TL<span>03</span></div></div>
    <div className="lab-tabs" role="tablist" aria-label="Training studio sections">
      <button role="tab" aria-selected={tab === 'practice'} className={tab === 'practice' ? 'active' : ''} onClick={() => setTab('practice')}>⏱ Practice timer</button>
      <button role="tab" aria-selected={tab === 'algorithms'} className={tab === 'algorithms' ? 'active' : ''} onClick={() => setTab('algorithms')}>⌘ Algorithm library</button>
      <button role="tab" aria-selected={tab === 'stats'} className={tab === 'stats' ? 'active' : ''} onClick={() => setTab('stats')}>↗ Statistics</button>
    </div>
    {tab === 'practice' && <div className="lab-content practice-layout">
      <div className="timer-card"><span className="current-kicker">SESSION TIMER</span><div className="timer-display">{formatTime(elapsed)}</div><div className="timer-actions"><button className="primary-button" onClick={running ? stop : start}>{running ? '■ Stop & save' : elapsed > 0 ? '↻ Start again' : '▶ Start timer'}</button><button className="secondary-button" onClick={() => { setRunning(false); setElapsed(0); }} disabled={running}>Reset</button></div><p>Use this timer for a full solve. Stop it when you finish to save a local result.</p></div>
      <div className="scramble-card"><div className="lab-card-title"><div><span className="current-kicker">CURRENT CHALLENGE</span><h3>3×3 random-state-style scramble</h3></div><button className="secondary-button" onClick={newScramble}>↻ New</button></div><code className="scramble-code">{scramble}</code><button className="text-button" onClick={() => copy(scramble)}>{copied ? 'Copied ✓' : 'Copy scramble'}</button><div className="scramble-note">Notation: <b>R</b> clockwise, <b>R'</b> counter-clockwise, <b>R2</b> half-turn. Apply this sequence to a solved cube before timing.</div></div>
      <div className="session-summary"><div><span>PERSONAL BEST</span><strong>{best === null ? '—' : formatTime(best)}</strong></div><div><span>RECORDED SOLVES</span><strong>{records.length}</strong></div><div><span>AVERAGE TIME</span><strong>{average === null ? '—' : formatTime(average)}</strong></div></div>
    </div>}
    {tab === 'algorithms' && <div className="lab-content algorithm-library"><div className="algorithm-search"><input aria-label="Search algorithms" placeholder="Search by name, case, or notation…" value={query} onChange={e => setQuery(e.target.value)} /><span>{filtered.length} algorithms</span></div><div className="algorithm-library-grid"><div className="algorithm-list">{filtered.map(a => <button key={a.name} className={ALGORITHMS[selectedAlgorithm]?.name === a.name ? 'algorithm-item selected' : 'algorithm-item'} onClick={() => setSelectedAlgorithm(ALGORITHMS.findIndex(item => item.name === a.name))}><span>{a.name}</span><small>{a.category}</small></button>)}{!filtered.length && <p className="empty-library">No algorithms match that search.</p>}</div>{ALGORITHMS[selectedAlgorithm] && <article className="algorithm-detail"><span className="current-kicker">{ALGORITHMS[selectedAlgorithm].category}</span><h3>{ALGORITHMS[selectedAlgorithm].name}</h3><code>{ALGORITHMS[selectedAlgorithm].moves}</code><p>{ALGORITHMS[selectedAlgorithm].use}</p><button className="primary-button" onClick={() => copy(ALGORITHMS[selectedAlgorithm].moves)}>{copied ? 'Copied ✓' : 'Copy notation'}</button><p className="algorithm-caveat">Algorithms are reference sequences, not a diagnosis of your current cube case. Match the pattern before applying one.</p></article>}</div></div>}
    {tab === 'stats' && <div className="lab-content"><div className="stats-grid"><div className="stat-card"><span>RECORDED SOLVES</span><strong>{records.length}</strong><small>Saved on this device</small></div><div className="stat-card"><span>PERSONAL BEST</span><strong>{best === null ? '—' : formatTime(best)}</strong><small>Fastest recorded timer</small></div><div className="stat-card"><span>SESSION AVERAGE</span><strong>{average === null ? '—' : formatTime(average)}</strong><small>Across recorded times</small></div></div><div className="records-head"><h3>Recent sessions</h3><button className="text-button" onClick={() => setShowConfirm(v => !v)} disabled={!records.length}>Clear records</button></div>{showConfirm && <div className="clear-confirm"><span>Delete all local solve records?</span><button className="secondary-button" onClick={clearRecords}>Yes, clear</button><button className="text-button" onClick={() => setShowConfirm(false)}>Cancel</button></div>}{records.length ? <div className="records-table"><div className="record-row record-header"><span>DATE</span><span>TIME</span><span>SCRAMBLE</span></div>{records.slice(0, 12).map((record, index) => <div className="record-row" key={record.date + index}><span>{new Date(record.date).toLocaleString()}</span><strong>{formatTime(record.seconds)}</strong><code>{record.scramble}</code></div>)}</div> : <div className="empty-library"><span className="empty-icon">↗</span><h3>Your training history starts here</h3><p>Record a solve in Practice Timer to build a personal progress log.</p></div>}</div>}
    <div className="lab-privacy"><span>●</span> Local-first training · no account · no upload of your times</div>
  </section>;
}
