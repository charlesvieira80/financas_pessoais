import React, { useState, FormEvent } from 'react';
import { useAuth } from '../contexts/AuthContext';

const Login: React.FC = () => {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const { login } = useAuth();

    const handleSubmit = async (e: FormEvent) => {
        e.preventDefault();
        setError('');
        const success = await login(username, password);
        if (!success) {
            setError('Usuário ou senha inválidos.');
        }
    };

    return (
        <div className="flex items-center justify-center min-h-screen bg-slate-50 dark:bg-slate-950 p-4">
            <div className="w-full max-w-md p-10 space-y-8 bg-white dark:bg-slate-900 rounded-3xl shadow-2xl shadow-slate-200/50 dark:shadow-none border border-slate-100 dark:border-slate-800">
                <div className="text-center">
                    <div className="inline-flex items-center justify-center w-16 h-16 bg-violet-100 dark:bg-violet-900/30 rounded-2xl mb-6 text-violet-600 dark:text-violet-400">
                         <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" /></svg>
                    </div>
                    <h1 className="text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">Bem-vindo</h1>
                    <p className="text-slate-500 dark:text-slate-400 mt-2">Acesse seu gerenciador financeiro pessoal</p>
                </div>
                <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
                    <div className="space-y-4">
                        <div>
                            <label htmlFor="username" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Usuário</label>
                            <input
                                id="username"
                                name="username"
                                type="text"
                                autoComplete="username"
                                required
                                value={username}
                                onChange={(e) => setUsername(e.target.value)}
                                className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white focus:ring-2 focus:ring-violet-500 focus:border-violet-500 outline-none transition-all"
                                placeholder="Digite seu usuário"
                            />
                        </div>
                        <div>
                            <label htmlFor="password-input" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Senha</label>
                            <input
                                id="password-input"
                                name="password"
                                type="password"
                                autoComplete="current-password"
                                required
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white focus:ring-2 focus:ring-violet-500 focus:border-violet-500 outline-none transition-all"
                                placeholder="Digite sua senha"
                            />
                        </div>
                    </div>
                    {error && (
                        <div className="p-3 bg-rose-50 dark:bg-rose-900/20 text-rose-600 dark:text-rose-400 text-sm text-center rounded-lg">
                            {error}
                        </div>
                    )}
                    <button
                        type="submit"
                        className="w-full flex justify-center py-3.5 px-4 border border-transparent text-sm font-bold rounded-xl text-white bg-violet-600 hover:bg-violet-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-violet-500 shadow-lg shadow-violet-500/30 transition-all transform hover:-translate-y-0.5"
                    >
                        Entrar no Sistema
                    </button>
                </form>
                <p className="text-center text-xs text-slate-400">
                    Login padrão: admin / password
                </p>
            </div>
        </div>
    );
}

export default Login;