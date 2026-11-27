import os
import re
import subprocess
from pathlib import Path

from google import genai
from google.genai import types

ROOT = Path.cwd()
README = ROOT / "README.md"
MODEL = os.environ.get("GEMINI_MODEL", "gemini-3.5-flash-lite")
REPOSITORY = os.environ["GITHUB_REPOSITORY"]
TARGET_BRANCH = os.environ["TARGET_BRANCH"]
EXCLUDED_DIRS = {".git", ".venv", "venv", "node_modules", "vendor", "build", "dist", "coverage", "__pycache__", ".cache", "target", "out", "generated"}
IGNORED_PATHS = {"README.md", ".github/scripts/generate_readme.py", ".github/readme-generator-instructions.md", ".github/workflows/readme-generator.yml"}
SOURCE_EXTENSIONS = {".py", ".js", ".ts", ".jsx", ".tsx", ".html", ".css", ".ps1", ".json", ".yml", ".yaml", ".toml", ".java", ".c", ".cpp", ".h", ".hpp", ".go", ".rs", ".rb", ".php", ".cs", ".md", ".txt"}
MANIFESTS = {"requirements.txt", "pyproject.toml", "package.json", "Cargo.toml", "go.mod", "pom.xml", "build.gradle", "build.gradle.kts"}
BADGE_RE = re.compile(r"^\s*\[!\[[^\]]*\]\(https://github\.com/[^/]+/[^/]+/actions/workflows/[^)]*/badge\.svg[^)]*\)\]\([^)]*\)\s*$")

def git(*args):
    result = subprocess.run(["git", *args], capture_output=True, text=True, timeout=45, check=False)
    if result.returncode:
        raise RuntimeError(result.stderr.strip() or "git command failed")
    return result.stdout.strip()

def read(path, limit):
    try:
        return path.read_text(encoding="utf-8", errors="ignore")[:limit]
    except OSError:
        return ""

def changed_files():
    before = os.environ.get("BEFORE_SHA", "")
    head = os.environ.get("GITHUB_SHA", "HEAD")
    if before and before != "0" * 40:
        try:
            raw = git("diff", "--name-only", before, head, "--")
        except RuntimeError:
            raw = git("diff", "--name-only", f"{head}^", head, "--")
    else:
        try:
            raw = git("diff", "--name-only", f"{head}^", head, "--")
        except RuntimeError:
            raw = git("ls-tree", "-r", "--name-only", head)
    return [p for p in raw.splitlines() if p]

def is_meaningful(path):
    if path in IGNORED_PATHS or path.startswith(".github/scripts/") or path.startswith(".git"):
        return False
    if any(part in EXCLUDED_DIRS for part in Path(path).parts):
        return False
    return Path(path).suffix.lower() in SOURCE_EXTENSIONS or path.startswith(".github/workflows/")

def workflow_badges():
    badges = []
    workflows = ROOT / ".github" / "workflows"
    if not workflows.is_dir():
        return badges
    for path in sorted(workflows.iterdir()):
        if path.suffix.lower() not in {".yml", ".yaml"}:
            continue
        name = path.stem
        for line in read(path, 4000).splitlines():
            match = re.match(r"^\s*name\s*:\s*(.+)$", line.strip())
            if match:
                name = match.group(1).strip().strip('"').strip("'")
                break
        url = f"https://github.com/{REPOSITORY}/actions/workflows/{path.name}"
        badges.append(f"[![{name}]({url}/badge.svg?branch={TARGET_BRANCH})]({url})")
    return badges

def sync_badges(original, generated):
    badges = [line.strip() for line in original.splitlines() if BADGE_RE.match(line.strip())]
    for badge in workflow_badges():
        if badge not in badges:
            badges.append(badge)
    lines = [line for line in generated.splitlines() if not BADGE_RE.match(line.strip())]
    heading = next((i for i, line in enumerate(lines) if line.strip().lower() == "## github actions"), None)
    if heading is None:
        insert_at = 1 if lines and lines[0].startswith("#") else 0
        lines[insert_at:insert_at] = ["", "## GitHub Actions", "", *badges, ""]
    else:
        end = heading + 1
        while end < len(lines) and not lines[end].startswith("## "):
            end += 1
        lines[heading + 1:end] = ["", *badges, ""]
    return "\n".join(lines).strip()

changes = changed_files()
meaningful = sorted({p for p in changes if is_meaningful(p)})
if not meaningful:
    print("No README-relevant project changes detected; skipping Gemini API call.")
    raise SystemExit(0)

file_list = meaningful[:120]
evidence = []
for path_text in file_list[:30]:
    path = ROOT / path_text
    if path.is_file():
        evidence.append(f"--- {path_text} ---\n{read(path, 6000)}")
manifest_text = []
for name in sorted(MANIFESTS):
    path = ROOT / name
    if path.is_file():
        manifest_text.append(f"--- {name} ---\n{read(path, 6000)}")

current = read(README, 30000)
recent = git("log", "-8", "--oneline", "--decorate")
prompt = f"""Maintain README.md for this repository.

Repository: {REPOSITORY}
Target branch: {TARGET_BRANCH}

Rules:
- Treat checked-in source and manifests as the only source of truth.
- Use only claims supported by the supplied evidence and current README.
- Preserve useful existing instructions and project-specific content.
- Do not invent features, commands, dependencies, URLs, tests, workflows, or setup steps.
- Do not claim a test passed unless the evidence says so.
- Do not expose secrets or environment-variable values.
- Keep the README clear, structured, and concise.
- Return ONLY the complete README.md in Markdown, without code fences.
- Include a GitHub Actions section with the supplied workflow badges.
- Keep product identity specific to this repository and branch.

Current README:
{current}

Changed paths:
{chr(10).join(file_list)}

Relevant changed-file evidence:
{chr(10).join(evidence)}

Project manifests:
{chr(10).join(manifest_text)}

Recent commits:
{recent}
"""
api_key = os.environ.get("GEMINI_API_KEY") or os.environ.get("GOOGLE_API_KEY")
if not api_key:
    raise SystemExit("Neither GEMINI_API_KEY nor GOOGLE_API_KEY is configured in repository secrets.")
client = genai.Client(api_key=api_key)
response = client.models.generate_content(
    model=MODEL, contents=prompt,
    config=types.GenerateContentConfig(max_output_tokens=7000, candidate_count=1),
)
generated = (response.text or "").strip()
if generated.startswith("```"):
    lines = generated.splitlines()[1:]
    if lines and lines[-1].strip() == "```":
        lines = lines[:-1]
    generated = "\n".join(lines).strip()
if len(generated) < 300 or not generated.startswith("#"):
    raise SystemExit("Generated README is empty, too short, or missing a Markdown title; refusing to replace README.")
README.write_text(sync_badges(current, generated) + "\n", encoding="utf-8")
print(f"README updated for {REPOSITORY}@{TARGET_BRANCH} using one {MODEL} request.")
