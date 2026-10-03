import { generate } from '../services/gemini.js';
import { createArtifact } from '../services/artifacts.js';

function cleanJson(text) {
  const raw = String(text || '').trim();
  const fenced = raw.match(/```(?:json)?\s*([\s\S]*?)```/i);
  return fenced ? fenced[1].trim() : raw;
}

function parsePlan(text) {
  try { return JSON.parse(cleanJson(text)); }
  catch { throw new Error('The AI returned an invalid agent plan. Please try the task again.'); }
}

const allowedActions = new Set(['answer','summarize','extract','analyze','create_xlsx','create_docx','create_csv','create_txt']);

export async function runAgent({prompt, files}) {
  const fileContext = files.map((f,i)=>`\n--- FILE ${i+1}: ${f.originalName} ---\nType: ${f.mimeType}\nExtracted content:\n${f.extractedText}\n`).join('\n');
  const plannerPrompt = `You are the planner for Nova Document AI Agent.\nUser task: ${prompt}\n${fileContext || '\nNo file was attached. Answer using your general knowledge.'}\n\nReturn ONLY valid JSON with this shape:\n{"action":"answer|summarize|extract|analyze|create_xlsx|create_docx|create_csv|create_txt","plan":["step 1","step 2"],"answer":"final answer if no artifact is required","artifactName":"optional filename without path","artifactRows":[{"column":"value"}],"artifactContent":"optional document text"}\nRules: choose create_xlsx/create_csv when the user asks for a spreadsheet/table file; choose create_docx when the user asks for a Word document/report; choose create_txt for a text file; otherwise answer. For artifactRows, return an array of flat JSON objects with consistent columns. Never invent file data. If the request cannot be completed from the supplied file, say what is missing in answer.`;
  const response = await generate(plannerPrompt, {temperature:0.2, responseMimeType:'application/json'});
  const plan = parsePlan(response.text);
  if (!allowedActions.has(plan.action)) plan.action='answer';

  if (plan.action.startsWith('create_')) {
    const kind = plan.action.replace('create_','');
    const content = kind === 'docx' || kind === 'txt' ? (plan.artifactContent || plan.answer || '') : (Array.isArray(plan.artifactRows) ? plan.artifactRows : [{Result:plan.answer || ''}]);
    const artifact = await createArtifact(kind, plan.artifactName || `nova-result-${Date.now()}`, content);
    return { message: plan.answer || 'I completed the task and created the requested file.', plan: plan.plan || [], files:[artifact] };
  }
  return { message: plan.answer || 'I completed the requested analysis.', plan: plan.plan || [], files:[] };
}
