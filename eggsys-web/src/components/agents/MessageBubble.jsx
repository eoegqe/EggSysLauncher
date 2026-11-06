import React, { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import { ChevronRight, Check, Loader2, AlertCircle, Wrench } from 'lucide-react';

function statusMeta(status) {
  switch (status) {
    case 'pending':
    case 'running':
    case 'in_progress':
      return { icon: <Loader2 className="w-3.5 h-3.5 animate-spin" />, text: 'Working…', cls: 'text-blue-500' };
    case 'completed':
    case 'success':
      return { icon: <Check className="w-3.5 h-3.5" />, text: 'Done', cls: 'text-green-500' };
    case 'failed':
    case 'error':
      return { icon: <AlertCircle className="w-3.5 h-3.5" />, text: 'Failed', cls: 'text-red-500' };
    default:
      return { icon: <Wrench className="w-3.5 h-3.5" />, text: status || 'Tool', cls: 'text-gray-500' };
  }
}

function ToolCallDisplay({ toolCall }) {
  const [expanded, setExpanded] = useState(false);
  const meta = statusMeta(toolCall.status);

  let parsedArgs = toolCall.arguments_string;
  try { parsedArgs = JSON.parse(toolCall.arguments_string); } catch { /* keep raw */ }

  let parsedResults = toolCall.results;
  if (typeof parsedResults === 'string') {
    try { parsedResults = JSON.parse(parsedResults); } catch { /* keep raw */ }
  }

  const failed = ['failed', 'error'].includes(toolCall.status) ||
    (typeof parsedResults === 'string' && /error|failed/i.test(parsedResults)) ||
    (parsedResults && typeof parsedResults === 'object' && parsedResults.success === false);

  const proj = toolCall.display_projection || {};
  const hideDetails = proj.hide_details && proj.details_redacted;

  const label = failed ? (proj.error_label || 'Action failed') : (meta.text);

  return (
    <div className="mt-2 text-xs border border-white/10 rounded-lg overflow-hidden bg-zinc-900/60">
      <button
        onClick={() => !hideDetails && setExpanded(!expanded)}
        className={`w-full flex items-center gap-2 px-3 py-2 ${hideDetails ? '' : 'hover:bg-white/5'} transition-colors`}
      >
        {failed ? <AlertCircle className="w-3.5 h-3.5 text-red-500" /> : meta.icon}
        <span className="font-medium text-zinc-200">{toolCall.name}</span>
        <span className={failed ? 'text-red-400' : meta.cls}>{label}</span>
        {!hideDetails && (
          <ChevronRight className={`w-3.5 h-3.5 ml-auto text-zinc-500 transition-transform ${expanded ? 'rotate-90' : ''}`} />
        )}
      </button>
      {expanded && !hideDetails && (
        <div className="px-3 pb-3 space-y-2 border-t border-white/5">
          {parsedArgs !== undefined && (
            <div>
              <div className="text-zinc-500 mb-1">Parameters:</div>
              <pre className="bg-black/40 rounded-md p-2 overflow-x-auto text-zinc-300 whitespace-pre-wrap break-words">
                {typeof parsedArgs === 'string' ? parsedArgs : JSON.stringify(parsedArgs, null, 2)}
              </pre>
            </div>
          )}
          {parsedResults !== undefined && (
            <div>
              <div className="text-zinc-500 mb-1">Result:</div>
              <pre className="bg-black/40 rounded-md p-2 overflow-x-auto text-zinc-300 whitespace-pre-wrap break-words">
                {typeof parsedResults === 'string' ? parsedResults : JSON.stringify(parsedResults, null, 2)}
              </pre>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function MessageBubble({ message }) {
  const isUser = message.role === 'user';
  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}>
      <div className={`max-w-[85%] rounded-2xl px-4 py-3 ${isUser
        ? 'bg-gradient-to-br from-violet-600 to-indigo-600 text-white'
        : 'bg-zinc-800/80 text-zinc-100 border border-white/5'}`}>
        {message.content && (isUser
          ? <p className="text-sm whitespace-pre-wrap break-words leading-relaxed">{message.content}</p>
          : <div className="prose prose-sm prose-invert max-w-none [&_code]:bg-black/40 [&_code]:px-1.5 [&_code]:py-0.5 [&_code]:rounded [&_pre]:bg-black/40 [&_pre]:p-3 [&_pre]:rounded-lg [&_pre]:overflow-x-auto [&_pre_code]:bg-transparent [&_pre_code]:p-0">
              <ReactMarkdown>{message.content}</ReactMarkdown>
            </div>
        )}
        {message.tool_calls?.map((tc, i) => <ToolCallDisplay key={i} toolCall={tc} />)}
      </div>
    </div>
  );
}