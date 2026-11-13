import { useEffect, useState } from 'react';
import { motion } from 'motion/react';
import { BookOpenCheck, Languages, Search } from 'lucide-react';
import type { Language } from '../types';

interface RagThinkingBannerProps {
  language: Language;
  mode?: 'chat' | 'pdf';
}

export function RagThinkingBanner({ language, mode = 'chat' }: RagThinkingBannerProps) {
  const isTe = language === 'te';
  const [activeStep, setActiveStep] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setActiveStep((prev) => (prev + 1) % 3);
    }, 900);
    return () => clearInterval(timer);
  }, []);

  const steps =
    mode === 'pdf'
      ? [
          {
            icon: Languages,
            label: isTe ? 'ప్రశ్న & భాష గుర్తింపు' : 'Understanding Question',
          },
          {
            icon: Search,
            label: isTe ? 'PDF పేజీల శోధన' : 'Scanning PDF Pages',
          },
          {
            icon: BookOpenCheck,
            label: isTe ? 'పేజీ సూచనలతో సమాధానం' : 'Grounding Page Citations',
          },
        ]
      : [
          {
            icon: Languages,
            label: isTe ? 'తెలుగు / ఇంగ్లీష్ గుర్తింపు' : 'Detecting Language',
          },
          {
            icon: Search,
            label: isTe ? 'పథకాల పత్రాల శోధన' : 'Searching Scheme Vectors',
          },
          {
            icon: BookOpenCheck,
            label: isTe ? 'సరళమైన సమాధానం సిద్ధం' : 'Drafting Grounded Reply',
          },
        ];

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
      className="bg-gradient-to-r from-teal-50 via-white to-amber-50/70 border border-teal-200 rounded-xl p-4 max-w-md space-y-3"
    >
      <div className="relative h-1.5 w-full rounded-full bg-teal-100 overflow-hidden">
        <div className="absolute inset-y-0 left-0 w-1/2 rounded-full bg-gradient-to-r from-teal-600 via-emerald-500 to-amber-500 animate-civic-signal" />
      </div>

      <div className="grid grid-cols-3 gap-2">
        {steps.map((step, idx) => {
          const Icon = step.icon;
          const isActive = idx === activeStep;
          return (
            <div
              key={step.label}
              className={`flex flex-col items-center text-center gap-1.5 px-2 py-2 rounded-lg transition-colors ${
                isActive
                  ? 'bg-white border border-teal-200 text-teal-900 shadow-xs'
                  : 'text-slate-500'
              }`}
            >
              <Icon
                className={`w-4 h-4 ${isActive ? 'text-teal-700' : 'text-slate-400'}`}
                strokeWidth={1.85}
              />
              <span className="text-[11px] font-medium leading-tight">{step.label}</span>
            </div>
          );
        })}
      </div>
    </motion.div>
  );
}
