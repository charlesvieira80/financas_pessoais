
import React, { useState, useEffect } from 'react';
import { useLocalStorage } from './hooks/useLocalStorage';
import { Account, Category, Subcategory, Transaction, TransactionType } from './types';
import Dashboard from './components/Dashboard';
import TransactionsView from './components/TransactionsView';
import SettingsView from './components/SettingsView';
import StatementView from './components/StatementView';
import { DashboardIcon, SettingsIcon, TransactionsIcon, DocumentTextIcon, LogoutIcon, SunIcon, MoonIcon } from './components/shared/icons';
import { ThemeToggle } from './components/ThemeToggle';
import { useAuth } from './contexts/AuthContext';
import Login from './components/Login';
import { useTheme } from './contexts/ThemeContext';

type ActiveView = 'dashboard' | 'transactions' | 'statement' | 'settings';

// Initial Data Generators
const getInitialAccounts = (): Account[] => [
  { id: 'acc1', name: 'Conta Corrente', initialBalance: 0 },
  { id: 'acc2', name: 'Carteira', initialBalance: 0 },
];

const getInitialCategories = (): Category[] => [
  { id: 'cat1', name: 'Salário', type: TransactionType.INCOME },
  { id: 'cat2', name: 'Alimentação', type: TransactionType.EXPENSE },
  { id: 'cat3', name: 'Moradia', type: TransactionType.EXPENSE },
  { id: 'cat4', name: 'Transporte', type: TransactionType.EXPENSE },
  { id: 'cat5', name: 'Lazer', type: TransactionType.EXPENSE },
];

const getInitialSubcategories = (): Subcategory[] => [];
const getInitialTransactions = (): Transaction[] => [];

const App: React.FC = () => {
    const { isAuthenticated, user, logout } = useAuth();
    const { theme, toggleTheme } = useTheme();
    const [activeView, setActiveView] = useState<ActiveView>('dashboard');

    // Create a dynamic prefix based on the logged-in user to isolate data
    // If no user is logged in (shouldn't happen in main view), use 'public_'
    const userPrefix = user ? `user_${user.email.replace(/[^a-zA-Z0-9]/g, '')}_` : 'public_';

    const [accounts, setAccounts] = useLocalStorage<Account[]>(`${userPrefix}finance-accounts`, []);
    const [categories, setCategories] = useLocalStorage<Category[]>(`${userPrefix}finance-categories`, []);
    const [subcategories, setSubcategories] = useLocalStorage<Subcategory[]>(`${userPrefix}finance-subcategories`, []);
    const [transactions, setTransactions] = useLocalStorage<Transaction[]>(`${userPrefix}finance-transactions`, []);

    // One-time initialization PER USER
    useEffect(() => {
        if (isAuthenticated && user) {
            const initializedKey = `${userPrefix}app-initialized`;
            const isInitialized = localStorage.getItem(initializedKey);

            if (!isInitialized) {
                console.log(`Initializing data for user: ${user.email}`);
                // Only seed if arrays are empty to respect useLocalStorage loading
                if (accounts.length === 0) setAccounts(getInitialAccounts());
                if (categories.length === 0) setCategories(getInitialCategories());
                // No default transactions for new users, start clean
                
                localStorage.setItem(initializedKey, 'true');
            }
        }
    }, [isAuthenticated, user, userPrefix]); // removed dependencies on data arrays to avoid reset loops

    const addAccount = (account: Omit<Account, 'id'>): Account => {
        const newAccount = { ...account, id: crypto.randomUUID() };
        setAccounts(prev => [...prev, newAccount]);
        return newAccount;
    };
    const updateAccount = (account: Account) => setAccounts(prev => prev.map(a => a.id === account.id ? account : a));
    const deleteAccount = (id: string) => setAccounts(prev => prev.filter(a => a.id !== id));

    const addCategory = (category: Omit<Category, 'id'>): Category => {
        const newCategory = { ...category, id: crypto.randomUUID() };
        setCategories(prev => [...prev, newCategory]);
        return newCategory;
    };
    const updateCategory = (category: Category) => setCategories(prev => prev.map(c => c.id === category.id ? category : c));
    const deleteCategory = (id: string) => {
        setCategories(prev => prev.filter(c => c.id !== id));
        // Also clean up subcategories, but logic in SettingsView now prevents deletion if these exist, 
        // essentially enforcing manual cleanup or safe deletion.
        setSubcategories(prev => prev.filter(s => s.categoryId !== id));
    };

    const addSubcategory = (subcategory: Omit<Subcategory, 'id'>): Subcategory => {
        const newSubcategory = { ...subcategory, id: crypto.randomUUID() };
        setSubcategories(prev => [...prev, newSubcategory]);
        return newSubcategory;
    };
    const updateSubcategory = (subcategory: Subcategory) => setSubcategories(prev => prev.map(s => s.id === subcategory.id ? subcategory : s));
    const deleteSubcategory = (id: string) => setSubcategories(prev => prev.filter(s => s.id !== id));

    const addTransaction = (transaction: Omit<Transaction, 'id'>) => setTransactions(prev => [...prev, { ...transaction, id: crypto.randomUUID() }]);
    const updateTransaction = (transaction: Transaction) => setTransactions(prev => prev.map(t => t.id === transaction.id ? transaction : t));
    const deleteTransaction = (id: string) => {
        setTransactions(prev => {
            const txToDelete = prev.find(t => t.id === id);
            if (txToDelete?.transferId) {
                return prev.filter(t => t.transferId !== txToDelete.transferId);
            }
            return prev.filter(t => t.id !== id);
        });
    };

    const settingsProps = {
        accounts, addAccount, updateAccount, deleteAccount,
        categories, addCategory, updateCategory, deleteCategory,
        subcategories, addSubcategory, updateSubcategory, deleteSubcategory,
        transactions // Pass transactions to enable referential integrity checks
    };
    
    if (!isAuthenticated) {
        return <Login />;
    }

    const renderView = () => {
        switch (activeView) {
            case 'dashboard':
                return <Dashboard transactions={transactions} categories={categories} accounts={accounts} subcategories={subcategories} />;
            case 'transactions':
                return <TransactionsView
                    transactions={transactions}
                    accounts={accounts}
                    categories={categories}
                    subcategories={subcategories}
                    addTransaction={addTransaction}
                    updateTransaction={updateTransaction}
                    deleteTransaction={deleteTransaction}
                    addAccount={addAccount}
                    addCategory={addCategory}
                    addSubcategory={addSubcategory}
                />;
            case 'statement':
                return <StatementView transactions={transactions} accounts={accounts} categories={categories} />;
            case 'settings':
                return <SettingsView {...settingsProps} />;
            default:
                return <Dashboard transactions={transactions} categories={categories} accounts={accounts} subcategories={subcategories} />;
        }
    };
    
    const NavItem: React.FC<{ view: ActiveView, label: string, icon: React.ReactNode }> = ({ view, label, icon }) => (
        <li>
            <button
                onClick={() => setActiveView(view)}
                className={`flex items-center p-3 my-2 rounded-xl w-full text-left transition-all duration-200 group ${
                    activeView === view 
                    ? 'bg-violet-600 text-white shadow-lg shadow-violet-600/30' 
                    : 'text-slate-500 dark:text-slate-400 hover:bg-violet-50 dark:hover:bg-slate-800 hover:text-violet-600 dark:hover:text-violet-400'
                }`}
            >
                <span className={`transition-transform duration-200 ${activeView === view ? 'scale-110' : 'group-hover:scale-110'}`}>
                   {icon}
                </span>
                <span className="ml-3 font-medium">{label}</span>
            </button>
        </li>
    );

    return (
        <div className="min-h-screen font-sans text-slate-800 dark:text-slate-200 bg-slate-50 dark:bg-slate-950 selection:bg-violet-200 dark:selection:bg-violet-900">
            {/* Sidebar Desktop */}
            <aside className="w-72 bg-white dark:bg-slate-900 p-6 border-r border-slate-200 dark:border-slate-800 hidden md:flex md:flex-col fixed h-full z-20 shadow-xl shadow-slate-200/50 dark:shadow-none">
                <div className="flex items-center gap-3 mb-8 px-2">
                    <div className="p-2 bg-gradient-to-br from-violet-500 to-indigo-600 rounded-lg text-white shadow-lg shadow-violet-500/30">
                        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" /></svg>
                    </div>
                    <span className="text-xl font-bold tracking-tight text-slate-900 dark:text-white">Minhas <span className="text-violet-600">Finanças</span></span>
                </div>

                <div className="mb-6 px-2">
                    <div className="p-4 bg-slate-50 dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700/50">
                        <p className="text-xs text-slate-400 dark:text-slate-500 uppercase font-bold tracking-wider mb-1">Olá,</p>
                        <p className="font-bold text-slate-800 dark:text-white truncate">{user?.firstName} {user?.lastName}</p>
                        <p className="text-xs text-slate-500 truncate">{user?.email}</p>
                    </div>
                </div>

                <nav className="flex-grow">
                    <ul className="space-y-1">
                        <NavItem view="dashboard" label="Painel Geral" icon={<DashboardIcon className="w-5 h-5" />} />
                        <NavItem view="transactions" label="Transações" icon={<TransactionsIcon className="w-5 h-5" />} />
                        <NavItem view="statement" label="Extratos" icon={<DocumentTextIcon className="w-5 h-5" />} />
                        <NavItem view="settings" label="Configurações" icon={<SettingsIcon className="w-5 h-5" />} />
                    </ul>
                </nav>
                
                <div className="mt-auto pt-6 border-t border-slate-100 dark:border-slate-800 space-y-3">
                     <div className="flex items-center justify-between px-2 mb-2">
                         <span className="text-xs font-semibold uppercase text-slate-400 dark:text-slate-500 tracking-wider">Preferências</span>
                     </div>
                    <ThemeToggle />
                    <button
                        onClick={logout}
                        className="flex items-center p-3 rounded-xl w-full text-left transition-colors text-slate-500 dark:text-slate-400 hover:bg-rose-50 dark:hover:bg-rose-900/20 hover:text-rose-600 dark:hover:text-rose-400"
                    >
                        <LogoutIcon className="w-5 h-5" />
                        <span className="ml-3 font-medium">Sair</span>
                    </button>
                </div>
            </aside>

            {/* Main Content */}
            <main className="md:ml-72 min-h-screen transition-all duration-300 ease-in-out pb-24 md:pb-0">
                 {renderView()}
            </main>

             {/* Mobile Navigation */}
            <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white/90 dark:bg-slate-900/90 backdrop-blur-lg border-t border-slate-200 dark:border-slate-800 flex justify-around items-center p-2 z-50 safe-area-bottom shadow-[0_-4px_20px_rgba(0,0,0,0.05)]">
                {[
                    { view: 'dashboard', icon: <DashboardIcon />, label: 'Painel' },
                    { view: 'transactions', icon: <TransactionsIcon />, label: 'Transações' },
                    { view: 'statement', icon: <DocumentTextIcon />, label: 'Extratos' },
                    { view: 'settings', icon: <SettingsIcon />, label: 'Ajustes' }
                ].map((item) => (
                    <button 
                        key={item.view}
                        onClick={() => setActiveView(item.view as ActiveView)} 
                        className={`p-2 rounded-xl flex flex-col items-center transition-all duration-200 w-16 ${
                            activeView === item.view 
                            ? 'text-violet-600 dark:text-violet-400 bg-violet-50 dark:bg-violet-900/20' 
                            : 'text-slate-400 dark:text-slate-500'
                        }`}
                    >
                        <div className={`w-6 h-6 ${activeView === item.view ? 'scale-110' : ''} transition-transform`}>
                            {item.icon}
                        </div>
                        <span className="text-[10px] font-medium mt-1">{item.label}</span>
                    </button>
                ))}
                 <button onClick={toggleTheme} className="p-2 flex flex-col items-center text-slate-400 dark:text-slate-500">
                     {theme === 'light' ? <MoonIcon className="w-6 h-6" /> : <SunIcon className="w-6 h-6" />}
                     <span className="text-[10px] font-medium mt-1">Tema</span>
                 </button>
            </nav>
        </div>
    );
};

export default App;
