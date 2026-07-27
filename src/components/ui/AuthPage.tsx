import React, { useState, useRef } from 'react';
import { User } from '../../types';
import ABLogo from './ABLogo';

interface AuthPageProps {
  onAuth: (user: User) => void;
}

// PBKDF2 password derivation for local safety
async function derivePassword(password: string, salt: string): Promise<string> {
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(password),
    'PBKDF2',
    false,
    ['deriveBits']
  );
  const derivedBits = await crypto.subtle.deriveBits(
    {
      name: 'PBKDF2',
      hash: 'SHA-256',
      salt: encoder.encode(salt),
      iterations: 100000,
    },
    key,
    256
  );
  return Array.from(new Uint8Array(derivedBits))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}

const makeSalt = () =>
  Array.from(crypto.getRandomValues(new Uint8Array(16)))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');

const USERS_DB_KEY = 'mep_users_v1';
const SESSION_KEY = 'mep_session_v1';

export default function AuthPage({ onAuth }: AuthPageProps) {
  const [mode, setMode] = useState<'signin' | 'signup'>('signin');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const passwordRef = useRef<HTMLInputElement>(null);
  const confirmRef = useRef<HTMLInputElement>(null);

  const switchMode = (newMode: 'signin' | 'signup') => {
    setMode(newMode);
    setError(null);
    setSuccess(null);
    setUsername('');
    setPassword('');
    setConfirmPassword('');
  };

  const getUsersDB = (): Record<string, any> => {
    try {
      return JSON.parse(localStorage.getItem(USERS_DB_KEY) || '{}');
    } catch {
      return {};
    }
  };

  const saveUsersDB = (db: Record<string, any>) => {
    localStorage.setItem(USERS_DB_KEY, JSON.stringify(db));
  };

  const handleAuth = async () => {
    setError(null);
    setSuccess(null);

    const cleanUsername = username.trim().toLowerCase();

    if (cleanUsername.length < 3) {
      setError('Username must be at least 3 characters.');
      return;
    }
    if (!/^[a-z0-9_\-.]+$/.test(cleanUsername)) {
      setError('Username can only contain alphanumeric characters, underscores, dashes, and periods.');
      return;
    }
    if (password.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }

    const db = getUsersDB();
    setIsLoading(true);

    try {
      if (mode === 'signup') {
        if (password !== confirmPassword) {
          setIsLoading(false);
          setError('Passwords do not match.');
          return;
        }
        if (db[cleanUsername]) {
          setIsLoading(false);
          setError('Username already taken. Please try another.');
          return;
        }

        const salt = makeSalt();
        const hash = await derivePassword(password, salt);

        db[cleanUsername] = {
          username: cleanUsername,
          hash,
          salt,
          createdAt: Date.now(),
        };

        saveUsersDB(db);
        localStorage.setItem(SESSION_KEY, JSON.stringify({ username: cleanUsername, at: Date.now() }));
        onAuth({ username: cleanUsername });
      } else {
        const userEntry = db[cleanUsername];
        if (!userEntry) {
          setIsLoading(false);
          setError('Account not found. Sign up if you are new.');
          return;
        }

        const computedHash = await derivePassword(password, userEntry.salt);
        if (computedHash !== userEntry.hash) {
          setIsLoading(false);
          setError('Incorrect password.');
          return;
        }

        localStorage.setItem(SESSION_KEY, JSON.stringify({ username: cleanUsername, at: Date.now() }));
        onAuth({ username: cleanUsername });
      }
    } catch (err: any) {
      setError('Authentication failed: ' + (err.message || 'unknown error'));
    }
    setIsLoading(false);
  };

  return (
    <div className="min-h-screen bg-[#0f1117] flex items-center justify-center p-4">
      <div className="w-full max-w-[420px]">
        <div className="text-center mb-6 flex flex-col items-center">
          <ABLogo className="w-16 h-16 mb-4 drop-shadow-[0_4px_10px_rgba(236,72,153,0.15)]" />
          <div className="text-xl font-extrabold text-[#e2e8f0]">MEP Calculator Toolkit</div>
          <div className="text-xs text-[#718096] mt-1">Standby, Load Distribution, HVAC, Plumbing & Fire Sizing</div>
        </div>

        <div className="bg-[#1a1f2e] border border-[#2d3748] rounded-2xl p-7 shadow-xl">
          <div className="flex bg-[#0f1117] border border-[#2d3748] rounded-xl p-1 mb-5">
            <button
              onClick={() => switchMode('signin')}
              className={`flex-1 py-2 rounded-lg border-none cursor-pointer text-xs font-bold transition-all ${
                mode === 'signin' ? 'bg-[#2b6cb0] text-white' : 'bg-transparent text-[#718096]'
              }`}
            >
              Sign In
            </button>
            <button
              onClick={() => switchMode('signup')}
              className={`flex-1 py-2 rounded-lg border-none cursor-pointer text-xs font-bold transition-all ${
                mode === 'signup' ? 'bg-[#2b6cb0] text-white' : 'bg-transparent text-[#718096]'
              }`}
            >
              Sign Up
            </button>
          </div>

          {error && (
            <div className="p-3 bg-red-950/40 border border-red-500/50 rounded-lg text-red-300 text-xs mb-4">
              ⚠️ {error}
            </div>
          )}

          {success && (
            <div className="p-3 bg-green-950/40 border border-green-500/50 rounded-lg text-green-300 text-xs mb-4">
              ✓ {success}
            </div>
          )}

          <div className="flex flex-col gap-4">
            <div>
              <label className="block text-[10px] font-bold text-[#718096] mb-1.5 uppercase tracking-wider">
                Username
              </label>
              <input
                value={username}
                onChange={e => setUsername(e.target.value)}
                placeholder="e.g. jdoe"
                onKeyDown={e => e.key === 'Enter' && passwordRef.current?.focus()}
                className="w-full px-3 py-2.5 rounded-lg bg-[#0f1117] border border-[#2d3748] text-white text-xs outline-none focus:border-blue-500 transition-colors"
                autoFocus
              />
            </div>

            <div>
              <label className="block text-[10px] font-bold text-[#718096] mb-1.5 uppercase tracking-wider">
                Password
              </label>
              <input
                ref={passwordRef}
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="••••••••"
                onKeyDown={e => e.key === 'Enter' && (mode === 'signup' ? confirmRef.current?.focus() : handleAuth())}
                className="w-full px-3 py-2.5 rounded-lg bg-[#0f1117] border border-[#2d3748] text-white text-xs outline-none focus:border-blue-500 transition-colors"
              />
            </div>

            {mode === 'signup' && (
              <div>
                <label className="block text-[10px] font-bold text-[#718096] mb-1.5 uppercase tracking-wider">
                  Confirm Password
                </label>
                <input
                  ref={confirmRef}
                  type="password"
                  value={confirmPassword}
                  onChange={e => setConfirmPassword(e.target.value)}
                  placeholder="••••••••"
                  onKeyDown={e => e.key === 'Enter' && handleAuth()}
                  className="w-full px-3 py-2.5 rounded-lg bg-[#0f1117] border border-[#2d3748] text-white text-xs outline-none focus:border-blue-500 transition-colors"
                />
              </div>
            )}

            <button
              onClick={handleAuth}
              disabled={isLoading}
              className={`w-full mt-2 py-3 rounded-lg border-none cursor-pointer bg-gradient-to-r from-blue-600 to-cyan-600 text-white font-bold text-sm transition-all shadow-md shadow-blue-500/20 active:scale-95 ${
                isLoading ? 'opacity-50 cursor-not-allowed' : ''
              }`}
            >
              {isLoading ? 'Processing...' : mode === 'signin' ? 'Sign In →' : 'Create Account →'}
            </button>
          </div>

          <div className="mt-5 text-center text-xs text-[#718096]">
            {mode === 'signin' ? (
              <>
                Need a new isolated workspace?{' '}
                <span onClick={() => switchMode('signup')} className="text-blue-400 font-bold hover:underline cursor-pointer">
                  Sign Up
                </span>
              </>
            ) : (
              <>
                Already have a workspace?{' '}
                <span onClick={() => switchMode('signin')} className="text-blue-400 font-bold hover:underline cursor-pointer">
                  Sign In
                </span>
              </>
            )}
          </div>

          {mode === 'signup' && (
            <div className="mt-4 text-[10px] text-[#4a5568] text-center leading-normal">
              Note: All accounts and sizing projects are strictly stored in offline-first localStorage on your browser. Sizing schedules never leave your device.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
