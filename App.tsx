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

// Seed Data moved here to be used by the one-time initialization logic
const initialAccounts: Account[] = [
  { id: 'acc1', name: 'Conta Corrente', initialBalance: 1500 },
  { id: 'acc2', name: 'Poupança', initialBalance: 10000 },
];

const initialCategories: Category[] = [
  { id: 'cat1', name: 'Salário', type: TransactionType.INCOME },
  { id: 'cat2', name: 'Supermercado', type: TransactionType.EXPENSE },
  { id: 'cat3', name: 'Contas', type: TransactionType.EXPENSE },
  { id: 'cat4', name: 'Transporte', type: TransactionType.EXPENSE },
  { id: 'cat5', name: 'Lazer', type: TransactionType.EXPENSE },
];

const initialSubcategories: Subcategory[] = [
    { id: 'sub1', name: 'Bônus', categoryId: 'cat1' },
    { id: 'sub2', name: 'Mercado', categoryId: 'cat2' },
    { id: 'sub3', name: 'Feira', categoryId: 'cat2' },
    { id: 'sub4', name: 'Energia', categoryId: 'cat3' },
    { id: 'sub5', name: 'Internet', categoryId: 'cat3' },
    { id: 'sub6', name: 'Combustível', categoryId: 'cat4' },
    { id: 'sub7', name: 'Transporte Público', categoryId: 'cat4' },
    { id: 'sub8', name: 'Restaurantes', categoryId: 'cat5' },
    { id: 'sub9', name: 'Cafeterias', categoryId: 'cat5' },
];

const initialTransactions: Transaction[] = [
  { id: 'trn1', accountId: 'acc1', categoryId: 'cat1', subcategoryId: 'sub1', amount: 3000, date: new Date(new Date().setDate(1)).toISOString(), description: 'Salário Mensal', type: TransactionType.INCOME },
  { id: 'trn2', accountId: 'acc1', categoryId: 'cat2', subcategoryId: 'sub2', amount: 120.50, date: new Date(new Date().setDate(2)).toISOString(), description: 'Compras no supermercado', type: TransactionType.EXPENSE },
  { id: 'trn3', accountId: 'acc1', categoryId: 'cat3', subcategoryId: 'sub4', amount: 75.00, date: new Date(new Date().setDate(5)).toISOString(), description: 'Conta de luz', type: TransactionType.EXPENSE },
  { id: 'trn4', accountId: 'acc1', categoryId: 'cat5', subcategoryId: 'sub8', amount: 45.25, date: new Date(new Date().setDate(7)).toISOString(), description: 'Jantar com amigos', type: TransactionType.EXPENSE },
  { id: 'trn5', accountId: 'acc1', categoryId: 'cat4', subcategoryId: 'sub6', amount: 50.00, date: new Date(new Date().setDate(10)).toISOString(), description: 'Gasolina para o carro', type: TransactionType.EXPENSE },
];


const App: React.FC = () => {
    const [accounts, setAccounts] = useLocalStorage<Account[]>('finance-accounts', []);
    const [categories, setCategories] = useLocalStorage<Category[]>('finance-categories', []);
    const [subcategories, setSubcategories] = useLocalStorage<Subcategory[]>('finance-subcategories', []);
    const [transactions, setTransactions] = useLocalStorage<Transaction[]>('finance-transactions', []);
    const [activeView, setActiveView] = useState<ActiveView>('dashboard');
    const { isAuthenticated, logout } = useAuth();
    const { theme, toggleTheme } = useTheme();

    useEffect(() => {
        const appInitialized = localStorage.getItem('finance-app-initialized');
        if (appInitialized) {
            return;
        }

        const hasOldData = localStorage.getItem('finance-transactions') || localStorage.getItem('finance-accounts');
        if (hasOldData) {
            localStorage.setItem('finance-app-initialized', 'true');
            return;
        }

        console.log("Seeding initial data for new user.");
        
        // FIX: Instead of setting localStorage manually and reloading (which breaks previews),
        // we use the state setters. The useLocalStorage hook will handle the persistence automatically.
        setAccounts(initialAccounts);
        setCategories(initialCategories);
        setSubcategories(initialSubcategories);
        setTransactions(initialTransactions);
        
        localStorage.setItem('finance-app-initialized', 'true');
    }, []);

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
        setSubcategories(prev => prev.filter(s => s.categoryId !== id));
        setTransactions(prev => prev.map(t => t.categoryId === id ? {...t, categoryId: '', subcategoryId: ''} : t));
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
        subcategories, addSubcategory, updateSubcategory, deleteSubcategory
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
                <div className="flex items-center gap-3 mb-10 px-2">
                    <div className="p-2 bg-gradient-to-br from-violet-500 to-indigo-600 rounded-lg text-white shadow-lg shadow-violet-500/30">
                        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" /></svg>
                    </div>
                    <span className="text-xl font-bold tracking-tight text-slate-900 dark:text-white">Minhas <span className="text-violet-600">Finanças</span></span>
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

            {/* Main Content - Added padding-bottom for mobile nav visibility */}
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