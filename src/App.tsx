import { useEffect, useMemo, useState } from 'react';
import {
  Activity,
  ArrowUpRight,
  BookOpen,
  Check,
  ChevronDown,
  Code2,
  Copy,
  FileCode2,
  FolderGit2,
  ShieldCheck,
  Github,
  LoaderCircle,
  Plus,
  Paperclip,
  Sparkles,
  Trash2,
  WandSparkles,
  X,
} from 'lucide-react';

type Mode =
  | 'Generate code'
  | 'Explain code'
  | 'Debug code'
  | 'AI Code Review'
  | 'README writer'
  | 'Release notes';
type Project = {
  id: string;
  name: string;
  language: string;
  status: string;
  notes: string;
};
const modes: { name: Mode; description: string; icon: typeof Code2 }[] = [
  {
    name: 'Generate code',
    description: 'Build a solution from a clear prompt',
    icon: WandSparkles,
  },
  {
    name: 'Explain code',
    description: 'Understand unfamiliar code',
    icon: BookOpen,
  },
  {
    name: 'Debug code',
    description: 'Find likely causes and fixes',
    icon: Activity,
  },
  {
    name: 'AI Code Review',
    description: 'Find bugs, risks, and maintainability issues',
    icon: ShieldCheck,
  },
  {
    name: 'README writer',
    description: 'Draft polished project documentation',
    icon: FileCode2,
  },
  {
    name: 'Release notes',
    description: 'Write structured Markdown release notes',
    icon: Github,
  },
];
const languages = [
  'Python',
  'JavaScript',
  'TypeScript',
  'HTML',
  'CSS',
  'Java',
  'C',
  'C++',
  'C#',
  'Go',
  'Rust',
  'PHP',
  'Ruby',
  'Kotlin',
  'Swift',
  'SQL',
  'Bash / PowerShell',
  'Other',
];
const starterProjects: Project[] = [
  {
    id: 'starter-chatbot',
    name: 'AI Chatbot',
    language: 'Python',
    status: 'In progress',
    notes: 'Improve prompts, reliability and release workflow.',
  },
  {
    id: 'starter-web',
    name: 'Web experiments',
    language: 'HTML / CSS / JS',
    status: 'Planned',
    notes: 'Keep small interface ideas and experiments together.',
  },
];

function readProjects(): Project[] {
  try {
    const saved = localStorage.getItem('devhub-projects-v1');
    return saved ? (JSON.parse(saved) as Project[]) : starterProjects;
  } catch {
    return starterProjects;
  }
}

function App() {
  const [mode, setMode] = useState<Mode>('Explain code');
  const [language, setLanguage] = useState('Python');
  const [task, setTask] = useState('');
  const [attachedFile, setAttachedFile] = useState<{ name: string; text: string } | null>(null);
  const [result, setResult] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [tab, setTab] = useState<'Workspace' | 'Projects'>('Workspace');
  const [projects, setProjects] = useState<Project[]>(readProjects);
  const [showProjectForm, setShowProjectForm] = useState(false);
  const [projectName, setProjectName] = useState('');
  const [projectLanguage, setProjectLanguage] = useState('Python');
  const [projectNotes, setProjectNotes] = useState('');

  useEffect(() => {
    localStorage.setItem('devhub-projects-v1', JSON.stringify(projects));
  }, [projects]);

  const activeMode = useMemo(
    () => modes.find(item => item.name === mode) ?? modes[0],
    [mode]
  );

  async function handleFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    if (file.size > 100 * 1024) {
      setErrorMessage('Please choose a text/code file smaller than 100 KB.');
      return;
    }
    const allowedExtensions = ['.txt','.md','.json','.yaml','.yml','.xml','.html','.htm','.css','.scss','.less','.js','.jsx','.mjs','.cjs','.ts','.tsx','.py','.java','.kt','.kts','.c','.h','.cc','.cpp','.hpp','.cs','.go','.rs','.php','.rb','.swift','.sql','.sh','.bash','.ps1','.psm1','.toml','.ini','.vue','.svelte','.astro','.ipynb','.log'];
    const lowerName = file.name.toLowerCase();
    if (!allowedExtensions.some(extension => lowerName.endsWith(extension))) {
      setErrorMessage('Unsupported file type. Choose a text or source-code file.');
      return;
    }
    try {
      const text = await file.text();
      if (text.includes(String.fromCharCode(0))) {
        setErrorMessage('This file does not look like plain text. Choose a text or source-code file.');
        return;
      }
      setAttachedFile({ name: file.name, text });
      setErrorMessage('');
    } catch {
      setErrorMessage('Could not read that file. Try another text or source-code file.');
    }
  }

  async function generate() {
    if (!task.trim() && !attachedFile) {
      setErrorMessage(
        'Add a question, code snippet, or project details first.'
      );
      return;
    }
    setLoading(true);
    setErrorMessage('');
    setCopied(false);
    setResult('');
    try {
      const response = await fetch('/api/assist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mode, language, task: task.trim(), fileName: attachedFile?.name, fileContent: attachedFile?.text }),
      });
      const payload = (await response.json().catch(() => ({}))) as {
        text?: string;
        error?: string;
      };
      if (!response.ok) {
        throw new Error(payload.error || `AI request failed (HTTP ${response.status}).`);
      }
      const text = payload.text;
      if (typeof text !== 'string' || !text.trim())
        throw new Error(
          'The assistant returned an empty response. Please try again.'
        );
      setResult(text);
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : 'Something went wrong. Please try again.';
      setErrorMessage(
        message.includes('429')
          ? 'The AI service is busy or rate-limited. Wait a moment, then retry.'
          : message
      );
    } finally {
      setLoading(false);
    }
  }

  async function copyResult() {
    if (!result) return;
    try {
      await navigator.clipboard.writeText(result);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      setErrorMessage(
        'Copy was blocked by your browser. Select the result text and copy it manually.'
      );
    }
  }

  function addProject(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!projectName.trim()) return;
    setProjects(current => [
      {
        id: crypto.randomUUID(),
        name: projectName.trim(),
        language: projectLanguage,
        status: 'Planned',
        notes: projectNotes.trim(),
      },
      ...current,
    ]);
    setProjectName('');
    setProjectNotes('');
    setShowProjectForm(false);
  }

  return (
    <div className="shell">
      <aside className="sidebar">
        <a className="brand" href="#" onClick={() => setTab('Workspace')}>
          <span className="brand-mark">
            <Code2 size={21} />
          </span>
          <span>
            <strong>
              Dev<span>Hub</span>
            </strong>
            <small>AI WORKSPACE</small>
          </span>
        </a>
        <div className="side-label">WORKSPACE</div>
        <button
          className={tab === 'Workspace' ? 'nav-item active' : 'nav-item'}
          onClick={() => setTab('Workspace')}
        >
          <Sparkles size={17} /> AI Assistant <span className="nav-dot" />
        </button>
        <button
          className={tab === 'Projects' ? 'nav-item active' : 'nav-item'}
          onClick={() => setTab('Projects')}
        >
          <FolderGit2 size={17} /> My Projects{' '}
          <span className="nav-count">{projects.length}</span>
        </button>
        <div className="sidebar-bottom">
          <div className="status-card">
            <span className="status-icon">
              <Activity size={16} />
            </span>
            <div>
              <strong>Ready to build?</strong>
              <p>Your next idea starts here.</p>
            </div>
          </div>
          <div className="profile-row">
            <div className="avatar">D</div>
            <div>
              <strong>Developer</strong>
              <small>Personal workspace</small>
            </div>
            <ChevronDown size={15} />
          </div>
        </div>
      </aside>

      <main className="main">
        <header className="topbar">
          <div className="breadcrumbs">
            Workspace <span>/</span> <strong>{tab}</strong>
          </div>
          <div className="top-actions">
            <span className="secure-pill">
              <span /> Private workspace
            </span>
            <div className="top-avatar">D</div>
          </div>
        </header>
        {tab === 'Workspace' ? (
          <div className="content">
            <div className="hero">
              <div className="hero-copy">
                <div className="eyebrow">
                  <Sparkles size={14} /> YOUR AI DEVELOPMENT PARTNER
                </div>
                <h1>
                  Make good code.
                  <br />
                  <span>Ship great ideas.</span>
                </h1>
                <p>
                  Write, understand, and improve code across languages. One
                  focused workspace for your entire build process.
                </p>
                <div className="hero-stats">
                  <div>
                    <strong>18+</strong>
                    <span>Languages</span>
                  </div>
                  <i />
                  <div>
                    <strong>6</strong>
                    <span>AI workflows</span>
                  </div>
                  <i />
                  <div>
                    <strong>1</strong>
                    <span>Creative space</span>
                  </div>
                </div>
              </div>
              <div className="hero-art" aria-hidden="true">
                <div className="orbit orbit-one" />
                <div className="orbit orbit-two" />
                <div className="code-window">
                  <div className="window-head">
                    <span />
                    <span />
                    <span />
                    <small>solution.ts</small>
                  </div>
                  <div className="code-lines">
                    <p>
                      <b>01</b> <em>const</em> idea = <i>'build';</i>
                    </p>
                    <p>
                      <b>02</b> <em>function</em> <strong>create</strong>(){' '}
                      {'{'}
                    </p>
                    <p>
                      <b>03</b> &nbsp; <em>return</em> idea +{' '}
                      <i>' something';</i>
                    </p>
                    <p>
                      <b>04</b> {'}'}
                    </p>
                    <p>
                      <b>05</b>{' '}
                      <span className="code-comment">
                        // iterate. improve. ship.
                      </span>
                    </p>
                  </div>
                </div>
                <div className="floating-chip chip-top">
                  <Sparkles size={15} /> AI assisted
                </div>
                <div className="floating-chip chip-bottom">
                  <Check size={15} /> Build with confidence
                </div>
              </div>
            </div>
            <div className="section-heading">
              <div>
                <h2>What are we building today?</h2>
                <p>Choose a workflow and let’s get to work.</p>
              </div>
              <span className="powered">
                <span /> AI READY
              </span>
            </div>
            <div className="mode-grid">
              {modes.map((item, index) => {
                const Icon = item.icon;
                return (
                  <button
                    key={item.name}
                    className={
                      mode === item.name ? 'mode-card selected' : 'mode-card'
                    }
                    onClick={() => setMode(item.name)}
                  >
                    <span className={'mode-icon mode-' + index}>
                      <Icon size={19} />
                    </span>
                    <span className="mode-text">
                      <strong>{item.name}</strong>
                      <small>{item.description}</small>
                    </span>
                    {mode === item.name ? (
                      <span className="selected-check">
                        <Check size={13} />
                      </span>
                    ) : (
                      <ArrowUpRight className="mode-arrow" size={16} />
                    )}
                  </button>
                );
              })}
            </div>
            <section className="workbench">
              <div className="workbench-title">
                <div className="workbench-icon">
                  <activeMode.icon size={19} />
                </div>
                <div>
                  <h2>{mode}</h2>
                  <p>{activeMode.description}</p>
                </div>
                <span className="live-tag">
                  <span /> READY
                </span>
              </div>
              <div className="form-grid">
                <label className="field-label">
                  LANGUAGE / STACK
                  <select
                    value={language}
                    onChange={event => setLanguage(event.target.value)}
                  >
                    {languages.map(item => (
                      <option key={item}>{item}</option>
                    ))}
                  </select>
                </label>
                <div className="field-label">
                  TASK TYPE
                  <div className="task-chip">
                    <activeMode.icon size={15} /> {mode}
                  </div>
                </div>
              </div>
              <div className="file-upload-row">
                <label className="attach-file-button">
                  <Paperclip size={16} /> {attachedFile ? "Replace file" : "Attach code file"}
                  <input type="file" accept=".txt,.md,.json,.yaml,.yml,.xml,.html,.htm,.css,.scss,.less,.js,.jsx,.mjs,.cjs,.ts,.tsx,.py,.java,.kt,.kts,.c,.h,.cc,.cpp,.hpp,.cs,.go,.rs,.php,.rb,.swift,.sql,.sh,.bash,.ps1,.psm1,.toml,.ini,.vue,.svelte,.astro,.ipynb,.log" onChange={handleFileChange} />
                </label>
                <span className="file-upload-hint">Text/code files up to 100 KB. File contents are sent to Gemini for this request.</span>
                {attachedFile && (
                  <span className="attached-file">
                    <FileCode2 size={14} /> {attachedFile.name}
                    <button type="button" onClick={() => setAttachedFile(null)} aria-label="Remove attached file"><X size={14} /></button>
                  </span>
                )}
              </div>
              <label className="field-label prompt-label">
                YOUR PROMPT <span>Be specific for the best results</span>
                <textarea
                  value={task}
                  onChange={event => setTask(event.target.value)}
                  placeholder={
                    mode === 'Explain code'
                      ? 'Paste your code here, ask a question, or attach a code file above…'
                      : mode === 'Debug code'
                        ? 'Paste the code, error message, and expected behavior, or attach a code file above…'
                        : mode === 'README writer'
                          ? 'Describe your project, its features, setup steps, and intended audience…'
                          : mode === 'Release notes'
                            ? 'Describe the changes, fixes, and improvements in this release…'
                            : 'Describe what you want to build, including inputs, outputs, and constraints…'
                  }
                  rows={6}
                />
              </label>
              <div className="prompt-footer">
                <span>
                  <span className="keyboard-key">↵</span> Tip: include context
                  and expected behavior
                </span>
                <button
                  className="generate-button"
                  onClick={generate}
                  disabled={loading}
                >
                  {loading ? (
                    <>
                      <LoaderCircle className="spin" size={17} /> Working…
                    </>
                  ) : (
                    <>
                      <Sparkles size={17} /> Generate response{' '}
                      <ArrowUpRight size={16} />
                    </>
                  )}
                </button>
              </div>
              {errorMessage && (
                <div className="error-box">
                  <X size={17} />
                  <span>{errorMessage}</span>
                  <button
                    onClick={() => setErrorMessage('')}
                    aria-label="Dismiss error"
                  >
                    <X size={15} />
                  </button>
                </div>
              )}
              {result && (
                <div className="result-panel">
                  <div className="result-header">
                    <div>
                      <span className="result-indicator">
                        <Check size={13} />
                      </span>
                      <strong>Generated result</strong>
                      <small>
                        {language} · {mode}
                      </small>
                    </div>
                    <button className="copy-button" onClick={copyResult}>
                      {copied ? <Check size={15} /> : <Copy size={15} />}
                      {copied ? 'Copied' : 'Copy output'}
                    </button>
                  </div>
                  <pre className="result-content">{result}</pre>
                  <div className="result-foot">
                    <Sparkles size={14} /> Review and test generated code before
                    using it in production.
                  </div>
                </div>
              )}
            </section>
            <div className="bottom-note">
              <span>
                <BookOpen size={16} />
              </span>
              <p>
                <strong>Good code starts with a clear question.</strong>
                <br />
                Share the context, constraints, and what success looks like.
              </p>
              <button
                onClick={() => {
                  setMode('Generate code');
                  setTask('');
                  setResult('');
                }}
              >
                Start fresh <ArrowUpRight size={15} />
              </button>
            </div>
          </div>
        ) : (
          <div className="content projects-content">
            <div className="projects-heading">
              <div>
                <div className="eyebrow">
                  <FolderGit2 size={14} /> YOUR WORK, ORGANIZED
                </div>
                <h1>
                  My <span>Projects.</span>
                </h1>
                <p>
                  Keep your ideas, stacks, and next steps in one place. Projects
                  are saved in this browser.
                </p>
              </div>
              <button
                className="generate-button"
                onClick={() => setShowProjectForm(value => !value)}
              >
                <Plus size={17} /> New project
              </button>
            </div>
            {showProjectForm && (
              <form className="project-form" onSubmit={addProject}>
                <div className="form-grid">
                  <label className="field-label">
                    PROJECT NAME
                    <input
                      value={projectName}
                      onChange={event => setProjectName(event.target.value)}
                      placeholder="e.g. Portfolio website"
                      required
                    />
                  </label>
                  <label className="field-label">
                    LANGUAGE / STACK
                    <select
                      value={projectLanguage}
                      onChange={event => setProjectLanguage(event.target.value)}
                    >
                      {languages.map(item => (
                        <option key={item}>{item}</option>
                      ))}
                    </select>
                  </label>
                </div>
                <label className="field-label">
                  NOTES
                  <textarea
                    value={projectNotes}
                    onChange={event => setProjectNotes(event.target.value)}
                    placeholder="What are you building next?"
                    rows={3}
                  />
                </label>
                <div className="form-actions">
                  <button
                    type="button"
                    className="secondary-button"
                    onClick={() => setShowProjectForm(false)}
                  >
                    Cancel
                  </button>
                  <button className="generate-button" type="submit">
                    <Plus size={16} /> Save project
                  </button>
                </div>
              </form>
            )}
            <div className="project-summary">
              <div>
                <span>Total projects</span>
                <strong>{projects.length}</strong>
              </div>
              <div>
                <span>In progress</span>
                <strong>
                  {
                    projects.filter(project => project.status === 'In progress')
                      .length
                  }
                </strong>
              </div>
              <div>
                <span>Planned</span>
                <strong>
                  {
                    projects.filter(project => project.status === 'Planned')
                      .length
                  }
                </strong>
              </div>
            </div>
            {projects.length ? (
              <div className="project-grid">
                {projects.map(project => (
                  <article className="project-card" key={project.id}>
                    <div className="project-card-top">
                      <span className="project-symbol">
                        <Code2 size={20} />
                      </span>
                      <button
                        className="icon-button"
                        onClick={() =>
                          setProjects(current =>
                            current.filter(item => item.id !== project.id)
                          )
                        }
                        aria-label={'Delete ' + project.name}
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                    <h3>{project.name}</h3>
                    <p>
                      {project.notes ||
                        'No notes added yet. Add details to remember your next steps.'}
                    </p>
                    <div className="project-card-bottom">
                      <span className="language-tag">{project.language}</span>
                      <label className="status-select">
                        <select
                          aria-label={'Status for ' + project.name}
                          value={project.status}
                          onChange={event =>
                            setProjects(current =>
                              current.map(item =>
                                item.id === project.id
                                  ? { ...item, status: event.target.value }
                                  : item
                              )
                            )
                          }
                        >
                          <option>Planned</option>
                          <option>In progress</option>
                          <option>Done</option>
                        </select>
                      </label>
                    </div>
                  </article>
                ))}
              </div>
            ) : (
              <div className="empty-projects">
                <FolderGit2 size={30} />
                <h3>No projects yet</h3>
                <p>Add a project to start organizing your work.</p>
                <button
                  className="generate-button"
                  onClick={() => setShowProjectForm(true)}
                >
                  <Plus size={16} /> Create a project
                </button>
              </div>
            )}
          </div>
        )}
        <footer className="footer">
          <span>
            DEVHUB <b>•</b> BUILT FOR BUILDERS
          </span>
          <span>
            Keep learning. Keep shipping. <Code2 size={14} />
          </span>
        </footer>
      </main>
    </div>
  );
}

export default App;
