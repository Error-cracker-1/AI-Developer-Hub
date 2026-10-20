import { useEffect, useMemo, useRef, useState } from 'react';
import CubeCanvas from './components/CubeCanvas';
import CubeNet from './components/CubeNet';
import MoveControls from './components/MoveControls';
import SolutionSteps from './components/SolutionSteps';
import { applyMoves, Cube, emptyFaces, Face, Facelets, FACE_ORDER, FACE_NAMES, PALETTE, randomScramble, SOLVED, toString, fromString } from './lib/cube';
import { validateCube } from './lib/validation';

type Mode = 'fast' | 'guided';
export default function App() {
  const [faces, setFaces] = useState<Facelets>(emptyFaces);
  const [solution, setSolution] = useState<string[]>([]);
  const [startState, setStartState] = useState('');
  const [step, setStep] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [speed, setSpeed] = useState(700);
  const [mode, setMode] = useState<Mode>('fast');
  const [error, setError] = useState('');
  const [status, setStatus] = useState('Ready to solve');
  const [busy, setBusy] = useState(false);
  const [scramble, setScramble] = useState('');
  const [algorithm, setAlgorithm] = useState('');
  const [history, setHistory] = useState<string[]>([]);
  const [cameraOn, setCameraOn] = useState(false);
  const [scanFace, setScanFace] = useState<Face>('F');
  const [cameraError, setCameraError] = useState('');
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [showHelp, setShowHelp] = useState(false);
  const [turnKey, setTurnKey] = useState('');
  const displayedState = useMemo(() => startState && solution.length ? applyMoves(startState, solution.slice(0, step)) : toString(faces), [startState, solution, step, faces]);
  const displayedFaces = useMemo(() => fromString(displayedState), [displayedState]);
  const validation = useMemo(() => validateCube(faces), [faces]);
  const solved = displayedState === SOLVED;
  const currentMove = step < solution.length ? solution[step] : '';
  const progress = solution.length ? Math.round(step / solution.length * 100) : 0;

  useEffect(() => {
    if (!playing || step >= solution.length) { if (playing) setPlaying(false); return; }
    const timer = window.setTimeout(() => { setTurnKey(solution[step] + '-' + Date.now()); setStep(current => Math.min(current + 1, solution.length)); }, speed);
    return () => window.clearTimeout(timer);
  }, [playing, step, solution, speed]);

  useEffect(() => {
    if (cameraOn && videoRef.current && streamRef.current) {
      videoRef.current.srcObject = streamRef.current;
      void videoRef.current.play().catch(() => setCameraError('Tap the video to start playback.'));
    }
  }, [cameraOn]);

  useEffect(() => () => streamRef.current?.getTracks().forEach(track => track.stop()), []);

  const clearSolution = () => { setPlaying(false); setSolution([]); setStartState(''); setStep(0); setAlgorithm(''); };
  const paintSticker = (face: Face, index: number) => {
    if (index === 4 || busy) return;
    setHistory(previous => [...previous.slice(-29), toString(faces)]);
    clearSolution(); setError(''); setStatus('Sticker updated. Check the color counts before solving.');
    setFaces(previous => ({ ...previous, [face]: previous[face].map((color, i) => i === index ? FACE_ORDER[(FACE_ORDER.indexOf(color) + 1) % 6] : color) }));
  };
  const setStickerColor = (face: Face, index: number, color: Face) => {
    if (index === 4 || busy) return;
    setHistory(previous => [...previous.slice(-29), toString(faces)]);
    clearSolution(); setFaces(previous => ({ ...previous, [face]: previous[face].map((value, i) => i === index ? color : value) }));
  };
  const undo = () => {
    const previous = history[history.length - 1];
    if (!previous) return;
    setFaces(fromString(previous)); setHistory(items => items.slice(0, -1)); clearSolution(); setStatus('Last sticker edit undone.');
  };
  const reset = () => { setFaces(emptyFaces()); clearSolution(); setScramble(''); setError(''); setStatus('Cube reset to solved state.'); };
  const scrambleCube = () => {
    const moves = randomScramble();
    const state = applyMoves(SOLVED, moves);
    setFaces(fromString(state)); setScramble(moves.join(' ')); setHistory(items => [...items.slice(-29), toString(faces)]);
    clearSolution(); setError(''); setStatus('Scramble generated. Solve it when ready.');
  };
  const solve = async () => {
    setPlaying(false); setError('');
    const check = validateCube(faces);
    if (!check.valid) { setError(check.errors.join(' ')); setStatus('Fix the highlighted cube setup before solving.'); return; }
    const state = toString(faces);
    setBusy(true); setStatus('Preparing the two-phase solver. The first solve can take a moment.');
    try {
      await new Promise<void>((resolve, reject) => window.setTimeout(() => { try { Cube.initSolver(); resolve(); } catch (cause) { reject(cause); } }, 25));
      const answer = Cube.fromString(state).solve().trim();
      const moves = answer ? answer.split(/\\s+/) : [];
      const checkCube = Cube.fromString(state);
      if (moves.length) checkCube.move(moves.join(' '));
      if (checkCube.asString() !== SOLVED) throw new Error('The returned algorithm failed verification. Review the stickers and retry.');
      setStartState(state); setSolution(moves); setStep(0); setAlgorithm(moves.join(' '));
      setStatus(moves.length ? 'Verified solution ready. Follow the highlighted move.' : 'This cube is already solved.');
      setScramble('');
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Could not solve this cube. Check the sticker colors.'); setStatus('Could not calculate a solution.'); }
    finally { setBusy(false); }
  };
  const jumpTo = (index: number) => { setPlaying(false); const next = Math.max(0, Math.min(solution.length, index)); setStep(next); if (solution[next]) setTurnKey(solution[next] + '-' + Date.now()); };
  const startCamera = async () => {
    setCameraError('');
    if (!navigator.mediaDevices?.getUserMedia) { setCameraError('Camera access requires a supported browser over HTTPS. You can still enter colors manually.'); return; }
    try { streamRef.current = await navigator.mediaDevices.getUserMedia({ video: { facingMode: { ideal: 'environment' } }, audio: false }); setCameraOn(true); }
    catch { setCameraError('Camera permission was blocked or no camera was found. Allow access and retry, or use the sticker editor.'); }
  };
  const stopCamera = () => { streamRef.current?.getTracks().forEach(track => track.stop()); streamRef.current = null; setCameraOn(false); };
  const scanFaceNow = () => {
    const video = videoRef.current;
    if (!video || !video.videoWidth || !video.videoHeight) { setCameraError('Wait until the camera preview is ready, then capture again.'); return; }
    const canvas = document.createElement('canvas'); canvas.width = video.videoWidth; canvas.height = video.videoHeight;
    const context = canvas.getContext('2d'); if (!context) { setCameraError('Could not read this camera frame.'); return; }
    context.drawImage(video, 0, 0, canvas.width, canvas.height);
    const samples: Face[] = [];
    for (let row = 0; row < 3; row++) for (let col = 0; col < 3; col++) {
      const px = Math.min(canvas.width - 1, Math.round(canvas.width * (0.25 + col * 0.25)));
      const py = Math.min(canvas.height - 1, Math.round(canvas.height * (0.25 + row * 0.25)));
      const rgb = context.getImageData(px, py, 1, 1).data;
      let best: Face = 'U', distance = Infinity;
      FACE_ORDER.forEach(face => { const hex = PALETTE[face].color.replace('#', ''); const target = [0, 2, 4].map(i => parseInt(hex.slice(i, i + 2), 16)); const d = Math.sqrt((rgb[0]-target[0])**2+(rgb[1]-target[1])**2+(rgb[2]-target[2])**2); if (d < distance) { distance = d; best = face; } });
      samples.push(best);
    }
    samples[4] = scanFace;
    setHistory(items => [...items.slice(-29), toString(faces)]); clearSolution();
    setFaces(previous => ({ ...previous, [scanFace]: samples }));
    setCameraError('Face colors copied. This simple color sampler is lighting-sensitive; inspect all nine stickers before solving.');
  };
  const fillSolved = () => { setHistory(items => [...items.slice(-29), toString(faces)]); setFaces(emptyFaces()); clearSolution(); setError(''); setStatus('Solved color layout restored.'); };
  const copyAlgorithm = async () => { try { await navigator.clipboard.writeText(algorithm); setStatus('Algorithm copied to clipboard.'); } catch { setStatus('Select and copy the algorithm shown below.'); } };

  return <div className="app-shell">
    <header className="topbar"><a className="brand" href="#" aria-label="TwistLab home"><span className="brand-cube">✣</span><span>TWIST<span>LAB</span></span></a><div className="topbar-actions"><span className="privacy-pill"><i /> Local-first</span><button className="quiet-button" onClick={() => setShowHelp(value => !value)}>How to use</button></div></header>
    <main className="page">
      <section className="hero"><div className="eyebrow">INTERACTIVE CUBE LAB <span>•</span> 3×3</div><h1>Crack the cube.<br/><em>One move at a time.</em></h1><p>Paint your stickers, rotate a real 3D cube, validate the setup, then follow a verified solution.</p><div className="hero-pills"><span>3D INTERACTION</span><span>STEP-BY-STEP</span><span>NO ACCOUNT NEEDED</span></div></section>
      {showHelp && <section className="help-panel"><button className="close-help" onClick={() => setShowHelp(false)}>×</button><h3>How to use TwistLab</h3><ol><li>Drag the 3D cube to rotate it; scroll or pinch to zoom.</li><li>Tap a sticker in the 3D view or the flat net to cycle its color. Center stickers are fixed.</li><li>Each color must appear exactly nine times. A color-count check runs before solving.</li><li>Choose Fast or Guided view, then solve and use the controls to follow the verified algorithm.</li></ol><p>Notation: <b>R</b> is the right face clockwise, <b>R'</b> is counter-clockwise, and <b>R2</b> is a half-turn.</p></section>}
      <div className="main-grid">
        <section className="panel cube-panel"><div className="panel-heading"><div><span className="step-label">01 / SETUP</span><h2>Your cube</h2></div><button className="text-button" onClick={reset}>Reset ↺</button></div>
          <div className="cube-status"><span className={solved ? 'state-badge solved' : 'state-badge'}><i />{solved ? 'Solved state' : 'Custom state'}</span><span className="hint">Drag to rotate · tap a sticker to paint</span></div>
          <CubeCanvas faces={displayedFaces} onSticker={paintSticker} turnKey={turnKey} />
          <div className="cube-tools"><button className="secondary-button" onClick={undo} disabled={!history.length}>↶ Undo edit</button><button className="secondary-button" onClick={fillSolved}>Fill solved</button><button className="secondary-button" onClick={scrambleCube}>⤨ Scramble</button></div>
          <div className="color-legend">{FACE_ORDER.map(face => <button key={face} title={`Select ${PALETTE[face].name} color`} onClick={() => setStatus(`${PALETTE[face].name} is color ${face}. Tap any non-center sticker to cycle colors.`)}><i style={{ background: PALETTE[face].color }} />{PALETTE[face].name}</button>)}</div>
          <h3 className="subheading">Sticker map <span>Tap a tile to cycle colors</span></h3><CubeNet faces={displayedFaces} onSticker={paintSticker} disabled={busy || Boolean(solution.length)} />
          <div className={validation.valid ? 'validation-box good' : 'validation-box'}><strong>{validation.valid ? '✓ Color counts look balanced' : '⚠ Check cube colors'}</strong><div className="count-row">{FACE_ORDER.map(face => <span key={face}><i style={{ background: PALETTE[face].color }} />{face}: {validation.counts[face]}/9</span>)}</div>{!validation.valid && <p>Every color needs nine stickers and centers must stay on their matching faces. A valid count does not guarantee every physical cube arrangement is reachable.</p>}</div>
          <section className="scan-card"><div className="scan-heading"><div><h3>📷 Camera color assist</h3><p>Capture one face at a time, then review it in the sticker map.</p></div>{!cameraOn ? <button className="secondary-button" onClick={startCamera}>Open camera</button> : <button className="text-button" onClick={stopCamera}>Turn off</button>}</div>
            {cameraOn && <><label className="field-label" htmlFor="scan-face">Face shown in preview</label><select id="scan-face" value={scanFace} onChange={event => setScanFace(event.target.value as Face)}>{FACE_ORDER.map(face => <option value={face} key={face}>{FACE_NAMES[face]} ({face})</option>)}</select><div className="camera-frame"><video ref={videoRef} autoPlay muted playsInline /><div className="scan-guide">{Array.from({ length: 9 }, (_, i) => <i key={i} />)}</div></div><button className="primary-button full-button" onClick={scanFaceNow}>Capture 9 colors</button></>}
            {cameraError && <p className="notice" role="status">{cameraError}</p>}
            <p className="privacy-note">Camera frames are sampled locally in this browser and are not uploaded. Lighting can misread colors.</p>
          </section>
          {scramble && <div className="algorithm-block"><label>SCRAMBLE SEQUENCE</label><code>{scramble}</code></div>}
        </section>
        <section className="panel solution-panel"><div className="panel-heading"><div><span className="step-label">02 / SOLUTION</span><h2>Move guide</h2></div><span className="move-total">{solution.length ? `${solution.length} MOVES` : 'WAITING'}</span></div>
          <div className="mode-switch" role="group" aria-label="Solution view mode"><button className={mode === 'fast' ? 'selected' : ''} onClick={() => setMode('fast')}>⚡ Fast solve</button><button className={mode === 'guided' ? 'selected' : ''} onClick={() => setMode('guided')}>☷ Guided view</button></div>
          <div className="current-move-card"><span className="current-kicker">CURRENT MOVE</span><div className="current-move">{currentMove || (solution.length && step === solution.length ? '✓' : '—')}</div><strong>{solution.length && step === solution.length ? 'Cube solved' : currentMove ? `Move ${step + 1} of ${solution.length}` : 'Ready when you are'}</strong><p>{currentMove ? explainMove(currentMove) : status}</p><div className="big-progress"><span style={{ width: `${progress}%` }} /></div><div className="progress-caption"><span>{progress}% complete</span><span>{solution.length - step} remaining</span></div></div>
          <div className="solution-actions"><button className="primary-button" onClick={solve} disabled={busy}>{busy ? 'Preparing solver…' : 'Solve cube ↗'}</button><button className="secondary-button" onClick={copyAlgorithm} disabled={!solution.length}>Copy algorithm</button></div>
          {error && <div className="error-box" role="alert"><b>Cube needs attention</b><p>{error}</p></div>}
          <MoveControls step={step} total={solution.length} playing={playing} onPrevious={() => jumpTo(step - 1)} onNext={() => jumpTo(step + 1)} onPlay={() => { if (step >= solution.length) setStep(0); setPlaying(value => !value); }} onReplay={() => { setPlaying(false); setStep(0); }} speed={speed} onSpeed={setSpeed} />
          <div className="steps-heading"><h3>Algorithm</h3><span>{solution.length} moves</span></div><SolutionSteps moves={solution} step={step} mode={mode} onSelect={jumpTo} />
          {algorithm && <div className="algorithm-block"><label>FULL ALGORITHM</label><code>{algorithm}</code></div>}
          <div className="history-note"><span>✓</span><div><b>Solution verification</b><p>The solver's output is replayed against the cube state before it is shown.</p></div></div>
        </section>
      </div>
      <footer><span>TWISTLAB / 3×3 SOLVER</span><span>Cube state stays in this tab · no sign-in</span></footer>
    </main>
  </div>;
}
function explainMove(move: string) {
  const names: Record<string, string> = { U: 'upper', R: 'right', F: 'front', D: 'bottom', L: 'left', B: 'back' };
  const direction = move.endsWith('2') ? 'Turn the ' + names[move[0]] + ' face half a turn.' : move.endsWith("'") ? 'Turn the ' + names[move[0]] + ' face counter-clockwise.' : 'Turn the ' + names[move[0]] + ' face clockwise.';
  return direction + ' Direction is judged while looking directly at that face.';
}
