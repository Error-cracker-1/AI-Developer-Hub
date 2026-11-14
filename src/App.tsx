import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Activity,
  Bot,
  MessageCircle,
  Send,
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
  | 'Security audit'
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
type ChatMessage = { id: string; role: 'user' | 'assistant'; content: string; createdAt: string };
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
  githubUrl?: string;
  liveUrl?: string;
  folder?: string;
  archived?: boolean;
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
    name: 'Security audit',
    description: 'Audit source code for exploitable security weaknesses',
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

const projectTemplates: Record<string, { label: string; language: string; notes: string; tags: string[]; folder: string; tasks: string[] }> = {
  blank: { label: 'Blank project', language: 'Python', notes: '', tags: [], folder: 'General', tasks: [] },
  web: { label: 'Web application', language: 'TypeScript', notes: 'Build a responsive web experience with clear navigation, accessible UI, and reliable deployment.', tags: ['Web', 'Frontend'], folder: 'Web apps', tasks: ['Define scope and target users', 'Create page structure and navigation', 'Build responsive components', 'Add validation and error states', 'Test mobile and desktop layouts', 'Deploy and verify production'] },
  ai: { label: 'AI application', language: 'Python', notes: 'Build an AI-powered feature with safe API handling, useful evaluation, and clear user feedback.', tags: ['AI', 'API'], folder: 'AI projects', tasks: ['Define the AI use case and success criteria', 'Design prompts and expected output', 'Implement server-side API integration', 'Add input validation and error handling', 'Test quality, latency, and edge cases', 'Document setup and deployment'] },
  api: { label: 'Backend / API', language: 'TypeScript', notes: 'Develop a maintainable API with validated inputs, predictable responses, and operational visibility.', tags: ['Backend', 'API'], folder: 'Backend', tasks: ['Define endpoints and data contracts', 'Implement request validation', 'Add authentication and authorization if needed', 'Handle errors and rate limits', 'Add automated tests', 'Document and deploy the API'] },
  game: { label: 'Game project', language: 'JavaScript', notes: 'Create a playable game loop with clear controls, responsive presentation, and performance checks.', tags: ['Game', 'Interactive'], folder: 'Games', tasks: ['Write the core gameplay loop', 'Implement player input and controls', 'Build game state and scoring', 'Add feedback, sound, and visual polish', 'Test gameplay and performance', 'Publish a playable build'] },
};

function readChatMessages(): ChatMessage[] {
  try {
    const saved = localStorage.getItem('devhub-chat-v1');
    if (!saved) return [];
    const parsed = JSON.parse(saved);
    return Array.isArray(parsed) ? parsed.filter((item): item is ChatMessage => item && (item.role === 'user' || item.role === 'assistant') && typeof item.content === 'string').slice(-60) : [];
  } catch { return []; }
}

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
      folder: project.folder || 'General',
      archived: Boolean(project.archived),
    })) : starterProjects.map(project => ({ ...project, progress: 0, priority: 'Medium' as const, dueDate: '', tags: [], tasks: [], updatedAt: new Date().toISOString() }));
  } catch {
    return starterProjects;
  }
}

function App() {
  const featureFlags = useFeatureFlags();
  const APP_VERSION = __APP_VERSION__;
  const APP_COMMIT = __APP_COMMIT__;
  const [mode, setMode] = useState<Mode>('Explain code');
  const [language, setLanguage] = useState('Python');
  const [task, setTask] = useState('');
  const [attachedFile, setAttachedFile] = useState<{ name: string; text: string } | null>(null);
  const [result, setResult] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [tab, setTab] = useState<'Workspace' | 'Chat' | 'Projects' | 'History'>('Workspace');
  useEffect(() => {
    if (!featureFlags.session_history && tab === 'History') setTab('Workspace');
    if (!featureFlags.projects_tab && tab === 'Projects') setTab('Workspace');
    if (!featureFlags.aihub_ai_chat && tab === 'Chat') setTab('Workspace');
  }, [featureFlags.session_history, featureFlags.projects_tab, featureFlags.aihub_ai_chat, tab]);
  const [sessions, setSessions] = useState<Session[]>(readSessions);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>(readChatMessages);
  const [chatInput, setChatInput] = useState('');
  const [chatAttachedFile, setChatAttachedFile] = useState<{ name: string; text: string } | null>(null);
  const [chatLoading, setChatLoading] = useState(false);
  const [chatError, setChatError] = useState('');
  const [historyQuery, setHistoryQuery] = useState('');
  const [projects, setProjects] = useState<Project[]>(readProjects);
  const [showProjectForm, setShowProjectForm] = useState(false);
  const [projectName, setProjectName] = useState('');
  const [projectTemplate, setProjectTemplate] = useState('blank');
  const [projectLanguage, setProjectLanguage] = useState('Python');
  const [projectNotes, setProjectNotes] = useState('');
  const [projectSearch, setProjectSearch] = useState('');
  const [projectStatusFilter, setProjectStatusFilter] = useState('All');
  const [projectLanguageFilter, setProjectLanguageFilter] = useState('All');
  const [projectSort, setProjectSort] = useState('updated');
  const [projectPriority, setProjectPriority] = useState<'Low' | 'Medium' | 'High'>('Medium');
  const [projectDueDate, setProjectDueDate] = useState('');
  const [projectFolder, setProjectFolder] = useState('General');
  const [projectTagsInput, setProjectTagsInput] = useState('');
  const [projectFolderFilter, setProjectFolderFilter] = useState('All');
  const [showArchivedProjects, setShowArchivedProjects] = useState(false);
  const [projectBackupMessage, setProjectBackupMessage] = useState('');
  const projectImportInputRef = useRef<HTMLInputElement>(null);
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [githubActivity, setGithubActivity] = useState<{name:string; description:string; stars:number; forks:number; openIssues:number; commits:Array<{message:string;date:string;url:string}>} | null>(null);
  const [githubLoading, setGithubLoading] = useState(false);
  const [githubError, setGithubError] = useState('');
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
      localStorage.setItem('devhub-chat-v1', JSON.stringify(chatMessages.slice(-60)));
    } catch {
      setChatError('Browser storage is full. Clear older chat messages to continue.');
    }
  }, [chatMessages]);

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

  async function handleChatFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    if (file.size > 100 * 1024) { setChatError('Code attachments must be 100 KB or smaller.'); return; }
    try {
      const text = await file.text();
      if (text.includes('\\u0000')) throw new Error('This file does not appear to be plain text or source code.');
      setChatAttachedFile({ name: file.name.slice(0, 180), text });
      setChatError('');
    } catch (error) {
      setChatError(error instanceof Error ? error.message : 'Could not read this code file.');
    }
  }

  async function sendChatMessage(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const prompt = chatInput.trim();
    if (!prompt || chatLoading) return;
    const userMessage: ChatMessage = { id: crypto.randomUUID(), role: 'user', content: prompt, createdAt: new Date().toISOString() };
    const nextMessages = [...chatMessages, userMessage].slice(-24);
    setChatMessages(current => [...current, userMessage].slice(-60));
    setChatInput('');
    setChatError('');
    setChatLoading(true);
    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: nextMessages.map(({ role, content }) => ({ role, content })),
          context: {
            projects: projects.slice(0, 12).map(project => ({
              name: project.name, language: project.language, status: project.status,
              priority: project.priority, progress: project.progress,
              tags: (project.tags || []).slice(0, 8),
              tasks: (project.tasks || []).slice(0, 12).map(item => ({ title: item.title, done: item.done })),
            })),
            recentSessions: sessions.slice(0, 4).map(item => ({
              mode: item.mode, language: item.language, task: item.task.slice(0, 700),
              result: item.result.slice(0, 700),
            })),
            codeFile: chatAttachedFile ? { name: chatAttachedFile.name, content: chatAttachedFile.text } : null,
          },
        }),
      });
      const payload = await response.json().catch(() => ({})) as { text?: string; error?: string };
      if (!response.ok) throw new Error(payload.error || `Chat request failed (HTTP ${response.status}).`);
      if (typeof payload.text !== 'string' || !payload.text.trim()) throw new Error('DevHub returned an empty response. Please retry.');
      setChatMessages(current => [...current, { id: crypto.randomUUID(), role: 'assistant', content: payload.text!.trim(), createdAt: new Date().toISOString() }].slice(-60));
      track('Chat message completed');
    } catch (error) {
      const message = error instanceof Error ? error.message : 'The chat service is temporarily unavailable.';
      setChatError(message);
      setChatInput(prompt);
      track('Chat message failed', { reason: message.includes('429') ? 'rate_limited' : 'request_error' });
    } finally {
      setChatLoading(false);
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

  function applyProjectTemplate(templateKey: string) {
    const template = projectTemplates[templateKey] || projectTemplates.blank;
    setProjectTemplate(templateKey in projectTemplates ? templateKey : 'blank');
    setProjectLanguage(template.language);
    setProjectNotes(template.notes);
    setProjectTagsInput(template.tags.join(', '));
    setProjectFolder(template.folder);
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
      tags: projectTagsInput.split(',').map(tag => tag.trim()).filter(Boolean).slice(0, 10),
      folder: projectFolder.trim() || 'General',
      archived: false,
      tasks: (projectTemplates[projectTemplate]?.tasks || []).map(title => ({ id: crypto.randomUUID(), title, done: false })),
      updatedAt: new Date().toISOString(),
    }, ...current]);
    setProjectName('');
    setProjectTemplate('blank');
    setProjectNotes('');
    setProjectPriority('Medium');
    setProjectDueDate('');
    setProjectFolder('General');
    setProjectTagsInput('');
    setShowProjectForm(false);
  }

  const selectedProject = projects.find(project => project.id === selectedProjectId) || null;
  const projectFolders = Array.from(new Set(projects.map(project => project.folder || 'General'))).sort();
  const filteredProjects = projects.filter(project => {
    const query = projectSearch.trim().toLowerCase();
    const matchesQuery = !query || [project.name, project.language, project.notes, ...(project.tags || []), project.folder || 'General'].some(value => value.toLowerCase().includes(query));
    return matchesQuery && Boolean(project.archived) === showArchivedProjects && (projectFolderFilter === 'All' || (project.folder || 'General') === projectFolderFilter) && (projectStatusFilter === 'All' || project.status === projectStatusFilter) && (projectLanguageFilter === 'All' || project.language === projectLanguageFilter);
  }).sort((a, b) => projectSort === 'name' ? a.name.localeCompare(b.name) : projectSort === 'due' ? (a.dueDate || '9999').localeCompare(b.dueDate || '9999') : new Date(b.updatedAt || 0).getTime() - new Date(a.updatedAt || 0).getTime());

  function updateProject(projectId: string, patch: Partial<Project>) {
    setProjects(current => current.map(project => project.id === projectId ? { ...project, ...patch, updatedAt: new Date().toISOString() } : project));
  }

  function downloadProjectFile(filename: string, content: string, type: string) {
    const blob = new Blob([content], { type });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  }

  function exportProjects(format: 'json' | 'markdown') {
    if (!projects.length) return;
    if (format === 'json') {
      downloadProjectFile('devhub-project-backup.json', JSON.stringify({
        schemaVersion: 1,
        exportedAt: new Date().toISOString(),
        projects,
      }, null, 2), 'application/json;charset=utf-8');
      setProjectBackupMessage('Project backup exported as JSON.');
      return;
    }
    const markdown = ['# AI Developer Hub — Projects', '', ...projects.flatMap(project => [
      `## ${project.name}`,
      '',
      `- **Language:** ${project.language}`,
      `- **Status:** ${project.status}`,
      `- **Progress:** ${project.progress || 0}%`,
      `- **Priority:** ${project.priority || 'Medium'}`,
      `- **Due date:** ${project.dueDate || 'Not set'}`,
      `- **Folder:** ${project.folder || 'General'}`,
      `- **Tags:** ${(project.tags || []).join(', ') || 'None'}`,
      '',
      project.notes || 'No notes.',
      '',
      '### Tasks',
      ...((project.tasks || []).length ? (project.tasks || []).map(task => `- [${task.done ? 'x' : ' '}] ${task.title}`) : ['- No tasks']),
      '',
    ])].join('\n');
    downloadProjectFile('devhub-projects.md', markdown, 'text/markdown;charset=utf-8');
    setProjectBackupMessage('Projects exported as Markdown.');
  }

  function exportSingleProject(project: Project, format: 'json' | 'markdown') {
    const safeName = project.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'project';
    if (format === 'json') {
      downloadProjectFile(`devhub-${safeName}.json`, JSON.stringify(project, null, 2), 'application/json;charset=utf-8');
      return;
    }
    const markdown = [
      `# ${project.name}`, '',
      `- **Language:** ${project.language}`,
      `- **Status:** ${project.status}`,
      `- **Progress:** ${project.progress || 0}%`,
      `- **Priority:** ${project.priority || 'Medium'}`,
      `- **Due date:** ${project.dueDate || 'Not set'}`,
      `- **Folder:** ${project.folder || 'General'}`,
      `- **Tags:** ${(project.tags || []).join(', ') || 'None'}`, '',
      project.notes || 'No notes.', '', '## Tasks',
      ...((project.tasks || []).length ? (project.tasks || []).map(task => `- [${task.done ? 'x' : ' '}] ${task.title}`) : ['- No tasks']),
    ].join('\n');
    downloadProjectFile(`devhub-${safeName}.md`, markdown, 'text/markdown;charset=utf-8');
  }

  async function importProjects(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) {
      setProjectBackupMessage('Backup is too large. Choose a JSON file under 2 MB.');
      return;
    }
    try {
      const parsed: unknown = JSON.parse(await file.text());
      const candidates = Array.isArray(parsed) ? parsed : (parsed && typeof parsed === 'object' && Array.isArray((parsed as { projects?: unknown }).projects) ? (parsed as { projects: unknown[] }).projects : null);
      if (!candidates || candidates.length > 500) throw new Error('Choose a valid DevHub project backup containing up to 500 projects.');
      const valid = candidates.filter((item): item is Project => Boolean(
        item && typeof item === 'object' &&
        typeof (item as Project).id === 'string' &&
        typeof (item as Project).name === 'string' && (item as Project).name.trim() &&
        typeof (item as Project).language === 'string'
      )).map(project => ({
        ...project,
        status: typeof project.status === 'string' ? project.status : 'Planned',
        notes: typeof project.notes === 'string' ? project.notes : '',
        progress: Math.max(0, Math.min(100, Number(project.progress) || 0)),
        priority: project.priority === 'Low' || project.priority === 'High' ? project.priority : 'Medium' as const,
        dueDate: typeof project.dueDate === 'string' ? project.dueDate : '',
        tags: Array.isArray(project.tags) ? project.tags.filter((tag): tag is string => typeof tag === 'string').slice(0, 10) : [],
        tasks: Array.isArray(project.tasks) ? project.tasks.filter(task => task && typeof task.id === 'string' && typeof task.title === 'string').map(task => ({ id: task.id, title: task.title, done: Boolean(task.done) })) : [],
        folder: typeof project.folder === 'string' && project.folder.trim() ? project.folder.slice(0, 40) : 'General',
        archived: Boolean(project.archived),
        updatedAt: typeof project.updatedAt === 'string' ? project.updatedAt : new Date().toISOString(),
      }));
      if (!valid.length) throw new Error('No valid projects were found in this backup.');
      setProjects(current => {
        const existing = new Set(current.map(project => project.id));
        return [...valid.filter(project => !existing.has(project.id)), ...current];
      });
      setProjectBackupMessage(`Imported ${valid.length} project record(s). Existing project IDs were kept unchanged.`);
    } catch (error) {
      setProjectBackupMessage(error instanceof Error ? error.message : 'Could not read this project backup.');
    }
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

  async function loadGithubActivity(project: Project) {
    const match = (project.githubUrl || '').match(/^https:\/\/github\.com\/([^/]+)\/([^/]+)\/?$/i);
    if (!match) { setGithubError('Add a valid public GitHub repository URL in Project overview.'); return; }
    setGithubLoading(true); setGithubError(''); setGithubActivity(null);
    try {
      const response = await fetch('/api/project-github?owner=' + encodeURIComponent(match[1]) + '&repo=' + encodeURIComponent(match[2]));
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Unable to load GitHub activity.');
      setGithubActivity(data);
    } catch (error) { setGithubError(error instanceof Error ? error.message : 'GitHub activity is unavailable.'); }
    finally { setGithubLoading(false); }
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
        {featureFlags.aihub_ai_chat && <button className={tab === 'Chat' ? 'nav-item active' : 'nav-item'} onClick={() => setTab('Chat')}>
          <MessageCircle size={17} /> Chat <span className="nav-dot" />
        </button>}
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
        {tab === 'Chat' && featureFlags.aihub_ai_chat ? (
          <div className="chat-content">
            <div className="chat-heading">
              <div>
                <div className="eyebrow"><MessageCircle size={14} /> YOUR ALWAYS-AVAILABLE DEVELOPMENT PARTNER</div>
                <h1>Chat with <span>DevHub.</span></h1>
                <p>Plan features, design architecture, draft multi-file code changes, debug, generate tests, review security, and use your saved project context.</p>
              </div>
              <button className="secondary-button" disabled={!chatMessages.length || chatLoading} onClick={() => { setChatMessages([]); setChatError(''); }}> <Trash2 size={14}/> Clear chat</button>
            </div>
            <section className="chat-panel" aria-label="DevHub chat">
              <div className="chat-messages" aria-live="polite">
                {!chatMessages.length && (
                  <div className="chat-welcome">
                    <span className="chat-welcome-icon"><Bot size={25}/></span>
                    <h2>What are we building today?</h2>
                    <p>I'm DevHub, your coding partner. I can plan implementations, draft reviewable patches, debug code, generate tests, and review uploaded source files using your saved project context.</p>
                    <div className="chat-suggestions">
                      {['Plan and implement a new feature','Debug this code and propose a patch','Create tests and review security'].map(prompt => <button key={prompt} onClick={() => setChatInput(prompt)}>{prompt}<ArrowUpRight size={13}/></button>)}
                    </div>
                  </div>
                )}
                {chatMessages.map(message => (
                  <article className={`chat-message ${message.role}`} key={message.id}>
                    <span className="chat-message-avatar">{message.role === 'assistant' ? <Bot size={17}/> : 'Y'}</span>
                    <div className="chat-bubble">
                      <div className="chat-message-meta">{message.role === 'assistant' ? 'DEVHUB AI' : 'YOU'}</div>
                      <p>{message.content}</p>
                    </div>
                  </article>
                ))}
                {chatLoading && <article className="chat-message assistant"><span className="chat-message-avatar"><Bot size={17}/></span><div className="chat-bubble"><div className="chat-message-meta">DEVHUB AI</div><p className="chat-typing">Thinking<span> · </span><span>· </span><span>·</span></p></div></article>}
              </div>
              {chatError && <div className="chat-error" role="alert">{chatError}</div>}
              <form className="chat-compose" onSubmit={sendChatMessage}>
                <label className="attach-file-button chat-attach-button">
                  <Paperclip size={15} /> {chatAttachedFile ? 'Replace code' : 'Attach code'}
                  <input type="file" accept=".txt,.md,.json,.yaml,.yml,.xml,.html,.htm,.css,.scss,.js,.jsx,.ts,.tsx,.py,.java,.kt,.c,.h,.cpp,.hpp,.cs,.go,.rs,.php,.rb,.swift,.sql,.sh,.toml,.vue,.svelte,.astro,.log" onChange={handleChatFileChange} disabled={chatLoading}/>
                </label>
                <textarea value={chatInput} onChange={event => setChatInput(event.target.value)} onKeyDown={event => { if (event.key === 'Enter' && !event.shiftKey) { event.preventDefault(); event.currentTarget.form?.requestSubmit(); } }} rows={2} maxLength={8000} placeholder="Ask DevHub to plan, build, debug, test or review code…" aria-label="Message DevHub" disabled={chatLoading}/>
                <button className="generate-button chat-send" type="submit" disabled={chatLoading || (!chatInput.trim() && !chatAttachedFile)}>{chatLoading ? <LoaderCircle size={17} className="spin"/> : <Send size={17}/>} Send</button>
              </form>
              {chatAttachedFile && <div className="attached-file chat-attached-file"><FileCode2 size={14}/>{chatAttachedFile.name}<button type="button" onClick={() => setChatAttachedFile(null)} aria-label="Remove attached code file"><X size={14}/></button></div>}
              <p className="chat-disclaimer">Attach a source file (up to 100 KB) for code-aware help. DevHub can draft patches and tests but cannot execute code or access your repository from this chat. Do not share passwords or API keys. Chat history is saved in this browser.</p>
            </section>
          </div>
        ) : tab === 'Workspace' ? (
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
                    <strong>8</strong>
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
              {modes.filter((item) => item.name !== 'AI Code Review' || featureFlags.ai_code_review).filter((item) => item.name !== 'Security audit' || featureFlags.ai_security_audit).filter((item) => item.name !== 'Code Playground' || featureFlags.code_playground).filter((item) => item.name !== 'Release notes' || featureFlags.release_notes).map((item, index) => {
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
              {(mode === 'AI Code Review' || mode === 'Security audit') && (
                <div className="review-guide" role="note">
                  <div className="review-guide-heading">
                    <ShieldCheck size={18} />
                    <div>
                      <strong>{mode === 'Security audit' ? 'Security-first source audit' : 'Structured code review'}</strong>
                      <span>{mode === 'Security audit' ? 'Evidence-led vulnerability findings with remediation guidance' : 'Prioritized findings with actionable fixes'}</span>
                    </div>
                  </div>
                  <div className="review-checklist">
                    {mode === 'Security audit' ? <><span><b>01</b> Injection, XSS & access control</span><span><b>02</b> Secrets, crypto & data exposure</span><span><b>03</b> Trust boundaries & unsafe file/network access</span><span><b>04</b> Severity, evidence & fixes</span></> : <><span><b>01</b> Bugs & edge cases</span><span><b>02</b> Security risks</span><span><b>03</b> Performance & maintainability</span><span><b>04</b> Tests to run</span></>}
                  </div>
                  <p>{mode === 'Security audit' ? 'Attach source code or a dependency manifest. The audit is static analysis guidance only; it does not execute code or prove exploitability.' : 'Attach a source file or paste code below. Findings will be prioritized by severity; the AI does not execute your code.'}</p>
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
                    mode === 'Security audit'
                      ? 'Paste code or attach a file. Ask for an OWASP-oriented audit, threat model, or review of authentication, input validation, data handling, and dependency risks…'
                      : mode === 'Generate tests'
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
                      <ShieldCheck size={17} /> {mode === 'Security audit' ? 'Run security audit' : mode === 'AI Code Review' ? 'Review code' : 'Generate response'}{' '}
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
                      <label className="field-label">FOLDER<input value={selectedProject.folder || 'General'} maxLength={40} onChange={event => updateProject(selectedProject.id, {folder:event.target.value.trimStart() || 'General'})}/></label>
                      <label className="field-label">TAGS · COMMA SEPARATED<input value={(selectedProject.tags || []).join(', ')} placeholder="React, AI, Portfolio" onChange={event => updateProject(selectedProject.id, {tags:event.target.value.split(',').map(tag => tag.trim()).filter(Boolean).slice(0,10)})}/></label>
                      <label className="field-label">STATUS<select value={selectedProject.status} onChange={event => updateProject(selectedProject.id, { status: event.target.value, progress: event.target.value === 'Done' ? 100 : selectedProject.progress })}><option>Planned</option><option>In progress</option><option>On hold</option><option>Done</option></select></label>
                      <label className="field-label">PRIORITY<select value={selectedProject.priority || 'Medium'} onChange={event => updateProject(selectedProject.id, { priority: event.target.value as Project['priority'] })}><option>Low</option><option>Medium</option><option>High</option></select></label>
                      <div className="project-backup-actions"><button className="secondary-button" onClick={() => exportSingleProject(selectedProject, 'json')}><Download size={14}/> Export JSON</button><button className="secondary-button" onClick={() => exportSingleProject(selectedProject, 'markdown')}>Export Markdown</button></div><button className="secondary-button project-archive-action" onClick={() => { updateProject(selectedProject.id, {archived: !selectedProject.archived}); setSelectedProjectId(null); }}>{selectedProject.archived ? 'Restore project' : 'Archive project'}</button>
                      <label className="field-label">DUE DATE<input type="date" value={selectedProject.dueDate || ''} onChange={event => updateProject(selectedProject.id, { dueDate: event.target.value })}/></label>
                      <label className="field-label">GITHUB REPOSITORY<input type="url" placeholder="https://github.com/owner/repo" value={selectedProject.githubUrl || ''} onChange={event => updateProject(selectedProject.id, {githubUrl:event.target.value})}/></label>
                      <label className="field-label">LIVE DEPLOYMENT URL<input type="url" placeholder="https://your-project.vercel.app" value={selectedProject.liveUrl || ''} onChange={event => updateProject(selectedProject.id, {liveUrl:event.target.value})}/></label>
                      {selectedProject.liveUrl && /^https:\/\//i.test(selectedProject.liveUrl) && <a className="project-integration-link" href={selectedProject.liveUrl} target="_blank" rel="noreferrer"><ArrowUpRight size={14}/> Open live deployment</a>}
                      {selectedProject.githubUrl && <button className="copy-button" onClick={() => void loadGithubActivity(selectedProject)} disabled={githubLoading}>{githubLoading ? 'Loading GitHub…' : 'Refresh GitHub activity'}</button>}
                      {githubError && <p className="project-ai-error" role="alert">{githubError}</p>}
                      {githubActivity && <div className="github-activity"><strong>{githubActivity.name}</strong><p>{githubActivity.description || 'No repository description.'}</p><div className="github-stats">★ {githubActivity.stars} · Forks {githubActivity.forks} · Open issues {githubActivity.openIssues}</div>{githubActivity.commits.map((commit,index)=><a key={index} href={commit.url} target="_blank" rel="noreferrer">{commit.message}<small>{new Date(commit.date).toLocaleDateString()}</small></a>)}</div>}
                      <label className="field-label">PROGRESS · {selectedProject.progress || 0}%<input type="range" min="0" max="100" step="5" value={selectedProject.progress || 0} onChange={event => updateProject(selectedProject.id, { progress: Number(event.target.value), status: Number(event.target.value) === 100 ? 'Done' : selectedProject.status === 'Done' ? 'In progress' : selectedProject.status })}/></label>
                      <div className="project-progress-track"><span style={{width: (selectedProject.progress || 0) + '%'}}/></div>
                    </div>
                  </aside>
                </div>
              </section>
            ) : <>
              <div className="projects-heading"><div><div className="eyebrow"><FolderGit2 size={14}/> YOUR WORK, ORGANIZED</div><h1>My <span>Projects.</span></h1><p>Plan, organize, and track your development work. Project data is saved locally in this browser.</p></div><div className="project-heading-actions"><button className="secondary-button" disabled={!projects.length} onClick={() => exportProjects('json')}><Download size={15}/> Backup JSON</button><button className="secondary-button" disabled={!projects.length} onClick={() => exportProjects('markdown')}>Export Markdown</button><button className="secondary-button" onClick={() => projectImportInputRef.current?.click()}>Import backup</button><input ref={projectImportInputRef} type="file" accept=".json,application/json" hidden onChange={importProjects}/><button className="generate-button" onClick={() => setShowProjectForm(value => !value)}><Plus size={17}/> New project</button></div></div>
              {showProjectForm && <form className="project-form" onSubmit={addProject}>
                <label className="field-label">STARTER TEMPLATE<select value={projectTemplate} onChange={event => applyProjectTemplate(event.target.value)}>{Object.entries(projectTemplates).map(([key, template]) => <option key={key} value={key}>{template.label}</option>)}</select></label>
                <div className="form-grid"><label className="field-label">PROJECT NAME<input value={projectName} onChange={event => setProjectName(event.target.value)} placeholder="e.g. Portfolio website" required/></label><label className="field-label">LANGUAGE / STACK<select value={projectLanguage} onChange={event => setProjectLanguage(event.target.value)}>{languages.map(item => <option key={item}>{item}</option>)}</select></label></div>
                <div className="form-grid"><label className="field-label">PRIORITY<select value={projectPriority} onChange={event => setProjectPriority(event.target.value as 'Low' | 'Medium' | 'High')}><option>Low</option><option>Medium</option><option>High</option></select></label><label className="field-label">DUE DATE<input type="date" value={projectDueDate} onChange={event => setProjectDueDate(event.target.value)}/></label></div>
                <div className="form-grid"><label className="field-label">FOLDER<input value={projectFolder} maxLength={40} onChange={event => setProjectFolder(event.target.value)} placeholder="General, Client work…"/></label><label className="field-label">TAGS · COMMA SEPARATED<input value={projectTagsInput} onChange={event => setProjectTagsInput(event.target.value)} placeholder="React, AI, Portfolio"/></label></div>
                <label className="field-label">NOTES<textarea value={projectNotes} onChange={event => setProjectNotes(event.target.value)} placeholder="What are you building next?" rows={3}/></label>
                <div className="form-actions"><button type="button" className="secondary-button" onClick={() => setShowProjectForm(false)}>Cancel</button><button className="generate-button" type="submit"><Plus size={16}/> Save project</button></div>
              </form>}
              {projectBackupMessage && <p className="project-backup-message" role="status">{projectBackupMessage}</p>}
              <div className="project-summary"><div><span>Total projects</span><strong>{projects.length}</strong></div><div><span>In progress</span><strong>{projects.filter(project => project.status === 'In progress').length}</strong></div><div><span>Completed</span><strong>{projects.filter(project => project.status === 'Done').length}</strong></div></div>
              <div className="project-toolbar"><label className="history-search"><Search size={17}/><input value={projectSearch} onChange={event => setProjectSearch(event.target.value)} placeholder="Search projects, stacks, notes…"/></label><select aria-label="Filter by folder" value={projectFolderFilter} onChange={event => setProjectFolderFilter(event.target.value)}><option>All</option>{projectFolders.map(folder => <option key={folder}>{folder}</option>)}</select><button className={showArchivedProjects ? 'secondary-button archive-toggle active' : 'secondary-button archive-toggle'} onClick={() => setShowArchivedProjects(value => !value)}>{showArchivedProjects ? 'View active projects' : 'View archive'} ({projects.filter(project => Boolean(project.archived) === !showArchivedProjects).length})</button><select aria-label="Filter by status" value={projectStatusFilter} onChange={event => setProjectStatusFilter(event.target.value)}><option>All</option><option>Planned</option><option>In progress</option><option>On hold</option><option>Done</option></select><select aria-label="Filter by language" value={projectLanguageFilter} onChange={event => setProjectLanguageFilter(event.target.value)}><option>All</option>{Array.from(new Set(projects.map(project => project.language))).map(language => <option key={language}>{language}</option>)}</select><select aria-label="Sort projects" value={projectSort} onChange={event => setProjectSort(event.target.value)}><option value="updated">Recently updated</option><option value="name">Name A–Z</option><option value="due">Due date</option></select></div>
              {filteredProjects.length ? <div className="project-grid">{filteredProjects.map(project => <article className="project-card" key={project.id}><div className="project-card-top"><span className="project-symbol"><Code2 size={20}/></span><button className="icon-button" onClick={() => { if(window.confirm('Delete '+project.name+'? This cannot be undone.')) setProjects(current => current.filter(item => item.id !== project.id)); }} aria-label={'Delete '+project.name}><Trash2 size={16}/></button></div><h3>{project.name}</h3><p>{project.notes || 'No notes added yet. Open the project to add details and tasks.'}</p><div className="project-card-meta"><span className="language-tag">{project.language}</span><span className="folder-chip"><FolderGit2 size={11}/>{project.folder || 'General'}</span><span className="priority-pill">{project.priority || 'Medium'}</span>{project.dueDate && <span className="project-due">Due {new Date(project.dueDate+'T00:00:00').toLocaleDateString()}</span>}</div>{(project.tags || []).length > 0 && <div className="project-tags">{project.tags!.map(tag => <span key={tag}>{tag}</span>)}</div>}<div className="project-progress-track"><span style={{width:(project.progress || 0)+'%'}}/></div><div className="project-card-bottom"><span className="project-progress-label">{project.progress || 0}% complete · {(project.tasks || []).filter(task => task.done).length}/{(project.tasks || []).length} tasks</span><button className="copy-button" onClick={() => setSelectedProjectId(project.id)}>Open project <ArrowUpRight size={14}/></button></div><div className="project-card-status"><button className="copy-button" onClick={() => updateProject(project.id, {archived: !project.archived})}>{project.archived ? 'Restore' : 'Archive'}</button><select aria-label={'Status for '+project.name} value={project.status} onChange={event => updateProject(project.id, {status:event.target.value, progress:event.target.value === 'Done' ? 100 : project.progress})}><option>Planned</option><option>In progress</option><option>On hold</option><option>Done</option></select></div></article>)}</div> : <div className="empty-projects"><FolderGit2 size={30}/><h3>{projects.length ? 'No matching projects' : 'No projects yet'}</h3><p>{projects.length ? 'Try changing your search or filters.' : 'Add a project to start organizing your work.'}</p>{!projects.length && <button className="generate-button" onClick={() => setShowProjectForm(true)}><Plus size={16}/> Create a project</button>}</div>}
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
                <section className="community-panel" aria-labelledby="community-title">
          <div className="community-heading"><div><span className="eyebrow"><MessageCircle size={13}/> COMMUNITY & RESOURCES</span><h2 id="community-title">Need a hand? <span>We're one click away.</span></h2><p>Report a problem, suggest an improvement, or explore the source and documentation.</p></div><div className="community-version"><span>APP VERSION</span><strong>{APP_VERSION}</strong><small>Commit <code>{APP_COMMIT.slice(0, 7)}</code></small></div></div>
          <div className="community-grid">
            <a className="community-card support-card" href={"https://github.com/Error-cracker-1/AI-Developer-Hub/issues/new?title=%5BBug%5D%20AI%20Developer%20Hub%3A%20&body=Application%3A%20AI%20Developer%20Hub%0AVersion%3A%201.0.0%0AProduction%20branch%3A%20deploy-vercel%0ABuild%20commit%3A%20__APP_COMMIT__%0A%0A%23%23%23%20What%20happened%3F%0A%0A%23%23%23%20Steps%20to%20reproduce%0A1.%20%0A%0A%23%23%23%20Expected%20behaviour%0A%0A%23%23%23%20Actual%20behaviour%0A%0A%23%23%23%20Device%20%2F%20browser%0A".replace("__APP_COMMIT__", APP_COMMIT)} target="_blank" rel="noopener noreferrer"><span className="community-icon"><MessageCircle size={19}/></span><strong>Report a bug</strong><p>Open a GitHub issue with app version, branch and build details prefilled.</p><span className="community-link">Get support <ArrowUpRight size={14}/></span></a>
            <a className="community-card" href={"https://github.com/Error-cracker-1/AI-Developer-Hub/issues/new?title=%5BFeature%5D%20AI%20Developer%20Hub%3A%20&body=Application%3A%20AI%20Developer%20Hub%0AVersion%3A%201.0.0%0AProduction%20branch%3A%20deploy-vercel%0ABuild%20commit%3A%20__APP_COMMIT__%0A%0A%23%23%23%20What%20would%20you%20like%20to%20improve%3F%0A%0A%23%23%23%20Why%20would%20this%20help%3F%0A%0A%23%23%23%20Any%20examples%20or%20references%3F%0A".replace("__APP_COMMIT__", APP_COMMIT)} target="_blank" rel="noopener noreferrer"><span className="community-icon"><Sparkles size={19}/></span><strong>Share feedback</strong><p>Suggest features and improvements to help shape the next release.</p><span className="community-link">Send feedback <ArrowUpRight size={14}/></span></a>
            <a className="community-card" href="https://github.com/Error-cracker-1/AI-Developer-Hub/blob/deploy-vercel/README.md" target="_blank" rel="noopener noreferrer"><span className="community-icon"><BookOpen size={19}/></span><strong>Documentation</strong><p>Read setup instructions, feature notes and project guidance.</p><span className="community-link">Read README <ArrowUpRight size={14}/></span></a>
            <a className="community-card" href="https://github.com/Error-cracker-1/AI-Developer-Hub/tree/deploy-vercel" target="_blank" rel="noopener noreferrer"><span className="community-icon"><Github size={19}/></span><strong>Show code</strong><p>Browse the AI Developer Hub source on its production branch.</p><span className="community-link">Explore source <ArrowUpRight size={14}/></span></a>
          </div>
        </section>
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
