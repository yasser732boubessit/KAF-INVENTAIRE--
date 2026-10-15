import React, { useState, useEffect } from 'react';
import { 
  Lock, 
  User, 
  KeyRound, 
  Eye, 
  EyeOff, 
  ShieldCheck, 
  Wifi, 
  WifiOff, 
  AlertCircle, 
  ArrowRight, 
  Languages, 
  Cpu, 
  CheckCircle2, 
  Loader2 
} from 'lucide-react';
import { Language, UserRole } from '../types';
import { AppUser } from '../security/permissions';
import { authService } from '../security/authService';
import { sound } from '../utils/audio';
import { KafLogo } from './KafLogo';

interface LoginScreenProps {
  lang: Language;
  setLang: (lang: Language) => void;
  onLoginSuccess: (user: AppUser, isOffline?: boolean) => void;
}

export const LoginScreen: React.FC<LoginScreenProps> = ({
  lang,
  setLang,
  onLoginSuccess
}) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [isServerOnline, setIsServerOnline] = useState<boolean>(true);
  const [isCheckingHealth, setIsCheckingHealth] = useState(false);

  // Check backend health on mount
  useEffect(() => {
    let isMounted = true;
    const checkServer = async () => {
      setIsCheckingHealth(true);
      try {
        const res = await fetch('/api/health', { method: 'GET' });
        if (isMounted) {
          setIsServerOnline(res.ok);
        }
      } catch {
        if (isMounted) {
          setIsServerOnline(false);
        }
      } finally {
        if (isMounted) setIsCheckingHealth(false);
      }
    };

    checkServer();
    return () => {
      isMounted = false;
    };
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);

    const cleanUser = username.trim();
    if (!cleanUser) {
      setErrorMessage(
        lang === 'ar'
          ? 'يرجى إدخال اسم المستخدم أو البريد الإلكتروني.'
          : 'Veuillez saisir votre nom d\'utilisateur ou adresse e-mail.'
      );
      sound.playAlert();
      return;
    }

    if (!password) {
      setErrorMessage(
        lang === 'ar' 
          ? 'يرجى إدخال كلمة المرور.' 
          : 'Veuillez saisir votre mot de passe.'
      );
      sound.playAlert();
      return;
    }

    setIsLoading(true);

    try {
      const result = await authService.login(cleanUser, password);

      if (result.success && result.user) {
        sound.playScanSuccess();
        const modeLabel = result.isOffline
          ? (lang === 'ar' ? 'جلسة محلية غير متصلة' : 'Session locale hors-ligne')
          : (lang === 'ar' ? 'جلسة مركزية متصلة' : 'Session centrale connectée');

        setSuccessMessage(
          lang === 'ar'
            ? `مرحباً بك، ${result.user.fullName} (${modeLabel})`
            : `Bienvenue, ${result.user.fullName} (${modeLabel})`
        );

        setTimeout(() => {
          onLoginSuccess(result.user!, result.isOffline);
        }, 350);
      } else {
        sound.playAlert();
        setErrorMessage(
          result.error || 
          (lang === 'ar' 
            ? 'فشل تسجيل الدخول. يرجى التحقق من بياناتك.' 
            : 'Échec de l\'authentification. Veuillez vérifier vos identifiants.')
        );
      }
    } catch (err: any) {
      sound.playAlert();
      setErrorMessage(
        err.message || 
        (lang === 'ar' 
          ? 'حدث خطأ غير متوقع أثناء تسجيل الدخول.' 
          : 'Une erreur inattendue est survenue lors de l\'authentification.')
      );
    } finally {
      setIsLoading(false);
    }
  };

  // Helper chips to prefill demo accounts
  const handleSelectDemo = (u: string, p: string) => {
    setUsername(u);
    setPassword(p);
    setErrorMessage(null);
    sound.playTap();
  };

  const isRtl = lang === 'ar';

  return (
    <div 
      className="min-h-screen bg-[#0B0F17] text-white flex flex-col justify-between selection:bg-emerald-500 selection:text-black font-sans"
      dir={isRtl ? 'rtl' : 'ltr'}
    >
      {/* Top Bar */}
      <header className="border-b border-neutral-800/80 bg-neutral-950/60 backdrop-blur px-4 sm:px-8 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <KafLogo className="h-8 w-auto text-emerald-500" />
          <div className="border-l border-neutral-800 rtl:border-l-0 rtl:border-r pl-3 rtl:pl-0 rtl:pr-3">
            <span className="text-xs font-mono font-bold tracking-wider text-emerald-400 block">
              KAF-INVENTAIRE
            </span>
            <span className="text-[10px] text-neutral-400 block">
              {lang === 'ar' ? 'نظام تتبع الأصول الصناعية' : 'Système de Traçabilité Industrielle'}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* Server status indicator */}
          <div 
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded text-[11px] font-mono border ${
              isServerOnline 
                ? 'bg-emerald-950/40 border-emerald-800/60 text-emerald-400' 
                : 'bg-amber-950/40 border-amber-800/60 text-amber-400'
            }`}
            title={
              isServerOnline 
                ? (lang === 'ar' ? 'الخادم المركزي متصل (PostgreSQL 16)' : 'Serveur central en ligne (PostgreSQL 16)')
                : (lang === 'ar' ? 'الخادم المركزي غير متصل (المصادقة المحلية متاحة)' : 'Serveur central hors-ligne (Authentification locale active)')
            }
          >
            {isServerOnline ? (
              <>
                <Wifi className="w-3.5 h-3.5 text-emerald-400" />
                <span className="hidden sm:inline">CENTRAL SERVER: ONLINE</span>
              </>
            ) : (
              <>
                <WifiOff className="w-3.5 h-3.5 text-amber-400" />
                <span className="hidden sm:inline">OFFLINE MODE (SQLITE)</span>
              </>
            )}
          </div>

          {/* Language Selector */}
          <button
            type="button"
            onClick={() => {
              const next = lang === 'ar' ? 'fr' : 'ar';
              setLang(next);
              sound.playTap();
            }}
            className="flex items-center gap-1.5 px-3 py-1 bg-neutral-900 hover:bg-neutral-800 border border-neutral-700 rounded text-xs text-neutral-200 transition-colors"
            title={lang === 'ar' ? 'Passer en Français' : 'التحويل إلى العربية'}
          >
            <Languages className="w-3.5 h-3.5 text-emerald-400" />
            <span className="font-bold">{lang === 'ar' ? 'Français' : 'العربية'}</span>
          </button>
        </div>
      </header>

      {/* Main Login Card Area */}
      <main className="flex-1 flex items-center justify-center p-4 sm:p-6">
        <div className="w-full max-w-md">
          {/* Main Card */}
          <div className="bg-neutral-900/90 border border-neutral-800 rounded-xl p-6 sm:p-8 shadow-2xl relative overflow-hidden">
            {/* Subtle top indicator bar */}
            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-emerald-600 via-emerald-400 to-teal-500" />

            {/* Title & Badge */}
            <div className="text-center mb-6">
              <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 mb-3 shadow-inner">
                <ShieldCheck className="w-6 h-6" />
              </div>
              <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-white">
                {lang === 'ar' ? 'تسجيل الدخول للمنظومة' : 'Connexion Opérateur'}
              </h1>
              <p className="text-xs text-neutral-400 mt-1">
                {lang === 'ar' 
                  ? 'أدخل بيانات الاعتماد الخاصة بك للوصول إلى بيئة العمل' 
                  : 'Veuillez vous authentifier pour accéder au terminal KAF'}
              </p>
            </div>

            {/* Error Notification */}
            {errorMessage && (
              <div className="mb-5 bg-red-950/60 border border-red-800/80 rounded-lg p-3 text-red-200 text-xs flex items-start gap-2.5 animate-in fade-in duration-200">
                <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
                <span className="leading-relaxed">{errorMessage}</span>
              </div>
            )}

            {/* Success Notification */}
            {successMessage && (
              <div className="mb-5 bg-emerald-950/60 border border-emerald-800/80 rounded-lg p-3 text-emerald-200 text-xs flex items-start gap-2.5 animate-in fade-in duration-200">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                <span className="leading-relaxed">{successMessage}</span>
              </div>
            )}

            {/* Login Form */}
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Username Field */}
              <div>
                <label className="block text-xs font-semibold text-neutral-300 mb-1.5">
                  {lang === 'ar' ? 'اسم المستخدم أو البريد' : 'Nom d\'utilisateur ou E-mail'}
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 rtl:left-auto rtl:right-0 pl-3 rtl:pl-0 rtl:pr-3 flex items-center pointer-events-none text-neutral-400">
                    <User className="w-4 h-4" />
                  </div>
                  <input
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    disabled={isLoading}
                    autoComplete="username"
                    autoFocus
                    placeholder={lang === 'ar' ? 'مثال: admin.patrimoine' : 'Ex: admin.patrimoine ou team1'}
                    className="w-full bg-neutral-950 border border-neutral-700/80 rounded-lg py-2.5 pl-10 pr-3 rtl:pl-3 rtl:pr-10 text-sm text-white placeholder-neutral-400 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-colors font-mono"
                  />
                </div>
              </div>

              {/* Password Field */}
              <div>
                <label className="block text-xs font-semibold text-neutral-300 mb-1.5">
                  {lang === 'ar' ? 'كلمة المرور' : 'Mot de passe'}
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 rtl:left-auto rtl:right-0 pl-3 rtl:pl-0 rtl:pr-3 flex items-center pointer-events-none text-neutral-400">
                    <KeyRound className="w-4 h-4" />
                  </div>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    disabled={isLoading}
                    autoComplete="current-password"
                    placeholder="••••••••••••"
                    className="w-full bg-neutral-950 border border-neutral-700/80 rounded-lg py-2.5 pl-10 pr-10 rtl:pl-10 rtl:pr-10 text-sm text-white placeholder-neutral-400 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-colors font-mono"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    tabIndex={-1}
                    className="absolute inset-y-0 right-0 rtl:right-auto rtl:left-0 pr-3 rtl:pr-0 rtl:pl-3 flex items-center text-neutral-400 hover:text-neutral-200 transition-colors"
                    title={showPassword ? 'Masquer le mot de passe' : 'Afficher le mot de passe'}
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={isLoading}
                className="w-full bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 text-white font-semibold py-2.5 px-4 rounded-lg text-sm shadow-lg shadow-emerald-900/30 flex items-center justify-center gap-2 transition-all duration-150 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer mt-2"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>{lang === 'ar' ? 'جاري التحقق...' : 'Vérification en cours...'}</span>
                  </>
                ) : (
                  <>
                    <span>{lang === 'ar' ? 'تسجيل الدخول' : 'Se connecter'}</span>
                    <ArrowRight className="w-4 h-4 rtl:rotate-180" />
                  </>
                )}
              </button>
            </form>

            {/* Offline & Security Policy Notice */}
            <div className="mt-6 pt-5 border-t border-neutral-800 text-[11px] text-neutral-400 space-y-2">
              <div className="flex items-start gap-2">
                <Lock className="w-3.5 h-3.5 text-neutral-400 shrink-0 mt-0.5" />
                <span>
                  {lang === 'ar'
                    ? 'الحسابات تدار حصرياً من قِبل مسؤول النظام. التسجيل الذاتي العام معطل لدواعي الأمان.'
                    : 'Comptes administrés exclusivement par le Responsable Patrimoine. Inscription publique désactivée.'}
                </span>
              </div>
            </div>

            {/* Demo Accounts Quick Selector for Testing */}
            <div className="mt-5 p-3 rounded-lg bg-neutral-950/60 border border-neutral-800/80">
              <span className="text-[10px] uppercase font-mono font-bold tracking-wider text-neutral-400 block mb-2">
                {lang === 'ar' ? 'حسابات التجربة والاختبار السريع :' : 'Comptes de démonstration préconfigurés :'}
              </span>
              <div className="grid grid-cols-1 gap-1.5 text-xs">
                <button
                  type="button"
                  onClick={() => handleSelectDemo('admin.patrimoine', 'admin123')}
                  className="w-full text-left rtl:text-right px-2.5 py-1.5 rounded bg-neutral-900 hover:bg-neutral-800 border border-neutral-800 flex items-center justify-between text-neutral-300 transition-colors"
                >
                  <span className="font-mono font-medium text-emerald-400">admin.patrimoine</span>
                  <span className="text-[10px] text-neutral-400">ADMIN (admin123)</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleSelectDemo('agent.identification', 'agent123')}
                  className="w-full text-left rtl:text-right px-2.5 py-1.5 rounded bg-neutral-900 hover:bg-neutral-800 border border-neutral-800 flex items-center justify-between text-neutral-300 transition-colors"
                >
                  <span className="font-mono font-medium text-blue-400">agent.identification</span>
                  <span className="text-[10px] text-neutral-400">ÉQUIPE 1 (agent123)</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleSelectDemo('controleur.chargement', 'ctrl123')}
                  className="w-full text-left rtl:text-right px-2.5 py-1.5 rounded bg-neutral-900 hover:bg-neutral-800 border border-neutral-800 flex items-center justify-between text-neutral-300 transition-colors"
                >
                  <span className="font-mono font-medium text-amber-400">controleur.chargement</span>
                  <span className="text-[10px] text-neutral-400">ÉQUIPE 2/3 (ctrl123)</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-neutral-800/80 bg-neutral-950/80 px-4 py-3 text-center text-xs text-neutral-400">
        <p>
          {lang === 'ar'
            ? 'مجمع كوتاما للصناعات الغذائية (KOTAMA AGRI-FOOD) — قطاع تدقيق الجرد وتتبع الأصول'
            : 'KOTAMA AGRI-FOOD — Direction de l\'Audit et du Patrimoine Industriel'}
        </p>
      </footer>
    </div>
  );
};
