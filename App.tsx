import React, { useState, useEffect } from 'react';
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
// Firebase Imports
import { db } from './services/firebase';
import {
    collection,
    query,
    where,
    onSnapshot,
    addDoc,
    updateDoc,
    deleteDoc,
    doc,
    writeBatch
} from 'firebase/firestore';

type ActiveView = 'dashboard' | 'transactions' | 'statement' | 'settings';

const App: React.FC = () => {
    const { isAuthenticated, user, logout } = useAuth();
    const { theme, toggleTheme } = useTheme();
    const [activeView, setActiveView] = useState<ActiveView>('dashboard');

    // Estado local sincronizado com Firebase
    const [accounts, setAccounts] = useState<Account[]>([]);
    const [categories, setCategories] = useState<Category[]>([]);
    const [subcategories, setSubcategories] = useState<Subcategory[]>([]);
    const [transactions, setTransactions] = useState<Transaction[]>([]);
    const [loadingData, setLoadingData] = useState(false);

    // --- Sincronização em Tempo Real (Realtime Listeners) ---
    useEffect(() => {
        if (!user || !db) {
            setAccounts([]);
            setCategories([]);
            setSubcategories([]);
            setTransactions([]);
            return;
        }

        setLoadingData(true);

        try {
            // Queries filtrando pelo ID do usuário logado
            const accountsQuery = query(collection(db, 'accounts'), where('userId', '==', user.id));
            const categoriesQuery = query(collection(db, 'categories'), where('userId', '==', user.id));
            const subcategoriesQuery = query(collection(db, 'subcategories'), where('userId', '==', user.id));
            const transactionsQuery = query(collection(db, 'transactions'), where('userId', '==', user.id));

            // Listeners
            const unsubscribeAccounts = onSnapshot(accountsQuery, (snapshot) => {
                const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Account));
                setAccounts(data);
                
                // Seed inicial se conta estiver vazia (opcional)
                if (data.length === 0 && !localStorage.getItem(`seeded_${user.id}`)) {
                    seedInitialData(user.id);
                }
            });

            const unsubscribeCategories = onSnapshot(categoriesQuery, (snapshot) => {
                const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Category));
                setCategories(data);
            });

            const unsubscribeSubcategories = onSnapshot(subcategoriesQuery, (snapshot) => {
                const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Subcategory));
                setSubcategories(data);
            });

            const unsubscribeTransactions = onSnapshot(transactionsQuery, (snapshot) => {
                const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Transaction));
                setTransactions(data);
                setLoadingData(false);
            });

            return () => {
                unsubscribeAccounts();
                unsubscribeCategories();
                unsubscribeSubcategories();
                unsubscribeTransactions();
            };
        } catch (error) {
            console.error("Erro ao configurar listeners do Firestore:", error);
            setLoadingData(false);
        }
    }, [user]);

    // Função para criar dados iniciais no Firestore
    const seedInitialData = async (userId: string) => {
        if (!db) return;
        try {
            localStorage.setItem(`seeded_${userId}`, 'true');
            const batch = writeBatch(db);

            const initialAccounts = [
                { name: 'Conta Corrente', initialBalance: 0, userId },
                { name: 'Carteira', initialBalance: 0, userId },
            ];
            initialAccounts.forEach(acc => {
                const ref = doc(collection(db!, "accounts"));
                batch.set(ref, acc);
            });

            const initialCategories = [
                { name: 'Salário', type: TransactionType.INCOME, userId },
                { name: 'Alimentação', type: TransactionType.EXPENSE, userId },
                { name: 'Moradia', type: TransactionType.EXPENSE, userId },
                { name: 'Transporte', type: TransactionType.EXPENSE, userId },
                { name: 'Lazer', type: TransactionType.EXPENSE, userId },
            ];
            initialCategories.forEach(cat => {
                const ref = doc(collection(db!, "categories"));
                batch.set(ref, cat);
            });

            await batch.commit();
        } catch (error) {
            console.error("Erro ao semear dados:", error);
        }
    };

    // --- Operações de Escrita (CRUD) ---

    // Generic Add
    const addToFirestore = async (collectionName: string, data: any) => {
        if (!user || !db) return;
        await addDoc(collection(db, collectionName), { ...data, userId: user.id });
    };

    // Generic Update
    const updateInFirestore = async (collectionName: string, data: any) => {
        if (!user || !db) return;
        const { id, ...rest } = data;
        const docRef = doc(db, collectionName, id);
        await updateDoc(docRef, rest);
    };

    // Generic Delete
    const deleteFromFirestore = async (collectionName: string, id: string) => {
        if (!user || !db) return;
        await deleteDoc(doc(db, collectionName, id));
    };


    // Wrappers para manter compatibilidade com componentes filhos
    const addAccount = (account: Omit<Account, 'id'>) => { addToFirestore('accounts', account); return {} as Account; }; 
    const updateAccount = (account: Account) => updateInFirestore('accounts', account);
    const deleteAccount = (id: string) => deleteFromFirestore('accounts', id);

    const addCategory = (category: Omit<Category, 'id'>) => { addToFirestore('categories', category); return {} as Category; };
    const updateCategory = (category: Category) => updateInFirestore('categories', category);
    const deleteCategory = (id: string) => {
        deleteFromFirestore('categories', id);
    };

    const addSubcategory = (subcategory: Omit<Subcategory, 'id'>) => { addToFirestore('subcategories', subcategory); return {} as Subcategory; };
    const updateSubcategory = (subcategory: Subcategory) => updateInFirestore('subcategories', subcategory);
    const deleteSubcategory = (id: string) => deleteFromFirestore('subcategories', id);

    const addTransaction = (transaction: Omit<Transaction, 'id'>) => addToFirestore('transactions', transaction);
    const updateTransaction = (transaction: Transaction) => updateInFirestore('transactions', transaction);
    const deleteTransaction = async (id: string) => {
        const tx = transactions.find(t => t.id === id);
        if (tx?.transferId) {
            // Deletar ambas as partes da transferência
            const related = transactions.filter(t => t.transferId === tx.transferId);
            for (const t of related) {
                await deleteFromFirestore('transactions', t.id);
            }
        } else {
            await deleteFromFirestore('transactions', id);
        }
    };

    const settingsProps = {
        accounts, addAccount, updateAccount, deleteAccount,
        categories, addCategory, updateCategory, deleteCategory,
        subcategories, addSubcategory, updateSubcategory, deleteSubcategory,
        transactions
    };
    
    if (!isAuthenticated) {
        return <Login />;
    }

    const renderView = () => {
        if (loadingData && accounts.length === 0 && categories.length === 0) {
            return (
                <div className="flex items-center justify-center h-full pt-20">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-violet-600"></div>
                </div>
            );
        }

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
                        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" /></svg>
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