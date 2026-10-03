import { useRef, useState } from 'react';
import { Bot, FileText, Upload, X, Send, Download, Sparkles, CheckCircle2, Loader2, MessageSquare, Trash2 } from 'lucide-react';
import { chat, runAgent, uploadFile } from './api';
import type { AgentResult, ChatMessage, FileInfo } from './types';

const chatExamples = ['Explain React useMemo vs useCallback.', 'Help me debug a React rendering issue.', 'Create a scalable React folder structure.', 'Explain an Agentic AI workflow with an example.'];
const docExamples = ['Summarize this document in 5 bullet points.', 'Extract the key requirements into a table.', 'Analyze this spreadsheet and identify the top 10 records.', 'Create a professional report from this document.'];

export default function App() {
  const inputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<FileInfo | null>(null);
  const [prompt, setPrompt] = useState('');
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [busy, setBusy] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [error, setError] = useState('');
  const [lastResult, setLastResult] = useState<AgentResult | null>(null);

  async function addFile(f?: File) {
    if (!f) return;
    setError('');
    try { setBusy(true); setFile(await uploadFile(f)); }
    catch (e) { setError(e instanceof Error ? e.message : 'Upload failed'); }
    finally { setBusy(false); }
  }

  function newChat() {
    setMessages([]); setFile(null); setPrompt(''); setError(''); setLastResult(null);
  }

  async function submit() {
    if (!prompt.trim() || busy) return;
    setError('');
    const text = prompt.trim();
    const history = messages.map(m => ({role:m.role, content:m.content}));
    setPrompt('');
    setMessages(m => [...m, {id:crypto.randomUUID(),role:'user',content:text,files:file?[file.originalName]:[],createdAt:new Date().toISOString()}]);
    try {
      setBusy(true);
      if (file) {
        const result = await runAgent(text, [file.id]);
        setLastResult(result);
        setMessages(m => [...m, {id:crypto.randomUUID(),role:'assistant',content:result.message,createdAt:new Date().toISOString()}]);
      } else {
        const answer = await chat(text, history);
        setLastResult(null);
        setMessages(m => [...m, {id:crypto.randomUUID(),role:'assistant',content:answer,createdAt:new Date().toISOString()}]);
      }
    } catch (e) {
      const msg=e instanceof Error?e.message:'Request failed'; setError(msg);
      setMessages(m=>[...m,{id:crypto.randomUUID(),role:'assistant',content:`I couldn't complete that request. ${msg}`,createdAt:new Date().toISOString()}]);
    } finally { setBusy(false); }
  }

  const examples = file ? docExamples : chatExamples;

  return <div className="app-shell">
    <header className="topbar">
      <div className="brand"><div className="logo"><Bot size={21}/></div><div><strong>Nova AI</strong><span>Chat + Document Agent</span></div></div>
      <div className="top-actions"><span className="mode"><span className="dot"/>{file ? 'Document Agent' : 'AI Chat'}</span><button className="new-chat" onClick={newChat}><MessageSquare size={15}/> New chat</button></div>
    </header>
    <main className="layout">
      <aside className="sidebar">
        <div className="side-title"><Sparkles size={17}/> Nova AI</div>
        <p>One AI workspace for everyday conversations and document-aware agentic workflows.</p>
        <div className="capabilities">
          <div><CheckCircle2/> General AI chat</div><div><CheckCircle2/> PDF / DOCX analysis</div><div><CheckCircle2/> CSV / XLSX analysis</div><div><CheckCircle2/> Natural-language tasks</div><div><CheckCircle2/> Generate output files</div>
        </div>
        <div className="side-note">The Gemini API key stays on the server. Attachments are processed by the backend before the agent uses them.</div>
      </aside>
      <section className="workspace">
        <div className="hero"><span className="eyebrow">FULL-STACK AI ASSISTANT</span><h1>{file ? 'Give your file a task.' : 'Ask Nova anything.'}</h1><p>{file ? 'Nova can read the uploaded document, plan the work, analyze the content, and generate a useful result.' : 'Chat normally with Nova, or attach a document whenever your task needs file-aware analysis.'}</p></div>
        <div className="conversation">
          {messages.length===0 && <div className="empty"><div className="empty-icon">{file?<FileText size={28}/>:<Bot size={28}/>}</div><h2>{file?'What should I do with your document?':'How can I help you today?'}</h2><p>{file?'Try an agent task below.':'Start a normal AI conversation, or attach a file to activate the Document Agent.'}</p><div className="examples">{examples.map(x=><button key={x} onClick={()=>setPrompt(x)}>{x}</button>)}</div></div>}
          {messages.map(m=><div className={`message ${m.role}`} key={m.id}><div className="avatar">{m.role==='assistant'?<Bot size={16}/>: 'You'}</div><div className="bubble"><div>{m.content}</div>{m.files?.map(f=><span className="file-chip" key={f}><FileText size={14}/>{f}</span>)}</div></div>)}
          {busy && <div className="message assistant"><div className="avatar"><Bot size={16}/></div><div className="bubble thinking"><Loader2 className="spin" size={17}/> {file?'Agent is reading and working…':'Nova is thinking…'}</div></div>}
          {lastResult?.plan?.length ? <div className="plan"><strong>Agent steps</strong>{lastResult.plan.map((p,i)=><div key={i}><span>{i+1}</span>{p}</div>)}</div>:null}
          {lastResult?.files?.length ? <div className="downloads"><strong>Generated files</strong>{lastResult.files.map(f=><a href={f.url} download key={f.url}><Download size={16}/>{f.name}</a>)}</div>:null}
        </div>
        {error && <div className="error">{error}</div>}
        <div className={`composer ${dragging?'dragging':''}`} onDragOver={e=>{e.preventDefault();setDragging(true)}} onDragLeave={()=>setDragging(false)} onDrop={e=>{e.preventDefault();setDragging(false);void addFile(e.dataTransfer.files[0])}}>
          {file && <div className="attached"><FileText size={17}/><div><strong>{file.originalName}</strong><small>{Math.round(file.size/1024)} KB · {file.extractedChars.toLocaleString()} extracted chars</small></div><button onClick={()=>{setFile(null);setLastResult(null)}} title="Remove file"><X size={17}/></button></div>}
          <textarea value={prompt} onChange={e=>setPrompt(e.target.value)} onKeyDown={e=>{if(e.key==='Enter'&&!e.shiftKey){e.preventDefault();void submit()}}} placeholder={file?'Tell the agent what to do with this file…':'Ask Nova anything, or attach a document…'} />
          <div className="composer-footer"><button className="attach" onClick={()=>inputRef.current?.click()}><Upload size={17}/> Attach file</button>{file && <button className="remove-file" onClick={()=>{setFile(null);setLastResult(null)}}><Trash2 size={15}/> Remove</button>}<input ref={inputRef} type="file" hidden accept=".pdf,.docx,.txt,.csv,.xlsx,.xls" onChange={e=>void addFile(e.target.files?.[0])}/><span>Enter to send · Shift+Enter for newline</span><button className="send" disabled={!prompt.trim()||busy} onClick={()=>void submit()}><Send size={17}/></button></div>
        </div>
        <footer>Nova AI supports normal chat plus PDF, DOCX, TXT, CSV, XLSX and XLS document workflows.</footer>
      </section>
    </main>
  </div>;
}
