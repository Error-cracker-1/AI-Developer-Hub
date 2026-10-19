import { useEffect, useMemo, useState } from 'react';
import Cube from 'cubejs';

type Face = 'U' | 'R' | 'F' | 'D' | 'L' | 'B';
type Facelets = Record<Face, string[]>;

const FACE_ORDER: Face[] = ['U', 'R', 'F', 'D', 'L', 'B'];
const FACE_NAMES: Record<Face, string> = {
  U: 'Up',
  R: 'Right',
  F: 'Front',
  D: 'Down',
  L: 'Left',
  B: 'Back',
};
const PALETTE: Record<Face, { color: string; name: string }> = {
  U: { color: '#f8fafc', name: 'White' },
  R: { color: '#ef4444', name: 'Red' },
  F: { color: '#22a06b', name: 'Green' },
  D: { color: '#facc15', name: 'Yellow' },
  L: { color: '#f97316', name: 'Orange' },
  B: { color: '#3b82f6', name: 'Blue' },
};
const MOVES = [
  'U',
  "U'",
  'U2',
  'R',
  "R'",
  'R2',
  'F',
  "F'",
  'F2',
  'D',
  "D'",
  'D2',
  'L',
  "L'",
  'L2',
  'B',
  "B'",
  'B2',
];
const EMPTY_FACELETS = (): Facelets => ({
  U: Array(9).fill('U'),
  R: Array(9).fill('R'),
  F: Array(9).fill('F'),
  D: Array(9).fill('D'),
  L: Array(9).fill('L'),
  B: Array(9).fill('B'),
});
const asFacelets = (state: string): Facelets => {
  const result = {} as Facelets;
  FACE_ORDER.forEach((face, index) => {
    result[face] = state.slice(index * 9, index * 9 + 9).split('');
  });
  return result;
};
const faceletsToString = (faces: Facelets) =>
  FACE_ORDER.map(face => faces[face].join('')).join('');
const moveState = (state: string, moves: string[]) => {
  if (!moves.length) return state;
  const cube = Cube.fromString(state);
  cube.move(moves.join(' '));
  return cube.asString();
};

function App() {
  const [faces, setFaces] = useState<Facelets>(EMPTY_FACELETS);
  const [error, setError] = useState('');
  const [status, setStatus] = useState('Ready when you are.');
  const [solverReady, setSolverReady] = useState(false);
  const [isSolving, setIsSolving] = useState(false);
  const [solution, setSolution] = useState<string[]>([]);
  const [solutionStart, setSolutionStart] = useState('');
  const [step, setStep] = useState(0);
  const [autoPlay, setAutoPlay] = useState(false);
  const [speed, setSpeed] = useState(900);
  const [scrambleText, setScrambleText] = useState('');
  const [showHelp, setShowHelp] = useState(false);

  const currentState = useMemo(() => {
    if (solutionStart && solution.length) {
      try {
        return moveState(solutionStart, solution.slice(0, step));
      } catch {
        return faceletsToString(faces);
      }
    }
    return faceletsToString(faces);
  }, [solutionStart, solution, step, faces]);

  const displayedFaces = useMemo(
    () => asFacelets(currentState),
    [currentState]
  );
  const isSolved =
    currentState ===
    'U'.repeat(9) +
      'R'.repeat(9) +
      'F'.repeat(9) +
      'D'.repeat(9) +
      'L'.repeat(9) +
      'B'.repeat(9);

  useEffect(() => {
    if (!autoPlay || step >= solution.length) {
      if (autoPlay) setAutoPlay(false);
      return;
    }
    const timer = window.setTimeout(
      () => setStep(current => Math.min(current + 1, solution.length)),
      speed
    );
    return () => window.clearTimeout(timer);
  }, [autoPlay, step, solution.length, speed]);

  function resetSolution() {
    setAutoPlay(false);
    setSolution([]);
    setSolutionStart('');
    setStep(0);
  }

  function cycleSticker(face: Face, index: number) {
    if (index === 4 || isSolving) return;
    resetSolution();
    setError('');
    setStatus('Cube updated. Check that every color appears nine times.');
    setFaces(previous => {
      const next = { ...previous, [face]: [...previous[face]] };
      const current = next[face][index] as Face;
      const nextIndex = (FACE_ORDER.indexOf(current) + 1) % FACE_ORDER.length;
      next[face][index] = FACE_ORDER[nextIndex];
      return next;
    });
  }

  function scrambleCube() {
    const cube = new Cube();
    const scramble: string[] = [];
    let previousFace = '';
    for (let i = 0; i < 20; i++) {
      const options = MOVES.filter(move => move[0] !== previousFace);
      const move = options[Math.floor(Math.random() * options.length)];
      scramble.push(move);
      previousFace = move[0];
    }
    cube.move(scramble.join(' '));
    const next = cube.asString();
    setFaces(asFacelets(next));
    setScrambleText(scramble.join(' '));
    resetSolution();
    setError('');
    setStatus('Random scramble ready. Press Solve cube to get the steps.');
  }

  function resetCube() {
    setFaces(EMPTY_FACELETS());
    setScrambleText('');
    resetSolution();
    setError('');
    setStatus('Cube reset to solved state.');
  }

  async function solveCube() {
    setAutoPlay(false);
    setError('');
    const state = faceletsToString(faces);
    const counts = FACE_ORDER.map(face => ({
      face,
      count: state.split(face).length - 1,
    }));
    const incorrect = counts.filter(item => item.count !== 9);
    if (incorrect.length) {
      setError(
        'Invalid color counts: each color must appear exactly 9 times. ' +
          incorrect.map(item => item.face + ': ' + item.count).join(', ')
      );
      setStatus('Fix the sticker colors before solving.');
      return;
    }
    if (FACE_ORDER.some(face => faces[face][4] !== face)) {
      setError(
        'The six center stickers must stay on their matching faces. Reset the cube and enter the stickers relative to the face labels.'
      );
      return;
    }
    setIsSolving(true);
    setStatus(
      solverReady
        ? 'Calculating a solution…'
        : 'Preparing the solver tables (first run may take a few seconds)…'
    );
    try {
      await new Promise<void>((resolve, reject) => {
        window.setTimeout(() => {
          try {
            if (!solverReady) Cube.initSolver();
            resolve();
          } catch (cause) {
            reject(cause);
          }
        }, 20);
      });
      setSolverReady(true);
      const cube = Cube.fromString(state);
      const answer = cube.solve().trim();
      const moves = answer ? answer.split(/\s+/) : [];
      const verification = Cube.fromString(state);
      if (moves.length) verification.move(moves.join(' '));
      if (
        !verification
          .asString()
          .split('')
          .every((value, index) => value === 'URFDLB'[Math.floor(index / 9)])
      ) {
        throw new Error(
          'The solver returned a sequence that did not verify. Please check the sticker input.'
        );
      }
      setSolutionStart(state);
      setSolution(moves);
      setStep(0);
      setStatus(
        moves.length
          ? 'Solution found. Follow each move in order.'
          : 'This cube is already solved.'
      );
      setScrambleText('');
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : 'Could not solve this cube state. Check the sticker colors and try again.'
      );
      setStatus('The cube state could not be solved.');
    } finally {
      setIsSolving(false);
    }
  }

  function useMoveIndex(nextStep: number) {
    setAutoPlay(false);
    setStep(Math.max(0, Math.min(solution.length, nextStep)));
  }

  const currentMove = step < solution.length ? solution[step] : '';
  const progress = solution.length
    ? Math.round((step / solution.length) * 100)
    : 0;

  return (
    <div className="site-shell">
      <header className="topbar">
        <a className="brand" href="#" aria-label="TwistLab home">
          <span className="brand-mark">
            <span />
            <span />
            <span />
            <span />
          </span>
          <span>
            TWIST<span className="brand-accent">LAB</span>
          </span>
        </a>
        <div className="topbar-right">
          <span className="local-badge">
            <span className="status-dot" /> Runs in your browser
          </span>
          <button
            className="help-link"
            onClick={() => setShowHelp(value => !value)}
          >
            How to use
          </button>
        </div>
      </header>

      <main className="main-content">
        <section className="hero">
          <div className="eyebrow">
            <span className="eyebrow-line" /> THE CUBE, DECODED
          </div>
          <h1>
            One cube.
            <br />
            <span>One clear solution.</span>
          </h1>
          <p className="hero-copy">
            Enter your 3×3 cube, get a move-by-move solution, and follow along
            at your own pace.
          </p>
          <div className="hero-tags">
            <span>3×3 SOLVER</span>
            <span className="tag-separator">/</span>
            <span>STEP-BY-STEP</span>
            <span className="tag-separator">/</span>
            <span>FREE TO USE</span>
          </div>
        </section>

        {showHelp && (
          <section className="help-panel">
            <button
              className="help-close"
              onClick={() => setShowHelp(false)}
              aria-label="Close help"
            >
              ×
            </button>
            <h3>How to enter your cube</h3>
            <ol>
              <li>Hold the cube with white on top and green facing you.</li>
              <li>
                Use the net below. Tap any non-center sticker to cycle its
                color.
              </li>
              <li>Each color must appear exactly nine times.</li>
              <li>
                Press <strong>Solve cube</strong>, then use the step controls to
                follow the algorithm.
              </li>
            </ol>
            <p>
              Move notation: <strong>R</strong> = right face clockwise,{' '}
              <strong>R'</strong> = counter-clockwise, and <strong>R2</strong> =
              half turn. The same notation applies to U, F, D, L, and B.
            </p>
          </section>
        )}

        <div className="workspace">
          <section className="cube-card">
            <div className="card-heading">
              <div>
                <span className="section-kicker">01 / YOUR CUBE</span>
                <h2>Cube configuration</h2>
              </div>
              <button className="text-button" onClick={resetCube}>
                Reset cube ↺
              </button>
            </div>
            <div className="cube-status-row">
              <span
                className={'cube-status-pill ' + (isSolved ? 'solved' : '')}
              >
                <span className="mini-dot" />
                {isSolved ? 'Solved state' : 'Custom state'}
              </span>
              <span className="tap-hint">Tap a sticker to change color</span>
            </div>
            <div
              className="cube-net"
              aria-label="Editable Rubik's cube sticker net"
            >
              <div className="net-spacer" />
              <FaceGrid
                face="U"
                stickers={displayedFaces.U}
                onSticker={cycleSticker}
                disabled={Boolean(solution.length) || isSolving}
              />
              <div className="net-spacer" />
              <div className="net-spacer" />
              <FaceGrid
                face="L"
                stickers={displayedFaces.L}
                onSticker={cycleSticker}
                disabled={Boolean(solution.length) || isSolving}
              />
              <FaceGrid
                face="F"
                stickers={displayedFaces.F}
                onSticker={cycleSticker}
                disabled={Boolean(solution.length) || isSolving}
              />
              <FaceGrid
                face="R"
                stickers={displayedFaces.R}
                onSticker={cycleSticker}
                disabled={Boolean(solution.length) || isSolving}
              />
              <FaceGrid
                face="B"
                stickers={displayedFaces.B}
                onSticker={cycleSticker}
                disabled={Boolean(solution.length) || isSolving}
              />
              <div className="net-spacer" />
              <FaceGrid
                face="D"
                stickers={displayedFaces.D}
                onSticker={cycleSticker}
                disabled={Boolean(solution.length) || isSolving}
              />
              <div className="net-spacer" />
              <div className="net-spacer" />
            </div>
            <div className="palette-legend">
              {FACE_ORDER.map(face => (
                <span key={face}>
                  <i style={{ background: PALETTE[face].color }} />
                  {PALETTE[face].name}
                </span>
              ))}
            </div>
            <div className="cube-actions">
              <button className="button-secondary" onClick={scrambleCube}>
                ⤨ Random scramble
              </button>
              <button
                className="button-primary"
                onClick={solveCube}
                disabled={isSolving}
              >
                {isSolving ? (
                  <>
                    <span className="spinner" /> Solving…
                  </>
                ) : (
                  <>
                    Solve cube <span>↗</span>
                  </>
                )}
              </button>
            </div>
            {scrambleText && (
              <div className="scramble-note">
                <span>SCRAMBLE</span>
                <code>{scrambleText}</code>
              </div>
            )}
            <p className="privacy-note">
              <span>◈</span> Your cube state stays in this browser. No camera or
              account needed.
            </p>
          </section>

          <section className="solution-card">
            <div className="card-heading">
              <div>
                <span className="section-kicker">02 / THE SOLUTION</span>
                <h2>Move guide</h2>
              </div>
              <span className="move-count">
                {solution.length ? solution.length + ' MOVES' : 'WAITING'}
              </span>
            </div>
            <div className="solution-visual">
              <div className="visual-glow" />
              <div className="mini-cube" aria-label="Cube status illustration">
                <div className="mini-face mini-top">
                  {Array.from({ length: 9 }, (_, i) => (
                    <i
                      key={i}
                      style={{
                        background: PALETTE[displayedFaces.U[i] as Face].color,
                      }}
                    />
                  ))}
                </div>
                <div className="mini-face mini-left">
                  {Array.from({ length: 9 }, (_, i) => (
                    <i
                      key={i}
                      style={{
                        background: PALETTE[displayedFaces.F[i] as Face].color,
                      }}
                    />
                  ))}
                </div>
                <div className="mini-face mini-right">
                  {Array.from({ length: 9 }, (_, i) => (
                    <i
                      key={i}
                      style={{
                        background: PALETTE[displayedFaces.R[i] as Face].color,
                      }}
                    />
                  ))}
                </div>
              </div>
              <div className="visual-caption">
                {solution.length
                  ? step === solution.length
                    ? 'CUBE SOLVED'
                    : 'FOLLOW THE NEXT MOVE'
                  : 'YOUR SOLUTION WILL APPEAR HERE'}
              </div>
            </div>
            <div className="solution-status">
              <span className={'status-icon ' + (error ? 'status-error' : '')}>
                {error ? '!' : '↗'}
              </span>
              <div>
                <strong>{error ? 'Check your cube' : status}</strong>
                <p>
                  {error
                    ? 'Correct the sticker net and try again.'
                    : solution.length
                      ? step === solution.length
                        ? 'Nice work — every move is complete.'
                        : 'Move ' +
                          (step + 1) +
                          ' of ' +
                          solution.length +
                          ' is next.'
                      : 'Configure your stickers, then solve to see the move list.'}
                </p>
              </div>
            </div>
            {error && (
              <div className="error-box" role="alert">
                {error}
              </div>
            )}
            {solution.length > 0 && (
              <>
                <div className="progress-header">
                  <span>PROGRESS</span>
                  <strong>
                    {step} <small>/ {solution.length}</small>
                  </strong>
                </div>
                <div className="progress-track">
                  <div
                    className="progress-fill"
                    style={{ width: progress + '%' }}
                  />
                </div>
                <div className="current-move-panel">
                  <div className="move-token">
                    {step === solution.length ? '✓' : currentMove}
                  </div>
                  <div className="move-explanation">
                    <span>NEXT MOVE</span>
                    <strong>
                      {step === solution.length
                        ? 'All done!'
                        : describeMove(currentMove)}
                    </strong>
                    <p>
                      {step === solution.length
                        ? 'Your cube should now be solved.'
                        : moveDescription(currentMove)}
                    </p>
                  </div>
                </div>
                <div className="move-controls">
                  <button
                    className="control-button"
                    onClick={() => useMoveIndex(0)}
                    disabled={step === 0}
                    aria-label="Go to first move"
                  >
                    |‹
                  </button>
                  <button
                    className="control-button"
                    onClick={() => useMoveIndex(step - 1)}
                    disabled={step === 0}
                    aria-label="Previous move"
                  >
                    ‹
                  </button>
                  <button
                    className="control-play"
                    onClick={() => {
                      if (step >= solution.length) setStep(0);
                      setAutoPlay(value => !(value && step < solution.length));
                    }}
                    disabled={step === solution.length && !solution.length}
                  >
                    {autoPlay
                      ? 'Ⅱ Pause'
                      : step === solution.length
                        ? '↻ Replay'
                        : '▶ Play steps'}
                  </button>
                  <button
                    className="control-button"
                    onClick={() => useMoveIndex(step + 1)}
                    disabled={step >= solution.length}
                    aria-label="Next move"
                  >
                    ›
                  </button>
                  <button
                    className="control-button"
                    onClick={() => useMoveIndex(solution.length)}
                    disabled={step === solution.length}
                    aria-label="Go to last move"
                  >
                    ›|
                  </button>
                </div>
                <div className="speed-row">
                  <label htmlFor="speed">PLAYBACK SPEED</label>
                  <select
                    id="speed"
                    value={speed}
                    onChange={event => setSpeed(Number(event.target.value))}
                  >
                    <option value={1400}>Slow</option>
                    <option value={900}>Normal</option>
                    <option value={450}>Fast</option>
                  </select>
                  <button
                    className="text-button"
                    onClick={() => {
                      resetSolution();
                      setStatus(
                        'Solution cleared. You can solve again any time.'
                      );
                    }}
                  >
                    Clear solution
                  </button>
                </div>
                <div className="algorithm-list">
                  <div className="algorithm-header">
                    <span>FULL ALGORITHM</span>
                    <button
                      className="text-button"
                      onClick={() =>
                        navigator.clipboard
                          ?.writeText(solution.join(' '))
                          .then(() =>
                            setStatus('Algorithm copied to clipboard.')
                          )
                          .catch(() => setStatus(solution.join(' ')))
                      }
                    >
                      Copy moves ⧉
                    </button>
                  </div>
                  <div className="move-chips">
                    {solution.map((move, index) => (
                      <button
                        key={index}
                        className={
                          'move-chip ' +
                          (index < step
                            ? 'done'
                            : index === step
                              ? 'active'
                              : '')
                        }
                        onClick={() => useMoveIndex(index)}
                        title={'Start at move ' + (index + 1)}
                      >
                        {move}
                      </button>
                    ))}
                  </div>
                </div>
              </>
            )}
            {!solution.length && (
              <div className="empty-solution">
                <div className="empty-icon">↗</div>
                <strong>Ready to find your way out?</strong>
                <p>
                  Your solution will show up here as a clear sequence of turns.
                </p>
              </div>
            )}
          </section>
        </div>

        <section className="bottom-tip">
          <div className="tip-icon">✳</div>
          <div>
            <strong>Small notation, big difference.</strong>
            <p>
              A move with a <code>'</code> symbol turns counter-clockwise. A{' '}
              <code>2</code> means turn the face twice. Keep the cube oriented
              the same way as you follow the steps.
            </p>
          </div>
          <button onClick={() => setShowHelp(true)}>Read the guide ↗</button>
        </section>
        <footer>
          <span>
            TWISTLAB <span className="footer-dot">•</span> A little logic, a lot
            of twists.
          </span>
          <span>
            Built for curious minds. <span className="footer-spark">✳</span>
          </span>
        </footer>
      </main>
    </div>
  );
}

function FaceGrid({
  face,
  stickers,
  onSticker,
  disabled,
}: {
  face: Face;
  stickers: string[];
  onSticker: (face: Face, index: number) => void;
  disabled: boolean;
}) {
  return (
    <div className="face-block">
      <div className="face-label">
        <span>{FACE_NAMES[face]}</span>
        <b>{face}</b>
      </div>
      <div className="face-grid">
        {stickers.map((sticker, index) => (
          <button
            key={index}
            type="button"
            className={'sticker ' + (index === 4 ? 'center-sticker' : '')}
            style={{ background: PALETTE[sticker as Face]?.color ?? '#64748b' }}
            onClick={() => onSticker(face, index)}
            disabled={disabled || index === 4}
            aria-label={
              FACE_NAMES[face] +
              ' sticker ' +
              (index + 1) +
              (index === 4
                ? ', center'
                : ', color ' + PALETTE[sticker as Face]?.name)
            }
            title={
              index === 4
                ? 'Center stickers are fixed'
                : 'Tap to cycle sticker color'
            }
          />
        ))}
      </div>
    </div>
  );
}

function describeMove(move: string) {
  if (!move) return 'Solution complete';
  const faceNames: Record<string, string> = {
    U: 'Top face',
    R: 'Right face',
    F: 'Front face',
    D: 'Bottom face',
    L: 'Left face',
    B: 'Back face',
  };
  return (
    (faceNames[move[0]] || move[0]) +
    (move.includes('2')
      ? ' · Half turn'
      : move.includes("'")
        ? ' · Counter-clockwise'
        : ' · Clockwise')
  );
}
function moveDescription(move: string) {
  if (!move) return 'No more turns needed.';
  return move.includes('2')
    ? 'Turn the ' + move[0] + ' face 180 degrees.'
    : move.includes("'")
      ? 'Turn the ' + move[0] + ' face counter-clockwise.'
      : 'Turn the ' + move[0] + ' face clockwise.';
}

export default App;
