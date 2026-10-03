import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
import multer from 'multer';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { ensureDirs, uploadsDir, generatedDir, files, saveUpload } from './fileStore.js';
import { parseFile } from './services/fileParser.js';
import { runAgent } from './agent/agent.js';
import { configuredModel } from './services/gemini.js';

const app=express();
const port=Number(process.env.PORT||8789);
const maxMb=Number(process.env.MAX_FILE_SIZE_MB||15);
const allowedExt=new Set(['.pdf','.docx','.txt','.csv','.xlsx','.xls']);
const upload=multer({dest:uploadsDir,limits:{fileSize:maxMb*1024*1024},fileFilter:(_req,file,cb)=>allowedExt.has(path.extname(file.originalname).toLowerCase())?cb(null,true):cb(new Error('Unsupported file type. Use PDF, DOCX, TXT, CSV, XLSX or XLS.'))});

app.use(cors({origin:process.env.CLIENT_ORIGIN||'http://localhost:5175'}));
app.use(express.json({limit:'300kb'}));
app.use(rateLimit({windowMs:60_000,limit:30,standardHeaders:true,legacyHeaders:false}));

app.get('/api/health',(_req,res)=>res.json({ok:true,model:configuredModel}));


app.post('/api/chat', async (req, res, next) => {
  try {
    const message = typeof req.body?.message === 'string' ? req.body.message.trim() : '';
    const history = Array.isArray(req.body?.history) ? req.body.history : [];
    if (!message) return res.status(400).json({ error: 'Please provide a message.' });
    if (history.length > 30) return res.status(400).json({ error: 'Conversation history is too long.' });

    const safeHistory = history
      .filter(m => m && (m.role === 'user' || m.role === 'assistant') && typeof m.content === 'string')
      .map(m => `${m.role === 'assistant' ? 'Assistant' : 'User'}: ${m.content.slice(0, 10000)}`)
      .join('\n');

    const { generate } = await import('./services/gemini.js');
    const response = await generate(
      `You are Nova AI, a helpful full-stack AI assistant. Answer the user's question clearly and accurately. Use markdown when useful.\n\nConversation history:\n${safeHistory || '(none)'}\n\nUser: ${message}`,
      { temperature: 0.4 }
    );
    res.json({ message: response.text || 'I could not generate a response.' });
  } catch (error) { next(error); }
});

app.post('/api/files',upload.single('file'),async(req,res,next)=>{
  try {
    if(!req.file) return res.status(400).json({error:'No file was attached.'});
    const extracted=await parseFile(req.file);
    const record=await saveUpload(req.file,extracted);
    res.json({file:{id:record.id,originalName:record.originalName,mimeType:record.mimeType,size:record.size,extractedChars:record.extractedText.length,preview:record.extractedText.slice(0,1200)}});
  } catch(error) { next(error); }
});

app.post('/api/agent',async(req,res,next)=>{
  try {
    const prompt=typeof req.body?.prompt==='string'?req.body.prompt.trim():'';
    const ids=Array.isArray(req.body?.fileIds)?req.body.fileIds:[];
    if(!prompt) return res.status(400).json({error:'Please provide a task for the agent.'});
    if(ids.length>5) return res.status(400).json({error:'You can attach up to 5 files per task.'});
    const selected=ids.map(id=>files.get(id)).filter(Boolean);
    if(ids.length && selected.length!==ids.length) return res.status(404).json({error:'One or more uploaded files are no longer available. Please upload them again.'});
    const result=await runAgent({prompt,files:selected});
    res.json(result);
  } catch(error) { next(error); }
});

app.get('/api/files/generated/:name',async(req,res,next)=>{
  try {
    const name=path.basename(req.params.name);
    const filePath=path.join(generatedDir,name);
    await fs.access(filePath); res.download(filePath,name);
  } catch(error) { next(error); }
});

const __dirname=path.dirname(fileURLToPath(import.meta.url));
const clientDist=path.resolve(__dirname,'../../client/dist');
app.use(express.static(clientDist));
app.get(/^(?!\/api).*/,async(_req,res,next)=>{try{res.sendFile(path.join(clientDist,'index.html'));}catch(error){next(error);}});

app.use((error,_req,res,_next)=>{
  console.error('Server error:',error);
  if(res.headersSent)return;
  if(error?.code==='LIMIT_FILE_SIZE') return res.status(413).json({error:`File is too large. Maximum size is ${maxMb} MB.`});
  const status=Number(error?.status||error?.statusCode||500);
  const message=status>=500&&status!==502?'The server could not complete the request.':(error?.message||'Request failed.');
  res.status(status>=400&&status<600?status:500).json({error:message});
});

await ensureDirs();
app.listen(port,'0.0.0.0',()=>console.log(`Nova Document AI Agent running on http://localhost:${port} using ${configuredModel}`));
