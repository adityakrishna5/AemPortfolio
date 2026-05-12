import React from 'react';
import { useAuth } from './auth/useAuth';
import { logout } from './auth/authService';

// ── Locale detection ────────────────────────────────────────────────────────
function detectLocale(): string {
  const m = (globalThis.location?.pathname ?? '').match(/\/content\/adkstvite\/([a-z]{2}\/[a-z]{2})\//);
  return m ? m[1] : 'us/en';
}

// ── i18n ────────────────────────────────────────────────────────────────────
interface AccountI18n {
  loading: string;
  emailNotVerified: string;
  firstName: string;
  lastName: string;
  email: string;
  signOut: string;
}
const ACCOUNT_I18N: Record<string, AccountI18n> = {
  'us/en': {
    loading: 'Loading your account…',
    emailNotVerified: 'Email not verified',
    firstName: 'First name', lastName: 'Last name', email: 'Email',
    signOut: 'Sign Out',
  },
  'fr/fr': {
    loading: 'Chargement de votre compte…',
    emailNotVerified: 'E-mail non vérifié',
    firstName: 'Prénom', lastName: 'Nom de famille', email: 'E-mail',
    signOut: 'Se déconnecter',
  },
  'es/es': {
    loading: 'Cargando tu cuenta…',
    emailNotVerified: 'Correo no verificado',
    firstName: 'Nombre', lastName: 'Apellido', email: 'Correo',
    signOut: 'Cerrar sesión',
  },
};

/**
 * AccountPage
 *
 * Client-side protected island component.
 * - Redirects to sign-in if no valid session cookie is present.
 * - Shows the Auth0 user profile (name, email, picture) when authenticated.
 * - Provides a Sign Out button that clears the HttpOnly cookie via the proxy,
 *   then redirects to the home page.
 */
const AccountPage: React.FC = () => {
  const locale = detectLocale();
  const t = ACCOUNT_I18N[locale] ?? ACCOUNT_I18N['us/en'];
  const base = `/content/adkstvite/${locale}`;
  const SIGN_IN_PATH = `${base}/sign-in.html`;
  const HOME_PATH    = `${base}/home.html`;

  const { user, isAuthenticated, isLoading } = useAuth();

  const handleSignOut = async () => {
    await logout();
    globalThis.location.href = HOME_PATH;
  };

  // ── Loading state ────────────────────────────────────────────────────────
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-stone-100 to-amber-50">
        <div className="flex flex-col items-center gap-4">
          <div
            className="w-12 h-12 rounded-full border-4 border-amber-500 border-t-transparent animate-spin"
            aria-hidden="true"
          />
          <output aria-live="polite" className="text-sm text-stone-600">{t.loading}</output>
        </div>
      </div>
    );
  }

  // ── Guard – unauthenticated ──────────────────────────────────────────────
  if (!isAuthenticated || !user) {
    globalThis.location.href = SIGN_IN_PATH;
    return null;
  }

  // ── Helpers ──────────────────────────────────────────────────────────────
  const fullName   = [user.given_name, user.family_name].filter(Boolean).join(' ') || user.name || user.email;
  const initials   = (user.given_name?.[0] ?? user.name?.[0] ?? user.email[0]).toUpperCase();

  // ── Authenticated view ───────────────────────────────────────────────────
  return (
    <main
      className="min-h-screen bg-gradient-to-br from-stone-100 to-amber-50 flex items-center justify-center px-4 py-24"
      aria-labelledby="account-heading"
    >
      <div className="w-full max-w-md">
        <div className="bg-white rounded-2xl shadow-xl p-8 sm:p-10 text-center">

          {/* Avatar */}
          {user.picture ? (
            <img
              src={user.picture}
              alt={`${fullName} avatar`}
              className="w-24 h-24 rounded-full mx-auto mb-6 ring-4 ring-amber-400 object-cover"
            />
          ) : (
            <div className="w-24 h-24 rounded-full bg-amber-500 flex items-center justify-center mx-auto mb-6 ring-4 ring-amber-200">
              <span className="text-3xl font-bold text-white">{initials}</span>
            </div>
          )}

          {/* Name & email */}
          <h1 id="account-heading" className="text-2xl font-extrabold text-gray-900 mb-1">
            {fullName}
          </h1>
          <p className="text-sm text-gray-500 mb-2">{user.email}</p>
          {user.email_verified === false && (
            <span className="inline-block text-xs font-medium text-amber-700 bg-amber-100 rounded-full px-2 py-0.5 mb-4">
              {t.emailNotVerified}
            </span>
          )}

          <hr className="my-6 border-stone-200" />

          {/* Quick info */}
          <dl className="text-left space-y-3 text-sm text-gray-700 mb-8">
            {user.given_name && (
              <div className="flex justify-between">
                <dt className="font-medium text-gray-500">{t.firstName}</dt>
                <dd>{user.given_name}</dd>
              </div>
            )}
            {user.family_name && (
              <div className="flex justify-between">
                <dt className="font-medium text-gray-500">{t.lastName}</dt>
                <dd>{user.family_name}</dd>
              </div>
            )}
            <div className="flex justify-between">
              <dt className="font-medium text-gray-500">{t.email}</dt>
              <dd>{user.email}</dd>
            </div>
          </dl>

          {/* Sign Out */}
          <button
            type="button"
            onClick={handleSignOut}
            className="w-full py-3 rounded-lg text-sm font-bold text-white bg-amber-600 hover:bg-amber-700 transition-colors shadow focus:outline-none focus:ring-2 focus:ring-amber-500 focus:ring-offset-2"
          >
            {t.signOut}
          </button>
        </div>
      </div>
    </main>
  );
};

export default AccountPage;
