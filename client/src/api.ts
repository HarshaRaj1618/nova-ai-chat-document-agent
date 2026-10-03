import type { AgentResult, FileInfo } from './types';

export async function uploadFile(file: File): Promise<FileInfo> {
  const form = new FormData(); form.append('file', file);
  const res = await fetch('/api/files', { method:'POST', body:form });
  const data = await res.json(); if (!res.ok) throw new Error(data.error || 'Upload failed');
  return data.file;
}

export async function runAgent(prompt: string, fileIds: string[]): Promise<AgentResult> {
  const res = await fetch('/api/agent', { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({prompt,fileIds}) });
  const data = await res.json(); if (!res.ok) throw new Error(data.error || 'Agent request failed');
  return data;
}


export async function chat(message: string, history: Array<{role:'user'|'assistant';content:string}>): Promise<string> {
  const res = await fetch('/api/chat', {
    method: 'POST', headers: {'Content-Type':'application/json'},
    body: JSON.stringify({message, history})
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Chat request failed');
  return data.message;
}
