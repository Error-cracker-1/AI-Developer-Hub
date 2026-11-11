import { lazy, Suspense, useEffect, useMemo, useRef, useState } from 'react';
import { track } from '@vercel/analytics/react';
import { useFeatureFlags } from './lib/featureFlags';
import CubeAssistant from './components/CubeAssistant';
const CubeCanvas = lazy(() => import('./components/CubeCanvas'));
import CubeNet from './components/CubeNet';
import MoveControls from './components/MoveControls';
import SolutionSteps from './components/SolutionSteps';
import SolutionOptimizer from './components/SolutionOptimizer';
import CubeLabExtras from './components/CubeLabExtras';
import { applyMoves, Cube, emptyFaces, Face, Facelets, FACE_ORDER, FACE_NAMES, PALETTE, randomScramble, SOLVED, toString, fromString } from './lib/cube';
import { validateCube } from './lib/validation';

type Mode = 'fast' | 'guided';
export default function App() {
  const featureFlags = useFeatureFlags();
  const APP_VERSION = __APP_VERSION__;
  const APP_COMMIT = __APP_COMMIT__;
  const [faces, setFaces] = useState<Facelets>(emptyFaces);
  const [solution, setSolution] = useState<string[]>([]);
  const [startState, setStartState] = useState('');
  const [step, setStep] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [speed, setSpeed] = useState(2800);
  const [mode, setMode] = useState<Mode>('fast');
  const [error, setError] = useState('');
  const [status, setStatus] = useState('Ready to solve');
  const [busy, setBusy] = useState(false);
  const [scramble, setScramble] = useState('');
  const [algorithm, setAlgorithm] = useState('');
  const [history, setHistory] = useState<string[]>([]);
  const [redoHistory, setRedoHistory] = useState<string[]>([]);
  const [cameraOn, setCameraOn] = useState(false);
  const [scannedFaces, setScannedFaces] = useState<Face[]>([]);
  const [cameraError, setCameraError] = useState('');
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [showHelp, setShowHelp] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [turnKey, setTurnKey] = useState('');
  const displayedState = useMemo(() => startState && solution.length ? applyMoves(startState, solution.slice(0, step)) : toString(faces), [startState, solution, step, faces]);
  const displayedFaces = useMemo(() => fromString(displayedState), [displayedState]);
  const validation = useMemo(() => validateCube(faces), [faces]);
  const solved = displayedState === SOLVED;
  const currentMove = step < solution.length ? solution[step] : '';
  const progress = solution.length ? Math.round(step / solution.length * 100) : 0;
  const solverInsights = useMemo(() => {
    if (!solution.length) return null;
    const faceCounts: Record<Face, number> = { U: 0, R: 0, F: 0, D: 0, L: 0, B: 0 };
    let qtm = 0;
    for (const move of solution) {
      const face = move[0] as Face;
      if (FACE_ORDER.includes(face)) faceCounts[face] += 1;
      qtm += move.endsWith('2') ? 2 : 1;
    }
    return { htm: solution.length, qtm, faceCounts };
  }, [solution]);
  const estimatedPlaybackSeconds = solution.length * (speed + 300) / 1000;

  useEffect(() => {
    if (!playing || step >= solution.length) { if (playing) setPlaying(false); return; }
    const timer = window.setTimeout(() => { setTurnKey(solution[step] + '-' + Date.now()); setStep(current => Math.min(current + 1, solution.length)); }, speed + 300);
    return () => window.clearTimeout(timer);
  }, [playing, step, solution, speed]);

  useEffect(() => {
    if (cameraOn && videoRef.current && streamRef.current) {
      videoRef.current.srcObject = streamRef.current;
      void videoRef.current.play().catch(() => setCameraError('Tap the video to start playback.'));
    }
  }, [cameraOn]);

  useEffect(() => () => streamRef.current?.getTracks().forEach(track => track.stop()), []);
  useEffect(() => {
    if (!isFullscreen) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onKeyDown = (event: KeyboardEvent) => { if (event.key === 'Escape') setIsFullscreen(false); };
    window.addEventListener('keydown', onKeyDown);
    return () => { document.body.style.overflow = previousOverflow; window.removeEventListener('keydown', onKeyDown); };
  }, [isFullscreen]);

  const clearSolution = () => { setPlaying(false); setSolution([]); setStartState(''); setStep(0); setAlgorithm(''); };
  const paintSticker = (face: Face, index: number) => {
    if (index === 4 || busy) return;
    setHistory(previous => [...previous.slice(-29), toString(faces)]);
    setRedoHistory([]);
    clearSolution(); setError(''); setStatus('Sticker updated. Check the color counts before solving.');
    setFaces(previous => ({ ...previous, [face]: previous[face].map((color, i) => i === index ? FACE_ORDER[(FACE_ORDER.indexOf(color) + 1) % 6] : color) }));
  };
  const setStickerColor = (face: Face, index: number, color: Face) => {
    if (index === 4 || busy) return;
    setHistory(previous => [...previous.slice(-29), toString(faces)]);
    setRedoHistory([]);
    clearSolution(); setFaces(previous => ({ ...previous, [face]: previous[face].map((value, i) => i === index ? color : value) }));
  };
  const undo = () => {
    const previous = history[history.length - 1];
    if (!previous) return;
    setRedoHistory(items => [...items.slice(-29), toString(faces)]);
    setFaces(fromString(previous));
    setHistory(items => items.slice(0, -1));
    clearSolution();
    setStatus('Last change undone. Use Redo to restore it.');
  };
  const redo = () => {
    const next = redoHistory[redoHistory.length - 1];
    if (!next) return;
    setHistory(items => [...items.slice(-29), toString(faces)]);
    setFaces(fromString(next));
    setRedoHistory(items => items.slice(0, -1));
    clearSolution();
    setStatus('Change restored.');
  };
  const reset = () => { track('Cube reset'); setFaces(emptyFaces()); setHistory([]); setRedoHistory([]); setScannedFaces([]); clearSolution(); setScramble(''); setError(''); setCameraError(''); setStatus('Cube reset to solved state.'); };
  const scrambleCube = () => {
    const moves = randomScramble();
    const state = applyMoves(SOLVED, moves);
    setFaces(fromString(state)); setScramble(moves.join(' ')); setHistory(items => [...items.slice(-29), toString(faces)]); setRedoHistory([]);
    clearSolution(); setError(''); setStatus('Scramble generated. Solve it when ready.'); track('Cube scramble generated');
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
      const moves = answer ? answer.split(/\s+/) : [];
      const checkCube = Cube.fromString(state);
      if (moves.length) checkCube.move(moves.join(' '));
      if (checkCube.asString() !== SOLVED) throw new Error('The returned algorithm failed verification. Review the stickers and retry.');
      setStartState(state); setSolution(moves); setStep(0); setAlgorithm(moves.join(' '));
      setStatus(moves.length ? 'Verified solution ready. Follow the highlighted move.' : 'This cube is already solved.');
       track('Cube solution generated', { moveCount: moves.length, mode });
      setScramble('');
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Could not solve this cube. Check the sticker colors.'); setStatus('Could not calculate a solution.'); }
    finally { setBusy(false); }
  };
  const jumpTo = (index: number) => { setPlaying(false); const next = Math.max(0, Math.min(solution.length, index)); setStep(next); if (next > 0 && solution[next - 1]) setTurnKey(solution[next - 1] + '-' + Date.now()); };
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
    // The preview is a square object-fit:cover window. Sample the same centered square
    // from the source frame so the nine detection cells line up with the on-screen guide.
    const side = Math.min(video.videoWidth, video.videoHeight);
    const sx = (video.videoWidth - side) / 2;
    const sy = (video.videoHeight - side) / 2;
    const canvas = document.createElement('canvas'); canvas.width = 360; canvas.height = 360;
    const context = canvas.getContext('2d', { willReadFrequently: true });
    if (!context) { setCameraError('Could not read this camera frame.'); return; }
    context.drawImage(video, sx, sy, side, side, 0, 0, 360, 360);
    // Use HSV hue for chromatic stickers: unlike distance to ideal RGB/Lab
    // swatches, hue is comparatively stable under exposure changes. This also
    // separates orange from red and gives green a much wider recognition band.
    const classifyColor = (r: number, g: number, b: number): { face: Face; confident: boolean; hue: number; saturation: number; value: number } => {
      const rn = r / 255, gn = g / 255, bn = b / 255;
      const max = Math.max(rn, gn, bn), min = Math.min(rn, gn, bn), delta = max - min;
      let hue = 0;
      if (delta > 0) {
        if (max === rn) hue = 60 * (((gn - bn) / delta) % 6);
        else if (max === gn) hue = 60 * ((bn - rn) / delta + 2);
        else hue = 60 * ((rn - gn) / delta + 4);
      }
      if (hue < 0) hue += 360;
      const saturation = max === 0 ? 0 : delta / max;
      const value = max;
      // White has low chroma; reject dark/grey frames instead of guessing.
      if (saturation < 0.20) {
        return { face: 'U', confident: saturation < 0.16 && value > 0.42, hue, saturation, value };
      }
      if (value < 0.16) return { face: 'F', confident: false, hue, saturation, value };
      // Hue bands are intentionally asymmetric: red wraps around 0°, orange
      // occupies its own band, and green gets a broad allowance for camera shifts.
      const bands: { face: Face; min: number; max: number }[] = [
        { face: 'R', min: 345, max: 360 }, { face: 'R', min: 0, max: 12 },
        { face: 'L', min: 12, max: 42 },
        { face: 'D', min: 42, max: 78 },
        { face: 'F', min: 78, max: 170 },
        { face: 'B', min: 170, max: 270 }
      ];
      const band = bands.find(item => hue >= item.min && hue < item.max);
      if (!band) return { face: 'F', confident: false, hue, saturation, value };
      const margin = Math.min(hue - band.min, band.max - hue);
      const confident = saturation >= 0.24 && value >= 0.20 && margin >= 3;
      return { face: band.face, confident, hue, saturation, value };
    };
    const samples: Face[] = [];
    let uncertain = 0;
    let centerConfident = false;
    let centerHue = 0;
    for (let row = 0; row < 3; row++) for (let col = 0; col < 3; col++) {
      // Median RGB from a 7x7 patch avoids sticker borders and isolated glare.
      const cx = Math.round(360 * (.17 + col * .33));
      const cy = Math.round(360 * (.17 + row * .33));
      const channels: number[][] = [[], [], []];
      for (let dy = -9; dy <= 9; dy += 3) for (let dx = -9; dx <= 9; dx += 3) {
        const pixel = context.getImageData(Math.max(0, Math.min(359, cx + dx)), Math.max(0, Math.min(359, cy + dy)), 1, 1).data;
        channels.forEach((channel, index) => channel.push(pixel[index]));
      }
      const median = (values: number[]) => values.sort((x, y) => x - y)[Math.floor(values.length / 2)];
      const result = classifyColor(median(channels[0]), median(channels[1]), median(channels[2]));
      if (!result.confident) uncertain++;
      if (row === 1 && col === 1) { centerConfident = result.confident; centerHue = result.hue; }
      samples.push(result.face);
    }
    // The centre sticker identifies the physical face. A confident centre-colour match
    // overrides the dropdown so the six sides can be scanned in any order.
    const detectedFace = samples[4];
    if (!centerConfident) {
      setCameraError('Centre colour is ambiguous (hue ' + Math.round(centerHue) + '°). Keep the centre sticker inside the middle guide, avoid glare, and use bright neutral lighting. Red and orange are separated by hue; green has a wider detection range.');
      return;
    }
    setHistory(items => [...items.slice(-29), toString(faces)]); clearSolution();
    setFaces(previous => ({ ...previous, [detectedFace]: samples }));
    setScannedFaces(previous => previous.includes(detectedFace) ? previous : [...previous, detectedFace]);
    const label = `${PALETTE[detectedFace].name} centre detected → ${FACE_NAMES[detectedFace]} face`;
    setCameraError(uncertain
      ? `${label}. Captured with ${uncertain} low-confidence sticker(s). Improve lighting and review the sticker map. ${scannedFaces.includes(detectedFace) ? 'This face was already scanned, so its capture was replaced.' : ''}`
      : `${label}. Face captured. ${Math.min(6, scannedFaces.includes(detectedFace) ? scannedFaces.length : scannedFaces.length + 1)}/6 faces scanned. Review the sticker map before solving.`);
  };
  const fillSolved = () => { setHistory(items => [...items.slice(-29), toString(faces)]); setFaces(emptyFaces()); setScannedFaces([]); clearSolution(); setError(''); setStatus('Solved color layout restored.'); };
  const copyAlgorithm = async () => { try { await navigator.clipboard.writeText(algorithm); setStatus('Algorithm copied to clipboard.'); } catch { setStatus('Select and copy the algorithm shown below.'); } };

  const downloadAlgorithm = () => {
    if (!algorithm) return;
    const blob = new Blob([algorithm.trim() + '\n'], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'twistlab-solution-algorithm.txt';
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
    setStatus('Solution algorithm downloaded as a text file.');
  };

  return <div className="app-shell">
    <header className="topbar"><a className="brand" href="#" aria-label="TwistLab home"><span className="brand-cube">✣</span><span>TWIST<span>LAB</span></span></a><div className="topbar-actions"><span className="privacy-pill"><i /> Local-first</span><button className="quiet-button" onClick={() => setShowHelp(value => !value)}>How to use</button></div></header>
    <main className="page">
      <section className="hero"><div className="eyebrow">INTERACTIVE CUBE LAB <span>•</span> 3×3</div><h1>Crack the cube.<br/><em>One move at a time.</em></h1><p>Paint your stickers, rotate a real 3D cube, validate the setup, then follow a verified solution.</p><div className="hero-pills"><span>3D INTERACTION</span><span>STEP-BY-STEP</span><span>NO ACCOUNT NEEDED</span></div></section>
      {showHelp && <section className="help-panel"><button className="close-help" onClick={() => setShowHelp(false)}>×</button><h3>How to use TwistLab</h3><ol><li>Drag the 3D cube to rotate it; scroll or pinch to zoom.</li><li>Tap a sticker in the 3D view or the flat net to cycle its color. Center stickers are fixed.</li><li>Each color must appear exactly nine times. A color-count check runs before solving.</li><li>Choose Fast or Guided view, then solve and use the controls to follow the verified algorithm.</li></ol><p>Notation: <b>R</b> is the right face clockwise, <b>R'</b> is counter-clockwise, and <b>R2</b> is a half-turn.</p></section>}
      {featureFlags.cube_history && <CubeLabExtras />}
      {featureFlags.cube_assistant && <CubeAssistant cubeState={toString(faces)} solution={solution} currentMove={currentMove} progress={progress} />}
      <div className="main-grid">
        <section className="panel cube-panel"><div className="panel-heading"><div><span className="step-label">01 / SETUP</span><h2>Your cube</h2></div><div className="cube-heading-actions">{featureFlags.fullscreen_controls && <button className="secondary-button fullscreen-trigger" onClick={() => setIsFullscreen(true)} aria-label="Open full-screen 3D cube">⛶ Full screen</button>}<button className="text-button" onClick={reset}>Reset ↺</button></div></div>
          <div className="cube-status"><span className={solved ? 'state-badge solved' : 'state-badge'}><i />{solved ? 'Solved state' : 'Custom state'}</span><span className="hint">Drag to rotate · tap a sticker to paint</span></div>
          <Suspense fallback={<div className="webgl-fallback" role="status">Loading interactive 3D cube…</div>}><CubeCanvas faces={displayedFaces} onSticker={paintSticker} turnKey={turnKey} durationMs={speed} /></Suspense>
          <div className="cube-tools"><button className="secondary-button" onClick={undo} disabled={!history.length}>↶ Undo</button><button className="secondary-button" onClick={redo} disabled={!redoHistory.length}>↷ Redo</button><button className="secondary-button" onClick={fillSolved}>Fill solved</button><button className="secondary-button" onClick={scrambleCube}>⤨ Scramble</button></div>
          <div className="color-legend">{FACE_ORDER.map(face => <button key={face} title={`Select ${PALETTE[face].name} color`} onClick={() => setStatus(`${PALETTE[face].name} is color ${face}. Tap any non-center sticker to cycle colors.`)}><i style={{ background: PALETTE[face].color }} />{PALETTE[face].name}</button>)}</div>
          <h3 className="subheading">Sticker map <span>Tap a tile to cycle colors</span></h3><CubeNet faces={displayedFaces} onSticker={paintSticker} disabled={busy || Boolean(solution.length)} />
          <div className={validation.valid ? 'validation-box good' : 'validation-box'}><strong>{validation.valid ? '✓ Color counts look balanced' : '⚠ Check cube colors'}</strong><div className="count-row">{FACE_ORDER.map(face => <span key={face}><i style={{ background: PALETTE[face].color }} />{face}: {validation.counts[face]}/9</span>)}</div>{!validation.valid && <p>Every color needs nine stickers and centers must stay on their matching faces. A valid count does not guarantee every physical cube arrangement is reachable.</p>}</div>
          {featureFlags.camera_scan && <section className="scan-card"><div className="scan-heading"><div><h3>📷 Camera color assist</h3><p>Capture one face at a time, then review it in the sticker map.</p></div>{!cameraOn ? <button className="secondary-button" onClick={startCamera}>Open camera</button> : <button className="text-button" onClick={stopCamera}>Turn off</button>}</div>
            {cameraOn && <><div className="scan-progress" aria-label={`${scannedFaces.length} of 6 faces scanned`}><div className="scan-progress-top"><span>Centre-colour auto-detection</span><b>{scannedFaces.length}/6 faces</b></div><div className="scan-progress-bar"><span style={{width:`${scannedFaces.length / 6 * 100}%`}} /></div><div className="scan-face-chips">{FACE_ORDER.map(face => <span key={face} className={scannedFaces.includes(face) ? 'scanned' : ''}><i style={{background:PALETTE[face].color}} />{FACE_NAMES[face]}</span>)}</div></div><p className="scan-auto-hint">Point any face toward the camera. TwistLab reads the centre sticker and assigns the face automatically.</p><div className="camera-frame"><video ref={videoRef} autoPlay muted playsInline /><div className="scan-guide">{Array.from({ length: 9 }, (_, i) => <i key={i} />)}</div></div><button className="primary-button full-button" onClick={scanFaceNow}>◎ Auto-detect side & capture 9 colors</button><button className="secondary-button full-button" onClick={() => { setScannedFaces([]); setCameraError('Scan progress cleared. Existing sticker colors were kept.'); }}>Reset scan progress</button></>}
            {cameraError && <p className="notice" role="status">{cameraError}</p>}
            <p className="privacy-note">Camera frames are sampled locally in this browser and are not uploaded. Lighting can misread colors.</p>
          </section>}
          {scramble && <div className="algorithm-block"><label>SCRAMBLE SEQUENCE</label><code>{scramble}</code></div>}
        </section>
        <section className="panel solution-panel"><div className="panel-heading"><div><span className="step-label">02 / SOLUTION</span><h2>Move guide</h2></div><span className="move-total">{solution.length ? `${solution.length} MOVES` : 'WAITING'}</span></div>
          <div className="mode-switch" role="group" aria-label="Solution view mode"><button className={mode === 'fast' ? 'selected' : ''} onClick={() => setMode('fast')}>⚡ Fast solve</button>{featureFlags.guided_mode && <button className={mode === 'guided' ? 'selected' : ''} onClick={() => setMode('guided')}>☷ Guided view</button>}</div>
          <div className="current-move-card"><span className="current-kicker">CURRENT MOVE</span><div className="current-move">{currentMove || (solution.length && step === solution.length ? '✓' : '—')}</div><strong>{solution.length && step === solution.length ? 'Cube solved' : currentMove ? `Move ${step + 1} of ${solution.length}` : 'Ready when you are'}</strong><p>{currentMove ? explainMove(currentMove) : status}</p><div className="big-progress"><span style={{ width: `${progress}%` }} /></div><div className="progress-caption"><span>{progress}% complete</span><span>{solution.length - step} remaining</span></div></div>
          <div className="solution-actions"><button className="primary-button" onClick={solve} disabled={busy}>{busy ? 'Preparing solver…' : 'Solve cube ↗'}</button><button className="secondary-button" onClick={copyAlgorithm} disabled={!solution.length}>Copy algorithm</button><button className="secondary-button" onClick={downloadAlgorithm} disabled={!solution.length}>Download solution</button></div>
          {error && <div className="error-box" role="alert"><b>Cube needs attention</b><p>{error}</p></div>}
          <MoveControls step={step} total={solution.length} playing={playing} onPrevious={() => jumpTo(step - 1)} onNext={() => jumpTo(step + 1)} onPlay={() => { if (step >= solution.length) setStep(0); setPlaying(value => !value); }} onReplay={() => { setPlaying(false); setStep(0); }} speed={speed} onSpeed={setSpeed} />
          <div className="steps-heading"><h3>Algorithm</h3><span>{solution.length} moves</span></div><SolutionSteps moves={solution} step={step} mode={mode} onSelect={jumpTo} />
          {algorithm && <div className="algorithm-block"><label>FULL ALGORITHM</label><code>{algorithm}</code></div>}
          {solution.length > 0 && startState && <SolutionOptimizer initialState={startState} moves={solution} />}
          {solverInsights && <section className="solver-insights" aria-label="Solution analysis">
            <div className="solver-insights-heading"><div><span className="current-kicker">ADVANCED SOLVER</span><h3>Solution analysis</h3></div><span className="solver-verified">✓ Verified</span></div>
            <div className="solver-metrics">
              <div><span>HTM</span><strong>{solverInsights.htm}</strong><small>Face-turn moves</small></div>
              <div><span>QTM</span><strong>{solverInsights.qtm}</strong><small>Quarter-turn units</small></div>
              <div><span>PLAYBACK</span><strong>{Math.floor(estimatedPlaybackSeconds / 60)}:{String(Math.round(estimatedPlaybackSeconds % 60)).padStart(2, '0')}</strong><small>At current speed</small></div>
            </div>
            <div className="solver-face-counts"><span>Move distribution</span>{FACE_ORDER.map(face => <span key={face}><b>{face}</b> {solverInsights.faceCounts[face]}</span>)}</div>
            <p>HTM counts each notation move once; QTM counts a half-turn as two quarter-turns. The estimate reflects your selected playback delay, not physical solving time. The two-phase solver's result is verified against the entered cube state, but is not guaranteed to be the globally shortest solution.</p>
          </section>}
          <div className="history-note"><span>✓</span><div><b>Solution verification</b><p>The solver's output is replayed against the cube state before it is shown.</p></div></div>
        </section>
      </div>
      <section className="community-panel" aria-labelledby="community-title">
        <div className="community-heading"><div><span className="community-kicker">✦ COMMUNITY & RESOURCES</span><h2 id="community-title">Need a hand? <em>We're one click away.</em></h2><p>Report a problem, suggest an improvement, or explore the source and documentation.</p></div><div className="community-version"><span>APP VERSION</span><strong>{APP_VERSION}</strong><small>Commit <code>{APP_COMMIT.slice(0, 7)}</code></small></div></div>
        <div className="community-grid">
          <a className="community-card support-card" href={"https://github.com/Error-cracker-1/AI-Developer-Hub/issues/new?title=%5BBug%5D%20TwistLab%3A%20&body=Application%3A%20TwistLab%20(Rubik's%20Cube%20Solver)%0AVersion%3A%202.0.0%0AProduction%20branch%3A%20rubiks-cube-solver%0ABuild%20commit%3A%20__APP_COMMIT__%0A%0A%23%23%23%20What%20happened%3F%0A%0A%23%23%23%20Steps%20to%20reproduce%0A1.%20%0A%0A%23%23%23%20Expected%20behaviour%0A%0A%23%23%23%20Actual%20behaviour%0A%0A%23%23%23%20Device%20%2F%20browser%0A".replace("__APP_COMMIT__", APP_COMMIT)} target="_blank" rel="noopener noreferrer"><span className="community-icon">?</span><strong>Report a bug</strong><p>Open a GitHub issue with app version, branch and build details prefilled.</p><span className="community-link">Get support ↗</span></a>
          <a className="community-card" href={"https://github.com/Error-cracker-1/AI-Developer-Hub/issues/new?title=%5BFeature%5D%20TwistLab%3A%20&body=Application%3A%20TwistLab%20(Rubik's%20Cube%20Solver)%0AVersion%3A%202.0.0%0AProduction%20branch%3A%20rubiks-cube-solver%0ABuild%20commit%3A%20__APP_COMMIT__%0A%0A%23%23%23%20What%20would%20you%20like%20to%20improve%3F%0A%0A%23%23%23%20Why%20would%20this%20help%3F%0A%0A%23%23%23%20Any%20examples%20or%20references%3F%0A".replace("__APP_COMMIT__", APP_COMMIT)} target="_blank" rel="noopener noreferrer"><span className="community-icon">✦</span><strong>Share feedback</strong><p>Suggest features and improvements for future TwistLab releases.</p><span className="community-link">Send feedback ↗</span></a>
          <a className="community-card" href="https://github.com/Error-cracker-1/AI-Developer-Hub/blob/rubiks-cube-solver/README.md" target="_blank" rel="noopener noreferrer"><span className="community-icon">▤</span><strong>Documentation</strong><p>Read cube setup, notation, solver and project information.</p><span className="community-link">Read README ↗</span></a>
          <a className="community-card" href="https://github.com/Error-cracker-1/AI-Developer-Hub/tree/rubiks-cube-solver" target="_blank" rel="noopener noreferrer"><span className="community-icon">⌘</span><strong>Show code</strong><p>Browse TwistLab's source on its own production branch.</p><span className="community-link">Explore source ↗</span></a>
        </div>
      </section>
      <footer><span>TWISTLAB / 3×3 SOLVER</span><span>Cube state stays in this tab · no sign-in</span></footer>
    </main>

      {featureFlags.fullscreen_controls && isFullscreen && <div className="cube-fullscreen" role="dialog" aria-modal="true" aria-label="Full-screen 3D cube and playback controls">
        <header className="fullscreen-header"><div><span className="step-label">TWISTLAB / IMMERSIVE VIEW</span><h2>3D Cube Playback</h2></div><button className="fullscreen-close" onClick={() => setIsFullscreen(false)} aria-label="Close full-screen view">✕ <span>Exit full screen</span></button></header>
        <div className="fullscreen-cube-stage"><Suspense fallback={<div className="webgl-fallback" role="status">Loading interactive 3D cube…</div>}><CubeCanvas faces={displayedFaces} onSticker={paintSticker} turnKey={turnKey} durationMs={speed} /></Suspense></div>
        <div className="fullscreen-move-summary"><span className="current-kicker">CURRENT MOVE</span><strong>{currentMove || (solution.length && step === solution.length ? '✓ Solved' : 'Ready to play')}</strong><span>{solution.length ? 'Move ' + Math.min(step + 1, solution.length) + ' of ' + solution.length + ' · ' + progress + '% complete' : 'Solve the cube to enable playback.'}</span></div>
        <div className="fullscreen-controls"><MoveControls step={step} total={solution.length} playing={playing} onPrevious={() => jumpTo(step - 1)} onNext={() => jumpTo(step + 1)} onPlay={() => { if (step >= solution.length) setStep(0); setPlaying(value => !value); }} onReplay={() => { setPlaying(false); setStep(0); }} speed={speed} onSpeed={setSpeed} /></div>
        <p className="fullscreen-hint">Drag the cube to rotate the view · pinch or scroll to zoom · press Esc to exit</p>
      </div>}
  </div>;
}
function explainMove(move: string) {
  const names: Record<string, string> = { U: 'upper', R: 'right', F: 'front', D: 'bottom', L: 'left', B: 'back' };
  const direction = move.endsWith('2') ? 'Turn the ' + names[move[0]] + ' face half a turn.' : move.endsWith("'") ? 'Turn the ' + names[move[0]] + ' face counter-clockwise.' : 'Turn the ' + names[move[0]] + ' face clockwise.';
  return direction + ' Direction is judged while looking directly at that face.';
}
