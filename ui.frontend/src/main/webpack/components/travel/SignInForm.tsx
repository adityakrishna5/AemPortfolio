import React, { useState } from 'react';

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
  const [form, setForm] = useState<FormState>({ email: '', password: '' });
  const [errors, setErrors] = useState<FieldError>({});
  const [submitted, setSubmitted] = useState(false);

  const validate = (): FieldError => {
    const e: FieldError = {};
    if (!form.email) e.email = 'Email is required.';
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email))
      e.email = 'Please enter a valid email address.';
    if (!form.password) e.password = 'Password is required.';
    else if (form.password.length < 8)
      e.password = 'Password must be at least 8 characters.';
    return e;
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
    if (errors[name as keyof FieldError]) {
      setErrors((prev) => ({ ...prev, [name]: undefined }));
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length > 0) {
      setErrors(errs);
      return;
    }
    // Placeholder: wire up to your auth service here
    setSubmitted(true);
  };

  if (submitted) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[300px] py-12 text-center">
        <div className="w-16 h-16 rounded-full bg-amber-100 flex items-center justify-center mb-4">
          <svg className="w-8 h-8 text-amber-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Welcome back!</h2>
        <p className="text-gray-500 text-sm">You're signed in. Redirecting to your dashboard…</p>
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
              href="/content/adkstvite/us/en/home.html"
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
              Don't have an account?{' '}
              <a
                href="/content/adkstvite/us/en/register.html"
                className="font-semibold text-amber-600 hover:underline"
              >
                Register free
              </a>
            </p>
          </div>

          <form onSubmit={handleSubmit} noValidate className="space-y-5">
            {/* Email */}
            <div>
              <label htmlFor="signin-email" className="block text-sm font-medium text-gray-700 mb-1">
                Email address
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
                  Password
                </label>
                <a href="#" className="text-xs text-amber-600 hover:underline">
                  Forgot password?
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

            <button
              type="submit"
              className="w-full py-3 rounded-lg text-sm font-bold text-white bg-amber-600 hover:bg-amber-700 transition-colors shadow focus:outline-none focus:ring-2 focus:ring-amber-500 focus:ring-offset-2"
            >
              Sign In
            </button>
          </form>
        </div>
      </div>
    </section>
  );
};

export default SignInForm;
