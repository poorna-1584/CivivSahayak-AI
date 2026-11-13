import React from 'react';

function renderInlineBold(text: string): React.ReactNode[] {
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  return parts.map((part, i) => {
    if (part.startsWith('**') && part.endsWith('**') && part.length > 4) {
      return (
        <strong key={i} className="font-semibold text-slate-900">
          {part.slice(2, -2)}
        </strong>
      );
    }
    return <React.Fragment key={i}>{part}</React.Fragment>;
  });
}

export function FormattedMessage({ content }: { content: string }) {
  const lines = content.split('\n');

  return (
    <div className="space-y-1.5 text-sm leading-relaxed text-slate-800">
      {lines.map((rawLine, idx) => {
        const line = rawLine.trim();
        if (!line) {
          return <div key={idx} className="h-1.5" />;
        }

        if (line.startsWith('### ')) {
          return (
            <h3 key={idx} className="font-display text-sm font-bold text-slate-900 pt-1.5">
              {renderInlineBold(line.slice(4))}
            </h3>
          );
        }

        if (line.startsWith('## ')) {
          return (
            <h2 key={idx} className="font-display text-base font-bold text-slate-900 pt-1.5">
              {renderInlineBold(line.slice(3))}
            </h2>
          );
        }

        if (line.startsWith('> ')) {
          return (
            <p
              key={idx}
              className="text-xs text-slate-600 bg-white border border-slate-200 rounded-lg px-3 py-2"
            >
              {renderInlineBold(line.slice(2))}
            </p>
          );
        }

        if (line.startsWith('* ') || line.startsWith('- ')) {
          return (
            <div key={idx} className="flex items-start gap-2 pl-1">
              <span className="text-blue-700 mt-0.5">•</span>
              <span className="flex-1">{renderInlineBold(line.slice(2))}</span>
            </div>
          );
        }

        return <p key={idx}>{renderInlineBold(line)}</p>;
      })}
    </div>
  );
}
