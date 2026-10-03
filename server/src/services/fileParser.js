import fs from 'node:fs/promises';
import path from 'node:path';
import pdf from 'pdf-parse';
import mammoth from 'mammoth';
import XLSX from 'xlsx';

const MAX_EXTRACTED_CHARS = 120000;
const truncate = (s) => String(s ?? '').replace(/\u0000/g,'').slice(0, MAX_EXTRACTED_CHARS);

export async function parseFile(file) {
  const ext = path.extname(file.originalname).toLowerCase();
  if (ext === '.pdf') {
    const data = await pdf(await fs.readFile(file.path));
    return { text: truncate(data.text), structuredData: null };
  }
  if (ext === '.docx') {
    const result = await mammoth.extractRawText({ path:file.path });
    return { text: truncate(result.value), structuredData: null };
  }
  if (ext === '.txt') {
    return { text: truncate(await fs.readFile(file.path,'utf8')), structuredData: null };
  }
  if (ext === '.csv') {
    const csv = await fs.readFile(file.path,'utf8');
    const workbook = XLSX.read(csv, { type:'string', raw:false });
    const rows = XLSX.utils.sheet_to_json(workbook.Sheets[workbook.SheetNames[0]], {defval:null});
    return { text: truncate(JSON.stringify(rows,null,2)), structuredData: { kind:'table', sheets:{[workbook.SheetNames[0]]:rows} } };
  }
  if (ext === '.xlsx' || ext === '.xls') {
    const workbook = XLSX.read(await fs.readFile(file.path), { type:'buffer', cellDates:true });
    const sheets = {};
    for (const name of workbook.SheetNames) sheets[name] = XLSX.utils.sheet_to_json(workbook.Sheets[name], {defval:null});
    return { text: truncate(JSON.stringify(sheets,null,2)), structuredData: {kind:'workbook', sheets} };
  }
  throw new Error('Unsupported file type. Use PDF, DOCX, TXT, CSV, XLSX or XLS.');
}
