import { useState, type FormEvent } from 'react';
import { ar } from '../i18n/ar';
import { Tx, both, type Sel } from '../components/Tx';
type Dict = typeof ar;
import { Link, navigate } from '../router';
import { actions } from '../store/useProgress';

export function Login() {
  const [code, setCode] = useState('');
  const [name, setName] = useState('');
  const [error, setError] = useState<Sel | null>(null);

  function submit(e: FormEvent) {
    e.preventDefault();
    if (!/^\d{4}$/.test(code)) return setError(() => (d: Dict) => d.login.errCode);
    if (!name.trim()) return setError(() => (d: Dict) => d.login.errName);
    actions.login(name.trim(), code); // mock: any 4-digit code is accepted
    navigate('/', { replace: true });
  }

  return (
    <main className="screen login">
      <div className="login-hero" aria-hidden>
        🐪🌴
      </div>
      <h1 className="login-title"><Tx t={(d) => d.appName} /></h1>
      <p className="muted"><Tx t={(d) => d.tagline} /></p>

      <form className="card form" onSubmit={submit} noValidate>
        <h2><Tx t={(d) => d.login.title} /></h2>
        <label>
          <Tx t={(d) => d.login.classCode} />
          <input
            inputMode="numeric"
            maxLength={4}
            dir="ltr"
            className="code-input"
            value={code}
            onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
            placeholder="••••"
          />
          <small className="muted"><Tx t={(d) => d.login.classCodeHint} /></small>
        </label>
        <label>
          <Tx t={(d) => d.login.name} />
          <input value={name} onChange={(e) => setName(e.target.value)} placeholder={both((d) => d.login.namePlaceholder)} />
        </label>
        {error && (
          <p className="error">
            <Tx t={error} />
          </p>
        )}
        <button className="btn btn-primary" type="submit">
          <Tx t={(d) => d.login.submit} />
        </button>
      </form>

      <Link href="/teacher" className="teacher-link">
        <Tx t={(d) => d.login.teacherLink} />
      </Link>
    </main>
  );
}
