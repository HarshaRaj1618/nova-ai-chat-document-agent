export type FileInfo = { id:string; originalName:string; mimeType:string; size:number; extractedChars:number; preview:string };
export type ChatMessage = { id:string; role:'user'|'assistant'; content:string; files?:string[]; createdAt:string };
export type AgentResult = { message:string; plan:string[]; files:Array<{name:string; url:string; type:string}> };
