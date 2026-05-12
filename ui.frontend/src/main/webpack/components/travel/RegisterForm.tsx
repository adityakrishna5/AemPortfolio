import React, { useState } from 'react';
import { signup } from './auth/authService';

// ── Locale detection ────────────────────────────────────────────────────────
function detectLocale(): string {
  const m = (globalThis.location?.pathname ?? '').match(/\/content\/adkstvite\/([a-z]{2}\/[a-z]{2})\//);
  return m ? m[1] : 'us/en';
}

// ── i18n ────────────────────────────────────────────────────────────────────
interface RegisterI18n {
  alreadyHaveAccount: string; signIn: string;
  firstName: string; lastName: string; email: string;
  password: string; confirmPassword: string;
  createAccount: string; creatingAccount: string;
  welcomeMsg: string; accountReady: string;
  signInToExplore: string; signInButton: string; backToHome: string;
  firstNameRequired: string; lastNameRequired: string;
  emailRequired: string; emailInvalid: string;
  passwordRequired: string; passwordTooShort: string;
  confirmPasswordRequired: string; passwordsMismatch: string;
  genericError: string;
}
const REGISTER_I18N: Record<string, RegisterI18n> = {
  'us/en': {
    alreadyHaveAccount: 'Already have an account?', signIn: 'Sign in',
    firstName: 'First name', lastName: 'Last name', email: 'Email address',
    password: 'Password', confirmPassword: 'Confirm password',
    createAccount: 'Create Account', creatingAccount: 'Creating account\u2026',
    welcomeMsg: 'Welcome, {name}!', accountReady: 'Your AdventureTrails account is ready.',
    signInToExplore: 'Sign in below to start exploring destinations.',
    signInButton: 'Sign In to Your Account', backToHome: '\u2190 Back to home',
    firstNameRequired: 'First name is required.', lastNameRequired: 'Last name is required.',
    emailRequired: 'Email is required.', emailInvalid: 'Please enter a valid email address.',
    passwordRequired: 'Password is required.', passwordTooShort: 'Password must be at least 8 characters.',
    confirmPasswordRequired: 'Please confirm your password.', passwordsMismatch: 'Passwords do not match.',
    genericError: 'Something went wrong. Please try again.',
  },
  'fr/fr': {
    alreadyHaveAccount: 'Vous avez d\u00e9j\u00e0 un compte\u00a0?', signIn: 'Se connecter',
    firstName: 'Pr\u00e9nom', lastName: 'Nom de famille', email: 'Adresse e-mail',
    password: 'Mot de passe', confirmPassword: 'Confirmer le mot de passe',
    createAccount: 'Cr\u00e9er un compte', creatingAccount: 'Cr\u00e9ation du compte\u2026',
    welcomeMsg: 'Bienvenue, {name}\u00a0!', accountReady: 'Votre compte AdventureTrails est pr\u00eat.',
    signInToExplore: 'Connectez-vous pour commencer \u00e0 explorer les destinations.',
    signInButton: 'Connectez-vous \u00e0 votre compte', backToHome: '\u2190 Retour \u00e0 l\u2019accueil',
    firstNameRequired: 'Le pr\u00e9nom est obligatoire.', lastNameRequired: 'Le nom de famille est obligatoire.',
    emailRequired: "L'adresse e-mail est obligatoire.", emailInvalid: 'Veuillez entrer une adresse e-mail valide.',
    passwordRequired: 'Le mot de passe est obligatoire.', passwordTooShort: 'Le mot de passe doit comporter au moins 8 caract\u00e8res.',
    confirmPasswordRequired: 'Veuillez confirmer votre mot de passe.', passwordsMismatch: 'Les mots de passe ne correspondent pas.',
    genericError: 'Une erreur est survenue. Veuillez r\u00e9essayer.',
  },
  'es/es': {
    alreadyHaveAccount: '\u00bfYa tienes una cuenta?', signIn: 'Iniciar sesi\u00f3n',
    firstName: 'Nombre', lastName: 'Apellido', email: 'Correo electr\u00f3nico',
    password: 'Contrase\u00f1a', confirmPassword: 'Confirmar contrase\u00f1a',
    createAccount: 'Crear cuenta', creatingAccount: 'Creando cuenta\u2026',
    welcomeMsg: '\u00a1Bienvenido, {name}!', accountReady: 'Tu cuenta de AdventureTrails est\u00e1 lista.',
    signInToExplore: 'Inicia sesi\u00f3n para comenzar a explorar destinos.',
    signInButton: 'Inicia sesi\u00f3n en tu cuenta', backToHome: '\u2190 Volver al inicio',
    firstNameRequired: 'El nombre es obligatorio.', lastNameRequired: 'El apellido es obligatorio.',
    emailRequired: 'El correo electr\u00f3nico es obligatorio.', emailInvalid: 'Por favor, introduce una direcci\u00f3n de correo v\u00e1lida.',
    passwordRequired: 'La contrase\u00f1a es obligatoria.', passwordTooShort: 'La contrase\u00f1a debe tener al menos 8 caracteres.',
    confirmPasswordRequired: 'Por favor, confirma tu contrase\u00f1a.', passwordsMismatch: 'Las contrase\u00f1as no coinciden.',
    genericError: 'Algo sali\u00f3 mal. Por favor, in\u00e9ntalo de nuevo.',
  },
};

interface FormState {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  confirmPassword: string;
}

interface FieldError {
  firstName?: string;
  lastName?: string;
  email?: string;
  password?: string;
  confirmPassword?: string;
}

interface RegisterFormProps {
  heading?: string;
  description?: string;
}

const RegisterForm: React.FC<RegisterFormProps> = ({
  heading = 'Create your account',
  description,
}) => {
  const locale = detectLocale();
  const t = REGISTER_I18N[locale] ?? REGISTER_I18N['us/en'];
  const base = `/content/adkstvite/${locale}`;

  const [form, setForm] = useState<FormState>({
    firstName: '',
    lastName: '',
    email: '',
    password: '',
    confirmPassword: '',
  });
  const [errors, setErrors] = useState<FieldError>({});
  const [submitted, setSubmitted] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const validate = (): FieldError => {
    const e: FieldError = {};
    if (!form.firstName.trim()) e.firstName = t.firstNameRequired;
    if (!form.lastName.trim()) e.lastName = t.lastNameRequired;
    if (!form.email) e.email = t.emailRequired;
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email))
      e.email = t.emailInvalid;
    if (!form.password) e.password = t.passwordRequired;
    else if (form.password.length < 8)
      e.password = t.passwordTooShort;
    if (!form.confirmPassword) e.confirmPassword = t.confirmPasswordRequired;
    else if (form.password !== form.confirmPassword)
      e.confirmPassword = t.passwordsMismatch;
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
      const result = await signup(form.email, form.password, form.firstName, form.lastName);
      if (result.error) {
        setApiError(result.error);
      } else if (result.autoSignedIn) {
        // Auto-login succeeded – cookies are set, go straight to the account page.
        globalThis.location.href = `${base}/account.html`;
      } else {
        // Auto-login didn't fire; show the success screen so the user can sign in manually.
        setSubmitted(true);
      }
    } catch {
      setApiError(t.genericError);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (submitted) {
    return (
      <section
        className="min-h-screen flex items-center justify-center bg-gradient-to-br from-stone-100 to-amber-50 px-4 py-24"
        aria-labelledby="reg-success-heading"
      >
        <div className="w-full max-w-md">
          <div className="bg-white rounded-2xl shadow-xl p-8 sm:p-10 text-center">
            {/* Check icon */}
            <div className="w-16 h-16 rounded-full bg-amber-100 flex items-center justify-center mx-auto mb-6">
              <svg className="w-8 h-8 text-amber-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
            </div>

            <h2 id="reg-success-heading" className="text-2xl font-extrabold text-gray-900 mb-2">
              {t.welcomeMsg.replace('{name}', form.firstName)}
            </h2>
            <p className="text-gray-500 text-sm mb-1">{t.accountReady}</p>
            <p className="text-gray-400 text-xs mb-8">{t.signInToExplore}</p>

            <a
              href={`${base}/sign-in.html`}
              className="inline-block w-full py-3 rounded-xl text-sm font-bold text-white bg-amber-600 hover:bg-amber-700 transition-colors shadow focus:outline-none focus:ring-2 focus:ring-amber-500 focus:ring-offset-2"
            >
              {t.signInButton}
            </a>

            <p className="mt-6 text-xs text-gray-400">
              <a href={`${base}/home.html`} className="hover:underline text-amber-600">
                {t.backToHome}
              </a>
            </p>
          </div>
        </div>
      </section>
    );
  }

  const fields: Array<{
    id: string;
    name: keyof FormState;
    label: string;
    type: string;
    autoComplete: string;
    placeholder: string;
  }> = [
    { id: 'reg-first-name', name: 'firstName', label: t.firstName, type: 'text', autoComplete: 'given-name', placeholder: 'Jane' },
    { id: 'reg-last-name', name: 'lastName', label: t.lastName, type: 'text', autoComplete: 'family-name', placeholder: 'Explorer' },
    { id: 'reg-email', name: 'email', label: t.email, type: 'email', autoComplete: 'email', placeholder: 'you@email.com' },
    { id: 'reg-password', name: 'password', label: t.password, type: 'password', autoComplete: 'new-password', placeholder: '••••••••' },
    { id: 'reg-confirm-password', name: 'confirmPassword', label: t.confirmPassword, type: 'password', autoComplete: 'new-password', placeholder: '••••••••' },
  ];

  return (
    <section
      className="min-h-screen flex items-center justify-center bg-gradient-to-br from-stone-100 to-amber-50 px-4 py-24"
      aria-labelledby="register-heading"
    >
      <div className="w-full max-w-md">
        <div className="bg-white rounded-2xl shadow-xl p-8 sm:p-10">
          <div className="text-center mb-8">
            <a
              href={`${base}/home.html`}
              className="inline-flex items-center gap-1 text-amber-600 font-bold text-base mb-4"
            >
              ← AdventureTrails
            </a>
            <h1 id="register-heading" className="text-2xl font-extrabold text-gray-900">
              {heading}
            </h1>
            {description && (
              <p className="mt-1 text-sm text-gray-500">{description}</p>
            )}
            <p className="mt-1 text-sm text-gray-500">
              {t.alreadyHaveAccount}{' '}
              <a
                href={`${base}/sign-in.html`}
                className="font-semibold text-amber-600 hover:underline"
              >
                {t.signIn}
              </a>
            </p>
          </div>

          <form onSubmit={handleSubmit} noValidate className="space-y-4">
            {fields.map((f) => {
              const errorMsg = errors[f.name];
              const errorId = `${f.id}-error`;
              return (
                <div key={f.id}>
                  <label htmlFor={f.id} className="block text-sm font-medium text-gray-700 mb-1">
                    {f.label}
                  </label>
                  <input
                    id={f.id}
                    name={f.name}
                    type={f.type}
                    autoComplete={f.autoComplete}
                    value={form[f.name]}
                    onChange={handleChange}
                    placeholder={f.placeholder}
                    aria-describedby={errorMsg ? errorId : undefined}
                    aria-invalid={!!errorMsg}
                    className={`w-full px-4 py-2.5 rounded-xl border text-sm outline-none transition
                      focus:ring-2 focus:ring-amber-500
                      ${errorMsg ? 'border-red-400 bg-red-50' : 'border-gray-300 bg-white'}`}
                  />
                  {errorMsg && (
                    <p id={errorId} role="alert" className="mt-1 text-xs text-red-600">
                      {errorMsg}
                    </p>
                  )}
                </div>
              );
            })}

            {apiError && (
              <p role="alert" className="text-sm text-red-600 text-center">
                {apiError}
              </p>
            )}

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-3 rounded-lg text-sm font-bold text-white bg-amber-600 hover:bg-amber-700 transition-colors shadow focus:outline-none focus:ring-2 focus:ring-amber-500 focus:ring-offset-2 mt-2 disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {isSubmitting ? t.creatingAccount : t.createAccount}
            </button>
          </form>
        </div>
      </div>
    </section>
  );
};

export default RegisterForm;
