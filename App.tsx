// FIX: Imported `useMemo` from React to resolve 'Cannot find name' errors.
import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Account, Category, Subcategory, Transaction, TransactionType, ActiveView } from './types';
import Dashboard from './components/Dashboard';
import TransactionsView from './components/TransactionsView';
import SettingsView from './components/SettingsView';
import StatementView from './components/StatementView';
import BalanceView from './components/BalanceView';
import { DashboardIcon, SettingsIcon, TransactionsIcon, DocumentTextIcon, LogoutIcon, SunIcon, MoonIcon, SparklesIcon, XIcon, PlusIcon, TrashIcon, PencilIcon, UploadIcon, TableIcon, BalanceIcon, MoreHorizontalIcon, ChevronDoubleLeftIcon } from './components/shared/icons';
import { useAuth } from './contexts/AuthContext';
import Login from './components/Login';
import { useTheme } from './contexts/ThemeContext';
import Modal from './components/shared/Modal';
// FIX: Imported `ThemeToggle` component to resolve 'Cannot find name' error.
import { ThemeToggle } from './components/ThemeToggle';
import { suggestCategory } from './services/geminiService';
import { parseOFX, ParsedTransaction } from './services/ofxParser';
import { parseXLSX, ParsedXLSXTransaction } from './services/xlsxParser';
import { formatCurrency, formatDate, formatCurrencyInput, parseCurrencyInput } from './utils';

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

// --- COMPONENTS ---

const ImportReviewModal: React.FC<{
    isOpen: boolean;
    onClose: () => void;
    transactions: Transaction[];
    accounts: Account[];
    onRemove: (id: string) => void;
    onEdit: (transaction: Transaction) => void;
    onConfirm: (targetAccountId: string) => void;
    isSaving: boolean;
}> = ({ isOpen, onClose, transactions, accounts, onRemove, onEdit, onConfirm, isSaving }) => {
    const [targetAccountId, setTargetAccountId] = useState('');
    const totalAmount = transactions.reduce((acc, t) => t.type === TransactionType.INCOME ? acc + t.amount : acc - t.amount, 0);
    
    // Auto-select first account if available and none selected
    useEffect(() => {
        if (isOpen && accounts.length > 0 && !targetAccountId) {
            // Try to find if incoming transactions have a common accountId (passed from view filter)
            const commonId = transactions[0]?.accountId;
            if (commonId && accounts.some(a => a.id === commonId)) {
                setTargetAccountId(commonId);
            } else {
                setTargetAccountId(accounts[0].id);
            }
        }
    }, [isOpen, accounts]);

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={`Revisar Importação (${transactions.length})`} size="3xl">
            <div className="flex flex-col h-full max-h-[70vh]">
                <div className="mb-4 space-y-4">
                    <div className="p-4 bg-violet-50 dark:bg-violet-900/20 rounded-xl border border-violet-100 dark:border-violet-900/30 flex justify-between items-center">
                        <p className="text-sm text-violet-800 dark:text-violet-200">
                            Verifique os dados abaixo. Você pode excluir transações indesejadas ou editá-las.
                        </p>
                        <div className="text-right">
                            <p className="text-xs uppercase font-bold text-violet-500">Saldo da Importação</p>
                            <p className={`font-bold ${totalAmount >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                                {totalAmount >= 0 ? '+' : ''}{formatCurrency(totalAmount)}
                            </p>
                        </div>
                    </div>
                    
                    <div>
                        <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1.5">Importar para a Conta:</label>
                        <select 
                            value={targetAccountId} 
                            onChange={(e) => setTargetAccountId(e.target.value)}
                            className="w-full bg-white dark:bg-slate-900 text-slate-900 dark:text-white rounded-xl p-3 border border-slate-200 dark:border-slate-700 focus:ring-2 focus:ring-violet-500 outline-none transition-all"
                        >
                            <option value="" disabled>Selecione uma conta...</option>
                            {accounts.map(acc => <option key={acc.id} value={acc.id}>{acc.name}</option>)}
                        </select>
                    </div>
                </div>

                <div className="flex-grow overflow-y-auto border border-slate-200 dark:border-slate-700 rounded-xl">
                    <table className="w-full text-left text-sm">
                        <thead className="bg-slate-50 dark:bg-slate-800 sticky top-0 z-10">
                            <tr>
                                <th className="p-3 font-semibold text-slate-600 dark:text-slate-300">Data</th>
                                <th className="p-3 font-semibold text-slate-600 dark:text-slate-300">Descrição</th>
                                <th className="p-3 font-semibold text-slate-600 dark:text-slate-300 text-right">Valor</th>
                                <th className="p-3 font-semibold text-slate-600 dark:text-slate-300 text-center">Ações</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                            {transactions.map((t) => (
                                <tr key={t.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                                    <td className="p-3 text-slate-600 dark:text-slate-400 whitespace-nowrap">{formatDate(t.date)}</td>
                                    <td className="p-3 text-slate-800 dark:text-slate-200">{t.description}</td>
                                    <td className={`p-3 text-right font-medium ${t.type === TransactionType.INCOME ? 'text-emerald-600' : 'text-rose-600'}`}>
                                        {t.type === TransactionType.INCOME ? '+' : '-'} {formatCurrency(t.amount)}
                                    </td>
                                    <td className="p-3 text-center">
                                        <div className="flex justify-center gap-2">
                                            <button onClick={() => onEdit(t)} className="p-1.5 text-slate-400 hover:text-violet-600 hover:bg-violet-50 dark:hover:bg-violet-900/20 rounded-lg transition-colors" title="Editar">
                                                <PencilIcon className="w-4 h-4"/>
                                            </button>
                                            <button onClick={() => onRemove(t.id)} className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-900/20 rounded-lg transition-colors" title="Remover">
                                                <TrashIcon className="w-4 h-4"/>
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                <div className="mt-6 flex justify-end gap-3 pt-4 border-t border-slate-100 dark:border-slate-800">
                    <button 
                        onClick={onClose} 
                        className="px-5 py-2.5 rounded-xl text-slate-600 dark:text-slate-300 font-medium hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                        disabled={isSaving}
                    >
                        Cancelar
                    </button>
                    <button 
                        onClick={() => onConfirm(targetAccountId)} 
                        disabled={isSaving || transactions.length === 0 || !targetAccountId}
                        className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-violet-600 hover:bg-violet-700 text-white font-bold shadow-lg shadow-violet-500/20 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {isSaving ? (
                            <>
                                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                                Salvando...
                            </>
                        ) : (
                            <>
                                <UploadIcon className="w-5 h-5" />
                                Confirmar Importação
                            </>
                        )}
                    </button>
                </div>
            </div>
        </Modal>
    );
};

interface SuggestionItem {
    description: string;
    accountName: string;
    accountId: string;
}

const TransactionForm: React.FC<{
    transaction?: Transaction | null;
    accounts: Account[];
    categories: Category[];
    subcategories: Subcategory[];
    allTransactions: Transaction[];
    onSave: (transaction: Omit<Transaction, 'id'> | Transaction, keepOpen?: boolean) => void;
    onClose: () => void;
    preselectedData?: { accountId?: string };
}> = ({ transaction, accounts, categories, subcategories, allTransactions, onSave, onClose, preselectedData }) => {
    const [baseDescription, setBaseDescription] = useState('');
    const [installmentPart, setInstallmentPart] = useState<string | null>(null);
    const [amount, setAmount] = useState(0);
    const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
    const [accountId, setAccountId] = useState('');
    const [categoryId, setCategoryId] = useState('');
    const [subcategoryId, setSubcategoryId] = useState('');
    const [type, setType] = useState(TransactionType.EXPENSE);
    const [isSuggesting, setIsSuggesting] = useState(false);
    
    // Autocomplete State
    const [showSuggestions, setShowSuggestions] = useState(false);
    const [descriptionSuggestions, setDescriptionSuggestions] = useState<SuggestionItem[]>([]);
    const suggestionRef = useRef<HTMLDivElement>(null);
    
    // Ref for description input to auto-focus on "Save and New"
    const descriptionInputRef = useRef<HTMLInputElement>(null);
    
    const baseInputClass = "w-full bg-white dark:bg-slate-900 text-slate-900 dark:text-white rounded-xl p-3 border border-slate-200 dark:border-slate-700 focus:ring-2 focus:ring-violet-500 focus:border-violet-500 transition-shadow outline-none";
    const labelClass = "block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1.5";

    // Handle clicking outside suggestions
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (suggestionRef.current && !suggestionRef.current.contains(event.target as Node)) {
                setShowSuggestions(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    useEffect(() => {
        if (transaction) {
            const desc = transaction.description;
            const match = desc.match(/^(.*?)(\s\(\d+\/\d+\))$/);
            if (match) {
                setBaseDescription(match[1]);
                setInstallmentPart(match[2]);
            } else {
                setBaseDescription(desc);
                setInstallmentPart(null);
            }
            setAmount(transaction.amount);
            setDate(transaction.date.split('T')[0]);
            setAccountId(transaction.accountId);
            setCategoryId(transaction.categoryId);
            setSubcategoryId(transaction.subcategoryId);
            setType(transaction.type);
        } else {
            // Reset for new transaction
            setBaseDescription('');
            setInstallmentPart(null);
            setAmount(0);
            setDate(new Date().toISOString().split('T')[0]);
            setAccountId(preselectedData?.accountId || '');
            setCategoryId('');
            setSubcategoryId('');
            setType(TransactionType.EXPENSE);
        }
    }, [transaction, preselectedData]);

    const filteredCategories = useMemo(() => categories.filter(c => c.type === type), [categories, type]);
    const filteredSubcategories = useMemo(() => subcategories.filter(s => s.categoryId === categoryId), [subcategories, categoryId]);
    
    const handleDescriptionChange = (val: string) => {
        setBaseDescription(val);
        if (val.length >= 2) {
            // Filter all matching transactions, excluding transfers
            const matches = allTransactions
                .filter(t => t.description.toLowerCase().includes(val.toLowerCase()) && !t.transferId)
                .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

            // Group by description + accountId to offer precise "templates"
            const uniqueTemplates: SuggestionItem[] = [];
            const seen = new Set<string>();

            for (const t of matches) {
                const cleanDesc = t.description.replace(/\s\(\d+\/\d+\)$/, '');
                const key = `${cleanDesc.toLowerCase()}-${t.accountId}`;
                
                if (!seen.has(key)) {
                    const acc = accounts.find(a => a.id === t.accountId);
                    uniqueTemplates.push({
                        description: cleanDesc,
                        accountName: acc?.name || 'Conta desconhecida',
                        accountId: t.accountId
                    });
                    seen.add(key);
                }
                if (uniqueTemplates.length >= 5) break;
            }

            setDescriptionSuggestions(uniqueTemplates);
            setShowSuggestions(uniqueTemplates.length > 0);
        } else {
            setShowSuggestions(false);
        }
    };

    const selectSuggestion = (suggestion: SuggestionItem) => {
        setBaseDescription(suggestion.description);
        setShowSuggestions(false);

        // Smart fill based on the most recent transaction matching this specific description AND account
        const lastTx = [...allTransactions]
            .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
            .find(t => 
                t.description.toLowerCase().startsWith(suggestion.description.toLowerCase()) && 
                t.accountId === suggestion.accountId
            );

        if (lastTx) {
            setAmount(lastTx.amount);
            setType(lastTx.type);
            setAccountId(lastTx.accountId);
            setCategoryId(lastTx.categoryId);
            setSubcategoryId(lastTx.subcategoryId);
        }
    };

    const handleSuggestCategory = async () => {
        if (!baseDescription) {
            alert("Por favor, insira uma descrição primeiro.");
            return;
        }
        setIsSuggesting(true);
        const suggestion = await suggestCategory(baseDescription, categories);
        if (suggestion) {
            const foundCategory = categories.find(c => c.id === suggestion.categoryId);
            if (foundCategory) {
                setType(foundCategory.type);
                setCategoryId(foundCategory.id);
            }
        }
        setIsSuggesting(false);
    };

    const handleSaveInternal = (e: React.FormEvent | React.MouseEvent, keepOpen: boolean) => {
        e.preventDefault();
        const selectedCategory = categories.find(c => c.id === categoryId);
        if (!selectedCategory && categoryId !== '') return;
        
        const finalDescription = installmentPart ? baseDescription + installmentPart : baseDescription;

        // FIX: Parse date string as UTC to avoid timezone shifting
        const [year, month, day] = date.split('-').map(Number);
        const utcDate = new Date(Date.UTC(year, month - 1, day));

        const newTransaction: Omit<Transaction, 'id'> | Transaction = {
            ...(transaction && { id: transaction.id }),
            description: finalDescription,
            amount: +amount,
            date: utcDate.toISOString(),
            accountId,
            categoryId,
            subcategoryId,
            type: selectedCategory?.type || type
        };
        
        onSave(newTransaction, keepOpen);

        if (keepOpen) {
            // Reset fields for "New Transaction" flow
            setBaseDescription('');
            setAmount(0);
            setInstallmentPart(null);
            // Reset categories to force user to select correct one for new entry
            setCategoryId('');
            setSubcategoryId('');
            
            // NOTE: We deliberately do NOT reset 'accountId' and 'date' 
            // to fulfill the "Save and New" requirement of keeping them selected.
            
            // Focus back on description
            setTimeout(() => {
                descriptionInputRef.current?.focus();
            }, 100);
        }
    };

    return (
        <form onSubmit={(e) => handleSaveInternal(e, false)} className="space-y-5 pb-32">
             <div className="relative">
                <label className={labelClass}>Descrição</label>
                <div className="flex items-center gap-2">
                    <div className="relative flex-grow">
                        <input 
                            ref={descriptionInputRef}
                            type="text" 
                            value={baseDescription} 
                            onChange={e => handleDescriptionChange(e.target.value)} 
                            required 
                            className={baseInputClass} 
                            placeholder="Ex: Compras no Mercado"
                            autoComplete="off"
                        />
                        {/* SUGGESTIONS DROPDOWN */}
                        {showSuggestions && (
                            <div 
                                ref={suggestionRef}
                                className="absolute left-0 right-0 top-full mt-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-2xl z-50 overflow-hidden animate-content-in origin-top"
                            >
                                <div className="p-2 border-b border-slate-100 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/50">
                                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Sugestões de Histórico</p>
                                </div>
                                <div className="max-h-60 overflow-y-auto">
                                    {descriptionSuggestions.map((suggestion, idx) => (
                                        <button
                                            key={idx}
                                            type="button"
                                            onClick={() => selectSuggestion(suggestion)}
                                            className="w-full text-left px-4 py-3 hover:bg-violet-50 dark:hover:bg-violet-900/20 text-slate-700 dark:text-slate-200 transition-colors flex items-center gap-3 group border-b border-slate-50 dark:border-slate-800 last:border-0"
                                        >
                                            <div className="flex-shrink-0 w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-700 flex items-center justify-center text-slate-400 group-hover:bg-violet-100 group-hover:text-violet-600 transition-colors">
                                                <TransactionsIcon className="w-4 h-4" />
                                            </div>
                                            <div className="flex flex-col items-start overflow-hidden">
                                                <span className="font-bold text-sm truncate w-full">{suggestion.description}</span>
                                                <span className="text-[10px] text-slate-400 dark:text-slate-500 truncate w-full flex items-center gap-1 mt-0.5">
                                                    <BalanceIcon className="w-2.5 h-2.5" /> {suggestion.accountName}
                                                </span>
                                            </div>
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                    <button 
                        type="button" 
                        onClick={handleSuggestCategory} 
                        disabled={isSuggesting} 
                        className="p-3 bg-gradient-to-br from-violet-500 to-indigo-600 text-white rounded-xl hover:shadow-lg hover:shadow-violet-500/30 disabled:opacity-50 transition-all" 
                        title="Sugerir Categoria com IA"
                    >
                        {isSuggesting ? <div className="w-5 h-5 border-2 border-t-transparent border-white rounded-full animate-spin"></div> : <SparklesIcon className="h-5 w-5"/>}
                    </button>
                </div>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
                <div>
                    <label className={labelClass}>Valor</label>
                    <input 
                        type="text" 
                        inputMode="numeric"
                        value={formatCurrencyInput(amount)} 
                        onChange={e => setAmount(parseCurrencyInput(e.target.value))} 
                        required 
                        className={baseInputClass} 
                        placeholder="0,00"
                    />
                </div>
                <div>
                    <label className={labelClass}>Data</label>
                    <input type="date" value={date} onChange={e => setDate(e.target.value)} required className={baseInputClass}/>
                </div>
            </div>

             <div>
                <label className={labelClass}>Conta</label>
                <select value={accountId} onChange={e => setAccountId(e.target.value)} required className={baseInputClass}>
                    <option value="">Selecione a Conta</option>
                    {accounts.map(acc => <option key={acc.id} value={acc.id}>{acc.name}</option>)}
                </select>
            </div>

            <div className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-100 dark:border-slate-700 space-y-4">
                <div className="flex items-center gap-4">
                    <label className="flex items-center gap-2 cursor-pointer">
                        <input 
                            type="radio" 
                            name="type" 
                            value={TransactionType.EXPENSE} 
                            checked={type === TransactionType.EXPENSE} 
                            onChange={() => { setType(TransactionType.EXPENSE); setCategoryId(''); setSubcategoryId('') }}
                            className="text-rose-500 focus:ring-rose-500"
                        />
                        <span className="text-sm font-medium text-slate-700 dark:text-slate-300">Despesa</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                        <input 
                            type="radio" 
                            name="type" 
                            value={TransactionType.INCOME} 
                            checked={type === TransactionType.INCOME} 
                            onChange={() => { setType(TransactionType.INCOME); setCategoryId(''); setSubcategoryId('') }}
                            className="text-emerald-500 focus:ring-emerald-500"
                        />
                        <span className="text-sm font-medium text-slate-700 dark:text-slate-300">Receita</span>
                    </label>
                </div>

                <div>
                    <label className={labelClass}>Categoria</label>
                    <select value={categoryId} onChange={e => {setCategoryId(e.target.value); setSubcategoryId('');}} required className={baseInputClass}>
                        <option value="">Selecione a Categoria</option>
                        {filteredCategories.map(cat => <option key={cat.id} value={cat.id}>{cat.name}</option>)}
                    </select>
                </div>
                {filteredSubcategories.length > 0 && <div>
                    <label className={labelClass}>Subcategoria</label>
                    <select value={subcategoryId} onChange={e => setSubcategoryId(e.target.value)} className={baseInputClass}>
                        <option value="">Selecione a Subcategoria</option>
                        {filteredSubcategories.map(sub => <option key={sub.id} value={sub.id}>{sub.name}</option>)}
                    </select>
                </div>}
            </div>

            {/* FOOTER ACTIONS */}
            <div className="-mx-6 md:-mx-8 px-6 pt-4 md:px-8 bg-white dark:bg-slate-900 border-t border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row justify-end gap-3 mt-6 items-center">
                <button type="button" onClick={onClose} className="w-full sm:w-auto order-3 sm:order-1 px-5 py-2.5 rounded-xl text-slate-600 dark:text-slate-300 font-medium hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">Cancelar</button>
                
                <div className="flex gap-3 w-full sm:w-auto order-1 sm:order-2 flex-grow sm:flex-grow-0 justify-end">
                    {!transaction && (
                        <button 
                            type="button"
                            onClick={(e) => handleSaveInternal(e, true)}
                            className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-violet-500 hover:bg-violet-600 text-white font-bold shadow-lg shadow-violet-500/20 transition-all text-sm whitespace-nowrap"
                        >
                            <PlusIcon className="w-4 h-4 shrink-0" />
                            <span>Salvar e Nova</span>
                        </button>
                    )}

                    <button type="submit" className="flex-1 sm:flex-none flex items-center justify-center px-4 py-2.5 rounded-xl bg-violet-600 hover:bg-violet-700 text-white font-bold shadow-lg shadow-violet-500/20 transition-all text-sm min-w-[80px]">
                        Salvar
                    </button>
                </div>
            </div>
        </form>
    );
};

const InstallmentForm: React.FC<{
    accounts: Account[];
    categories: Category[];
    subcategories: Subcategory[];
    onSave: (data: {
        description: string;
        totalAmount: number;
        installments: number;
        startDate: string;
        accountId: string;
        categoryId: string;
        subcategoryId: string;
    }) => void;
    onClose: () => void;
    preselectedData?: { accountId?: string };
}> = ({ accounts, categories, subcategories, onSave, onClose, preselectedData }) => {
    const [description, setParaDescription] = useState('');
    const [totalAmount, setTotalAmount] = useState(0);
    const [installments, setInstallments] = useState(2);
    const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0]);
    const [accountId, setAccountId] = useState(preselectedData?.accountId || '');
    const [categoryId, setCategoryId] = useState('');
    const [subcategoryId, setSubcategoryId] = useState('');
    
    const baseInputClass = "w-full bg-white dark:bg-slate-900 text-slate-900 dark:text-white rounded-xl p-3 border border-slate-200 dark:border-slate-700 focus:ring-2 focus:ring-violet-500 focus:border-violet-500 transition-shadow outline-none";
    const labelClass = "block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1.5";

    const expenseCategories = useMemo(() => categories.filter(c => c.type === TransactionType.EXPENSE), [categories]);
    const filteredSubcategories = useMemo(() => subcategories.filter(s => s.categoryId === categoryId), [subcategories, categoryId]);
    
    useEffect(() => {
        setAccountId(preselectedData?.accountId || '');
    }, [preselectedData]);


    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onSave({
            description,
            totalAmount: +totalAmount,
            installments: +installments,
            startDate,
            accountId,
            categoryId,
            subcategoryId,
        });
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-4 pb-32">
            <div>
                <label className={labelClass}>Descrição da Compra</label>
                <input type="text" value={description} onChange={e => setParaDescription(e.target.value)} required className={baseInputClass} placeholder="Ex: Notebook Novo"/>
            </div>
            <div className="grid grid-cols-2 gap-4">
                <div>
                    <label className={labelClass}>Valor Total</label>
                    <input 
                        type="text" 
                        inputMode="numeric"
                        value={formatCurrencyInput(totalAmount)} 
                        onChange={e => setTotalAmount(parseCurrencyInput(e.target.value))} 
                        required 
                        className={baseInputClass}
                        placeholder="0,00"
                    />
                </div>
                <div>
                    <label className={labelClass}>Nº de Parcelas</label>
                    <input type="number" value={installments} onChange={e => setInstallments(parseInt(e.target.value, 10))} required min="2" className={baseInputClass}/>
                </div>
            </div>
             <div>
                <label className={labelClass}>Vencimento 1ª Parcela</label>
                <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} required className={baseInputClass}/>
            </div>
             <div>
                <label className={labelClass}>Conta de Pagamento</label>
                <select value={accountId} onChange={e => setAccountId(e.target.value)} required className={baseInputClass}>
                    <option value="">Selecione a Conta</option>
                    {accounts.map(acc => <option key={acc.id} value={acc.id}>{acc.name}</option>)}
                </select>
            </div>
            <div>
                <label className={labelClass}>Categoria</label>
                <select value={categoryId} onChange={e => {setCategoryId(e.target.value); setSubcategoryId('');}} required className={baseInputClass}>
                    <option value="">Selecione a Categoria</option>
                    {expenseCategories.map(cat => <option key={cat.id} value={cat.id}>{cat.name}</option>)}
                </select>
            </div>
            {filteredSubcategories.length > 0 && <div>
                <label className={labelClass}>Subcategoria</label>
                <select value={subcategoryId} onChange={e => setSubcategoryId(e.target.value)} className={baseInputClass}>
                    <option value="">Selecione a Subcategoria</option>
                    {filteredSubcategories.map(sub => <option key={sub.id} value={sub.id}>{sub.name}</option>)}
                </select>
            </div>}
            
             {/* FOOTER ACTIONS */}
             <div className="-mx-6 md:-mx-8 px-6 pt-4 md:px-8 bg-white dark:bg-slate-900 border-t border-slate-100 dark:border-slate-800 flex justify-end gap-3 mt-6">
                <button type="button" onClick={onClose} className="px-5 py-2.5 rounded-xl text-slate-600 dark:text-slate-300 font-medium hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">Cancelar</button>
                <button type="submit" className="px-5 py-2.5 rounded-xl bg-violet-600 hover:bg-violet-700 text-white font-bold shadow-lg shadow-violet-500/20 transition-all">Gerar Parcelamento</button>
            </div>
        </form>
    );
};

const TransferForm: React.FC<{
    accounts: Account[];
    onSave: (data: {
        fromAccountId: string;
        toAccountId: string;
        amount: number;
        date: string;
        description: string;
    }) => void;
    onClose: () => void;
    preselectedData?: { accountId?: string };
}> = ({ accounts, onSave, onClose, preselectedData }) => {
    const [fromAccountId, setFromAccountId] = useState(preselectedData?.accountId || '');
    const [toAccountId, setToAccountId] = useState('');
    const [amount, setAmount] = useState(0);
    const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
    const [description, setParaDescription] = useState('');
    
    const baseInputClass = "w-full bg-white dark:bg-slate-900 text-slate-900 dark:text-white rounded-xl p-3 border border-slate-200 dark:border-slate-700 focus:ring-2 focus:ring-violet-500 focus:border-violet-500 transition-shadow outline-none";
    const labelClass = "block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1.5";

    useEffect(() => {
        setFromAccountId(preselectedData?.accountId || '');
    }, [preselectedData]);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (fromAccountId === toAccountId) {
            alert("A conta de origem e destino não podem ser a mesma.");
            return;
        }
        onSave({
            fromAccountId,
            toAccountId,
            amount: +amount,
            date,
            description,
        });
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-4 pb-32">
            <div className="grid grid-cols-2 gap-4">
                <div>
                    <label className={labelClass}>De (Origem)</label>
                    <select value={fromAccountId} onChange={e => setFromAccountId(e.target.value)} required className={baseInputClass}>
                        <option value="">Selecione...</option>
                        {accounts.map(acc => <option key={acc.id} value={acc.id}>{acc.name}</option>)}
                    </select>
                </div>
                <div>
                    <label className={labelClass}>Para (Destino)</label>
                    <select value={toAccountId} onChange={e => setToAccountId(e.target.value)} required className={baseInputClass}>
                         <option value="">Selecione...</option>
                        {accounts.map(acc => <option key={acc.id} value={acc.id}>{acc.name}</option>)}
                    </select>
                </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
                 <div>
                    <label className={labelClass}>Valor</label>
                    <input 
                        type="text" 
                        inputMode="numeric"
                        value={formatCurrencyInput(amount)} 
                        onChange={e => setAmount(parseCurrencyInput(e.target.value))} 
                        required 
                        className={baseInputClass}
                        placeholder="0,00"
                    />
                </div>
                 <div>
                    <label className={labelClass}>Data</label>
                    <input type="date" value={date} onChange={e => setDate(e.target.value)} required className={baseInputClass}/>
                </div>
            </div>
           
             <div>
                <label className={labelClass}>Observação (Opcional)</label>
                <input type="text" value={description} onChange={e => setParaDescription(e.target.value)} className={baseInputClass} placeholder="Motivo da transferência"/>
            </div>

            {/* FOOTER ACTIONS */}
            <div className="-mx-6 md:-mx-8 px-6 pt-4 md:px-8 bg-white dark:bg-slate-900 border-t border-slate-100 dark:border-slate-800 flex justify-end gap-3 mt-6">
                <button type="button" onClick={onClose} className="px-5 py-2.5 rounded-xl text-slate-600 dark:text-slate-300 font-medium hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">Cancelar</button>
                <button type="submit" className="px-5 py-2.5 rounded-xl bg-violet-600 hover:bg-violet-700 text-white font-bold shadow-lg shadow-violet-500/20 transition-all">Transferir</button>
            </div>
        </form>
    );
};

const EditTransferForm: React.FC<{
    accounts: Account[];
    transactions: Transaction[];
    editingTransfer: Transaction;
    onSave: (data: {
        fromAccountId: string;
        toAccountId: string;
        amount: number;
        date: string;
        description: string;
    }) => void;
    onClose: () => void;
}> = ({ accounts, transactions, editingTransfer, onSave, onClose }) => {
    const [fromAccountId, setFromAccountId] = useState('');
    const [toAccountId, setToAccountId] = useState('');
    const [amount, setAmount] = useState(0);
    const [date, setDate] = useState('');
    const [description, setParaDescription] = useState('');
    
    const baseInputClass = "w-full bg-white dark:bg-slate-900 text-slate-900 dark:text-white rounded-xl p-3 border border-slate-200 dark:border-slate-700 focus:ring-2 focus:ring-violet-500 focus:border-violet-500 transition-shadow outline-none";
    const labelClass = "block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1.5";

    useEffect(() => {
        if (!editingTransfer || !editingTransfer.transferId) return;

        const related = transactions.filter(t => t.transferId === editingTransfer.transferId);
        const expensePart = related.find(t => t.type === TransactionType.EXPENSE);
        const incomePart = related.find(t => t.type === TransactionType.INCOME);

        if (!expensePart || !incomePart) return;

        setFromAccountId(expensePart.accountId);
        setToAccountId(incomePart.accountId);
        setAmount(expensePart.amount);
        setDate(expensePart.date.split('T')[0]);

        const descRegex = /^Transferência (?:para|de) .*?(?:: (.*))?$/;
        const match = expensePart.description.match(descRegex);
        if (match && match[1]) {
            setParaDescription(match[1]);
        } else {
            setParaDescription('');
        }
    }, [editingTransfer, transactions]);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (fromAccountId === toAccountId) {
            alert("A conta de origem e destino não podem ser a mesma.");
            return;
        }
        onSave({ fromAccountId, toAccountId, amount: +amount, date, description });
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-4 pb-32">
            <div className="grid grid-cols-2 gap-4">
                <div>
                    <label className={labelClass}>De (Origem)</label>
                    <select value={fromAccountId} onChange={e => setFromAccountId(e.target.value)} required className={baseInputClass}>
                        <option value="">Selecione...</option>
                        {accounts.map(acc => <option key={acc.id} value={acc.id}>{acc.name}</option>)}
                    </select>
                </div>
                <div>
                    <label className={labelClass}>Para (Destino)</label>
                    <select value={toAccountId} onChange={e => setToAccountId(e.target.value)} required className={baseInputClass}>
                        <option value="">Selecione...</option>
                        {accounts.map(acc => <option key={acc.id} value={acc.id}>{acc.name}</option>)}
                    </select>
                </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
                 <div>
                    <label className={labelClass}>Valor</label>
                    <input 
                        type="text" 
                        inputMode="numeric"
                        value={formatCurrencyInput(amount)} 
                        onChange={e => setAmount(parseCurrencyInput(e.target.value))} 
                        required 
                        className={baseInputClass}
                        placeholder="0,00"
                    />
                </div>
                 <div>
                    <label className={labelClass}>Data</label>
                    <input type="date" value={date} onChange={e => setDate(e.target.value)} required className={baseInputClass}/>
                </div>
            </div>
           
             <div>
                <label className={labelClass}>Observação (Opcional)</label>
                <input type="text" value={description} onChange={e => setParaDescription(e.target.value)} className={baseInputClass} placeholder="Motivo da transferência"/>
            </div>

            {/* FOOTER ACTIONS */}
            <div className="-mx-6 md:-mx-8 px-6 pt-4 md:px-8 bg-white dark:bg-slate-900 border-t border-slate-100 dark:border-slate-800 flex justify-end gap-3 mt-6">
                <button type="button" onClick={onClose} className="px-5 py-2.5 rounded-xl text-slate-600 dark:text-slate-300 font-medium hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">Cancelar</button>
                <button type="submit" className="px-5 py-2.5 rounded-xl bg-violet-600 hover:bg-violet-700 text-white font-bold shadow-lg shadow-violet-500/20 transition-all">Salvar Alterações</button>
            </div>
        </form>
    );
};


interface ImportTransaction extends ParsedTransaction {
    key: string; // for React list rendering
    categoryId: string;
    subcategoryId: string;
}

type ReviewedXLSXTransaction = ParsedXLSXTransaction & {
  accountId: string;
  categoryId: string;
  subcategoryId: string;
};

const App: React.FC = () => {
    const { isAuthenticated, user, logout } = useAuth();
    const { theme, toggleTheme } = useTheme();
    const [activeView, setActiveView] = useState<ActiveView>('dashboard');
    const [preselectedAccountId, setPreselectedAccountId] = useState<string | null>(null);


    // Estado local sincronizado com Firebase
    const [accounts, setAccounts] = useState<Account[]>([]);
    const [categories, setCategories] = useState<Category[]>([]);
    const [subcategories, setSubcategories] = useState<Subcategory[]>([]);
    const [transactions, setTransactions] = useState<Transaction[]>([]);
    const [loadingData, setLoadingData] = useState(false);

    // --- NAVIGATION STATE ---
    const [isSidebarOpen, setIsSidebarOpen] = useState(true);
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
    
    // --- IMPORT QUEUE STATE (REPLACED WITH PENDING LIST) ---
    const [pendingImports, setPendingImports] = useState<Transaction[]>([]);
    const [isImportReviewModalOpen, setIsImportReviewModalOpen] = useState(false);
    const [isSavingImports, setIsSavingImports] = useState(false);

    // --- MODAL STATE (Centralized) ---
    const [isTransactionModalOpen, setIsTransactionModalOpen] = useState(false);
    const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);
    const [isInstallmentModalOpen, setIsInstallmentModalOpen] = useState(false);
    const [isTransferModalOpen, setIsTransferModalOpen] = useState(false);
    const [isEditTransferModalOpen, setIsEditTransferModalOpen] = useState(false);
    const [editingTransfer, setEditingTransfer] = useState<Transaction | null>(null);
    const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);
    const [transactionToDelete, setTransactionToDelete] = useState<string | null>(null);
    const [isEditScopeModalOpen, setIsEditScopeModalOpen] = useState(false);
    const [editScope, setEditScope] = useState<'single' | 'future' | null>(null);
    const [preselectedData, setPreselectedData] = useState<{ accountId?: string }>({});


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
                // Ordenar Contas por ordem alfabética
                data.sort((a, b) => a.name.localeCompare(b.name));
                setAccounts(data);
                
                // Seed inicial se conta estiver vazia (opcional)
                if (data.length === 0 && !localStorage.getItem(`seeded_${user.id}`)) {
                    seedInitialData(user.id);
                }
            });

            const unsubscribeCategories = onSnapshot(categoriesQuery, (snapshot) => {
                const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Category));
                // Ordenar Categorias: Primeiro Receitas, depois Despesas, depois Alfabético
                data.sort((a, b) => {
                    if (a.type === b.type) {
                        return a.name.localeCompare(b.name);
                    }
                    // Income vem antes de Expense
                    return a.type === TransactionType.INCOME ? -1 : 1;
                });
                setCategories(data);
            });

            const unsubscribeSubcategories = onSnapshot(subcategoriesQuery, (snapshot) => {
                const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Subcategory));
                // Ordenar Subcategorias por ordem alfabética
                data.sort((a, b) => a.name.localeCompare(b.name));
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

    // Reset preselected account when leaving statement view to ensure fresh selection logic
    useEffect(() => {
        if (activeView !== 'statement') {
            setPreselectedAccountId(null);
        }
    }, [activeView]);

    // Função para criar dados iniciais no Firestore
    const seedInitialData = async (userId: string) => {
        if (!db) return;
        try {
            localStorage.setItem(`seeded_${userId}`, 'true');
            const batch = writeBatch(db);

            const initialAccounts = [
                { name: 'Carteira', initialBalance: 0, userId },
                { name: 'Conta Corrente', initialBalance: 0, userId },
            ];
            initialAccounts.forEach(acc => {
                const ref = doc(collection(db!, "accounts"));
                batch.set(ref, acc);
            });

            const initialCategories = [
                { name: 'Salário', type: TransactionType.INCOME, userId },
                { name: 'Alimentação', type: TransactionType.EXPENSE, userId },
                { name: 'Lazer', type: TransactionType.EXPENSE, userId },
                { name: 'Moradia', type: TransactionType.EXPENSE, userId },
                { name: 'Transporte', type: TransactionType.EXPENSE, userId },
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
            // FIX: The variable 't' is not defined in this scope. Use 'id' instead.
            await deleteFromFirestore('transactions', id);
        }
    };
    
    // --- MODAL HANDLERS ---
    const handleOpenAddTransaction = (preselect: { accountId?: string } = {}) => {
        setEditingTransaction(null);
        setPreselectedData(preselect);
        setIsTransactionModalOpen(true);
    };
    const handleOpenInstallmentModal = (preselect: { accountId?: string } = {}) => {
        setPreselectedData(preselect);
        setIsInstallmentModalOpen(true);
    };
    const handleOpenTransferModal = (preselect: { accountId?: string } = {}) => {
        setPreselectedData(preselect);
        setIsTransferModalOpen(true);
    };
    const handleEditTransaction = (transaction: Transaction) => {
        if (transaction.transferId) {
            setEditingTransfer(transaction);
            setIsEditTransferModalOpen(true);
            return;
        }

        const isInstallment = / \(\d+\/\d+\)$/.test(transaction.description);
        setEditingTransaction(transaction);
        if (isInstallment) {
            setIsEditScopeModalOpen(true);
        } else {
            setEditScope('single');
            setIsTransactionModalOpen(true);
        }
    };
    const handleCloseTransactionModal = () => {
        setIsTransactionModalOpen(false);
        setEditingTransaction(null);
        setPreselectedData({});
    }

    // --- IMPORT LOGIC ---
    const handleImportTransactions = (data: Omit<Transaction, 'id'>[]) => {
        if (data.length === 0) return;
        // Generate temp IDs for local management
        const transactionsWithTempIds = data.map(t => ({
            ...t,
            id: `temp_${crypto.randomUUID()}`
        })) as Transaction[];
        
        setPendingImports(transactionsWithTempIds);
        setIsImportReviewModalOpen(true);
    };

    const handleRemovePendingImport = (id: string) => {
        setPendingImports(prev => prev.filter(t => t.id !== id));
    };

    const handleEditPendingImport = (transaction: Transaction) => {
        setEditingTransaction(transaction);
        setIsTransactionModalOpen(true);
        // Note: ImportReviewModal stays open in the background (visual stack) or we can close it. 
        // For better UX on mobile, let's keep it "open" state-wise, but the TransactionModal will cover it.
    };

    const handleConfirmImport = async (targetAccountId: string) => {
        if (!targetAccountId) return;
        setIsSavingImports(true);
        try {
            for (const t of pendingImports) {
                const { id, ...cleanData } = t; // Remove temp ID
                // Override accountId with the selected one in the modal
                await addTransaction({
                    ...cleanData,
                    accountId: targetAccountId
                });
            }
            setPendingImports([]);
            setIsImportReviewModalOpen(false);
        } catch (e) {
            console.error("Error saving imports", e);
            alert("Ocorreu um erro ao salvar algumas transações.");
        } finally {
            setIsSavingImports(false);
        }
    };

    const handleSaveTransaction = (transactionData: Omit<Transaction, 'id'> | Transaction, keepOpen: boolean = false) => {
        // Check if we are editing a pending import (temp ID)
        if ('id' in transactionData && transactionData.id.startsWith('temp_')) {
            // Update the pending list instead of saving to Firestore
            setPendingImports(prev => prev.map(t => t.id === transactionData.id ? (transactionData as Transaction) : t));
            handleCloseTransactionModal();
            return;
        }

        const isRealUpdate = 'id' in transactionData;

        if (isRealUpdate) {
            const updatedTransaction = transactionData as Transaction;
            if (editScope === 'future' && editingTransaction) {
                 // ... (lógica de edição parcelada existente mantida)
                const installmentRegex = /^(.*?) \((\d+)\/(\d+)\)$/;
                const originalMatch = editingTransaction.description.match(installmentRegex);

                if (originalMatch) {
                    const baseDescription = originalMatch[1];
                    const currentInstallmentNum = parseInt(originalMatch[2], 10);
                    
                    const transactionsToUpdate = transactions
                        .filter(t => {
                            const tMatch = t.description.match(installmentRegex);
                            if (!tMatch) return false;
                            const tBaseDescription = tMatch[1];
                            const tInstallmentNum = parseInt(tMatch[2], 10);
                            return tBaseDescription === baseDescription && tInstallmentNum >= currentInstallmentNum;
                        })
                        .sort((a, b) => {
                             const aNum = parseInt(a.description.match(installmentRegex)![2], 10);
                             const bNum = parseInt(b.description.match(installmentRegex)![2], 10);
                             return aNum - bNum;
                        });
                    
                    const newStartDate = new Date(updatedTransaction.date);
                    const newBaseDescriptionMatch = updatedTransaction.description.match(installmentRegex);
                    const newBaseDescription = newBaseDescriptionMatch ? newBaseDescriptionMatch[1] : updatedTransaction.description;

                    transactionsToUpdate.forEach((tToUpdate, index) => {
                        const tMatch = tToUpdate.description.match(installmentRegex)!;
                        const nextDate = new Date(newStartDate);
                        nextDate.setUTCMonth(nextDate.getUTCMonth() + index);

                        const updated = {
                            ...tToUpdate,
                            date: nextDate.toISOString(),
                            amount: updatedTransaction.amount,
                            description: `${newBaseDescription} (${tMatch[2]}/${tMatch[3]})`,
                            accountId: updatedTransaction.accountId,
                            categoryId: updatedTransaction.categoryId,
                            subcategoryId: updatedTransaction.subcategoryId,
                        };
                        updateTransaction(updated);
                    });
                } else {
                     updateTransaction(updatedTransaction);
                }
            } else {
                updateTransaction(updatedTransaction);
            }
        } else {
            // Novo registro
            const { id, ...dataToSave } = transactionData as any;
            addTransaction(dataToSave);
        }

        if (!keepOpen) {
            handleCloseTransactionModal();
            setEditScope(null);
        }
    };

    const handleSaveTransfer = (data: {
        fromAccountId: string;
        toAccountId: string;
        amount: number;
        date: string;
        description: string;
    }) => {
        const { fromAccountId, toAccountId, amount, date, description } = data;
        const fromAccount = accounts.find(a => a.id === fromAccountId);
        const toAccount = accounts.find(a => a.id === toAccountId);
        if (!fromAccount || !toAccount) return;

        const transferId = crypto.randomUUID();

        // FIX: Parse date string as UTC to avoid timezone shifting
        const [year, month, day] = data.date.split('-').map(Number);
        const utcDate = new Date(Date.UTC(year, month - 1, day));
        
        const expenseTransaction: Omit<Transaction, 'id'> = {
            description: `Transferência para ${toAccount.name}${description ? `: ${description}` : ''}`,
            amount,
            date: utcDate.toISOString(),
            accountId: fromAccountId,
            categoryId: '',
            subcategoryId: '',
            type: TransactionType.EXPENSE,
            transferId,
        };
        addTransaction(expenseTransaction);

        const incomeTransaction: Omit<Transaction, 'id'> = {
            description: `Transferência de ${fromAccount.name}${description ? `: ${description}`: ''}`,
            amount,
            date: utcDate.toISOString(),
            accountId: toAccountId,
            categoryId: '',
            subcategoryId: '',
            type: TransactionType.INCOME,
            transferId,
        };
        addTransaction(incomeTransaction);

        setIsTransferModalOpen(false);
        setPreselectedData({});
    };

    const handleSaveEditedTransfer = async (data: {
        fromAccountId: string;
        toAccountId: string;
        amount: number;
        date: string;
        description: string;
    }) => {
        if (!editingTransfer || !editingTransfer.transferId) {
            console.error("No transfer is being edited.");
            return;
        }
        if (!db) return;

        const transferId = editingTransfer.transferId;
        const relatedTransactions = transactions.filter(t => t.transferId === transferId);

        if (relatedTransactions.length !== 2) {
            alert("Erro: não foi possível encontrar as duas partes da transferência para editar.");
            return;
        }
        
        const fromAccount = accounts.find(a => a.id === data.fromAccountId);
        const toAccount = accounts.find(a => a.id === data.toAccountId);
        if (!fromAccount || !toAccount) {
            alert("Erro: Conta de origem ou destino inválida.");
            return;
        }

        const expensePart = relatedTransactions.find(t => t.type === TransactionType.EXPENSE);
        const incomePart = relatedTransactions.find(t => t.type === TransactionType.INCOME);

        if (!expensePart || !incomePart) {
             alert("Erro: não foi possível identificar as transações de entrada e saída.");
             return;
        }

        const [year, month, day] = data.date.split('-').map(Number);
        const utcDate = new Date(Date.UTC(year, month - 1, day));
        
        const batch = writeBatch(db);

        const expenseRef = doc(db, 'transactions', expensePart.id);
        batch.update(expenseRef, {
            accountId: data.fromAccountId,
            amount: data.amount,
            date: utcDate.toISOString(),
            description: `Transferência para ${toAccount.name}${data.description ? `: ${data.description}` : ''}`
        });

        const incomeRef = doc(db, 'transactions', incomePart.id);
        batch.update(incomeRef, {
            accountId: data.toAccountId,
            amount: data.amount,
            date: utcDate.toISOString(),
            description: `Transferência de ${fromAccount.name}${data.description ? `: ${data.description}` : ''}`
        });
        
        await batch.commit();

        setIsEditTransferModalOpen(false);
        setEditingTransfer(null);
    };

    const handleSaveInstallments = (data: {
        description: string;
        totalAmount: number;
        installments: number;
        startDate: string;
        accountId: string;
        categoryId: string;
        subcategoryId: string;
    }) => {
        const { description, totalAmount, installments, startDate, accountId, categoryId, subcategoryId } = data;
        
        if (installments <= 1 || totalAmount <= 0) return;

        const totalAmountInCents = Math.round(totalAmount * 100);
        const installmentAmountInCents = Math.floor(totalAmountInCents / installments);
        const remainderCents = totalAmountInCents % installments;

        const [year, month, day] = startDate.split('-').map(Number);

        for (let i = 0; i < installments; i++) {
            // FIX: Create date in UTC to avoid timezone shifting
            const transactionDate = new Date(Date.UTC(year, month - 1 + i, day));

            let currentInstallmentCents = installmentAmountInCents;
            if (i === installments - 1) {
                currentInstallmentCents += remainderCents;
            }
            const installmentAmount = currentInstallmentCents / 100;

            const newTransaction: Omit<Transaction, 'id'> = {
                description: `${description} (${i + 1}/${installments})`,
                amount: installmentAmount,
                date: transactionDate.toISOString(),
                accountId,
                categoryId,
                subcategoryId,
                type: TransactionType.EXPENSE,
            };
            addTransaction(newTransaction);
        }
        setIsInstallmentModalOpen(false);
        setPreselectedData({});
    };

    const handleDeleteRequest = (id: string) => {
        setTransactionToDelete(id);
        setIsConfirmModalOpen(true);
    };
    
    const handleConfirmDelete = () => {
        if (transactionToDelete) {
            deleteTransaction(transactionToDelete);
        }
        setIsConfirmModalOpen(false);
        setTransactionToDelete(null);
    };
    
    const handleScopeSelection = (scope: 'single' | 'future') => {
        setEditScope(scope);
        setIsEditScopeModalOpen(false);
        setIsTransactionModalOpen(true);
    };

    const handleNavigateToStatement = (accountId: string) => {
        setPreselectedAccountId(accountId);
        setActiveView('statement');
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
        
        const transactionViewProps = {
            transactions,
            accounts,
            categories,
            subcategories,
            addTransaction: handleOpenAddTransaction,
            updateTransaction,
            deleteTransaction: handleDeleteRequest,
            handleEditTransaction,
            handleOpenInstallmentModal,
            handleOpenTransferModal,
            onImportTransactions: handleImportTransactions,
        };

        const statementViewProps = {
             transactions,
             accounts,
             categories,
             handleOpenAddTransaction,
             handleOpenInstallmentModal,
             handleOpenTransferModal,
             handleEditTransaction,
             handleDeleteRequest,
             initialAccountId: preselectedAccountId
        };

        switch (activeView) {
            case 'dashboard':
                return <Dashboard transactions={transactions} categories={categories} accounts={accounts} subcategories={subcategories} setActiveView={setActiveView} />;
            case 'transactions':
                return <TransactionsView {...transactionViewProps} addAccount={addAccount} addCategory={addCategory} addSubcategory={addSubcategory}/>;
            case 'statement':
                return <StatementView {...statementViewProps} />;
            case 'balance':
                return <BalanceView accounts={accounts} transactions={transactions} onNavigateToStatement={handleNavigateToStatement} />;
            case 'settings':
                return <SettingsView {...settingsProps} />;
            default:
                return <Dashboard transactions={transactions} categories={categories} accounts={accounts} subcategories={subcategories} setActiveView={setActiveView} />;
        }
    };
    
    const NavItem: React.FC<{ view: ActiveView, label: string, icon: React.ReactNode }> = ({ view, label, icon }) => (
        <li title={label}>
            <button
                onClick={() => setActiveView(view)}
                className={`flex items-center p-3 my-1 rounded-xl w-full text-left transition-all duration-200 group ${isSidebarOpen ? '' : 'justify-center'} ${
                    activeView === view 
                    ? 'bg-violet-600 text-white shadow-lg shadow-violet-600/30' 
                    : 'text-slate-500 dark:text-slate-400 hover:bg-violet-50 dark:hover:bg-slate-800 hover:text-violet-600 dark:hover:text-violet-400'
                }`}
            >
                <span className={`transition-transform duration-200 ${activeView === view ? 'scale-110' : 'group-hover:scale-110'}`}>
                   {icon}
                </span>
                <span className={`ml-4 font-medium whitespace-nowrap transition-all duration-300 ${isSidebarOpen ? 'opacity-100' : 'opacity-0 sr-only'}`}>{label}</span>
            </button>
        </li>
    );

    const MobileNavItem: React.FC<{ view: ActiveView, label: string, icon: React.ReactNode }> = ({ view, label, icon }) => (
        <button 
            key={view}
            onClick={() => setActiveView(view)} 
            className={`p-2 rounded-xl flex flex-col items-center justify-center transition-all duration-200 w-full ${
                activeView === view 
                ? 'text-violet-600 dark:text-violet-400 bg-violet-50 dark:bg-violet-900/20' 
                : 'text-slate-400 dark:text-slate-500'
            }`}
        >
            <div className={`w-6 h-6 ${activeView === view ? 'scale-110' : ''} transition-transform`}>
                {icon}
            </div>
            <span className="text-[10px] font-medium mt-1">{label}</span>
        </button>
    );

    return (
        <div className="min-h-screen font-sans text-slate-800 dark:text-slate-200 bg-slate-50 dark:bg-slate-950 selection:bg-violet-200 dark:selection:bg-violet-900">
            {/* Sidebar Desktop */}
            <aside className={`bg-white dark:bg-slate-900 p-4 border-r border-slate-200 dark:border-slate-800 hidden md:flex md:flex-col fixed h-full z-20 shadow-xl shadow-slate-200/50 dark:shadow-none transition-all duration-300 ease-in-out ${isSidebarOpen ? 'w-72' : 'w-20'}`}>
                 <div className={`flex items-center gap-3 mb-8 px-2 transition-all duration-300 ${isSidebarOpen ? 'justify-start' : 'justify-center'}`}>
                    <div className="flex-shrink-0 p-2 bg-gradient-to-br from-violet-500 to-indigo-600 rounded-lg text-white shadow-lg shadow-violet-500/30">
                        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" /></svg>
                    </div>
                    <span className={`text-xl font-bold tracking-tight text-slate-900 dark:text-white whitespace-nowrap transition-opacity duration-200 ${isSidebarOpen ? 'opacity-100' : 'opacity-0 sr-only'}`}>Minhas <span className="text-violet-600">Finanças</span></span>
                </div>

                 <div className="mb-6 px-2">
                    <div className={`p-3 bg-slate-50 dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700/50 transition-all duration-300 ${!isSidebarOpen && 'p-2'}`}>
                        <div className={`flex items-center ${!isSidebarOpen && 'justify-center'}`}>
                             <div className="w-8 h-8 rounded-full bg-gradient-to-br from-slate-200 to-slate-300 dark:from-slate-600 dark:to-slate-700 flex items-center justify-center font-bold text-slate-600 dark:text-white uppercase flex-shrink-0">
                                 {user?.firstName.charAt(0)}
                             </div>
                             <div className={`ml-3 overflow-hidden transition-opacity duration-200 ${isSidebarOpen ? 'opacity-100' : 'opacity-0 sr-only'}`}>
                                <p className="font-bold text-sm text-slate-800 dark:text-white truncate">{user?.firstName} {user?.lastName}</p>
                                <p className="text-xs text-slate-500 truncate">{user?.email}</p>
                            </div>
                        </div>
                    </div>
                </div>


                <nav className="flex-grow">
                    <ul>
                        <NavItem view="dashboard" label="Painel Geral" icon={<DashboardIcon className="w-5 h-5" />} />
                        <NavItem view="transactions" label="Transações" icon={<TransactionsIcon className="w-5 h-5" />} />
                        <NavItem view="statement" label="Extratos" icon={<DocumentTextIcon className="w-5 h-5" />} />
                        <NavItem view="balance" label="Saldos" icon={<BalanceIcon className="w-5 h-5" />} />
                        <NavItem view="settings" label="Configurações" icon={<SettingsIcon className="w-5 h-5" />} />
                    </ul>
                </nav>
                
                <div className="mt-auto pt-4 border-t border-slate-100 dark:border-slate-800 space-y-1">
                    <button
                        onClick={toggleTheme}
                        className={`flex items-center p-3 rounded-xl w-full text-left transition-all duration-200 group ${isSidebarOpen ? '' : 'justify-center'} text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800`}
                        title={theme === 'light' ? "Modo Escuro" : "Modo Claro"}
                    >
                         <div className={`w-5 h-5 transition-transform duration-200 ${!isSidebarOpen && 'group-hover:scale-110'}`}>
                            {theme === 'light' ? <MoonIcon /> : <SunIcon />}
                         </div>
                        <span className={`ml-4 font-medium whitespace-nowrap transition-opacity duration-200 ${isSidebarOpen ? 'opacity-100' : 'opacity-0 sr-only'}`}>
                            {theme === 'light' ? 'Modo Escuro' : 'Modo Claro'}
                        </span>
                    </button>
                    <button
                        onClick={logout}
                        className={`flex items-center p-3 rounded-xl w-full text-left transition-all duration-200 group ${isSidebarOpen ? '' : 'justify-center'} text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-900/20`}
                        title="Sair"
                    >
                         <LogoutIcon className={`w-5 h-5 transition-transform duration-200 ${!isSidebarOpen && 'group-hover:scale-110'}`} />
                        <span className={`ml-4 font-medium whitespace-nowrap transition-opacity duration-200 ${isSidebarOpen ? 'opacity-100' : 'opacity-0 sr-only'}`}>Sair</span>
                    </button>
                    <button
                        onClick={() => setIsSidebarOpen(!isSidebarOpen)}
                        className="flex items-center p-3 rounded-xl w-full text-left transition-colors text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
                    >
                         <ChevronDoubleLeftIcon className={`w-5 h-5 transition-transform duration-300 ${!isSidebarOpen && 'rotate-180'}`} />
                        <span className={`ml-4 font-medium whitespace-nowrap transition-opacity duration-200 ${isSidebarOpen ? 'opacity-100' : 'opacity-0 sr-only'}`}>Recolher</span>
                    </button>
                </div>
            </aside>

            {/* Main Content */}
            <main className={`transition-all duration-300 ease-in-out pb-24 md:pb-0 ${isSidebarOpen ? 'md:ml-72' : 'md:ml-20'}`}>
                 {renderView()}
            </main>

             {/* Mobile Navigation */}
            <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white/80 dark:bg-slate-900/80 backdrop-blur-lg border-t border-slate-200 dark:border-slate-800 grid grid-cols-5 gap-1 p-2 z-50 safe-area-bottom shadow-[0_-4px_20px_rgba(0,0,0,0.05)]">
                <MobileNavItem view="dashboard" label="Painel" icon={<DashboardIcon />} />
                <MobileNavItem view="transactions" label="Transações" icon={<TransactionsIcon />} />
                <MobileNavItem view="statement" label="Extratos" icon={<DocumentTextIcon />} />
                <MobileNavItem view="balance" label="Saldos" icon={<BalanceIcon />} />
                <button 
                    onClick={() => setIsMobileMenuOpen(true)} 
                    className="p-2 rounded-xl flex flex-col items-center justify-center transition-all duration-200 w-full text-slate-400 dark:text-slate-500"
                >
                    <div className="w-6 h-6"><MoreHorizontalIcon /></div>
                    <span className="text-[10px] font-medium mt-1">Mais</span>
                </button>
            </nav>

             {/* MODALS CONTAINER */}
             <Modal isOpen={isMobileMenuOpen} onClose={() => setIsMobileMenuOpen(false)} title="Mais Opções">
                 <div className="space-y-2 pb-8">
                     <button
                        onClick={() => { setActiveView('settings'); setIsMobileMenuOpen(false); }}
                        className="w-full flex items-center p-4 text-left rounded-xl text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                     >
                         <SettingsIcon className="w-6 h-6 mr-4 text-slate-500 dark:text-slate-400" />
                         <span className="font-medium">Configurações</span>
                     </button>
                     <div className="w-full flex items-center p-4 text-left rounded-xl text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
                         <div className="w-6 h-6 mr-4 text-slate-500 dark:text-slate-400">
                             {theme === 'light' ? <MoonIcon /> : <SunIcon />}
                         </div>
                         <span className="font-medium flex-grow">Alterar Tema</span>
                         <ThemeToggle />
                     </div>
                     <button
                        onClick={logout}
                        className="w-full flex items-center p-4 text-left rounded-xl text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-900/30 transition-colors"
                     >
                         <LogoutIcon className="w-6 h-6 mr-4" />
                         <span className="font-medium">Sair</span>
                     </button>
                 </div>
             </Modal>


            {/* REVIEW IMPORT MODAL */}
            <ImportReviewModal 
                isOpen={isImportReviewModalOpen}
                onClose={() => {
                    setIsImportReviewModalOpen(false);
                    setPendingImports([]);
                }}
                transactions={pendingImports}
                accounts={accounts}
                onRemove={handleRemovePendingImport}
                onEdit={handleEditPendingImport}
                onConfirm={handleConfirmImport}
                isSaving={isSavingImports}
            />

            <Modal isOpen={isTransactionModalOpen} onClose={handleCloseTransactionModal} title={editingTransaction ? "Editar Transação" : "Nova Transação"}>
                <TransactionForm 
                    transaction={editingTransaction}
                    accounts={accounts}
                    categories={categories}
                    subcategories={subcategories}
                    allTransactions={transactions}
                    onSave={handleSaveTransaction}
                    onClose={handleCloseTransactionModal}
                    preselectedData={preselectedData}
                />
            </Modal>
            
            <Modal isOpen={isTransferModalOpen} onClose={() => { setIsTransferModalOpen(false); setPreselectedData({}); }} title="Nova Transferência">
                <TransferForm
                    accounts={accounts}
                    onSave={handleSaveTransfer}
                    onClose={() => { setIsTransferModalOpen(false); setPreselectedData({}); }}
                    preselectedData={preselectedData}
                />
            </Modal>

            {editingTransfer && (
                <Modal isOpen={isEditTransferModalOpen} onClose={() => { setIsEditTransferModalOpen(false); setEditingTransfer(null); }} title="Editar Transferência">
                    <EditTransferForm
                        accounts={accounts}
                        transactions={transactions}
                        editingTransfer={editingTransfer}
                        onSave={handleSaveEditedTransfer}
                        onClose={() => { setIsEditTransferModalOpen(false); setEditingTransfer(null); }}
                    />
                </Modal>
            )}

            <Modal isOpen={isInstallmentModalOpen} onClose={() => { setIsInstallmentModalOpen(false); setPreselectedData({}); }} title="Lançar Compra Parcelada">
                <InstallmentForm 
                    accounts={accounts}
                    categories={categories}
                    subcategories={subcategories}
                    onSave={handleSaveInstallments}
                    onClose={() => { setIsInstallmentModalOpen(false); setPreselectedData({}); }}
                    preselectedData={preselectedData}
                />
            </Modal>

            <Modal isOpen={isEditScopeModalOpen} onClose={() => setIsEditScopeModalOpen(false)} title="Editar Parcelamento">
                <div className="space-y-4">
                    <button 
                        onClick={() => handleScopeSelection('single')}
                        className="w-full text-left p-4 rounded-xl border border-slate-200 dark:border-slate-700 hover:border-violet-500 hover:bg-violet-50 dark:hover:bg-violet-900/20 transition-all group"
                    >
                        <p className="font-bold text-slate-800 dark:text-white group-hover:text-violet-700 dark:group-hover:text-violet-400">Apenas esta parcela</p>
                        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Alterar somente a transação selecionada.</p>
                    </button>
                    <button 
                        onClick={() => handleScopeSelection('future')}
                        className="w-full text-left p-4 rounded-xl border border-slate-200 dark:border-slate-700 hover:border-violet-500 hover:bg-violet-50 dark:hover:bg-violet-900/20 transition-all group"
                    >
                        <p className="font-bold text-slate-800 dark:text-white group-hover:text-violet-700 dark:group-hover:text-violet-400">Esta e as próximas</p>
                        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Alterar esta parcela e todas as futuras.</p>
                    </button>
                </div>
            </Modal>

            <Modal isOpen={isConfirmModalOpen} onClose={() => setIsConfirmModalOpen(false)} title="Excluir Transação">
                <div className="text-slate-600 dark:text-slate-300 pb-6">
                    <p className="mb-4">Tem certeza que deseja remover este lançamento?</p>
                     {transactions.find(t => t.id === transactionToDelete)?.transferId && (
                        <div className="p-3 bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-400 rounded-lg text-sm mb-4">
                            Esta é uma transferência. A transação correspondente na outra conta também será removida.
                        </div>
                     )}
                    <div className="flex justify-end gap-3">
                        <button 
                            type="button" 
                            onClick={() => setIsConfirmModalOpen(false)} 
                            className="px-4 py-2 rounded-xl text-slate-600 dark:text-slate-300 font-medium hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                        >
                            Cancelar
                        </button>
                        <button 
                            type="button" 
                            onClick={handleConfirmDelete} 
                            className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold shadow-lg shadow-rose-500/20 transition-all"
                        >
                            Confirmar Exclusão
                        </button>
                    </div>
                </div>
            </Modal>
        </div>
    );
};

export default App;