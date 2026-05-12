import React, { useState } from 'react';
import { login } from './auth/authService';

// ── Locale detection ────────────────────────────────────────────────────────
function detectLocale(): string {
  const m = (globalThis.location?.pathname ?? '').match(/\/content\/adkstvite\/([a-z]{2}\/[a-z]{2})\//);
  return m ? m[1] : 'us/en';
}

// ── i18n ────────────────────────────────────────────────────────────────────
interface SignInI18n {
  noAccount: string; registerFree: string;
  emailLabel: string; passwordLabel: string; forgotPassword: string;
  submitLabel: string; submittingLabel: string;
  welcomeBack: string; redirectMsg: string;
  emailRequired: string; emailInvalid: string;
  passwordRequired: string; passwordTooShort: string;
  genericError: string;
}
const SIGN_IN_I18N: Record<string, SignInI18n> = {
  'us/en': {
    noAccount: "Don't have an account?", registerFree: 'Register free',
    emailLabel: 'Email address', passwordLabel: 'Password', forgotPassword: 'Forgot password?',
    submitLabel: 'Sign In', submittingLabel: 'Signing in…',
    welcomeBack: 'Welcome back!', redirectMsg: "You're signed in. Redirecting to your dashboard…",
    emailRequired: 'Email is required.', emailInvalid: 'Please enter a valid email address.',
    passwordRequired: 'Password is required.', passwordTooShort: 'Password must be at least 8 characters.',
    genericError: 'Something went wrong. Please try again.',
  },
  'fr/fr': {
    noAccount: "Vous n'avez pas de compte ?", registerFree: "S'inscrire gratuitement",
    emailLabel: 'Adresse e-mail', passwordLabel: 'Mot de passe', forgotPassword: 'Mot de passe oublié ?',
    submitLabel: 'Se connecter', submittingLabel: 'Connexion en cours…',
    welcomeBack: 'Bon retour !', redirectMsg: 'Vous êtes connecté. Redirection vers votre tableau de bord…',
    emailRequired: "L'adresse e-mail est obligatoire.", emailInvalid: 'Veuillez entrer une adresse e-mail valide.',
    passwordRequired: 'Le mot de passe est obligatoire.', passwordTooShort: 'Le mot de passe doit comporter au moins 8 caractères.',
    genericError: 'Une erreur est survenue. Veuillez réessayer.',
  },
  'es/es': {
    noAccount: '¿No tienes cuenta?', registerFree: 'Regístrate gratis',
    emailLabel: 'Correo electrónico', passwordLabel: 'Contraseña', forgotPassword: '¿Olvidaste tu contraseña?',
    submitLabel: 'Iniciar sesión', submittingLabel: 'Iniciando sesión…',
    welcomeBack: '¡Bienvenido de vuelta!', redirectMsg: 'Has iniciado sesión. Redirigiendo a tu panel…',
    emailRequired: 'El correo electrónico es obligatorio.', emailInvalid: 'Por favor, introduce una dirección de correo válida.',
    passwordRequired: 'La contraseña es obligatoria.', passwordTooShort: 'La contraseña debe tener al menos 8 caracteres.',
    genericError: 'Algo salió mal. Por favor, inténtalo de nuevo.',
  },
};

interface FormState {
  email: string;
  password: string;
}

interface FieldError {
  email?: string;
  password?: string;
}

interface SignInFormProps {
  heading?: string;
  description?: string;
}

const SignInForm: React.FC<SignInFormProps> = ({
  heading = 'Sign in to your account',
  description,
}) => {
  const locale = detectLocale();
  const t = SIGN_IN_I18N[locale] ?? SIGN_IN_I18N['us/en'];
  const base = `/content/adkstvite/${locale}`;

  const [form, setForm] = useState<FormState>({ email: '', password: '' });
  const [errors, setErrors] = useState<FieldError>({});
  const [submitted, setSubmitted] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const validate = (): FieldError => {
    const e: FieldError = {};
    if (!form.email) e.email = t.emailRequired;
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email))
      e.email = t.emailInvalid;
    if (!form.password) e.password = t.passwordRequired;
    else if (form.password.length < 8)
      e.password = t.passwordTooShort;
    return e;
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
    if (errors[name as keyof FieldError]) {
      setErrors((prev) => ({ ...prev, [name]: undefined }));
    }
  };

  const handleSubmit = async (e: React.SyntheticEvent) => {
    e.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length > 0) {
      setErrors(errs);
      return;
    }
    setApiError(null);
    setIsSubmitting(true);
    try {
      const result = await login(form.email, form.password);
      if (result.error) {
        setApiError(result.error);
      } else {
        setSubmitted(true);
        globalThis.location.href = `${base}/account.html`;
      }
    } catch {
      setApiError(t.genericError);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (submitted) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[300px] py-12 text-center">
        <div className="w-16 h-16 rounded-full bg-amber-100 flex items-center justify-center mb-4">
          <svg className="w-8 h-8 text-amber-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">{t.welcomeBack}</h2>
        <p className="text-gray-500 text-sm">{t.redirectMsg}</p>
      </div>
    );
  }

  return (
    <section
      className="min-h-screen flex items-center justify-center bg-gradient-to-br from-stone-100 to-amber-50 px-4 py-24"
      aria-labelledby="sign-in-heading"
    >
      <div className="w-full max-w-md">
        <div className="bg-white rounded-2xl shadow-xl p-8 sm:p-10">
          {/* Heading */}
          <div className="text-center mb-8">
            <a
              href={`${base}/home.html`}
              className="inline-flex items-center gap-1 text-amber-600 font-bold text-base mb-4"
            >
              ← AdventureTrails
            </a>
            <h1 id="sign-in-heading" className="text-2xl font-extrabold text-gray-900">
              {heading}
            </h1>
            {description && (
              <p className="mt-1 text-sm text-gray-500">{description}</p>
            )}
            <p className="mt-1 text-sm text-gray-500">
              {t.noAccount}{' '}
              <a
                href={`${base}/register.html`}
                className="font-semibold text-amber-600 hover:underline"
              >
                {t.registerFree}
              </a>
            </p>
          </div>

          <form onSubmit={handleSubmit} noValidate className="space-y-5">
            {/* Email */}
            <div>
              <label htmlFor="signin-email" className="block text-sm font-medium text-gray-700 mb-1">
                {t.emailLabel}
              </label>
              <input
                id="signin-email"
                name="email"
                type="email"
                autoComplete="email"
                value={form.email}
                onChange={handleChange}
                aria-describedby={errors.email ? 'email-error' : undefined}
                aria-invalid={!!errors.email}
                className={`w-full px-4 py-2.5 rounded-xl border text-sm outline-none transition
                  focus:ring-2 focus:ring-amber-500
                  ${errors.email ? 'border-red-400 bg-red-50' : 'border-gray-300 bg-white'}`}
                placeholder="you@email.com"
              />
              {errors.email && (
                <p id="email-error" role="alert" className="mt-1 text-xs text-red-600">
                  {errors.email}
                </p>
              )}
            </div>

            {/* Password */}
            <div>
              <div className="flex justify-between items-center mb-1">
                <label htmlFor="signin-password" className="block text-sm font-medium text-gray-700">
                  {t.passwordLabel}
                </label>
                <a href="#" className="text-xs text-amber-600 hover:underline">
                  {t.forgotPassword}
                </a>
              </div>
              <input
                id="signin-password"
                name="password"
                type="password"
                autoComplete="current-password"
                value={form.password}
                onChange={handleChange}
                aria-describedby={errors.password ? 'password-error' : undefined}
                aria-invalid={!!errors.password}
                className={`w-full px-4 py-2.5 rounded-xl border text-sm outline-none transition
                  focus:ring-2 focus:ring-amber-500
                  ${errors.password ? 'border-red-400 bg-red-50' : 'border-gray-300 bg-white'}`}
                placeholder="••••••••"
              />
              {errors.password && (
                <p id="password-error" role="alert" className="mt-1 text-xs text-red-600">
                  {errors.password}
                </p>
              )}
            </div>

            {apiError && (
              <p role="alert" className="text-sm text-red-600 text-center">
                {apiError}
              </p>
            )}

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-3 rounded-lg text-sm font-bold text-white bg-amber-600 hover:bg-amber-700 transition-colors shadow focus:outline-none focus:ring-2 focus:ring-amber-500 focus:ring-offset-2 disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {isSubmitting ? t.submittingLabel : t.submitLabel}
            </button>
          </form>
        </div>
      </div>
    </section>
  );
};

export default SignInForm;
