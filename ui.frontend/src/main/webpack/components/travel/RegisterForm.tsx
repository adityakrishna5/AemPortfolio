import React, { useState } from 'react';

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
  const [form, setForm] = useState<FormState>({
    firstName: '',
    lastName: '',
    email: '',
    password: '',
    confirmPassword: '',
  });
  const [errors, setErrors] = useState<FieldError>({});
  const [submitted, setSubmitted] = useState(false);

  const validate = (): FieldError => {
    const e: FieldError = {};
    if (!form.firstName.trim()) e.firstName = 'First name is required.';
    if (!form.lastName.trim()) e.lastName = 'Last name is required.';
    if (!form.email) e.email = 'Email is required.';
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email))
      e.email = 'Please enter a valid email address.';
    if (!form.password) e.password = 'Password is required.';
    else if (form.password.length < 8)
      e.password = 'Password must be at least 8 characters.';
    if (!form.confirmPassword) e.confirmPassword = 'Please confirm your password.';
    else if (form.password !== form.confirmPassword)
      e.confirmPassword = 'Passwords do not match.';
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
    // Placeholder: wire up to your registration API here
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
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Welcome, {form.firstName}!</h2>
        <p className="text-gray-500 text-sm">Your account has been created. Start exploring.</p>
        <a
          href="/content/adkstvite/us/en/sign-in.html"
          className="mt-6 px-6 py-2.5 rounded-full text-sm font-semibold bg-amber-600 text-white hover:bg-amber-700 transition-colors"
        >
          Sign In
        </a>
      </div>
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
    { id: 'reg-first-name', name: 'firstName', label: 'First name', type: 'text', autoComplete: 'given-name', placeholder: 'Jane' },
    { id: 'reg-last-name', name: 'lastName', label: 'Last name', type: 'text', autoComplete: 'family-name', placeholder: 'Explorer' },
    { id: 'reg-email', name: 'email', label: 'Email address', type: 'email', autoComplete: 'email', placeholder: 'you@email.com' },
    { id: 'reg-password', name: 'password', label: 'Password', type: 'password', autoComplete: 'new-password', placeholder: '••••••••' },
    { id: 'reg-confirm-password', name: 'confirmPassword', label: 'Confirm password', type: 'password', autoComplete: 'new-password', placeholder: '••••••••' },
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
              href="/content/adkstvite/us/en/home.html"
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
              Already have an account?{' '}
              <a
                href="/content/adkstvite/us/en/sign-in.html"
                className="font-semibold text-amber-600 hover:underline"
              >
                Sign in
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

            <button
              type="submit"
              className="w-full py-3 rounded-lg text-sm font-bold text-white bg-amber-600 hover:bg-amber-700 transition-colors shadow focus:outline-none focus:ring-2 focus:ring-amber-500 focus:ring-offset-2 mt-2"
            >
              Create Account
            </button>
          </form>
        </div>
      </div>
    </section>
  );
};

export default RegisterForm;
