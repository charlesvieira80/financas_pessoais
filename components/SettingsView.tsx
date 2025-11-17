import React, { useState } from 'react';
import { Account, Category, Subcategory, TransactionType } from '../types';
import Modal from './shared/Modal';
import { PencilIcon, PlusIcon, TrashIcon } from './shared/icons';
import { formatCurrency, translateTransactionType } from '../utils';
import { useAuth } from '../contexts/AuthContext';

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
        <div>
            <div className="flex justify-between items-center mb-4">
                <h3 className="text-xl font-semibold">Contas Bancárias</h3>
                <button onClick={openAddModal} className="flex items-center gap-2 bg-sky-600 hover:bg-sky-700 text-white font-bold py-2 px-3 rounded-lg"><PlusIcon className="w-5 h-5"/> Add Conta</button>
            </div>
            <ul className="space-y-3">
                {accounts.map(acc => (
                    <li key={acc.id} className="bg-gray-50 dark:bg-slate-700 p-4 rounded-lg flex justify-between items-center">
                        <div>
                            <p className="font-semibold">{acc.name}</p>
                            <p className="text-sm text-gray-500 dark:text-slate-400">Saldo Inicial: {formatCurrency(acc.initialBalance)}</p>
                        </div>
                        <div className="flex gap-3">
                            <button onClick={() => openEditModal(acc)} className="text-gray-400 dark:text-slate-400 hover:text-sky-500 dark:hover:text-sky-400"><PencilIcon /></button>
                            <button onClick={() => deleteAccount(acc.id)} className="text-gray-400 dark:text-slate-400 hover:text-rose-500 dark:hover:text-rose-400"><TrashIcon /></button>
                        </div>
                    </li>
                ))}
            </ul>
             <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title={editingAccount ? "Editar Conta" : "Adicionar Conta"}>
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
    
    const labelClass = "block text-sm font-medium text-gray-600 dark:text-slate-300";
    const inputClass = "mt-1 w-full bg-gray-100 dark:bg-slate-700 text-gray-900 dark:text-white rounded-md p-2 border border-gray-300 dark:border-slate-600";

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onSave({ ...(account && {id: account.id}), name, initialBalance: +initialBalance });
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-4">
            <div>
                <label className={labelClass}>Nome da Conta</label>
                <input type="text" value={name} onChange={e => setName(e.target.value)} required className={inputClass}/>
            </div>
            <div>
                <label className={labelClass}>Saldo Inicial</label>
                <input type="number" step="0.01" value={initialBalance} onChange={e => setInitialBalance(parseFloat(e.target.value))} required className={inputClass}/>
            </div>
             <div className="flex justify-end gap-4 pt-4">
                <button type="button" onClick={onClose} className="bg-gray-200 dark:bg-slate-600 hover:bg-gray-300 dark:hover:bg-slate-700 text-gray-800 dark:text-white font-bold py-2 px-4 rounded-lg">Cancelar</button>
                <button type="submit" className="bg-sky-600 hover:bg-sky-700 text-white font-bold py-2 px-4 rounded-lg">Salvar</button>
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
        <div>
            <div className="flex justify-between items-center mb-4">
                <h3 className="text-xl font-semibold">Categorias</h3>
                <button onClick={() => { setEditingCategory(null); setIsCatModalOpen(true); }} className="flex items-center gap-2 bg-sky-600 hover:bg-sky-700 text-white font-bold py-2 px-3 rounded-lg"><PlusIcon className="w-5 h-5"/> Add Categoria</button>
            </div>
            <div className="space-y-4">
                {categories.map(cat => (
                    <div key={cat.id} className="bg-gray-50 dark:bg-slate-700 p-4 rounded-lg">
                        <div className="flex justify-between items-center">
                           <div className="flex items-center gap-3">
                             <span className={`px-2 py-1 text-xs rounded ${cat.type === TransactionType.INCOME ? 'bg-emerald-500/20 text-emerald-300' : 'bg-rose-500/20 text-rose-300'}`}>{translateTransactionType(cat.type)}</span>
                             <p className="font-semibold">{cat.name}</p>
                           </div>
                            <div className="flex gap-3">
                                <button onClick={() => { setEditingCategory(cat); setIsCatModalOpen(true); }} className="text-gray-400 dark:text-slate-400 hover:text-sky-500 dark:hover:text-sky-400"><PencilIcon /></button>
                                <button onClick={() => props.deleteCategory(cat.id)} className="text-gray-400 dark:text-slate-400 hover:text-rose-500 dark:hover:text-rose-400"><TrashIcon /></button>
                            </div>
                        </div>
                        <ul className="mt-3 ml-6 space-y-2">
                           {subcategories.filter(s => s.categoryId === cat.id).map(sub => (
                               <li key={sub.id} className="text-gray-600 dark:text-slate-300 flex justify-between items-center">
                                   <span>- {sub.name}</span>
                                    <div className="flex gap-2">
                                        <button onClick={() => { setEditingSubcategory(sub); setIsSubcatModalOpen(true); }} className="text-gray-400 dark:text-slate-400 hover:text-sky-500 dark:hover:text-sky-400"><PencilIcon className="w-4 h-4" /></button>
                                        <button onClick={() => props.deleteSubcategory(sub.id)} className="text-gray-400 dark:text-slate-400 hover:text-rose-500 dark:hover:text-rose-400"><TrashIcon className="w-4 h-4" /></button>
                                    </div>
                               </li>
                           ))}
                           <li>
                               <button onClick={() => {setParentCategoryId(cat.id); setEditingSubcategory(null); setIsSubcatModalOpen(true);}} className="text-sky-500 dark:text-sky-400 hover:text-sky-600 dark:hover:text-sky-300 text-sm flex items-center gap-1"><PlusIcon className="w-4 h-4" /> Add Subcategoria</button>
                           </li>
                        </ul>
                    </div>
                ))}
            </div>

            <Modal isOpen={isCatModalOpen} onClose={() => setIsCatModalOpen(false)} title={editingCategory ? "Editar Categoria" : "Adicionar Categoria"}>
                <CategoryForm category={editingCategory} onSave={handleSaveCategory} onClose={() => setIsCatModalOpen(false)} />
            </Modal>
             <Modal isOpen={isSubcatModalOpen} onClose={() => setIsSubcatModalOpen(false)} title={editingSubcategory ? "Editar Subcategoria" : "Adicionar Subcategoria"}>
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
    
    const labelClass = "block text-sm font-medium text-gray-600 dark:text-slate-300";
    const inputClass = "mt-1 w-full bg-gray-100 dark:bg-slate-700 text-gray-900 dark:text-white rounded-md p-2 border border-gray-300 dark:border-slate-600";


    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onSave({ ...(category && { id: category.id }), name, type });
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-4">
            <div>
                <label className={labelClass}>Nome da Categoria</label>
                <input type="text" value={name} onChange={e => setName(e.target.value)} required className={inputClass}/>
            </div>
            <div>
                <label className={labelClass}>Tipo</label>
                 <select value={type} onChange={e => setType(e.target.value as TransactionType)} className={inputClass}>
                    <option value={TransactionType.EXPENSE}>{translateTransactionType(TransactionType.EXPENSE)}</option>
                    <option value={TransactionType.INCOME}>{translateTransactionType(TransactionType.INCOME)}</option>
                </select>
            </div>
             <div className="flex justify-end gap-4 pt-4">
                <button type="button" onClick={onClose} className="bg-gray-200 dark:bg-slate-600 hover:bg-gray-300 dark:hover:bg-slate-700 text-gray-800 dark:text-white font-bold py-2 px-4 rounded-lg">Cancelar</button>
                <button type="submit" className="bg-sky-600 hover:bg-sky-700 text-white font-bold py-2 px-4 rounded-lg">Salvar</button>
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

    const labelClass = "block text-sm font-medium text-gray-600 dark:text-slate-300";
    const inputClass = "mt-1 w-full bg-gray-100 dark:bg-slate-700 text-gray-900 dark:text-white rounded-md p-2 border border-gray-300 dark:border-slate-600";


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
             <div className="flex justify-end gap-4 pt-4">
                <button type="button" onClick={onClose} className="bg-gray-200 dark:bg-slate-600 hover:bg-gray-300 dark:hover:bg-slate-700 text-gray-800 dark:text-white font-bold py-2 px-4 rounded-lg">Cancelar</button>
                <button type="submit" className="bg-sky-600 hover:bg-sky-700 text-white font-bold py-2 px-4 rounded-lg">Salvar</button>
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
            setError('A nova senha não é forte o suficiente. Use pelo menos 8 caracteres, incluindo maiúsculas, minúsculas, números e símbolos.');
            return;
        }

        if (newPassword !== confirmPassword) {
            setError('A nova senha e a confirmação não correspondem.');
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
    
    const strengthColors = ['bg-gray-300', 'bg-red-500', 'bg-orange-500', 'bg-yellow-500', 'bg-lime-500', 'bg-green-500'];
    const strengthLabels = ['Muito Fraca', 'Fraca', 'Razoável', 'Boa', 'Forte', 'Muito Forte'];

    const labelClass = "block text-sm font-medium text-gray-600 dark:text-slate-300";
    const inputClass = "mt-1 w-full bg-gray-100 dark:bg-slate-700 text-gray-900 dark:text-white rounded-md p-2 border border-gray-300 dark:border-slate-600 focus:ring-sky-500 focus:border-sky-500";


    return (
        <div>
            <h3 className="text-xl font-semibold mb-4">Alterar Senha</h3>
            <form onSubmit={handleSubmit} className="space-y-4 max-w-md">
                <div>
                    <label className={labelClass} htmlFor="current-password">Senha Atual</label>
                    <input id="current-password" type="password" value={currentPassword} onChange={e => setCurrentPassword(e.target.value)} required className={inputClass}/>
                </div>
                <div>
                    <label className={labelClass} htmlFor="new-password">Nova Senha</label>
                    <input id="new-password" type="password" value={newPassword} onChange={handleNewPasswordChange} required className={inputClass}/>
                     <div className="mt-2">
                        <div className="h-2 w-full bg-gray-200 dark:bg-slate-600 rounded-full overflow-hidden">
                           <div className={`h-full transition-all duration-300 ${strengthColors[passwordStrength]}`} style={{ width: `${(passwordStrength / 5) * 100}%` }}></div>
                        </div>
                        <p className="text-xs text-right mt-1 text-gray-500 dark:text-slate-400" aria-live="polite">{strengthLabels[passwordStrength]}</p>
                     </div>
                     <p className="text-xs text-gray-500 dark:text-slate-400 mt-1">A senha deve ter no mínimo 8 caracteres, com letras maiúsculas, minúsculas, números e símbolos.</p>
                </div>
                 <div>
                    <label className={labelClass} htmlFor="confirm-password">Confirmar Nova Senha</label>
                    <input id="confirm-password" type="password" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} required className={inputClass}/>
                </div>

                {error && <p className="text-sm text-red-500" role="alert">{error}</p>}
                {success && <p className="text-sm text-green-500" role="alert">{success}</p>}
                
                <div className="flex justify-end pt-2">
                    <button type="submit" className="bg-sky-600 hover:bg-sky-700 text-white font-bold py-2 px-4 rounded-lg transition-colors">Salvar Nova Senha</button>
                </div>
            </form>
        </div>
    );
};

// Main Settings View
export const SettingsView: React.FC<any> = (props) => {
    const [activeTab, setActiveTab] = useState('accounts');

    return (
        <div className="p-4 md:p-8 text-gray-800 dark:text-white">
            <h1 className="text-3xl font-bold text-gray-900 dark:text-slate-100 mb-6">Configurações</h1>
            <div className="flex border-b border-gray-200 dark:border-slate-700 mb-6">
                <button onClick={() => setActiveTab('accounts')} className={`px-4 py-2 font-semibold ${activeTab === 'accounts' ? 'text-sky-500 border-b-2 border-sky-500' : 'text-gray-500 dark:text-slate-400'}`}>Contas</button>
                <button onClick={() => setActiveTab('categories')} className={`px-4 py-2 font-semibold ${activeTab === 'categories' ? 'text-sky-500 border-b-2 border-sky-500' : 'text-gray-500 dark:text-slate-400'}`}>Categorias</button>
                <button onClick={() => setActiveTab('security')} className={`px-4 py-2 font-semibold ${activeTab === 'security' ? 'text-sky-500 border-b-2 border-sky-500' : 'text-gray-500 dark:text-slate-400'}`}>Segurança</button>
            </div>
            <div className="bg-white dark:bg-slate-800 p-6 rounded-lg shadow-lg">
                {activeTab === 'accounts' && <AccountManager {...props} />}
                {activeTab === 'categories' && <CategoryManager {...props} />}
                {activeTab === 'security' && <PasswordManager />}
            </div>
        </div>
    );
}

export default SettingsView;
