import React, { useState } from 'react';
import { Account, Category, Subcategory, TransactionType } from '../types';
import Modal from './shared/Modal';
import { PencilIcon, PlusIcon, TrashIcon } from './shared/icons';
import { formatCurrency, translateTransactionType } from '../utils';
import { useAuth } from '../contexts/AuthContext';

// Shared Styling
const sectionTitleClass = "text-lg font-bold text-slate-800 dark:text-white mb-4";
const cardClass = "bg-white dark:bg-slate-900 rounded-2xl p-6 shadow-sm border border-slate-100 dark:border-slate-800";
const btnIconClass = "p-2 rounded-lg text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors";
const listItemClass = "flex justify-between items-center p-4 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-transparent hover:border-slate-200 dark:hover:border-slate-700 transition-all";

// Account Management Component
const AccountManager: React.FC<{
    accounts: Account[],
    addAccount: (acc: Omit<Account, 'id'>) => void,
    updateAccount: (acc: Account) => void,
    deleteAccount: (id: string) => void
}> = ({ accounts, addAccount, updateAccount, deleteAccount }) => {
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingAccount, setEditingAccount] = useState<Account | null>(null);

    const handleSave = (accountData: Omit<Account, 'id'> | Account) => {
        if ('id' in accountData) {
            updateAccount(accountData);
        } else {
            addAccount(accountData);
        }
        setIsModalOpen(false);
        setEditingAccount(null);
    };

    const openAddModal = () => {
        setEditingAccount(null);
        setIsModalOpen(true);
    };

    const openEditModal = (account: Account) => {
        setEditingAccount(account);
        setIsModalOpen(true);
    }

    return (
        <div className={cardClass}>
            <div className="flex justify-between items-center mb-6">
                <h3 className={sectionTitleClass}>Minhas Contas</h3>
                <button onClick={openAddModal} className="flex items-center gap-2 bg-violet-600 hover:bg-violet-700 text-white text-sm font-bold py-2 px-4 rounded-xl shadow-md shadow-violet-500/20 transition-all"><PlusIcon className="w-4 h-4"/> Nova Conta</button>
            </div>
            <ul className="space-y-3">
                {accounts.map(acc => (
                    <li key={acc.id} className={listItemClass}>
                        <div>
                            <p className="font-bold text-slate-800 dark:text-white">{acc.name}</p>
                            <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">Saldo Inicial: {formatCurrency(acc.initialBalance)}</p>
                        </div>
                        <div className="flex gap-1">
                            <button onClick={() => openEditModal(acc)} className={`${btnIconClass} hover:text-violet-600`}><PencilIcon className="w-4 h-4" /></button>
                            <button onClick={() => deleteAccount(acc.id)} className={`${btnIconClass} hover:text-rose-600`}><TrashIcon className="w-4 h-4" /></button>
                        </div>
                    </li>
                ))}
            </ul>
             <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title={editingAccount ? "Editar Conta" : "Criar Conta"}>
                <AccountForm account={editingAccount} onSave={handleSave} onClose={() => setIsModalOpen(false)} />
            </Modal>
        </div>
    );
};

const AccountForm: React.FC<{
    account?: Account | null;
    onSave: (account: Omit<Account, 'id'> | Account) => void;
    onClose: () => void;
}> = ({ account, onSave, onClose }) => {
    const [name, setName] = useState(account?.name || '');
    const [initialBalance, setInitialBalance] = useState(account?.initialBalance || 0);
    
    const labelClass = "block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1";
    const inputClass = "w-full bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white rounded-xl p-3 border border-slate-200 dark:border-slate-700 focus:ring-2 focus:ring-violet-500 outline-none transition-all";

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onSave({ ...(account && {id: account.id}), name, initialBalance: +initialBalance });
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-4">
            <div>
                <label className={labelClass}>Nome da Conta</label>
                <input type="text" value={name} onChange={e => setName(e.target.value)} required className={inputClass} placeholder="Ex: Nubank"/>
            </div>
            <div>
                <label className={labelClass}>Saldo Inicial</label>
                <input type="number" step="0.01" value={initialBalance} onChange={e => setInitialBalance(parseFloat(e.target.value))} required className={inputClass}/>
            </div>
             <div className="flex justify-end gap-3 pt-4">
                <button type="button" onClick={onClose} className="px-4 py-2 rounded-xl text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors font-medium">Cancelar</button>
                <button type="submit" className="px-4 py-2 rounded-xl bg-violet-600 hover:bg-violet-700 text-white font-bold shadow-lg shadow-violet-500/20 transition-all">Salvar</button>
            </div>
        </form>
    );
};


// Category Management Component
const CategoryManager: React.FC<{
    categories: Category[];
    subcategories: Subcategory[];
    addCategory: (cat: Omit<Category, 'id'>) => void;
    updateCategory: (cat: Category) => void;
    deleteCategory: (id: string) => void;
    addSubcategory: (subcat: Omit<Subcategory, 'id'>) => void;
    updateSubcategory: (subcat: Subcategory) => void;
    deleteSubcategory: (id: string) => void;
}> = (props) => {
    const { categories, subcategories } = props;
    const [isCatModalOpen, setIsCatModalOpen] = useState(false);
    const [editingCategory, setEditingCategory] = useState<Category | null>(null);
    const [isSubcatModalOpen, setIsSubcatModalOpen] = useState(false);
    const [editingSubcategory, setEditingSubcategory] = useState<Subcategory | null>(null);
    const [parentCategoryId, setParentCategoryId] = useState<string>('');
    
    const handleSaveCategory = (catData: Omit<Category, 'id'> | Category) => {
        if ('id' in catData) props.updateCategory(catData);
        else props.addCategory(catData);
        setIsCatModalOpen(false);
    };
    
    const handleSaveSubcategory = (subcatData: Omit<Subcategory, 'id'> | Subcategory) => {
        if ('id' in subcatData) props.updateSubcategory(subcatData);
        else props.addSubcategory(subcatData);
        setIsSubcatModalOpen(false);
    };
    
    return (
        <div className={cardClass}>
            <div className="flex justify-between items-center mb-6">
                <h3 className={sectionTitleClass}>Categorias de Transação</h3>
                <button onClick={() => { setEditingCategory(null); setIsCatModalOpen(true); }} className="flex items-center gap-2 bg-violet-600 hover:bg-violet-700 text-white text-sm font-bold py-2 px-4 rounded-xl shadow-md shadow-violet-500/20 transition-all"><PlusIcon className="w-4 h-4"/> Nova Categoria</button>
            </div>
            <div className="space-y-4">
                {categories.map(cat => (
                    <div key={cat.id} className="bg-slate-50 dark:bg-slate-800/30 p-4 rounded-2xl border border-slate-100 dark:border-slate-800">
                        <div className="flex justify-between items-center mb-2">
                           <div className="flex items-center gap-3">
                             <span className={`px-2.5 py-1 text-[10px] uppercase font-bold tracking-wide rounded-full ${cat.type === TransactionType.INCOME ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400' : 'bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400'}`}>{translateTransactionType(cat.type)}</span>
                             <p className="font-bold text-slate-800 dark:text-white">{cat.name}</p>
                           </div>
                            <div className="flex gap-1">
                                <button onClick={() => { setEditingCategory(cat); setIsCatModalOpen(true); }} className={`${btnIconClass} hover:text-violet-600`}><PencilIcon className="w-4 h-4" /></button>
                                <button onClick={() => props.deleteCategory(cat.id)} className={`${btnIconClass} hover:text-rose-600`}><TrashIcon className="w-4 h-4" /></button>
                            </div>
                        </div>
                        
                        <div className="pl-4 border-l-2 border-slate-200 dark:border-slate-700 ml-2 space-y-1">
                           {subcategories.filter(s => s.categoryId === cat.id).map(sub => (
                               <div key={sub.id} className="flex justify-between items-center py-1 group">
                                   <span className="text-sm text-slate-600 dark:text-slate-400">{sub.name}</span>
                                    <div className="flex opacity-0 group-hover:opacity-100 transition-opacity">
                                        <button onClick={() => { setEditingSubcategory(sub); setIsSubcatModalOpen(true); }} className="p-1 text-slate-400 hover:text-violet-500"><PencilIcon className="w-3 h-3" /></button>
                                        <button onClick={() => props.deleteSubcategory(sub.id)} className="p-1 text-slate-400 hover:text-rose-500"><TrashIcon className="w-3 h-3" /></button>
                                    </div>
                               </div>
                           ))}
                           <button onClick={() => {setParentCategoryId(cat.id); setEditingSubcategory(null); setIsSubcatModalOpen(true);}} className="text-xs font-semibold text-violet-600 dark:text-violet-400 hover:text-violet-700 dark:hover:text-violet-300 mt-2 flex items-center gap-1 transition-colors"><PlusIcon className="w-3 h-3" /> Adicionar subcategoria</button>
                        </div>
                    </div>
                ))}
            </div>

            <Modal isOpen={isCatModalOpen} onClose={() => setIsCatModalOpen(false)} title={editingCategory ? "Editar Categoria" : "Nova Categoria"}>
                <CategoryForm category={editingCategory} onSave={handleSaveCategory} onClose={() => setIsCatModalOpen(false)} />
            </Modal>
             <Modal isOpen={isSubcatModalOpen} onClose={() => setIsSubcatModalOpen(false)} title={editingSubcategory ? "Editar Subcategoria" : "Nova Subcategoria"}>
                <SubcategoryForm subcategory={editingSubcategory} parentCategoryId={parentCategoryId} onSave={handleSaveSubcategory} onClose={() => setIsSubcatModalOpen(false)} />
            </Modal>
        </div>
    );
};

const CategoryForm: React.FC<{
    category?: Category | null;
    onSave: (cat: Omit<Category, 'id'> | Category) => void;
    onClose: () => void;
}> = ({ category, onSave, onClose }) => {
    const [name, setName] = useState(category?.name || '');
    const [type, setType] = useState(category?.type || TransactionType.EXPENSE);
    
    const labelClass = "block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1";
    const inputClass = "w-full bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white rounded-xl p-3 border border-slate-200 dark:border-slate-700 focus:ring-2 focus:ring-violet-500 outline-none transition-all";

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onSave({ ...(category && { id: category.id }), name, type });
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-4">
            <div>
                <label className={labelClass}>Nome</label>
                <input type="text" value={name} onChange={e => setName(e.target.value)} required className={inputClass}/>
            </div>
            <div>
                <label className={labelClass}>Tipo de Transação</label>
                 <select value={type} onChange={e => setType(e.target.value as TransactionType)} className={inputClass}>
                    <option value={TransactionType.EXPENSE}>{translateTransactionType(TransactionType.EXPENSE)}</option>
                    <option value={TransactionType.INCOME}>{translateTransactionType(TransactionType.INCOME)}</option>
                </select>
            </div>
             <div className="flex justify-end gap-3 pt-4">
                <button type="button" onClick={onClose} className="px-4 py-2 rounded-xl text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors font-medium">Cancelar</button>
                <button type="submit" className="px-4 py-2 rounded-xl bg-violet-600 hover:bg-violet-700 text-white font-bold shadow-lg shadow-violet-500/20 transition-all">Salvar</button>
            </div>
        </form>
    );
};

const SubcategoryForm: React.FC<{
    subcategory?: Subcategory | null;
    parentCategoryId: string;
    onSave: (subcat: Omit<Subcategory, 'id'> | Subcategory) => void;
    onClose: () => void;
}> = ({ subcategory, parentCategoryId, onSave, onClose }) => {
    const [name, setName] = useState(subcategory?.name || '');

    const labelClass = "block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1";
    const inputClass = "w-full bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white rounded-xl p-3 border border-slate-200 dark:border-slate-700 focus:ring-2 focus:ring-violet-500 outline-none transition-all";

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onSave({ ...(subcategory && { id: subcategory.id }), name, categoryId: subcategory?.categoryId || parentCategoryId });
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-4">
            <div>
                <label className={labelClass}>Nome da Subcategoria</label>
                <input type="text" value={name} onChange={e => setName(e.target.value)} required className={inputClass}/>
            </div>
             <div className="flex justify-end gap-3 pt-4">
                <button type="button" onClick={onClose} className="px-4 py-2 rounded-xl text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors font-medium">Cancelar</button>
                <button type="submit" className="px-4 py-2 rounded-xl bg-violet-600 hover:bg-violet-700 text-white font-bold shadow-lg shadow-violet-500/20 transition-all">Salvar</button>
            </div>
        </form>
    );
};

// Password Management Component
const PasswordManager: React.FC = () => {
    const { changePassword } = useAuth();
    const [currentPassword, setCurrentPassword] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const [passwordStrength, setPasswordStrength] = useState(0);

    const checkPasswordStrength = (password: string) => {
        let score = 0;
        if (!password) {
            setPasswordStrength(0);
            return;
        }
        if (password.length >= 8) score++;
        if (/[a-z]/.test(password)) score++;
        if (/[A-Z]/.test(password)) score++;
        if (/[0-9]/.test(password)) score++;
        if (/[^A-Za-z0-9]/.test(password)) score++;
        setPasswordStrength(score);
    };

    const handleNewPasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const pass = e.target.value;
        setNewPassword(pass);
        checkPasswordStrength(pass);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setSuccess('');

        if (passwordStrength < 4) {
            setError('A nova senha é muito fraca.');
            return;
        }

        if (newPassword !== confirmPassword) {
            setError('As senhas não coincidem.');
            return;
        }

        const result = await changePassword(currentPassword, newPassword);
        if (result.success) {
            setSuccess(result.message);
            setCurrentPassword('');
            setNewPassword('');
            setConfirmPassword('');
            setPasswordStrength(0);
        } else {
            setError(result.message);
        }
    };
    
    const strengthColors = ['bg-slate-200', 'bg-rose-500', 'bg-orange-500', 'bg-amber-400', 'bg-lime-500', 'bg-emerald-500'];
    const strengthLabels = ['', 'Fraca', 'Razoável', 'Boa', 'Forte', 'Excelente'];

    const labelClass = "block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1";
    const inputClass = "w-full bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white rounded-xl p-3 border border-slate-200 dark:border-slate-700 focus:ring-2 focus:ring-violet-500 outline-none transition-all";


    return (
        <div className={cardClass}>
            <h3 className={sectionTitleClass}>Segurança da Conta</h3>
            <form onSubmit={handleSubmit} className="space-y-5 max-w-lg">
                <div>
                    <label className={labelClass}>Senha Atual</label>
                    <input type="password" value={currentPassword} onChange={e => setCurrentPassword(e.target.value)} required className={inputClass}/>
                </div>
                <div>
                    <label className={labelClass}>Nova Senha</label>
                    <input type="password" value={newPassword} onChange={handleNewPasswordChange} required className={inputClass}/>
                     <div className="mt-2 flex items-center gap-3">
                        <div className="flex-grow h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                           <div className={`h-full transition-all duration-500 ease-out ${strengthColors[passwordStrength]}`} style={{ width: `${(passwordStrength / 5) * 100}%` }}></div>
                        </div>
                        <span className="text-xs font-medium text-slate-500 w-16 text-right">{strengthLabels[passwordStrength]}</span>
                     </div>
                     <p className="text-xs text-slate-400 mt-1">Use 8+ caracteres, maiúsculas, números e símbolos.</p>
                </div>
                 <div>
                    <label className={labelClass}>Confirmar Nova Senha</label>
                    <input type="password" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} required className={inputClass}/>
                </div>

                {error && <div className="p-3 bg-rose-50 dark:bg-rose-900/20 text-rose-600 dark:text-rose-400 text-sm rounded-lg">{error}</div>}
                {success && <div className="p-3 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 text-sm rounded-lg">{success}</div>}
                
                <div className="pt-2">
                    <button type="submit" className="bg-violet-600 hover:bg-violet-700 text-white font-bold py-2.5 px-6 rounded-xl shadow-md shadow-violet-500/20 transition-all">Atualizar Senha</button>
                </div>
            </form>
        </div>
    );
};

// Main Settings View
export const SettingsView: React.FC<any> = (props) => {
    const [activeTab, setActiveTab] = useState('accounts');

    const tabs = [
        { id: 'accounts', label: 'Contas Bancárias' },
        { id: 'categories', label: 'Categorias' },
        { id: 'security', label: 'Segurança' },
    ];

    return (
        <div className="p-6 md:p-10 max-w-5xl mx-auto">
            <h1 className="text-3xl font-bold text-slate-900 dark:text-white mb-2">Configurações</h1>
            <p className="text-slate-500 dark:text-slate-400 mb-8">Gerencie suas preferências e dados do sistema.</p>
            
            <div className="flex gap-1 bg-slate-200/50 dark:bg-slate-800 p-1 rounded-xl w-fit mb-8">
                {tabs.map(tab => (
                    <button 
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id)} 
                        className={`px-5 py-2 rounded-lg text-sm font-semibold transition-all duration-200 ${
                            activeTab === tab.id 
                            ? 'bg-white dark:bg-slate-700 text-violet-600 dark:text-violet-400 shadow-sm' 
                            : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
                        }`}
                    >
                        {tab.label}
                    </button>
                ))}
            </div>
            
            <div className="transition-all duration-300 ease-in-out">
                {activeTab === 'accounts' && <AccountManager {...props} />}
                {activeTab === 'categories' && <CategoryManager {...props} />}
                {activeTab === 'security' && <PasswordManager />}
            </div>
        </div>
    );
}

export default SettingsView;