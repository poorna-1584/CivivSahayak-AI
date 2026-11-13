import { useState } from 'react';
import { Landmark } from 'lucide-react';

interface ResilientImageProps {
  src: string;
  alt: string;
  className?: string;
  fallbackTitle?: string;
}

export function ResilientImage({
  src,
  alt,
  className = '',
  fallbackTitle,
}: ResilientImageProps) {
  const [failed, setFailed] = useState(false);

  if (failed) {
    return (
      <div
        className={`flex flex-col items-center justify-center bg-gradient-to-br from-slate-100 via-blue-50 to-slate-200 text-slate-600 p-6 text-center ${className}`}
        role="img"
        aria-label={alt}
      >
        <Landmark className="w-8 h-8 text-blue-700 mb-2" strokeWidth={1.6} />
        {fallbackTitle && (
          <span className="text-sm font-medium text-slate-700">{fallbackTitle}</span>
        )}
      </div>
    );
  }

  return (
    <img
      src={src}
      alt={alt}
      referrerPolicy="no-referrer"
      onError={() => setFailed(true)}
      className={className}
    />
  );
}
