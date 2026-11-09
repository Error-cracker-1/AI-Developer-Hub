import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Activity,
  ArrowUpRight,
  BookOpen,
  Check,
  ChevronDown,
  Code2,
  Copy,
  FileCode2,
  FlaskConical,
  FolderGit2,
  ShieldCheck,
  Github,
  LoaderCircle,
  Clock3,
  Search,
  Download,
  Plus,
  Paperclip,
  Play,
  RotateCcw,
  Terminal,
  Sparkles,
  Trash2,
  WandSparkles,
  X,
} from 'lucide-react';
import { Analytics, track } from '@vercel/analytics/react';
import { useFeatureFlags } from './lib/featureFlags';

type Mode =
  | 'Generate code'
  | 'Explain code'
  | 'Debug code'
  | 'AI Code Review'
  | 'Generate tests'
  | 'Code Playground'
  | 'README writer'
  | 'Release notes';
type Session = {
  id: string;
  mode: Mode;
  language: string;
  task: string;
  result: string;
  fileName?: string;
  createdAt: string;
};
type ProjectTask = { id: string; title: string; done: boolean };
type Project = {
  id: string;
  name: string;
  language: string;
  status: string;
  notes: string;
  progress?: number;
  priority?: 'Low' | 'Medium' | 'High';
  dueDate?: string;
  tags?: string[];
  tasks?: ProjectTask[];
  updatedAt?: string;
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
    name: 'Generate tests',
    description: 'Create framework-aware tests and edge cases',
    icon: FlaskConical,
  },
  {
    name: 'Code Playground',
    description: 'Edit and run JavaScript or preview HTML safely',
    icon: Terminal,
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

function readSessions(): Session[] {
  try {
    const saved = localStorage.getItem('devhub-history-v1');
    return saved ? (JSON.parse(saved) as Session[]).slice(0, 100) : [];
  } catch {
    return [];
  }
}

function readProjects(): Project[] {
  try {
    const saved = localStorage.getItem('devhub-projects-v1');
    return saved ? (JSON.parse(saved) as Project[]).map(project => ({
      ...project,
      progress: typeof project.progress === 'number' ? project.progress : (project.status === 'Done' ? 100 : 0),
      priority: project.priority || 'Medium',
      dueDate: project.dueDate || '',
      tags: Array.isArray(project.tags) ? project.tags : [],
      tasks: Array.isArray(project.tasks) ? project.tasks : [],
      updatedAt: project.updatedAt || new Date().toISOString(),
    })) : starterProjects.map(project => ({ ...project, progress: 0, priority: 'Medium' as const, dueDate: '', tags: [], tasks: [], updatedAt: new Date().toISOString() }));
  } catch {
    return starterProjects;
  }
}

function App() {
  const featureFlags = useFeatureFlags();
  const [mode, setMode] = useState<Mode>('Explain code');
  const [language, setLanguage] = useState('Python');
  const [task, setTask] = useState('');
  const [attachedFile, setAttachedFile] = useState<{ name: string; text: string } | null>(null);
  const [result, setResult] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [tab, setTab] = useState<'Workspace' | 'Projects' | 'History'>('Workspace');
  useEffect(() => {
    if (!featureFlags.session_history && tab === 'History') setTab('Workspace');
    if (!featureFlags.projects_tab && tab === 'Projects') setTab('Workspace');
  }, [featureFlags.session_history, featureFlags.projects_tab, tab]);
  const [sessions, setSessions] = useState<Session[]>(readSessions);
  const [historyQuery, setHistoryQuery] = useState('');
  const [projects, setProjects] = useState<Project[]>(readProjects);
  const [showProjectForm, setShowProjectForm] = useState(false);
  const [projectName, setProjectName] = useState('');
  const [projectLanguage, setProjectLanguage] = useState('Python');
  const [projectNotes, setProjectNotes] = useState('');
  const [projectSearch, setProjectSearch] = useState('');
  const [projectStatusFilter, setProjectStatusFilter] = useState('All');
  const [projectLanguageFilter, setProjectLanguageFilter] = useState('All');
  const [projectSort, setProjectSort] = useState('updated');
  const [projectPriority, setProjectPriority] = useState<'Low' | 'Medium' | 'High'>('Medium');
  const [projectDueDate, setProjectDueDate] = useState('');
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [projectAiAction, setProjectAiAction] = useState<'roadmap' | 'tasks' | 'health'>('roadmap');
  const [projectAiResult, setProjectAiResult] = useState('');
  const [projectAiError, setProjectAiError] = useState('');
  const [projectAiLoading, setProjectAiLoading] = useState(false);
  const [playgroundLanguage, setPlaygroundLanguage] = useState<'JavaScript' | 'HTML/CSS'>('JavaScript');
  const [playgroundCode, setPlaygroundCode] = useState("console.log('Hello, DevHub!');\n\nconst numbers = [1, 2, 3];\nconsole.log('Total:', numbers.reduce((sum, number) => sum + number, 0));");
  const [playgroundOutput, setPlaygroundOutput] = useState('Run your code to see console output here.');
  const [playgroundDocument, setPlaygroundDocument] = useState('');
  const playgroundFrameRef = useRef<HTMLIFrameElement>(null);

  useEffect(() => {
    localStorage.setItem('devhub-projects-v1', JSON.stringify(projects));
  }, [projects]);

  useEffect(() => {
    try {
      localStorage.setItem('devhub-history-v1', JSON.stringify(sessions.slice(0, 100)));
    } catch {
      setErrorMessage('Browser storage is full. Export or delete old history items to free space.');
    }
  }, [sessions]);

  useEffect(() => {
    function handlePlaygroundMessage(event: MessageEvent) {
      if (event.source !== playgroundFrameRef.current?.contentWindow) return;
      const data = event.data as { __devhubPlayground?: boolean; text?: string } | null;
      if (data?.__devhubPlayground && typeof data.text === 'string') {
        setPlaygroundOutput(current => current === 'Running…' ? data.text! : `${current}\n${data.text}`);
      }
    }
    window.addEventListener('message', handlePlaygroundMessage);
    return () => window.removeEventListener('message', handlePlaygroundMessage);
  }, []);

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

  function runPlayground() {
    setPlaygroundOutput(playgroundLanguage === 'JavaScript' ? 'Running…' : 'HTML/CSS preview updated below.');
    if (playgroundLanguage === 'HTML/CSS') {
      setPlaygroundDocument(playgroundCode);
      return;
    }
    const safeCode = JSON.stringify(playgroundCode).replace(/</g, '\\u003c');
    setPlaygroundDocument(`<!doctype html><html><head><meta charset="utf-8"></head><body><script>(() => { const send = (...args) => parent.postMessage({__devhubPlayground:true,text:args.map(value => { try { return typeof value === 'string' ? value : JSON.stringify(value); } catch { return String(value); } }).join(' ')}, '*'); console.log = (...args) => send(...args); console.info = (...args) => send(...args); console.warn = (...args) => send('Warning:', ...args); console.error = (...args) => send('Error:', ...args); window.onerror = (message, source, line) => send('Error:', String(message) + (line ? ' (line ' + line + ')' : '')); const code = ${safeCode}; try { new Function(code)(); } catch (error) { send('Error:', error instanceof Error ? error.message : String(error)); } })();</script></body></html>`);
  }

  function sendPlaygroundTo(modeTarget: 'Debug code' | 'AI Code Review') {
    setMode(modeTarget);
    setLanguage(playgroundLanguage === 'JavaScript' ? 'JavaScript' : 'HTML');
    setTask(playgroundCode);
    setAttachedFile(null);
    setResult('');
    setErrorMessage('');
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
      track('AI generation completed', { mode, language, fileAttached: Boolean(attachedFile) });
      setResult(text);
      setSessions(current => [{
        id: crypto.randomUUID(),
        mode,
        language,
        task: task.trim() || (attachedFile ? `Review attached file: ${attachedFile.name}` : ''),
        result: text,
        fileName: attachedFile?.name,
        createdAt: new Date().toISOString(),
      }, ...current].slice(0, 100));
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : 'Something went wrong. Please try again.';
      track('AI generation failed', { mode, language, reason: message.includes('429') ? 'rate_limited' : 'request_error' });
      setErrorMessage(
        message.includes('429')
          ? 'The AI service is busy or rate-limited. Wait a moment, then retry.'
          : message
      );
    } finally {
      setLoading(false);
    }
  }

  function downloadResult() {
    if (!result) return;
    const blob = new Blob([result], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `devhub-${mode.toLowerCase().replace(/[^a-z0-9]+/g, '-')}-result.txt`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  }

  async function copyResult() {
    if (!result) return;
    try {
      if (navigator.clipboard?.writeText && window.isSecureContext) {
        await navigator.clipboard.writeText(result);
      } else {
        throw new Error('Clipboard API unavailable');
      }
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      // Fallback for mobile browsers where clipboard permission is unavailable.
      const field = document.createElement('textarea');
      field.value = result;
      field.setAttribute('readonly', '');
      field.style.position = 'fixed';
      field.style.opacity = '0';
      field.style.fontSize = '16px';
      document.body.appendChild(field);
      field.select();
      field.setSelectionRange(0, field.value.length);
      const success = document.execCommand('copy');
      document.body.removeChild(field);
      if (success) {
        setCopied(true);
        window.setTimeout(() => setCopied(false), 1800);
      } else {
        setErrorMessage('Copy was blocked by your browser. Long-press the result text and choose Copy.');
      }
    }
  }

  function addProject(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!projectName.trim()) return;
    setProjects(current => [{
      id: crypto.randomUUID(),
      name: projectName.trim(),
      language: projectLanguage,
      status: 'Planned',
      notes: projectNotes.trim(),
      progress: 0,
      priority: projectPriority,
      dueDate: projectDueDate,
      tags: [],
      tasks: [],
      updatedAt: new Date().toISOString(),
    }, ...current]);
    setProjectName('');
    setProjectNotes('');
    setProjectPriority('Medium');
    setProjectDueDate('');
    setShowProjectForm(false);
  }

  const selectedProject = projects.find(project => project.id === selectedProjectId) || null;
  const filteredProjects = projects.filter(project => {
    const query = projectSearch.trim().toLowerCase();
    const matchesQuery = !query || [project.name, project.language, project.notes, ...(project.tags || [])].some(value => value.toLowerCase().includes(query));
    return matchesQuery && (projectStatusFilter === 'All' || project.status === projectStatusFilter) && (projectLanguageFilter === 'All' || project.language === projectLanguageFilter);
  }).sort((a, b) => projectSort === 'name' ? a.name.localeCompare(b.name) : projectSort === 'due' ? (a.dueDate || '9999').localeCompare(b.dueDate || '9999') : new Date(b.updatedAt || 0).getTime() - new Date(a.updatedAt || 0).getTime());

  function updateProject(projectId: string, patch: Partial<Project>) {
    setProjects(current => current.map(project => project.id === projectId ? { ...project, ...patch, updatedAt: new Date().toISOString() } : project));
  }

  function addProjectTask(projectId: string) {
    if (!newTaskTitle.trim()) return;
    const project = projects.find(item => item.id === projectId);
    if (!project) return;
    updateProject(projectId, { tasks: [...(project.tasks || []), { id: crypto.randomUUID(), title: newTaskTitle.trim(), done: false }] });
    setNewTaskTitle('');
  }

  function toggleProjectTask(projectId: string, taskId: string) {
    const project = projects.find(item => item.id === projectId);
    if (!project) return;
    const tasks = (project.tasks || []).map(task => task.id === taskId ? { ...task, done: !task.done } : task);
    const progress = tasks.length ? Math.round(tasks.filter(task => task.done).length / tasks.length * 100) : project.progress || 0;
    updateProject(projectId, { tasks, progress, status: progress === 100 && tasks.length ? 'Done' : project.status === 'Done' ? 'In progress' : project.status });
  }

  async function runProjectAssistant(action: 'roadmap' | 'tasks' | 'health') {
    if (!selectedProject || projectAiLoading) return;
    setProjectAiAction(action);
    setProjectAiLoading(true);
    setProjectAiError('');
    setProjectAiResult('');
    try {
      const response = await fetch('/api/project-assistant', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action,
          project: {
            name: selectedProject.name,
            language: selectedProject.language,
            status: selectedProject.status,
            notes: selectedProject.notes,
            priority: selectedProject.priority,
            dueDate: selectedProject.dueDate,
            progress: selectedProject.progress,
            tasks: selectedProject.tasks,
          },
        }),
      });
      const payload = await response.json().catch(() => ({})) as { text?: string; error?: string };
      if (!response.ok) throw new Error(payload.error || 'The project assistant could not complete this request.');
      if (!payload.text?.trim()) throw new Error('The project assistant returned an empty response. Please try again.');
      setProjectAiResult(payload.text);
    } catch (error) {
      setProjectAiError(error instanceof Error ? error.message : 'The project assistant is temporarily unavailable.');
    } finally {
      setProjectAiLoading(false);
    }
  }

  return (
    <>
      <Analytics />
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
        {featureFlags.projects_tab && <button
          className={tab === 'Projects' ? 'nav-item active' : 'nav-item'}
          onClick={() => setTab('Projects')}
        >
          <FolderGit2 size={17} /> My Projects{' '}
          <span className="nav-count">{projects.length}</span>
        </button>}
        {featureFlags.session_history && <button
          className={tab === 'History' ? 'nav-item active' : 'nav-item'}
          onClick={() => setTab('History')}
        >
          <Clock3 size={17} /> Session History
          <span className="nav-count">{sessions.length}</span>
        </button>}
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
                    <strong>7</strong>
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
              {modes.filter((item) => item.name !== 'AI Code Review' || featureFlags.ai_code_review).filter((item) => item.name !== 'Code Playground' || featureFlags.code_playground).filter((item) => item.name !== 'Release notes' || featureFlags.release_notes).map((item, index) => {
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
              {mode === 'AI Code Review' && (
                <div className="review-guide" role="note">
                  <div className="review-guide-heading">
                    <ShieldCheck size={18} />
                    <div>
                      <strong>Structured code review</strong>
                      <span>Prioritized findings with actionable fixes</span>
                    </div>
                  </div>
                  <div className="review-checklist">
                    <span><b>01</b> Bugs & edge cases</span>
                    <span><b>02</b> Security risks</span>
                    <span><b>03</b> Performance & maintainability</span>
                    <span><b>04</b> Tests to run</span>
                  </div>
                  <p>Attach a source file or paste code below. Findings will be prioritized by severity; the AI does not execute your code.</p>
                </div>
              )}
              {mode === 'Code Playground' && (
                <section className="playground-panel" aria-label="Interactive code playground">
                  <div className="playground-toolbar">
                    <label className="playground-language">
                      <span>EDITOR LANGUAGE</span>
                      <select value={playgroundLanguage} onChange={event => {
                        const next = event.target.value as 'JavaScript' | 'HTML/CSS';
                        setPlaygroundLanguage(next);
                        setPlaygroundDocument('');
                        setPlaygroundOutput('Run your code to see the result here.');
                        setPlaygroundCode(next === 'JavaScript' ? "console.log('Hello, DevHub!');\n\nconst numbers = [1, 2, 3];\nconsole.log('Total:', numbers.reduce((sum, number) => sum + number, 0));" : '<!doctype html>\n<html>\n<head>\n  <style>body { font-family: system-ui; padding: 2rem; } h1 { color: seagreen; }</style>\n</head>\n<body>\n  <h1>Hello, DevHub!</h1>\n  <p>Edit this HTML and CSS, then preview it.</p>\n</body>\n</html>');
                      }}>
                        <option>JavaScript</option>
                        <option>HTML/CSS</option>
                      </select>
                    </label>
                    <div className="playground-actions">
                      <button type="button" className="secondary-button" onClick={() => { setPlaygroundCode(playgroundLanguage === 'JavaScript' ? "console.log('Hello, DevHub!');\n\nconst numbers = [1, 2, 3];\nconsole.log('Total:', numbers.reduce((sum, number) => sum + number, 0));" : '<!doctype html>\n<html>\n<head>\n  <style>body { font-family: system-ui; padding: 2rem; } h1 { color: seagreen; }</style>\n</head>\n<body>\n  <h1>Hello, DevHub!</h1>\n  <p>Edit this HTML and CSS, then preview it.</p>\n</body>\n</html>'); setPlaygroundOutput('Starter code restored. Press Run to execute it.'); setPlaygroundDocument(''); }}><RotateCcw size={14} /> Reset</button>
                      <button type="button" className="generate-button" onClick={runPlayground}><Play size={15} /> Run {playgroundLanguage === 'JavaScript' ? 'code' : 'preview'}</button>
                    </div>
                  </div>
                  <label className="playground-editor-label">SOURCE CODE <span>Runs in a sandboxed browser frame; it is not sent to the server to execute.</span></label>
                  <textarea className="playground-editor" aria-label="Playground source code" spellCheck={false} autoCapitalize="off" autoCorrect="off" value={playgroundCode} onChange={event => setPlaygroundCode(event.target.value)} />
                  <div className="playground-output-wrap">
                    <div className="playground-output-heading"><Terminal size={15} /> {playgroundLanguage === 'JavaScript' ? 'CONSOLE OUTPUT' : 'LIVE PREVIEW'}</div>
                    {playgroundLanguage === 'JavaScript' ? <><pre className="playground-output" aria-live="polite">{playgroundOutput}</pre><iframe className="playground-runner-frame" title="Isolated JavaScript runner" sandbox="allow-scripts" ref={playgroundFrameRef} srcDoc={playgroundDocument} /></> : <iframe className="playground-preview" title="Sandboxed HTML/CSS preview" sandbox="allow-scripts" ref={playgroundFrameRef} srcDoc={playgroundDocument || '<!doctype html><html><body style="font-family:system-ui;padding:1rem;color:#64748b">Press “Run preview” to render your HTML/CSS.</body></html>'} />}
                  </div>
                  <div className="playground-footer-note">Only JavaScript and HTML/CSS run in this browser playground. Python, C/C++, and other languages are not executed here. Avoid entering secrets or sensitive data into code that you do not trust.</div>
                  <div className="playground-ai-actions"><button type="button" className="secondary-button" onClick={() => sendPlaygroundTo('Debug code')}>Ask AI to debug</button><button type="button" className="secondary-button" onClick={() => sendPlaygroundTo('AI Code Review')}>Review this code</button></div>
                </section>
              )}
              {mode !== 'Code Playground' && (
              <>
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
                {featureFlags.file_uploads && <label className="attach-file-button">
                  <Paperclip size={16} /> {attachedFile ? "Replace file" : "Attach code file"}
                  <input type="file" accept=".txt,.md,.json,.yaml,.yml,.xml,.html,.htm,.css,.scss,.less,.js,.jsx,.mjs,.cjs,.ts,.tsx,.py,.java,.kt,.kts,.c,.h,.cc,.cpp,.hpp,.cs,.go,.rs,.php,.rb,.swift,.sql,.sh,.bash,.ps1,.psm1,.toml,.ini,.vue,.svelte,.astro,.ipynb,.log" onChange={handleFileChange} />
                </label>}
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
                    mode === 'Generate tests'
                      ? 'Paste code or attach a file. Mention your test framework (Jest, Vitest, Pytest, JUnit, etc.) or let DevHub recommend one. Include important expected behavior…'
                      : mode === 'AI Code Review'
                      ? 'Paste code or attach a file. Tell us what to prioritize: correctness, security, performance, edge cases, or maintainability…'
                      : mode === 'Explain code'
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
                      <ShieldCheck size={17} /> {mode === 'AI Code Review' ? 'Review code' : 'Generate response'}{' '}
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
                    <div className="result-actions">
                      <button className="copy-button" onClick={copyResult}>
                        {copied ? <Check size={15} /> : <Copy size={15} />}
                        {copied ? 'Copied' : 'Copy output'}
                      </button>
                      <button className="copy-button" onClick={downloadResult}>
                        <FileCode2 size={15} /> Download .txt
                      </button>
                    </div>
                  </div>
                  <pre className="result-content">{result}</pre>
                  <div className="result-foot">
                    <Sparkles size={14} /> Review and test generated code before
                    using it in production.
                  </div>
                </div>
              )}
              </>
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
        ) : tab === 'Projects' ? (
          <div className="content projects-content">
            {selectedProject ? (
              <section className="project-detail">
                <button className="secondary-button" onClick={() => setSelectedProjectId(null)}>← All projects</button>
                <div className="projects-heading">
                  <div><div className="eyebrow"><FolderGit2 size={14} /> PROJECT WORKSPACE</div><h1>{selectedProject.name}</h1><p>{selectedProject.language} · Updated {new Date(selectedProject.updatedAt || Date.now()).toLocaleDateString()}</p></div>
                  <span className="priority-pill">{selectedProject.priority || 'Medium'} priority</span>
                </div>
                <div className="project-detail-grid">
                  <div className="project-detail-main">
                    <label className="field-label">PROJECT NOTES<textarea value={selectedProject.notes} onChange={event => updateProject(selectedProject.id, { notes: event.target.value })} rows={5} placeholder="Project goals, decisions, and next steps…" /></label>
                    <div className="project-detail-panel project-ai-panel">
                      <div className="project-panel-heading"><h2><Sparkles size={17}/> AI Project Assistant</h2><span>Gemini-powered</span></div>
                      <p className="project-muted">Get actionable guidance based on this project's stack, goals, progress, and tasks.</p>
                      <div className="project-ai-actions">
                        <button className={projectAiAction === 'roadmap' ? 'project-ai-action active' : 'project-ai-action'} disabled={projectAiLoading} onClick={() => void runProjectAssistant('roadmap')}><WandSparkles size={15}/> Build roadmap</button>
                        <button className={projectAiAction === 'tasks' ? 'project-ai-action active' : 'project-ai-action'} disabled={projectAiLoading} onClick={() => void runProjectAssistant('tasks')}><Check size={15}/> Suggest tasks</button>
                        <button className={projectAiAction === 'health' ? 'project-ai-action active' : 'project-ai-action'} disabled={projectAiLoading} onClick={() => void runProjectAssistant('health')}><Activity size={15}/> Project health</button>
                      </div>
                      {projectAiLoading && <div className="project-ai-loading"><LoaderCircle size={17}/> Analyzing project…</div>}
                      {projectAiError && <p className="project-ai-error" role="alert">{projectAiError}</p>}
                      {projectAiResult && <div className="project-ai-result"><div className="project-ai-result-head"><strong>{projectAiAction === 'roadmap' ? 'Suggested roadmap' : projectAiAction === 'tasks' ? 'Suggested tasks' : 'Project health report'}</strong><button className="copy-button" onClick={() => { void navigator.clipboard?.writeText(projectAiResult); }}>Copy</button></div><pre>{projectAiResult}</pre></div>}
                    </div>
                    <div className="project-detail-panel">
                      <div className="project-panel-heading"><h2>Tasks & milestones</h2><span>{(selectedProject.tasks || []).filter(task => task.done).length}/{(selectedProject.tasks || []).length} complete</span></div>
                      <form className="project-task-add" onSubmit={event => { event.preventDefault(); addProjectTask(selectedProject.id); }}><input value={newTaskTitle} onChange={event => setNewTaskTitle(event.target.value)} placeholder="Add a task or milestone…" aria-label="New project task" /><button className="generate-button" type="submit"><Plus size={15}/> Add</button></form>
                      {(selectedProject.tasks || []).length ? <div className="project-task-list">{(selectedProject.tasks || []).map(task => <label key={task.id}><input type="checkbox" checked={task.done} onChange={() => toggleProjectTask(selectedProject.id, task.id)} /><span className={task.done ? 'task-done' : ''}>{task.title}</span></label>)}</div> : <p className="project-muted">Add tasks to track project progress. Progress updates automatically as tasks are completed.</p>}
                    </div>
                  </div>
                  <aside className="project-detail-side">
                    <div className="project-detail-panel"><h2>Project overview</h2>
                      <label className="field-label">STATUS<select value={selectedProject.status} onChange={event => updateProject(selectedProject.id, { status: event.target.value, progress: event.target.value === 'Done' ? 100 : selectedProject.progress })}><option>Planned</option><option>In progress</option><option>On hold</option><option>Done</option></select></label>
                      <label className="field-label">PRIORITY<select value={selectedProject.priority || 'Medium'} onChange={event => updateProject(selectedProject.id, { priority: event.target.value as Project['priority'] })}><option>Low</option><option>Medium</option><option>High</option></select></label>
                      <label className="field-label">DUE DATE<input type="date" value={selectedProject.dueDate || ''} onChange={event => updateProject(selectedProject.id, { dueDate: event.target.value })}/></label>
                      <label className="field-label">PROGRESS · {selectedProject.progress || 0}%<input type="range" min="0" max="100" step="5" value={selectedProject.progress || 0} onChange={event => updateProject(selectedProject.id, { progress: Number(event.target.value), status: Number(event.target.value) === 100 ? 'Done' : selectedProject.status === 'Done' ? 'In progress' : selectedProject.status })}/></label>
                      <div className="project-progress-track"><span style={{width: (selectedProject.progress || 0) + '%'}}/></div>
                    </div>
                  </aside>
                </div>
              </section>
            ) : <>
              <div className="projects-heading"><div><div className="eyebrow"><FolderGit2 size={14}/> YOUR WORK, ORGANIZED</div><h1>My <span>Projects.</span></h1><p>Plan, organize, and track your development work. Project data is saved locally in this browser.</p></div><button className="generate-button" onClick={() => setShowProjectForm(value => !value)}><Plus size={17}/> New project</button></div>
              {showProjectForm && <form className="project-form" onSubmit={addProject}>
                <div className="form-grid"><label className="field-label">PROJECT NAME<input value={projectName} onChange={event => setProjectName(event.target.value)} placeholder="e.g. Portfolio website" required/></label><label className="field-label">LANGUAGE / STACK<select value={projectLanguage} onChange={event => setProjectLanguage(event.target.value)}>{languages.map(item => <option key={item}>{item}</option>)}</select></label></div>
                <div className="form-grid"><label className="field-label">PRIORITY<select value={projectPriority} onChange={event => setProjectPriority(event.target.value as 'Low' | 'Medium' | 'High')}><option>Low</option><option>Medium</option><option>High</option></select></label><label className="field-label">DUE DATE<input type="date" value={projectDueDate} onChange={event => setProjectDueDate(event.target.value)}/></label></div>
                <label className="field-label">NOTES<textarea value={projectNotes} onChange={event => setProjectNotes(event.target.value)} placeholder="What are you building next?" rows={3}/></label>
                <div className="form-actions"><button type="button" className="secondary-button" onClick={() => setShowProjectForm(false)}>Cancel</button><button className="generate-button" type="submit"><Plus size={16}/> Save project</button></div>
              </form>}
              <div className="project-summary"><div><span>Total projects</span><strong>{projects.length}</strong></div><div><span>In progress</span><strong>{projects.filter(project => project.status === 'In progress').length}</strong></div><div><span>Completed</span><strong>{projects.filter(project => project.status === 'Done').length}</strong></div></div>
              <div className="project-toolbar"><label className="history-search"><Search size={17}/><input value={projectSearch} onChange={event => setProjectSearch(event.target.value)} placeholder="Search projects, stacks, notes…"/></label><select aria-label="Filter by status" value={projectStatusFilter} onChange={event => setProjectStatusFilter(event.target.value)}><option>All</option><option>Planned</option><option>In progress</option><option>On hold</option><option>Done</option></select><select aria-label="Filter by language" value={projectLanguageFilter} onChange={event => setProjectLanguageFilter(event.target.value)}><option>All</option>{Array.from(new Set(projects.map(project => project.language))).map(language => <option key={language}>{language}</option>)}</select><select aria-label="Sort projects" value={projectSort} onChange={event => setProjectSort(event.target.value)}><option value="updated">Recently updated</option><option value="name">Name A–Z</option><option value="due">Due date</option></select></div>
              {filteredProjects.length ? <div className="project-grid">{filteredProjects.map(project => <article className="project-card" key={project.id}><div className="project-card-top"><span className="project-symbol"><Code2 size={20}/></span><button className="icon-button" onClick={() => { if(window.confirm('Delete '+project.name+'? This cannot be undone.')) setProjects(current => current.filter(item => item.id !== project.id)); }} aria-label={'Delete '+project.name}><Trash2 size={16}/></button></div><h3>{project.name}</h3><p>{project.notes || 'No notes added yet. Open the project to add details and tasks.'}</p><div className="project-card-meta"><span className="language-tag">{project.language}</span><span className="priority-pill">{project.priority || 'Medium'}</span>{project.dueDate && <span className="project-due">Due {new Date(project.dueDate+'T00:00:00').toLocaleDateString()}</span>}</div><div className="project-progress-track"><span style={{width:(project.progress || 0)+'%'}}/></div><div className="project-card-bottom"><span className="project-progress-label">{project.progress || 0}% complete · {(project.tasks || []).filter(task => task.done).length}/{(project.tasks || []).length} tasks</span><button className="copy-button" onClick={() => setSelectedProjectId(project.id)}>Open project <ArrowUpRight size={14}/></button></div><div className="project-card-status"><select aria-label={'Status for '+project.name} value={project.status} onChange={event => updateProject(project.id, {status:event.target.value, progress:event.target.value === 'Done' ? 100 : project.progress})}><option>Planned</option><option>In progress</option><option>On hold</option><option>Done</option></select></div></article>)}</div> : <div className="empty-projects"><FolderGit2 size={30}/><h3>{projects.length ? 'No matching projects' : 'No projects yet'}</h3><p>{projects.length ? 'Try changing your search or filters.' : 'Add a project to start organizing your work.'}</p>{!projects.length && <button className="generate-button" onClick={() => setShowProjectForm(true)}><Plus size={16}/> Create a project</button>}</div>}
            </>}
          </div>
        ) : tab === 'History' && featureFlags.session_history ? (
          <div className="content projects-content history-content">
            <div className="projects-heading">
              <div>
                <div className="eyebrow"><Clock3 size={14} /> YOUR RECENT WORK</div>
                <h1>Session <span>History.</span></h1>
                <p>Search previous AI results, restore a task to the workspace, or export your history. Saved locally in this browser only.</p>
              </div>
              <button className="generate-button" onClick={() => {
                const blob = new Blob([JSON.stringify(sessions, null, 2)], { type: 'application/json' });
                const url = URL.createObjectURL(blob);
                const link = document.createElement('a');
                link.href = url;
                link.download = 'devhub-session-history.json';
                link.click();
                URL.revokeObjectURL(url);
              }} disabled={!sessions.length}><Download size={16} /> Export history</button>
            </div>
            <label className="history-search">
              <Search size={17} />
              <input value={historyQuery} onChange={event => setHistoryQuery(event.target.value)} placeholder="Search tasks, results, modes, or languages…" />
            </label>
            <div className="history-toolbar">
              <span>{sessions.length} saved session{sessions.length === 1 ? '' : 's'} · newest first · max 100</span>
              <button className="secondary-button" disabled={!sessions.length} onClick={() => {
                if (window.confirm('Delete all saved session history from this browser? This cannot be undone.')) setSessions([]);
              }}>Clear history</button>
            </div>
            {sessions.filter(item => [item.task, item.result, item.mode, item.language, item.fileName || ''].some(value => value.toLowerCase().includes(historyQuery.toLowerCase()))).length ? (
              <div className="history-list">
                {sessions.filter(item => [item.task, item.result, item.mode, item.language, item.fileName || ''].some(value => value.toLowerCase().includes(historyQuery.toLowerCase()))).map(item => (
                  <article className="history-card" key={item.id}>
                    <div className="history-card-head">
                      <div><span className="language-tag">{item.mode}</span> <span className="language-tag">{item.language}</span></div>
                      <time dateTime={item.createdAt}>{new Date(item.createdAt).toLocaleString()}</time>
                    </div>
                    <h3>{item.task || 'Untitled request'}</h3>
                    {item.fileName && <p className="history-file">Attached file: {item.fileName} (file contents are not stored in history)</p>}
                    <pre>{item.result.length > 700 ? item.result.slice(0, 700) + '…' : item.result}</pre>
                    <div className="history-card-actions">
                      <button className="copy-button" onClick={() => {
                        setMode(item.mode);
                        setLanguage(item.language);
                        setTask(item.task);
                        setAttachedFile(null);
                        setResult('');
                        setErrorMessage('');
                        setTab('Workspace');
                      }}><RotateCcw size={15} /> Restore task</button>
                      <button className="copy-button" onClick={() => {
                        const blob = new Blob([item.result], { type: 'text/plain;charset=utf-8' });
                        const url = URL.createObjectURL(blob);
                        const link = document.createElement('a');
                        link.href = url;
                        link.download = `devhub-${item.mode.toLowerCase().replace(/[^a-z0-9]+/g, '-')}-history.txt`;
                        link.click();
                        URL.revokeObjectURL(url);
                      }}><Download size={15} /> Download result</button>
                      <button className="icon-button" aria-label="Delete session" onClick={() => setSessions(current => current.filter(session => session.id !== item.id))}><Trash2 size={15} /></button>
                    </div>
                  </article>
                ))}
              </div>
            ) : (
              <div className="empty-projects">
                <Clock3 size={30} />
                <h3>{sessions.length ? 'No matching sessions' : 'No saved sessions yet'}</h3>
                <p>{sessions.length ? 'Try a different search term.' : 'Generate an AI response in the workspace and it will appear here automatically.'}</p>
                {sessions.length > 0 && <button className="secondary-button" onClick={() => setHistoryQuery('')}>Clear search</button>}
              </div>
            )}
          </div>
        ) : null}
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
    </>
  );
}

export default App;
