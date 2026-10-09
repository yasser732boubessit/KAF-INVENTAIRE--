import React from 'react';
import { 
  CheckCircle2, 
  Play, 
  HelpCircle, 
  Sparkles, 
  RotateCcw,
  ShieldCheck,
  Check
} from 'lucide-react';
import { ValidationChecklistItem, Language } from '../types';
import { translations } from '../translations';
import { sound } from '../utils/audio';

interface ChecklistValidationViewProps {
  checklist: ValidationChecklistItem[];
  onRunTest: (testId: number) => void;
  lang: Language;
}

export const ChecklistValidationView: React.FC<ChecklistValidationViewProps> = ({
  checklist,
  onRunTest,
  lang
}) => {
  const t = translations[lang];

  const passedCount = checklist.filter(c => c.status === 'PASSED').length;
  const totalCount = checklist.length;

  return (
    <div className="flex-1 bg-[#F8FAFC] overflow-y-auto p-4 lg:p-6 space-y-6">
      {/* Header */}
      <div className="bg-white border border-[#CBD5E1] rounded-lg p-5 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-200 pb-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="font-mono-numbers font-bold text-xs bg-emerald-900 text-emerald-200 px-2.5 py-0.5 rounded">
                HOMOLOGATION & AUDIT TEST SUITE
              </span>
              <h1 className="font-bold text-lg text-slate-900">
                {t.checklistTitle}
              </h1>
            </div>
            <p className="text-xs text-slate-500 mt-1 max-w-3xl">
              {t.checklistSubtitle}
            </p>
          </div>

          <div className="flex items-center gap-3">
            <div className="bg-slate-900 text-white px-3.5 py-1.5 rounded font-mono-numbers text-xs font-bold flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              <span>SCORE: {passedCount} / {totalCount} TESTS VALIDÉS</span>
            </div>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="mt-4">
          <div className="flex justify-between text-xs font-mono-numbers text-slate-600 mb-1">
            <span>Taux de couverture des scénarios critiques :</span>
            <span className="font-bold text-emerald-700">{Math.round((passedCount / totalCount) * 100)}%</span>
          </div>
          <div className="w-full bg-slate-200 h-2 rounded-full overflow-hidden">
            <div 
              className="bg-emerald-600 h-full transition-all duration-500"
              style={{ width: `${(passedCount / totalCount) * 100}%` }}
            />
          </div>
        </div>
      </div>

      {/* 9 Scenarios Interactive Cards */}
      <div className="space-y-3">
        {checklist.map((item) => {
          const isPassed = item.status === 'PASSED';

          return (
            <div
              key={item.id}
              className={`bg-white border-2 rounded-lg p-4 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4 transition-all ${
                isPassed ? 'border-emerald-300 bg-emerald-50/20' : 'border-slate-200'
              }`}
            >
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="w-6 h-6 rounded-full bg-slate-900 text-sky-300 font-mono-numbers text-xs font-bold flex items-center justify-center">
                    {item.id}
                  </span>
                  <h3 className="font-bold text-sm text-slate-900">
                    {lang === 'ar' ? item.titleAr : item.title}
                  </h3>
                  {isPassed && (
                    <span className="bg-emerald-100 text-emerald-800 border border-emerald-300 text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1 font-mono-numbers">
                      <Check className="w-3 h-3 text-emerald-600" /> VALIDÉ IN SITU
                    </span>
                  )}
                </div>
                <p className="text-xs text-slate-600 font-sans ms-8">
                  {item.description}
                </p>
                {item.testedAt && (
                  <div className="text-[10px] text-slate-400 font-mono-numbers ms-8">
                    Dernière exécution réussie: {item.testedAt}
                  </div>
                )}
              </div>

              <div className="flex-shrink-0 ms-8 md:ms-0">
                <button
                  onClick={() => {
                    sound.playScanSuccess();
                    onRunTest(item.id);
                  }}
                  className={`px-3 py-1.5 rounded text-xs font-bold flex items-center gap-1.5 transition-all ${
                    isPassed 
                      ? 'bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-300' 
                      : 'bg-[#0284C7] hover:bg-[#0369a1] text-white shadow-sm'
                  }`}
                >
                  <Play className="w-3.5 h-3.5 fill-current" />
                  <span>{t.testRunAction}</span>
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
