import React, { useState, useMemo, useRef, useEffect } from 'react';
import { Transaction, Account, Category, Subcategory, TransactionType } from '../types';
import { formatCurrency, formatDate, formatMonthYear, translateTransactionType } from '../utils';
import { ChevronLeftIcon, ChevronRightIcon, PencilIcon, PlusIcon, SparklesIcon, TrashIcon, UploadIcon, SearchIcon, XIcon, TableIcon } from './shared/icons';
import Modal from './shared/Modal';
import { suggestCategory } from '../services/geminiService';
import { parseOFX, ParsedTransaction } from '../services/ofxParser';
import { parseXLSX, ParsedXLSXTransaction } from '../services/xlsxParser';


interface TransactionsViewProps {
  transactions: Transaction[];
  accounts: Account[];
  categories: Category[];
  subcategories: Subcategory[];
  addTransaction: (transaction: Omit<Transaction, 'id'>) => void;
  updateTransaction: (transaction: Transaction) => void;
  deleteTransaction: (id: string) => void;
  addAccount: (account: Omit<Account, 'id'>) => Account;
  addCategory: (category: Omit<Category, 'id'>) => Category;
  addSubcategory: (subcategory: Omit<Subcategory, 'id'>) => Subcategory;
}

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

const TransactionForm: React.FC<{
    transaction?: Transaction | null;
    accounts: Account[];
    categories: Category[];
    subcategories: Subcategory[];
    onSave: (transaction: Omit<Transaction, 'id'> | Transaction) => void;
    onClose: () => void;
}> = ({ transaction, accounts, categories, subcategories, onSave, onClose }) => {
    const [baseDescription, setBaseDescription] = useState('');
    const [installmentPart, setInstallmentPart] = useState<string | null>(null);
    const [amount, setAmount] = useState(0);
    const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
    const [accountId, setAccountId] = useState('');
    const [categoryId, setCategoryId] = useState('');
    const [subcategoryId, setSubcategoryId] = useState('');
    const [type, setType] = useState(TransactionType.EXPENSE);
    const [isSuggesting, setIsSuggesting] = useState(false);
    
    const baseInputClass = "w-full bg-gray-100 dark:bg-slate-700 text-gray-900 dark:text-white rounded-md p-2 border border-gray-300 dark:border-slate-600 focus:ring-sky-500 focus:border-sky-500";
    const labelClass = "block text-sm font-medium text-gray-600 dark:text-slate-300";


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
            setAccountId('');
            setCategoryId('');
            setSubcategoryId('');
            setType(TransactionType.EXPENSE);
        }
    }, [transaction]);

    const filteredCategories = useMemo(() => categories.filter(c => c.type === type), [categories, type]);
    const filteredSubcategories = useMemo(() => subcategories.filter(s => s.categoryId === categoryId), [subcategories, categoryId]);
    
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

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        const selectedCategory = categories.find(c => c.id === categoryId);
        if (!selectedCategory && categoryId !== '') return;
        
        const finalDescription = installmentPart ? baseDescription + installmentPart : baseDescription;

        const newTransaction: Omit<Transaction, 'id'> | Transaction = {
            ...(transaction && { id: transaction.id }),
            description: finalDescription,
            amount: +amount,
            date: new Date(date).toISOString(),
            accountId,
            categoryId,
            subcategoryId,
            type: selectedCategory?.type || type
        };
        onSave(newTransaction);
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-4">
             <div>
                <label className={labelClass}>Descrição</label>
                <div className="flex items-center space-x-2 mt-1">
                <input type="text" value={baseDescription} onChange={e => setBaseDescription(e.target.value)} required className={baseInputClass}/>
                 <button type="button" onClick={handleSuggestCategory} disabled={isSuggesting} className="p-2 bg-sky-600 hover:bg-sky-700 rounded-md disabled:bg-slate-500" title="Sugerir Categoria">
                    {isSuggesting ? <div className="w-5 h-5 border-2 border-t-transparent border-white rounded-full animate-spin"></div> : <SparklesIcon className="h-5 w-5"/>}
                </button>
                </div>
            </div>
            <div>
                <label className={labelClass}>Valor</label>
                <input type="number" step="0.01" value={amount} onChange={e => setAmount(parseFloat(e.target.value))} required className={`mt-1 ${baseInputClass}`}/>
            </div>
            <div>
                <label className={labelClass}>Data</label>
                <input type="date" value={date} onChange={e => setDate(e.target.value)} required className={`mt-1 ${baseInputClass}`}/>
            </div>
             <div>
                <label className={labelClass}>Conta</label>
                <select value={accountId} onChange={e => setAccountId(e.target.value)} required className={`mt-1 ${baseInputClass}`}>
                    <option value="">Selecione a Conta</option>
                    {accounts.map(acc => <option key={acc.id} value={acc.id}>{acc.name}</option>)}
                </select>
            </div>
            <div>
                <label className={labelClass}>Tipo</label>
                 <select value={type} onChange={e => { setType(e.target.value as TransactionType); setCategoryId(''); setSubcategoryId('') }} className={`mt-1 ${baseInputClass}`}>
                    <option value={TransactionType.EXPENSE}>{translateTransactionType(TransactionType.EXPENSE)}</option>
                    <option value={TransactionType.INCOME}>{translateTransactionType(TransactionType.INCOME)}</option>
                </select>
            </div>
            <div>
                <label className={labelClass}>Categoria</label>
                <select value={categoryId} onChange={e => {setCategoryId(e.target.value); setSubcategoryId('');}} required className={`mt-1 ${baseInputClass}`}>
                    <option value="">Selecione a Categoria</option>
                    {filteredCategories.map(cat => <option key={cat.id} value={cat.id}>{cat.name}</option>)}
                </select>
            </div>
            {filteredSubcategories.length > 0 && <div>
                <label className={labelClass}>Subcategoria</label>
                <select value={subcategoryId} onChange={e => setSubcategoryId(e.target.value)} className={`mt-1 ${baseInputClass}`}>
                    <option value="">Selecione a Subcategoria</option>
                    {filteredSubcategories.map(sub => <option key={sub.id} value={sub.id}>{sub.name}</option>)}
                </select>
            </div>}
            <div className="flex justify-end gap-4 pt-4">
                <button type="button" onClick={onClose} className="bg-gray-200 dark:bg-slate-600 hover:bg-gray-300 dark:hover:bg-slate-700 text-gray-800 dark:text-white font-bold py-2 px-4 rounded-lg">Cancelar</button>
                <button type="submit" className="bg-sky-600 hover:bg-sky-700 text-white font-bold py-2 px-4 rounded-lg">Salvar Transação</button>
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
}> = ({ accounts, categories, subcategories, onSave, onClose }) => {
    const [description, setDescription] = useState('');
    const [totalAmount, setTotalAmount] = useState(0);
    const [installments, setInstallments] = useState(2);
    const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0]);
    const [accountId, setAccountId] = useState('');
    const [categoryId, setCategoryId] = useState('');
    const [subcategoryId, setSubcategoryId] = useState('');
    
    const baseInputClass = "w-full bg-gray-100 dark:bg-slate-700 text-gray-900 dark:text-white rounded-md p-2 border border-gray-300 dark:border-slate-600 focus:ring-sky-500 focus:border-sky-500";
    const labelClass = "block text-sm font-medium text-gray-600 dark:text-slate-300";

    const expenseCategories = useMemo(() => categories.filter(c => c.type === TransactionType.EXPENSE), [categories]);
    const filteredSubcategories = useMemo(() => subcategories.filter(s => s.categoryId === categoryId), [subcategories, categoryId]);

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
        <form onSubmit={handleSubmit} className="space-y-4">
            <div>
                <label className={labelClass}>Descrição</label>
                <input type="text" value={description} onChange={e => setDescription(e.target.value)} required className={`mt-1 ${baseInputClass}`}/>
            </div>
            <div className="grid grid-cols-2 gap-4">
                <div>
                    <label className={labelClass}>Valor Total</label>
                    <input type="number" step="0.01" value={totalAmount} onChange={e => setTotalAmount(parseFloat(e.target.value))} required min="0.01" className={`mt-1 ${baseInputClass}`}/>
                </div>
                <div>
                    <label className={labelClass}>Nº de Parcelas</label>
                    <input type="number" value={installments} onChange={e => setInstallments(parseInt(e.target.value, 10))} required min="2" className={`mt-1 ${baseInputClass}`}/>
                </div>
            </div>
             <div>
                <label className={labelClass}>Data da Primeira Parcela</label>
                <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} required className={`mt-1 ${baseInputClass}`}/>
            </div>
             <div>
                <label className={labelClass}>Conta</label>
                <select value={accountId} onChange={e => setAccountId(e.target.value)} required className={`mt-1 ${baseInputClass}`}>
                    <option value="">Selecione a Conta</option>
                    {accounts.map(acc => <option key={acc.id} value={acc.id}>{acc.name}</option>)}
                </select>
            </div>
            <div>
                <label className={labelClass}>Categoria</label>
                <select value={categoryId} onChange={e => {setCategoryId(e.target.value); setSubcategoryId('');}} required className={`mt-1 ${baseInputClass}`}>
                    <option value="">Selecione a Categoria</option>
                    {expenseCategories.map(cat => <option key={cat.id} value={cat.id}>{cat.name}</option>)}
                </select>
            </div>
            {filteredSubcategories.length > 0 && <div>
                <label className={labelClass}>Subcategoria</label>
                <select value={subcategoryId} onChange={e => setSubcategoryId(e.target.value)} className={`mt-1 ${baseInputClass}`}>
                    <option value="">Selecione a Subcategoria</option>
                    {filteredSubcategories.map(sub => <option key={sub.id} value={sub.id}>{sub.name}</option>)}
                </select>
            </div>}
            <div className="flex justify-end gap-4 pt-4">
                <button type="button" onClick={onClose} className="bg-gray-200 dark:bg-slate-600 hover:bg-gray-300 dark:hover:bg-slate-700 text-gray-800 dark:text-white font-bold py-2 px-4 rounded-lg">Cancelar</button>
                <button type="submit" className="bg-sky-600 hover:bg-sky-700 text-white font-bold py-2 px-4 rounded-lg">Salvar Parcelamento</button>
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
}> = ({ accounts, onSave, onClose }) => {
    const [fromAccountId, setFromAccountId] = useState('');
    const [toAccountId, setToAccountId] = useState('');
    const [amount, setAmount] = useState(0);
    const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
    const [description, setDescription] = useState('');
    
    const baseInputClass = "w-full bg-gray-100 dark:bg-slate-700 text-gray-900 dark:text-white rounded-md p-2 border border-gray-300 dark:border-slate-600 focus:ring-sky-500 focus:border-sky-500";
    const labelClass = "block text-sm font-medium text-gray-600 dark:text-slate-300";


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
        <form onSubmit={handleSubmit} className="space-y-4">
            <div>
                <label className={labelClass}>Conta de Origem</label>
                <select value={fromAccountId} onChange={e => setFromAccountId(e.target.value)} required className={`mt-1 ${baseInputClass}`}>
                    <option value="">Selecione a Conta</option>
                    {accounts.map(acc => <option key={acc.id} value={acc.id}>{acc.name}</option>)}
                </select>
            </div>
            <div>
                <label className={labelClass}>Conta de Destino</label>
                <select value={toAccountId} onChange={e => setToAccountId(e.target.value)} required className={`mt-1 ${baseInputClass}`}>
                    <option value="">Selecione a Conta</option>
                    {accounts.map(acc => <option key={acc.id} value={acc.id}>{acc.name}</option>)}
                </select>
            </div>
            <div>
                <label className={labelClass}>Valor</label>
                <input type="number" step="0.01" value={amount} onChange={e => setAmount(parseFloat(e.target.value))} required min="0.01" className={`mt-1 ${baseInputClass}`}/>
            </div>
             <div>
                <label className={labelClass}>Data</label>
                <input type="date" value={date} onChange={e => setDate(e.target.value)} required className={`mt-1 ${baseInputClass}`}/>
            </div>
             <div>
                <label className={labelClass}>Descrição</label>
                <input type="text" value={description} onChange={e => setDescription(e.target.value)} className={`mt-1 ${baseInputClass}`}/>
            </div>
            <div className="flex justify-end gap-4 pt-4">
                <button type="button" onClick={onClose} className="bg-gray-200 dark:bg-slate-600 hover:bg-gray-300 dark:hover:bg-slate-700 text-gray-800 dark:text-white font-bold py-2 px-4 rounded-lg">Cancelar</button>
                <button type="submit" className="bg-sky-600 hover:bg-sky-700 text-white font-bold py-2 px-4 rounded-lg">Salvar Transferência</button>
            </div>
        </form>
    );
};

const OFXImportReviewModal: React.FC<{
    isOpen: boolean;
    onClose: () => void;
    onSave: (transactions: (Omit<Transaction, 'id'> & { accountId: string })[]) => void;
    initialTransactions: ImportTransaction[];
    accounts: Account[];
    categories: Category[];
    subcategories: Subcategory[];
}> = ({ isOpen, onClose, onSave, initialTransactions, accounts, categories, subcategories }) => {
    const [reviewedTransactions, setReviewedTransactions] = useState<ImportTransaction[]>(initialTransactions);
    const [selectedAccountId, setSelectedAccountId] = useState('');

    React.useEffect(() => {
        if (isOpen) {
            setReviewedTransactions(initialTransactions);
            setSelectedAccountId(accounts.length === 1 ? accounts[0].id : '');
        }
    }, [isOpen, initialTransactions, accounts]);

    const handleTransactionChange = (key: string, field: keyof Omit<ImportTransaction, 'key'>, value: string) => {
        setReviewedTransactions(prev =>
            prev.map(t => {
                if (t.key === key) {
                    const updatedTransaction = { ...t };
                    
                    if (field === 'amount') {
                        (updatedTransaction as any)[field] = parseFloat(value) || 0;
                    } else if (field === 'date') {
                        const parts = value.split('-').map(p => parseInt(p, 10));
                        (updatedTransaction as any)[field] = new Date(Date.UTC(parts[0], parts[1] - 1, parts[2])).toISOString();
                    } else if (field === 'type') {
                        updatedTransaction.type = value as TransactionType;
                        updatedTransaction.categoryId = '';
                        updatedTransaction.subcategoryId = '';
                    } else if (field === 'categoryId') {
                        updatedTransaction.categoryId = value;
                        updatedTransaction.subcategoryId = '';
                    } else {
                        (updatedTransaction as any)[field] = value;
                    }
                    return updatedTransaction;
                }
                return t;
            })
        );
    };

    const handleDeleteTransaction = (key: string) => {
        setReviewedTransactions(prev => prev.filter(t => t.key !== key));
    };

    const handleSave = () => {
        if (!selectedAccountId) {
            alert('Por favor, selecione uma conta para importar as transações.');
            return;
        }
        const transactionsToSave = reviewedTransactions.map(({ key, ...rest }) => ({
            ...rest,
            accountId: selectedAccountId,
        }));
        onSave(transactionsToSave);
    };
    
    const baseInputClass = "w-full bg-gray-50 dark:bg-slate-600 text-gray-900 dark:text-white rounded p-2 border border-gray-300 dark:border-slate-500 text-sm focus:ring-sky-500 focus:border-sky-500";
    const labelClass = "block text-sm font-medium text-gray-600 dark:text-slate-300";

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={`Revisar e Importar ${reviewedTransactions.length} Transações (OFX)`} size="5xl">
            <div className="space-y-4">
                <div>
                    <label className={labelClass}>Importar para a Conta</label>
                    <select value={selectedAccountId} onChange={e => setSelectedAccountId(e.target.value)} required className="mt-1 w-full bg-gray-100 dark:bg-slate-700 text-gray-900 dark:text-white rounded-md p-2 border border-gray-300 dark:border-slate-600 focus:ring-sky-500 focus:border-sky-500">
                        <option value="">-- Selecione uma Conta --</option>
                        {accounts.map(acc => <option key={acc.id} value={acc.id}>{acc.name}</option>)}
                    </select>
                </div>

                <div className="max-h-[60vh] overflow-y-auto border border-gray-200 dark:border-slate-700 rounded-lg">
                    <table className="w-full text-left text-sm" style={{ tableLayout: 'fixed' }}>
                        <thead className="bg-gray-100 dark:bg-slate-700/50 sticky top-0 z-10">
                            <tr>
                                <th className="p-2 font-semibold" style={{ width: '10%'}}>Data</th>
                                <th className="p-2 font-semibold" style={{ width: '35%'}}>Descrição</th>
                                <th className="p-2 font-semibold text-right" style={{ width: '10%'}}>Valor</th>
                                <th className="p-2 font-semibold" style={{ width: '10%'}}>Tipo</th>
                                <th className="p-2 font-semibold" style={{ width: '15%'}}>Categoria</th>
                                <th className="p-2 font-semibold" style={{ width: '15%'}}>Subcategoria</th>
                                <th className="p-2 font-semibold text-center" style={{ width: '5%'}}></th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200 dark:divide-slate-700">
                            {reviewedTransactions.map(t => {
                                const filteredCategories = categories.filter(c => c.type === t.type);
                                const filteredSubcategories = subcategories.filter(s => s.categoryId === t.categoryId);
                                return (
                                <tr key={t.key} className="hover:bg-gray-50 dark:hover:bg-slate-700/50">
                                    <td className="p-2">
                                        <input type="date" value={t.date.split('T')[0]} onChange={e => handleTransactionChange(t.key, 'date', e.target.value)} className={baseInputClass} />
                                    </td>
                                    <td className="p-2">
                                        <input type="text" value={t.description} onChange={e => handleTransactionChange(t.key, 'description', e.target.value)} className={baseInputClass} />
                                    </td>
                                    <td className="p-2">
                                        <input type="number" step="0.01" value={t.amount} onChange={e => handleTransactionChange(t.key, 'amount', e.target.value)} className={`${baseInputClass} text-right ${t.type === TransactionType.INCOME ? 'text-emerald-500' : 'text-rose-500'}`} />
                                    </td>
                                    <td className="p-2">
                                        <select value={t.type} onChange={e => handleTransactionChange(t.key, 'type', e.target.value)} className={baseInputClass}>
                                            <option value={TransactionType.EXPENSE}>{translateTransactionType(TransactionType.EXPENSE)}</option>
                                            <option value={TransactionType.INCOME}>{translateTransactionType(TransactionType.INCOME)}</option>
                                        </select>
                                    </td>
                                    <td className="p-2">
                                        <select value={t.categoryId} onChange={e => handleTransactionChange(t.key, 'categoryId', e.target.value)} className={baseInputClass}>
                                            <option value="">Sem categoria</option>
                                            {filteredCategories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                                        </select>
                                    </td>
                                    <td className="p-2">
                                        <select value={t.subcategoryId} onChange={e => handleTransactionChange(t.key, 'subcategoryId', e.target.value)} disabled={!t.categoryId || filteredSubcategories.length === 0} className={`${baseInputClass} disabled:opacity-50`}>
                                            <option value="">Nenhuma</option>
                                            {filteredSubcategories.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                                        </select>
                                    </td>
                                    <td className="p-2 text-center">
                                        <button onClick={() => handleDeleteTransaction(t.key)} className="text-gray-400 dark:text-slate-400 hover:text-rose-500 dark:hover:text-rose-400"><TrashIcon /></button>
                                    </td>
                                </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>

                <div className="flex justify-end gap-4 pt-4">
                    <button type="button" onClick={onClose} className="bg-gray-200 dark:bg-slate-600 hover:bg-gray-300 dark:hover:bg-slate-700 text-gray-800 dark:text-white font-bold py-2 px-4 rounded-lg">Cancelar</button>
                    <button type="button" onClick={handleSave} disabled={!selectedAccountId || reviewedTransactions.length === 0} className="bg-sky-600 hover:bg-sky-700 text-white font-bold py-2 px-4 rounded-lg disabled:bg-gray-300 dark:disabled:bg-slate-500 disabled:cursor-not-allowed">
                       Salvar Transações
                    </button>
                </div>
            </div>
        </Modal>
    );
};

const XLSXImportReviewModal: React.FC<{
    isOpen: boolean;
    onClose: () => void;
    onSave: (transactions: ReviewedXLSXTransaction[]) => void;
    initialTransactions: ReviewedXLSXTransaction[];
    accounts: Account[];
    categories: Category[];
    subcategories: Subcategory[];
}> = ({ isOpen, onClose, onSave, initialTransactions, accounts, categories, subcategories }) => {
    const [transactionsToImport, setTransactionsToImport] = useState<ReviewedXLSXTransaction[]>([]);

    useEffect(() => {
        if (isOpen) {
            setTransactionsToImport(initialTransactions);
        }
    }, [isOpen, initialTransactions]);

    const handleTransactionChange = (key: string, field: keyof ReviewedXLSXTransaction, value: any) => {
        setTransactionsToImport(prev =>
            prev.map(t => {
                if (t.key === key) {
                    const updated = { ...t, [field]: value };
                    if (field === 'amount') {
                        updated.amount = Math.abs(parseFloat(value) || 0);
                    } else if (field === 'date') {
                        const parts = value.split('-').map((p:string) => parseInt(p, 10));
                        updated.date = new Date(Date.UTC(parts[0], parts[1] - 1, parts[2])).toISOString();
                    } else if (field === 'type') {
                        updated.categoryId = '';
                        updated.subcategoryId = '';
                    } else if (field === 'categoryId') {
                        updated.subcategoryId = '';
                    }
                    return updated;
                }
                return t;
            })
        );
    };

    const handleDeleteTransaction = (key: string) => {
        setTransactionsToImport(prev => prev.filter(t => t.key !== key));
    };

    const handleSave = () => {
        const incomplete = transactionsToImport.some(t => !t.accountId);
        if (incomplete) {
            alert("Todas as transações devem ser associadas a uma conta antes de salvar.");
            return;
        }
        onSave(transactionsToImport);
    };

    const baseInputClass = "w-full bg-gray-50 dark:bg-slate-600 text-gray-900 dark:text-white rounded p-2 border border-gray-300 dark:border-slate-500 text-sm focus:ring-sky-500 focus:border-sky-500";

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={`Revisar e Importar ${transactionsToImport.length} Transações (XLSX)`} size="5xl">
            <div className="space-y-4">
                <div className="max-h-[60vh] overflow-y-auto border border-gray-200 dark:border-slate-700 rounded-lg">
                    <table className="w-full text-left text-sm" style={{ tableLayout: 'fixed' }}>
                        <thead className="bg-gray-100 dark:bg-slate-700/50 sticky top-0 z-10">
                            <tr>
                                <th className="p-2 font-semibold" style={{ width: '10%' }}>Data</th>
                                <th className="p-2 font-semibold" style={{ width: '20%' }}>Descrição</th>
                                <th className="p-2 font-semibold" style={{ width: '15%' }}>Conta</th>
                                <th className="p-2 font-semibold" style={{ width: '15%' }}>Categoria</th>
                                <th className="p-2 font-semibold" style={{ width: '15%' }}>Subcategoria</th>
                                <th className="p-2 font-semibold text-right" style={{ width: '10%' }}>Valor</th>
                                <th className="p-2 font-semibold" style={{ width: '10%' }}>Tipo</th>
                                <th className="p-2 font-semibold text-center" style={{ width: '5%' }}></th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200 dark:divide-slate-700">
                            {transactionsToImport.map(t => {
                                const filteredCategories = categories.filter(c => c.type === t.type);
                                const filteredSubcategories = subcategories.filter(s => s.categoryId === t.categoryId);
                                return (
                                <tr key={t.key} className="hover:bg-gray-50 dark:hover:bg-slate-700/50">
                                    <td className="p-2"><input type="date" value={t.date.split('T')[0]} onChange={e => handleTransactionChange(t.key, 'date', e.target.value)} className={baseInputClass} /></td>
                                    <td className="p-2"><input type="text" value={t.description} onChange={e => handleTransactionChange(t.key, 'description', e.target.value)} className={baseInputClass} /></td>
                                    <td className="p-2">
                                        <select value={t.accountId} onChange={e => handleTransactionChange(t.key, 'accountId', e.target.value)} className={baseInputClass}>
                                            <option value="">Selecione a Conta</option>
                                            {accounts.map(acc => <option key={acc.id} value={acc.id}>{acc.name}</option>)}
                                        </select>
                                    </td>
                                    <td className="p-2">
                                         <select value={t.categoryId} onChange={e => handleTransactionChange(t.key, 'categoryId', e.target.value)} className={baseInputClass}>
                                            <option value="">Sem categoria</option>
                                            {filteredCategories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                                        </select>
                                    </td>
                                    <td className="p-2">
                                        <select value={t.subcategoryId} onChange={e => handleTransactionChange(t.key, 'subcategoryId', e.target.value)} disabled={!t.categoryId || filteredSubcategories.length === 0} className={`${baseInputClass} disabled:opacity-50`}>
                                            <option value="">Nenhuma</option>
                                            {filteredSubcategories.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                                        </select>
                                    </td>
                                    <td className="p-2"><input type="number" step="0.01" value={t.amount} onChange={e => handleTransactionChange(t.key, 'amount', e.target.value)} className={`${baseInputClass} text-right`} /></td>
                                    <td className="p-2">
                                        <select value={t.type} onChange={e => handleTransactionChange(t.key, 'type', e.target.value as TransactionType)} className={baseInputClass}>
                                            <option value={TransactionType.EXPENSE}>{translateTransactionType(TransactionType.EXPENSE)}</option>
                                            <option value={TransactionType.INCOME}>{translateTransactionType(TransactionType.INCOME)}</option>
                                        </select>
                                    </td>
                                    <td className="p-2 text-center"><button onClick={() => handleDeleteTransaction(t.key)} className="text-gray-400 dark:text-slate-400 hover:text-rose-500 dark:hover:text-rose-400"><TrashIcon /></button></td>
                                </tr>
                            )})}
                        </tbody>
                    </table>
                </div>

                <div className="flex justify-end gap-4 pt-4">
                    <button type="button" onClick={onClose} className="bg-gray-200 dark:bg-slate-600 hover:bg-gray-300 dark:hover:bg-slate-700 text-gray-800 dark:text-white font-bold py-2 px-4 rounded-lg">Cancelar</button>
                    <button type="button" onClick={handleSave} disabled={transactionsToImport.length === 0 || transactionsToImport.some(t => !t.accountId)} className="bg-sky-600 hover:bg-sky-700 text-white font-bold py-2 px-4 rounded-lg disabled:bg-gray-300 dark:disabled:bg-slate-500 disabled:cursor-not-allowed">
                        Salvar {transactionsToImport.length} Transações
                    </button>
                </div>
            </div>
        </Modal>
    );
}


const TransactionsView: React.FC<TransactionsViewProps> = ({ transactions, accounts, categories, subcategories, addTransaction, updateTransaction, deleteTransaction, addAccount, addCategory, addSubcategory }) => {
    const [currentDate, setCurrentDate] = useState(new Date());
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);
    const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);
    const [transactionToDelete, setTransactionToDelete] = useState<string | null>(null);
    const [isInstallmentModalOpen, setIsInstallmentModalOpen] = useState(false);
    const [isTransferModalOpen, setIsTransferModalOpen] = useState(false);
    
    // OFX Import State
    const [isOFXImportModalOpen, setIsOFXImportModalOpen] = useState(false);
    const [ofxTransactionsToReview, setOFXTransactionsToReview] = useState<ImportTransaction[]>([]);
    const [isImportingOFX, setIsImportingOFX] = useState(false);
    const ofxFileInputRef = useRef<HTMLInputElement>(null);

    // XLSX Import State
    const [isXLSXImportModalOpen, setIsXLSXImportModalOpen] = useState(false);
    const [xlsxTransactionsToReview, setXLSXTransactionsToReview] = useState<ReviewedXLSXTransaction[]>([]);
    const [isImportingXLSX, setIsImportingXLSX] = useState(false);
    const xlsxFileInputRef = useRef<HTMLInputElement>(null);


    const [isEditScopeModalOpen, setIsEditScopeModalOpen] = useState(false);
    const [editScope, setEditScope] = useState<'single' | 'future' | null>(null);
    
    const [searchTerm, setSearchTerm] = useState('');
    const [filterAccountId, setFilterAccountId] = useState('');
    const [filterCategoryId, setFilterCategoryId] = useState('');

    const filteredTransactions = useMemo(() => {
        return transactions
            .filter(t => {
                const tDate = new Date(t.date);
                if (tDate.getFullYear() !== currentDate.getFullYear() || tDate.getMonth() !== currentDate.getMonth()) {
                    return false;
                }
                if (filterAccountId && t.accountId !== filterAccountId) {
                    return false;
                }
                if (filterCategoryId && t.categoryId !== filterCategoryId) {
                    return false;
                }
                if (searchTerm && !t.description.toLowerCase().includes(searchTerm.toLowerCase())) {
                    return false;
                }
                return true;
            })
            .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    }, [transactions, currentDate, searchTerm, filterAccountId, filterCategoryId]);

    const changeMonth = (offset: number) => {
        setCurrentDate(prev => {
            const newDate = new Date(prev);
            newDate.setMonth(newDate.getMonth() + offset);
            return newDate;
        });
    };
    
    const handleAddTransaction = () => {
        setEditingTransaction(null);
        setIsModalOpen(true);
    };

    const handleAddTransfer = () => {
        setIsTransferModalOpen(true);
    };
    
    const handleAddInstallment = () => {
        setIsInstallmentModalOpen(true);
    };

    const handleEditTransaction = (transaction: Transaction) => {
        const isInstallment = / \(\d+\/\d+\)$/.test(transaction.description);
        setEditingTransaction(transaction);
        if (isInstallment) {
            setIsEditScopeModalOpen(true);
        } else {
            setEditScope('single');
            setIsModalOpen(true);
        }
    };

    const handleScopeSelection = (scope: 'single' | 'future') => {
        setEditScope(scope);
        setIsEditScopeModalOpen(false);
        setIsModalOpen(true);
    };

    const handleSaveTransaction = (transactionData: Omit<Transaction, 'id'> | Transaction) => {
        if (!('id' in transactionData)) {
            addTransaction(transactionData);
            setIsModalOpen(false);
            return;
        }

        const updatedTransaction = transactionData as Transaction;

        if (editScope === 'future' && editingTransaction) {
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

        setIsModalOpen(false);
        setEditingTransaction(null);
        setEditScope(null);
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
        
        const expenseTransaction: Omit<Transaction, 'id'> = {
            description: `Transferência para ${toAccount.name}${description ? `: ${description}` : ''}`,
            amount,
            date: new Date(date).toISOString(),
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
            date: new Date(date).toISOString(),
            accountId: toAccountId,
            categoryId: '',
            subcategoryId: '',
            type: TransactionType.INCOME,
            transferId,
        };
        addTransaction(incomeTransaction);

        setIsTransferModalOpen(false);
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
            const transactionDate = new Date(year, month - 1 + i, day);

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
    
    const handleOFXFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;

        setIsImportingOFX(true);
        const reader = new FileReader();
        reader.onload = async (e) => {
            const content = e.target?.result as string;
            if (content) {
                const parsed = parseOFX(content);
                if (parsed.length === 0) {
                    alert("Nenhuma transação encontrada no arquivo ou o formato do arquivo não é suportado.");
                    setIsImportingOFX(false);
                    return;
                }
                
                const enrichedTransactions = await Promise.all(
                    parsed.map(async (p) => {
                        const suggestion = await suggestCategory(p.description, categories);
                        return {
                            ...p,
                            key: crypto.randomUUID(),
                            categoryId: suggestion?.categoryId || '',
                            subcategoryId: suggestion?.subcategoryId || '',
                        };
                    })
                );
                setOFXTransactionsToReview(enrichedTransactions);
                setIsOFXImportModalOpen(true);
            }
            setIsImportingOFX(false);
        };
        reader.onerror = () => {
            setIsImportingOFX(false);
            alert("Falha ao ler o arquivo.");
        }
        reader.readAsText(file);
        event.target.value = ''; // Reset file input
    };
    
    const handleXLSXFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;

        setIsImportingXLSX(true);
        const reader = new FileReader();
        reader.onload = (e) => {
            const content = e.target?.result as ArrayBuffer;
            if (content) {
                const parsed = parseXLSX(content);
                if (parsed.length === 0) {
                    setIsImportingXLSX(false);
                    return;
                }
                
                const enrichedTransactions = parsed.map(p => {
                    const foundAccount = accounts.find(a => a.name.toLowerCase() === p.accountName.toLowerCase());

                    const [catName, subcatName] = p.categoryFullName.split('/').map(s => s.trim());
                    const foundCategory = categories.find(c => c.name.toLowerCase() === catName?.toLowerCase() && c.type === p.type);
                    
                    let foundSubcategory = null;
                    if(foundCategory && subcatName) {
                        foundSubcategory = subcategories.find(s => s.categoryId === foundCategory.id && s.name.toLowerCase() === subcatName.toLowerCase());
                    }

                    return {
                        ...p,
                        accountId: foundAccount?.id || '',
                        categoryId: foundCategory?.id || '',
                        subcategoryId: foundSubcategory?.id || '',
                    };
                });

                setXLSXTransactionsToReview(enrichedTransactions);
                setIsXLSXImportModalOpen(true);
            }
            setIsImportingXLSX(false);
        };
         reader.onerror = () => {
            setIsImportingXLSX(false);
            alert("Falha ao ler o arquivo.");
        }
        reader.readAsArrayBuffer(file);
        event.target.value = '';
    }

    const handleSaveOFXImport = (importedTransactions: (Omit<Transaction, 'id'> & { accountId: string })[]) => {
        importedTransactions.forEach(t => addTransaction(t));
        setIsOFXImportModalOpen(false);
    };

    const handleSaveXLSXImport = (finalTransactions: ReviewedXLSXTransaction[]) => {
        finalTransactions.forEach(t => {
            addTransaction({
                date: t.date,
                description: t.description,
                amount: t.amount,
                accountId: t.accountId,
                categoryId: t.categoryId,
                subcategoryId: t.subcategoryId,
                type: t.type,
            });
        });

        setIsXLSXImportModalOpen(false);
    };

    return (
        <div className="p-4 md:p-8 text-gray-800 dark:text-white">
            <header className="flex flex-col md:flex-row justify-between md:items-center mb-6">
                <h1 className="text-3xl font-bold text-gray-900 dark:text-slate-100">Transações</h1>
                <div className="flex items-center gap-2 mt-4 md:mt-0 flex-wrap">
                    <button onClick={() => xlsxFileInputRef.current?.click()} disabled={isImportingXLSX} className="flex items-center gap-2 bg-green-600 hover:bg-green-700 disabled:bg-slate-600 text-white font-bold py-2 px-4 rounded-lg transition-colors">
                       {isImportingXLSX ? <div className="w-5 h-5 border-2 border-t-transparent border-white rounded-full animate-spin"></div> : <TableIcon className="h-5 w-5" />}
                        Importar Planilha
                    </button>
                     <input type="file" ref={xlsxFileInputRef} className="hidden" accept=".xlsx, .xls" onChange={handleXLSXFileChange} />
                    <button onClick={() => ofxFileInputRef.current?.click()} disabled={isImportingOFX} className="flex items-center gap-2 bg-teal-600 hover:bg-teal-700 disabled:bg-slate-600 text-white font-bold py-2 px-4 rounded-lg transition-colors">
                       {isImportingOFX ? <div className="w-5 h-5 border-2 border-t-transparent border-white rounded-full animate-spin"></div> : <UploadIcon className="h-5 w-5" />}
                        Importar OFX
                    </button>
                    <input type="file" ref={ofxFileInputRef} className="hidden" accept=".ofx,.qfx" onChange={handleOFXFileChange} />
                    <button onClick={handleAddTransfer} className="flex items-center gap-2 bg-gray-600 dark:bg-slate-600 hover:bg-gray-700 dark:hover:bg-slate-700 text-white font-bold py-2 px-4 rounded-lg transition-colors">
                        Add Transferência
                    </button>
                    <button onClick={handleAddInstallment} className="flex items-center gap-2 bg-gray-600 dark:bg-slate-600 hover:bg-gray-700 dark:hover:bg-slate-700 text-white font-bold py-2 px-4 rounded-lg transition-colors">
                        Add Parcelamento
                    </button>
                    <button onClick={handleAddTransaction} className="flex items-center gap-2 bg-sky-600 hover:bg-sky-700 text-white font-bold py-2 px-4 rounded-lg transition-colors">
                        <PlusIcon className="h-5 w-5" />
                        Add Transação
                    </button>
                </div>
            </header>

            <div className="mb-4 p-4 bg-white dark:bg-slate-800/50 rounded-lg space-y-4 md:space-y-0 md:flex md:items-center md:gap-4">
                <div className="relative flex-grow">
                    <input
                        type="text"
                        placeholder="Buscar por descrição..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full bg-gray-100 dark:bg-slate-700 text-gray-900 dark:text-white rounded-md py-2 pl-10 pr-4 border border-gray-300 dark:border-slate-600 focus:ring-sky-500 focus:border-sky-500"
                        aria-label="Buscar transações"
                    />
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <SearchIcon className="h-5 w-5 text-gray-400 dark:text-slate-400" />
                    </div>
                </div>
                <div className="flex-shrink-0 w-full md:w-auto">
                    <select
                        value={filterAccountId}
                        onChange={(e) => setFilterAccountId(e.target.value)}
                        className="w-full bg-gray-100 dark:bg-slate-700 text-gray-900 dark:text-white rounded-md py-2 px-3 border border-gray-300 dark:border-slate-600 focus:ring-sky-500 focus:border-sky-500"
                        aria-label="Filtrar por conta"
                    >
                        <option value="">Todas as Contas</option>
                        {accounts.map(acc => <option key={acc.id} value={acc.id}>{acc.name}</option>)}
                    </select>
                </div>
                <div className="flex-shrink-0 w-full md:w-auto">
                     <select
                        value={filterCategoryId}
                        onChange={(e) => setFilterCategoryId(e.target.value)}
                        className="w-full bg-gray-100 dark:bg-slate-700 text-gray-900 dark:text-white rounded-md py-2 px-3 border border-gray-300 dark:border-slate-600 focus:ring-sky-500 focus:border-sky-500"
                        aria-label="Filtrar por categoria"
                    >
                        <option value="">Todas as Categorias</option>
                        {categories.sort((a,b) => a.name.localeCompare(b.name)).map(cat => <option key={cat.id} value={cat.id}>{cat.name}</option>)}
                    </select>
                </div>
                <button
                    onClick={() => {
                        setSearchTerm('');
                        setFilterAccountId('');
                        setFilterCategoryId('');
                    }}
                    className="flex-shrink-0 w-full md:w-auto bg-gray-200 dark:bg-slate-600 hover:bg-gray-300 dark:hover:bg-slate-700 text-gray-800 dark:text-white font-semibold py-2 px-4 rounded-lg transition-colors flex items-center justify-center gap-2"
                    aria-label="Limpar filtros"
                >
                    <XIcon className="h-5 w-5"/>
                    Limpar
                </button>
            </div>

            <div className="flex justify-between items-center bg-white dark:bg-slate-800 p-4 rounded-t-lg">
                <button onClick={() => changeMonth(-1)} className="p-2 rounded-full hover:bg-gray-200 dark:hover:bg-slate-700 transition-colors" aria-label="Mês anterior"><ChevronLeftIcon /></button>
                <h2 className="text-xl font-semibold">{formatMonthYear(currentDate)}</h2>
                <button onClick={() => changeMonth(1)} className="p-2 rounded-full hover:bg-gray-200 dark:hover:bg-slate-700 transition-colors" aria-label="Próximo mês"><ChevronRightIcon /></button>
            </div>

            <div className="bg-white dark:bg-slate-800 rounded-b-lg shadow-lg overflow-x-auto">
                <table className="w-full text-left">
                    <thead className="bg-gray-50 dark:bg-slate-700/50">
                        <tr>
                            <th className="p-4 font-semibold">Data</th>
                            <th className="p-4 font-semibold">Descrição</th>
                            <th className="p-4 font-semibold">Categoria</th>
                            <th className="p-4 font-semibold text-right">Valor</th>
                            <th className="p-4 font-semibold text-center">Ações</th>
                        </tr>
                    </thead>
                    <tbody>
                        {filteredTransactions.length > 0 ? filteredTransactions.map(t => {
                            const category = categories.find(c => c.id === t.categoryId);
                            const subcategory = subcategories.find(s => s.id === t.subcategoryId);
                             return (
                                <tr key={t.id} className="border-t border-gray-200 dark:border-slate-700 hover:bg-gray-50 dark:hover:bg-slate-700/50">
                                    <td className="p-4 text-gray-600 dark:text-slate-300">{formatDate(t.date)}</td>
                                    <td className="p-4">{t.description}</td>
                                    <td className="p-4 text-gray-500 dark:text-slate-400">{t.transferId ? 'Transferência' : (category?.name || 'Sem Categoria')}{subcategory ? ` / ${subcategory.name}` : ''}</td>
                                    <td className={`p-4 font-medium text-right ${t.type === TransactionType.INCOME ? 'text-emerald-500' : 'text-rose-500'}`}>{formatCurrency(t.amount)}</td>
                                    <td className="p-4">
                                        <div className="flex justify-center items-center gap-2">
                                            <button onClick={() => handleEditTransaction(t)} disabled={!!t.transferId} className="text-gray-400 dark:text-slate-400 hover:text-sky-500 dark:hover:text-sky-400 disabled:text-gray-300 dark:disabled:text-slate-600 disabled:cursor-not-allowed"><PencilIcon/></button>
                                            <button onClick={() => handleDeleteRequest(t.id)} className="text-gray-400 dark:text-slate-400 hover:text-rose-500 dark:hover:text-rose-400"><TrashIcon/></button>
                                        </div>
                                    </td>
                                </tr>
                            );
                        }) : (
                            <tr>
                                <td colSpan={5} className="text-center p-8 text-gray-500 dark:text-slate-400">Nenhuma transação encontrada para este mês com os filtros aplicados.</td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
            
            <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title={editingTransaction ? "Editar Transação" : "Adicionar Transação"}>
                <TransactionForm 
                    transaction={editingTransaction}
                    accounts={accounts}
                    categories={categories}
                    subcategories={subcategories}
                    onSave={handleSaveTransaction}
                    onClose={() => setIsModalOpen(false)}
                />
            </Modal>
            
            <Modal isOpen={isTransferModalOpen} onClose={() => setIsTransferModalOpen(false)} title="Adicionar Transferência">
                <TransferForm
                    accounts={accounts}
                    onSave={handleSaveTransfer}
                    onClose={() => setIsTransferModalOpen(false)}
                />
            </Modal>

            <Modal isOpen={isInstallmentModalOpen} onClose={() => setIsInstallmentModalOpen(false)} title="Adicionar Compra Parcelada">
                <InstallmentForm 
                    accounts={accounts}
                    categories={categories}
                    subcategories={subcategories}
                    onSave={handleSaveInstallments}
                    onClose={() => setIsInstallmentModalOpen(false)}
                />
            </Modal>
            
            <OFXImportReviewModal
                isOpen={isOFXImportModalOpen}
                onClose={() => setIsOFXImportModalOpen(false)}
                onSave={handleSaveOFXImport}
                initialTransactions={ofxTransactionsToReview}
                accounts={accounts}
                categories={categories}
                subcategories={subcategories}
            />

             <XLSXImportReviewModal
                isOpen={isXLSXImportModalOpen}
                onClose={() => setIsXLSXImportModalOpen(false)}
                onSave={handleSaveXLSXImport}
                initialTransactions={xlsxTransactionsToReview}
                accounts={accounts}
                categories={categories}
                subcategories={subcategories}
            />

            <Modal isOpen={isEditScopeModalOpen} onClose={() => setIsEditScopeModalOpen(false)} title="Editar Transação Parcelada">
                <div>
                    <p className="text-gray-600 dark:text-slate-300 mb-6">Como você gostaria de aplicar suas alterações?</p>
                    <div className="flex flex-col space-y-3">
                        <button 
                            onClick={() => handleScopeSelection('single')}
                            className="w-full text-left p-4 bg-gray-100 dark:bg-slate-700 hover:bg-gray-200 dark:hover:bg-slate-600 rounded-lg transition-colors"
                        >
                            <p className="font-semibold text-gray-900 dark:text-white">Aplicar somente a esta transação</p>
                            <p className="text-sm text-gray-500 dark:text-slate-400">Apenas a transação selecionada será modificada.</p>
                        </button>
                        <button 
                            onClick={() => handleScopeSelection('future')}
                            className="w-full text-left p-4 bg-gray-100 dark:bg-slate-700 hover:bg-gray-200 dark:hover:bg-slate-600 rounded-lg transition-colors"
                        >
                            <p className="font-semibold text-gray-900 dark:text-white">Aplicar a esta e às futuras transações</p>
                            <p className="text-sm text-gray-500 dark:text-slate-400">As alterações serão aplicadas a esta e a todas as parcelas subsequentes.</p>
                        </button>
                    </div>
                </div>
            </Modal>

            <Modal isOpen={isConfirmModalOpen} onClose={() => setIsConfirmModalOpen(false)} title="Confirmar Exclusão">
                <div className="text-gray-600 dark:text-slate-300">
                    <p>Tem certeza de que deseja excluir esta transação? Esta ação não pode ser desfeita.</p>
                     {transactions.find(t => t.id === transactionToDelete)?.transferId && (
                        <p className="mt-2 text-amber-500 dark:text-amber-400">Esta é uma transferência. Excluí-la também excluirá a transação correspondente na outra conta.</p>
                     )}
                    <div className="flex justify-end gap-4 pt-6">
                        <button 
                            type="button" 
                            onClick={() => setIsConfirmModalOpen(false)} 
                            className="bg-gray-200 dark:bg-slate-600 hover:bg-gray-300 dark:hover:bg-slate-700 text-gray-800 dark:text-white font-bold py-2 px-4 rounded-lg transition-colors"
                        >
                            Cancelar
                        </button>
                        <button 
                            type="button" 
                            onClick={handleConfirmDelete} 
                            className="bg-rose-600 hover:bg-rose-700 text-white font-bold py-2 px-4 rounded-lg transition-colors"
                        >
                            Excluir
                        </button>
                    </div>
                </div>
            </Modal>
        </div>
    );
};

export default TransactionsView;