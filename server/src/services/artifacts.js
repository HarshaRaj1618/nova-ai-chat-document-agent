import path from 'node:path';
import fs from 'node:fs/promises';
import XLSX from 'xlsx';
import { Document, Packer, Paragraph, HeadingLevel } from 'docx';
import { generatedDir, newId, safeName } from '../fileStore.js';

export async function createArtifact(kind, name, content) {
  const base = safeName(name || `nova-${newId()}`);
  if (kind === 'xlsx') {
    const filename = base.endsWith('.xlsx') ? base : `${base}.xlsx`;
    const workbook = XLSX.utils.book_new();
    const rows = Array.isArray(content) ? content : [{Result:String(content)}];
    XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(rows), 'Result');
    const filePath = path.join(generatedDir, filename); XLSX.writeFile(workbook,filePath);
    return {name:filename,url:`/api/files/generated/${encodeURIComponent(filename)}`,type:'xlsx'};
  }
  if (kind === 'csv') {
    const filename = base.endsWith('.csv') ? base : `${base}.csv`;
    const rows = Array.isArray(content) ? content : [{Result:String(content)}];
    const workbook = XLSX.utils.book_new(); XLSX.utils.book_append_sheet(workbook,XLSX.utils.json_to_sheet(rows),'Result');
    const filePath=path.join(generatedDir,filename); XLSX.writeFile(workbook,filePath,{bookType:'csv'});
    return {name:filename,url:`/api/files/generated/${encodeURIComponent(filename)}`,type:'csv'};
  }
  if (kind === 'docx') {
    const filename = base.endsWith('.docx') ? base : `${base}.docx`;
    const lines = String(content).split(/\r?\n/).filter(Boolean);
    const doc = new Document({sections:[{children:lines.map((line,i)=>new Paragraph({text:line,heading:i===0?HeadingLevel.TITLE:undefined}))} ]});
    const buffer=await Packer.toBuffer(doc); const filePath=path.join(generatedDir,filename); await fs.writeFile(filePath,buffer);
    return {name:filename,url:`/api/files/generated/${encodeURIComponent(filename)}`,type:'docx'};
  }
  const filename = base.endsWith('.txt') ? base : `${base}.txt`;
  await fs.writeFile(path.join(generatedDir,filename),String(content),'utf8');
  return {name:filename,url:`/api/files/generated/${encodeURIComponent(filename)}`,type:'txt'};
}
