import React, { useState, useEffect } from 'react';
import { useLocalStorage } from './hooks/useLocalStorage';
import { Account, Category, Subcategory, Transaction, TransactionType } from './types';
import Dashboard from './components/Dashboard';
import TransactionsView from './components/TransactionsView';
import SettingsView from './components/SettingsView';
import { DashboardIcon, SettingsIcon, TransactionsIcon, DocumentTextIcon, LogoutIcon, SunIcon, MoonIcon } from './components/shared/icons';
import StatementView from './components/StatementView';
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
    useEffect(() => {
        const appInitialized = localStorage.getItem('finance-app-initialized');
        if (appInitialized) {
            // Already initialized, do nothing.
            return;
        }

        // Not initialized. Check if data exists from a previous version without the flag.
        const hasOldData = localStorage.getItem('finance-transactions') || localStorage.getItem('finance-accounts');
        if (hasOldData) {
            // User has data from a version before this initialization logic.
            // Just set the flag and we're done. No data touched, no reload needed.
            localStorage.setItem('finance-app-initialized', 'true');
            return;
        }

        // This is a true fresh start for a new user. No flag, no data.
        // Seed the data, set the flag, and reload the page to ensure all hooks read the new data.
        console.log("Seeding initial data for new user.");
        localStorage.setItem('finance-accounts', JSON.stringify(initialAccounts));
        localStorage.setItem('finance-categories', JSON.stringify(initialCategories));
        localStorage.setItem('finance-subcategories', JSON.stringify(initialSubcategories));
        localStorage.setItem('finance-transactions', JSON.stringify(initialTransactions));
        localStorage.setItem('finance-app-initialized', 'true');
        window.location.reload();
    }, []);

    const [accounts, setAccounts] = useLocalStorage<Account[]>('finance-accounts', []);
    const [categories, setCategories] = useLocalStorage<Category[]>('finance-categories', []);
    const [subcategories, setSubcategories] = useLocalStorage<Subcategory[]>('finance-subcategories', []);
    const [transactions, setTransactions] = useLocalStorage<Transaction[]>('finance-transactions', []);
    const [activeView, setActiveView] = useState<ActiveView>('dashboard');
    const { isAuthenticated, logout } = useAuth();
    const { theme, toggleTheme } = useTheme();

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
        setSubcategories(prev => prev.filter(s => s.categoryId !== id)); // Also delete subcategories
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
                className={`flex items-center p-3 my-1 rounded-lg w-full text-left transition-colors ${activeView === view ? 'bg-sky-600 text-white' : 'text-gray-600 dark:text-slate-300 hover:bg-gray-100 dark:hover:bg-slate-700'}`}
            >
                {icon}
                <span className="ml-3 font-medium">{label}</span>
            </button>
        </li>
    );

    return (
        <div className="min-h-screen font-sans text-gray-800 dark:text-slate-200 bg-gray-50 dark:bg-slate-900">
            <aside className="w-64 bg-white dark:bg-slate-800 p-4 border-r border-gray-200 dark:border-slate-700 hidden md:flex md:flex-col fixed h-full z-10">
                <div className="text-2xl font-bold text-gray-900 dark:text-white mb-8 flex items-center gap-2">
                    <svg className="w-8 h-8 text-sky-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
                    <span>Minhas Finanças</span>
                </div>
                <nav className="flex-grow">
                    <ul>
                        <NavItem view="dashboard" label="Painel" icon={<DashboardIcon className="w-6 h-6" />} />
                        <NavItem view="transactions" label="Transações" icon={<TransactionsIcon className="w-6 h-6" />} />
                        <NavItem view="statement" label="Extratos" icon={<DocumentTextIcon className="w-6 h-6" />} />
                        <NavItem view="settings" label="Configurações" icon={<SettingsIcon className="w-6 h-6" />} />
                    </ul>
                </nav>
                <div className="mt-auto space-y-2">
                    <button
                        onClick={logout}
                        className="flex items-center p-3 my-1 rounded-lg w-full text-left transition-colors text-gray-600 dark:text-slate-300 hover:bg-gray-100 dark:hover:bg-slate-700"
                    >
                        <LogoutIcon className="w-6 h-6" />
                        <span className="ml-3 font-medium">Sair</span>
                    </button>
                    <ThemeToggle />
                </div>
            </aside>
            <main className="md:ml-64 overflow-auto pb-24 md:pb-0">
                {renderView()}
            </main>
             {/* Bottom Nav for Mobile */}
            <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white dark:bg-slate-800 border-t border-gray-200 dark:border-slate-700 flex justify-around">
                <button onClick={() => setActiveView('dashboard')} className={`p-4 flex flex-col items-center ${activeView === 'dashboard' ? 'text-sky-500' : 'text-gray-500 dark:text-slate-400'}`}><DashboardIcon /><span className="text-xs mt-1">Painel</span></button>
                <button onClick={() => setActiveView('transactions')} className={`p-4 flex flex-col items-center ${activeView === 'transactions' ? 'text-sky-500' : 'text-gray-500 dark:text-slate-400'}`}><TransactionsIcon /><span className="text-xs mt-1">Transações</span></button>
                <button onClick={() => setActiveView('statement')} className={`p-4 flex flex-col items-center ${activeView === 'statement' ? 'text-sky-500' : 'text-gray-500 dark:text-slate-400'}`}><DocumentTextIcon /><span className="text-xs mt-1">Extratos</span></button>
                <button onClick={() => setActiveView('settings')} className={`p-4 flex flex-col items-center ${activeView === 'settings' ? 'text-sky-500' : 'text-gray-500 dark:text-slate-400'}`}><SettingsIcon /><span className="text-xs mt-1">Ajustes</span></button>
                <button onClick={logout} className={`p-4 flex flex-col items-center text-gray-500 dark:text-slate-400`}><LogoutIcon /><span className="text-xs mt-1">Sair</span></button>
                <button onClick={toggleTheme} className={`p-4 flex flex-col items-center text-gray-500 dark:text-slate-400`}>
                    {theme === 'light' ? <MoonIcon /> : <SunIcon />}
                    <span className="text-xs mt-1">Tema</span>
                </button>
            </nav>
        </div>
    );
};

export default App;