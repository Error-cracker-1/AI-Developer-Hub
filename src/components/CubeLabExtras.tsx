
import { useEffect, useMemo, useRef, useState } from 'react';
import { randomScramble } from '../lib/cube';

type Tab = 'practice' | 'algorithms' | 'stats';
type Penalty = 'OK' | '+2' | 'DNF';
type RecordEntry = { date: string; seconds: number; scramble: string; moves: number; penalty?: Penalty };
type TimerPhase = 'idle' | 'inspection' | 'running';
const KEY = 'twistlab-cube-lab-v4';
const ALGORITHMS = [
  { name: 'Right trigger', category: 'Beginner · Corner insertion', moves: "R U R' U'", use: 'A foundational trigger for moving pieces while restoring much of the cube.' },
  { name: 'Left trigger', category: 'Beginner · Mirror trigger', moves: "L' U' L U", use: 'The mirrored trigger for left-side practice.' },
  { name: 'Sune', category: 'OLL · Orientation', moves: "R U R' U R U2 R'", use: 'A common last-layer orientation pattern. Learn the setup and recognize the case first.' },
  { name: 'Anti-Sune', category: 'OLL · Orientation', moves: "R U2 R' U' R U' R'", use: 'A useful Sune variation for last-layer recognition drills.' },
  { name: 'T-perm', category: 'PLL · Permutation', moves: "R U R' U' R' F R2 U' R' U' R U R' F'", use: 'A popular last-layer permutation algorithm; practice slowly before increasing speed.' },
  { name: 'U-perm practice', category: 'PLL · Permutation', moves: "R U' R U R U R U' R' U' R2", use: 'A practice sequence for studying last-layer edge cycles. Verify the exact case before timed use.' },
  { name: 'Beginner cross', category: 'CFOP · Cross planning', moves: "F R U R' U' F'", use: 'A familiar trigger sequence for practicing move recognition and planning. It is not a universal cross solution.' },
  { name: 'Sexy move', category: 'Fundamentals · Trigger', moves: "R U R' U'", use: 'A core four-move trigger used throughout beginner and CFOP practice.' },
  { name: 'Niklas', category: 'PLL · Corner permutation', moves: "R U' L' U R' U' L U", use: 'A corner-permutation practice sequence. Identify the matching case before applying it.' },
  { name: 'Y-perm practice', category: 'PLL · Permutation', moves: "F R U' R' U' R U R' F' R U R' U' R' F R F'", use: 'A longer PLL practice sequence. Learn it in short chunks and verify the case.' }
];
function readRecords(): RecordEntry[] {
  try {
    const value = JSON.parse(localStorage.getItem(KEY) || '[]');
    if (!Array.isArray(value)) return [];
    return value.filter(item => item && typeof item.seconds === 'number' && typeof item.scramble === 'string').map(item => ({
      date: typeof item.date === 'string' ? item.date : new Date().toISOString(),
      seconds: Math.max(0, item.seconds), scramble: item.scramble, moves: Number.isFinite(item.moves) ? item.moves : item.scramble.split(/\\s+/).filter(Boolean).length,
      penalty: item.penalty === '+2' || item.penalty === 'DNF' ? item.penalty : 'OK'
    })).slice(0, 200);
  } catch { return []; }
}
function formatTime(value: number) {
  if (!Number.isFinite(value)) return 'DNF';
  const minutes = Math.floor(value / 60);
  return minutes ? minutes + ':' + String(Math.floor(value % 60)).padStart(2, '0') + '.' + String(Math.floor((value % 1) * 100)).padStart(2, '0') : value.toFixed(2) + 's';
}
function effective(record: RecordEntry) { return record.penalty === 'DNF' ? Infinity : record.seconds + (record.penalty === '+2' ? 2 : 0); }
function averageOf(records: RecordEntry[], count: 5 | 12): number | null {
  if (records.length < count) return null;
  const values = records.slice(0, count).map(effective).sort((a, b) => a - b);
  const trimmed = values.slice(1, -1);
  if (trimmed.some(value => !Number.isFinite(value))) return Infinity;
  return trimmed.reduce((sum, value) => sum + value, 0) / trimmed.length;
}
export default function CubeLabExtras() {
  const [tab, setTab] = useState<Tab>('practice');
  const [scramble, setScramble] = useState(() => randomScramble(20).join(' '));
  const [records, setRecords] = useState<RecordEntry[]>(readRecords);
  const [phase, setPhase] = useState<TimerPhase>('idle');
  const [elapsed, setElapsed] = useState(0);
  const [inspectionElapsed, setInspectionElapsed] = useState(0);
  const [selectedAlgorithm, setSelectedAlgorithm] = useState(0);
  const [query, setQuery] = useState('');
  const [copied, setCopied] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const startedRef = useRef(0);
  const inspectionRef = useRef(0);
  const pendingPenaltyRef = useRef<Penalty>('OK');
  useEffect(() => {
    if (phase === 'idle') return;
    const tick = window.setInterval(() => {
      if (phase === 'inspection') setInspectionElapsed((performance.now() - inspectionRef.current) / 1000);
      else setElapsed((performance.now() - startedRef.current) / 1000);
    }, 31);
    return () => window.clearInterval(tick);
  }, [phase]);
  useEffect(() => { try { localStorage.setItem(KEY, JSON.stringify(records.slice(0, 200))); } catch { /* storage may be unavailable */ } }, [records]);
  const filtered = useMemo(() => ALGORITHMS.filter(a => (a.name + ' ' + a.category + ' ' + a.moves).toLowerCase().includes(query.toLowerCase())), [query]);
  const validRecords = records.filter(record => record.penalty !== 'DNF');
  const best = validRecords.length ? Math.min(...validRecords.map(effective)) : null;
  const average = validRecords.length ? validRecords.reduce((sum, record) => sum + effective(record), 0) / validRecords.length : null;
  const ao5 = averageOf(records, 5);
  const ao12 = averageOf(records, 12);
  const startInspection = () => {
    inspectionRef.current = performance.now();
    setInspectionElapsed(0); setElapsed(0); setPhase('inspection'); setShowConfirm(false);
    pendingPenaltyRef.current = 'OK';
  };
  const beginSolve = () => {
    const inspection = (performance.now() - inspectionRef.current) / 1000;
    pendingPenaltyRef.current = inspection > 17 ? 'DNF' : inspection > 15 ? '+2' : 'OK';
    startedRef.current = performance.now();
    setInspectionElapsed(inspection); setElapsed(0); setPhase('running');
  };
  const stop = () => {
    const seconds = (performance.now() - startedRef.current) / 1000;
    setElapsed(seconds); setPhase('idle');
    setRecords(prev => [{ date: new Date().toISOString(), seconds, scramble, moves: scramble.split(/\\s+/).filter(Boolean).length, penalty: pendingPenaltyRef.current }, ...prev].slice(0, 200));
  };
  const resetTimer = () => { setPhase('idle'); setElapsed(0); setInspectionElapsed(0); pendingPenaltyRef.current = 'OK'; };
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.code !== 'Space' || event.repeat || event.ctrlKey || event.metaKey || event.altKey) return;
      const target = event.target as HTMLElement | null;
      if (target && (['INPUT', 'TEXTAREA', 'SELECT', 'BUTTON'].includes(target.tagName) || target.isContentEditable)) return;
      event.preventDefault();
      if (phase === 'idle') startInspection();
      else if (phase === 'inspection') beginSolve();
      else stop();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [phase, scramble]);
  const copy = async (value: string) => { try { await navigator.clipboard.writeText(value); setCopied(true); window.setTimeout(() => setCopied(false), 1400); } catch { setCopied(false); } };
  const newScramble = () => { setScramble(randomScramble(20).join(' ')); resetTimer(); setShowConfirm(false); };
  const clearRecords = () => { setRecords([]); setShowConfirm(false); };
  const exportCsv = () => {
    const quote = (value: string) => '"' + value.replace(/"/g, '""') + '"';
    const rows = [['Date', 'Raw seconds', 'Penalty', 'Result', 'Moves', 'Scramble'], ...records.map(record => [record.date, record.seconds.toFixed(3), record.penalty || 'OK', formatTime(effective(record)), String(record.moves), record.scramble])];
    const csv = rows.map(row => row.map(value => quote(String(value))).join(',')).join('\\r\\n');
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
    const link = document.createElement('a'); link.href = url; link.download = 'twistlab-solve-history.csv'; link.click(); URL.revokeObjectURL(url);
  };
  const timerLabel = phase === 'inspection' ? Math.max(0, 15 - inspectionElapsed) : elapsed;
  const inspectionPenalty = inspectionElapsed > 17 ? 'DNF' : inspectionElapsed > 15 ? '+2' : 'OK';
  return <section className="lab-suite panel">
    <div className="lab-suite-head"><div><span className="step-label">03 / TRAINING STUDIO</span><h2>Train like a competitor.</h2><p>WCA-style inspection timing, keyboard controls, penalties, rolling averages, and a searchable algorithm library. Your records stay on this device.</p></div><div className="lab-mark">TL<span>03</span></div></div>
    <div className="lab-tabs" role="tablist" aria-label="Training studio sections">
      <button role="tab" aria-selected={tab === 'practice'} className={tab === 'practice' ? 'active' : ''} onClick={() => setTab('practice')}>⏱ Competition timer</button>
      <button role="tab" aria-selected={tab === 'algorithms'} className={tab === 'algorithms' ? 'active' : ''} onClick={() => setTab('algorithms')}>⌘ Algorithm library</button>
      <button role="tab" aria-selected={tab === 'stats'} className={tab === 'stats' ? 'active' : ''} onClick={() => setTab('stats')}>↗ Statistics</button>
    </div>
    {tab === 'practice' && <div className="lab-content practice-layout">
      <div className="timer-card"><span className="current-kicker">{phase === 'inspection' ? '15 SECOND INSPECTION' : phase === 'running' ? 'SOLVE IN PROGRESS' : 'COMPETITION TIMER'}</span><div className="timer-display" aria-live="off">{phase === 'inspection' ? formatTime(timerLabel) : formatTime(elapsed)}</div>
        {phase === 'inspection' && <p className="timer-state-warning">{inspectionElapsed > 17 ? 'Inspection exceeds 17 seconds · next start will be DNF' : inspectionElapsed > 15 ? '+2 penalty window · next start will add two seconds' : 'Inspection countdown · press Space or start solve'}</p>}
        <div className="timer-actions"><button className="primary-button" onClick={phase === 'idle' ? startInspection : phase === 'inspection' ? beginSolve : stop}>{phase === 'idle' ? '▶ Start inspection' : phase === 'inspection' ? 'Start solve' : '■ Stop & save'}</button><button className="secondary-button" onClick={resetTimer} disabled={phase === 'running'}>Reset</button></div>
        <p>{phase === 'idle' ? 'Start a 15-second inspection, then start the solve. Space starts inspection, starts the solve, and stops/saves.' : phase === 'inspection' ? 'Start the solve before the inspection penalty changes. Space starts the solve.' : 'Space or Stop saves the solve with its inspection penalty.'}</p>
      </div>
      <div className="scramble-card"><div className="lab-card-title"><div><span className="current-kicker">CURRENT CHALLENGE</span><h3>3×3 random-move scramble</h3></div><button className="secondary-button" onClick={newScramble}>↻ New</button></div><code className="scramble-code">{scramble}</code><button className="text-button" onClick={() => copy(scramble)}>{copied ? 'Copied ✓' : 'Copy scramble'}</button><div className="scramble-note">WCA-style practice thresholds: 15.00s or less = OK; over 15.00s and up to 17.00s = +2; over 17.00s = DNF. This is a practice aid, not an official competition timer.</div></div>
      <div className="session-summary"><div><span>PERSONAL BEST</span><strong>{best === null ? '—' : formatTime(best)}</strong></div><div><span>RECORDED SOLVES</span><strong>{records.length}</strong></div><div><span>AVERAGE OF 5</span><strong>{ao5 === null ? '—' : formatTime(ao5)}</strong></div></div>
    </div>}
    {tab === 'algorithms' && <div className="lab-content algorithm-library"><div className="algorithm-search"><input aria-label="Search algorithms" placeholder="Search by name, case, or notation…" value={query} onChange={e => setQuery(e.target.value)} /><span>{filtered.length} algorithms</span></div><div className="algorithm-library-grid"><div className="algorithm-list">{filtered.map(a => <button key={a.name} className={ALGORITHMS[selectedAlgorithm]?.name === a.name ? 'algorithm-item selected' : 'algorithm-item'} onClick={() => setSelectedAlgorithm(ALGORITHMS.findIndex(item => item.name === a.name))}><span>{a.name}</span><small>{a.category}</small></button>)}{!filtered.length && <p className="empty-library">No algorithms match that search.</p>}</div>{ALGORITHMS[selectedAlgorithm] && <article className="algorithm-detail"><span className="current-kicker">{ALGORITHMS[selectedAlgorithm].category}</span><h3>{ALGORITHMS[selectedAlgorithm].name}</h3><code>{ALGORITHMS[selectedAlgorithm].moves}</code><p>{ALGORITHMS[selectedAlgorithm].use}</p><button className="primary-button" onClick={() => copy(ALGORITHMS[selectedAlgorithm].moves)}>{copied ? 'Copied ✓' : 'Copy notation'}</button><p className="algorithm-caveat">Algorithms are reference sequences, not a diagnosis of your current cube case. Match the pattern before applying one.</p></article>}</div></div>}
    {tab === 'stats' && <div className="lab-content"><div className="stats-grid"><div className="stat-card"><span>RECORDED SOLVES</span><strong>{records.length}</strong><small>Saved on this device</small></div><div className="stat-card"><span>PERSONAL BEST</span><strong>{best === null ? '—' : formatTime(best)}</strong><small>Best valid result including penalties</small></div><div className="stat-card"><span>SESSION AVERAGE</span><strong>{average === null ? '—' : formatTime(average)}</strong><small>Valid solves including +2 penalties</small></div><div className="stat-card"><span>AVERAGE OF 5</span><strong>{ao5 === null ? '—' : formatTime(ao5)}</strong><small>Rolling trimmed average</small></div><div className="stat-card"><span>AVERAGE OF 12</span><strong>{ao12 === null ? '—' : formatTime(ao12)}</strong><small>Rolling trimmed average</small></div></div>
      <div className="records-head"><h3>Recent sessions</h3><div className="timer-actions"><button className="secondary-button" onClick={exportCsv} disabled={!records.length}>Export CSV</button><button className="text-button" onClick={() => setShowConfirm(v => !v)} disabled={!records.length}>Clear records</button></div></div>
      {showConfirm && <div className="clear-confirm"><span>Delete all local solve records?</span><button className="secondary-button" onClick={clearRecords}>Yes, clear</button><button className="text-button" onClick={() => setShowConfirm(false)}>Cancel</button></div>}
      {records.length ? <div className="records-table"><div className="record-row record-header"><span>DATE</span><span>TIME / PENALTY</span><span>SCRAMBLE</span></div>{records.slice(0, 12).map((record, index) => <div className="record-row" key={record.date + index}><span>{new Date(record.date).toLocaleString()}</span><strong>{formatTime(effective(record))}{record.penalty === '+2' ? ' (+2)' : ''}</strong><code>{record.scramble}</code></div>)}</div> : <div className="empty-library"><span className="empty-icon">↗</span><h3>Your training history starts here</h3><p>Record a solve in Competition Timer to build a personal progress log.</p></div>}
    </div>}
    <div className="lab-privacy"><span>●</span> Local-first training · no account · no upload of your times</div>
  </section>;
}
