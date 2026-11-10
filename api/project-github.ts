import type { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Cache-Control', 's-maxage=60, stale-while-revalidate=120');
  if (req.method !== 'GET') { res.setHeader('Allow', 'GET'); return res.status(405).json({error:'Method not allowed'}); }
  const owner = typeof req.query.owner === 'string' ? req.query.owner : '';
  const repo = typeof req.query.repo === 'string' ? req.query.repo : '';
  if (!/^[a-zA-Z0-9-]{1,39}$/.test(owner) || !/^[a-zA-Z0-9_.-]{1,100}$/.test(repo)) return res.status(400).json({error:'Invalid GitHub repository.'});
  try {
    const headers = {'Accept':'application/vnd.github+json','User-Agent':'AI-Developer-Hub'};
    const [repository, commits] = await Promise.all([
      fetch('https://api.github.com/repos/'+encodeURIComponent(owner)+'/'+encodeURIComponent(repo),{headers}),
      fetch('https://api.github.com/repos/'+encodeURIComponent(owner)+'/'+encodeURIComponent(repo)+'/commits?per_page=5',{headers})
    ]);
    if (repository.status === 404) return res.status(404).json({error:'Public repository not found. Private repositories are not supported by this public connection.'});
    if (!repository.ok || !commits.ok) return res.status(repository.status === 403 || commits.status === 403 ? 429 : 502).json({error:'GitHub could not provide repository activity right now.'});
    const r = await repository.json() as any, c = await commits.json() as any[];
    return res.status(200).json({name:r.full_name,description:r.description,stars:r.stargazers_count,forks:r.forks_count,openIssues:r.open_issues_count,commits:c.slice(0,5).map(item=>({message:String(item.commit?.message||'').split('\n')[0].slice(0,180),date:item.commit?.committer?.date||item.commit?.author?.date,url:item.html_url}))});
  } catch { return res.status(502).json({error:'GitHub activity is temporarily unavailable.'}); }
}
