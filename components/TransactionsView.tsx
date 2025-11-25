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
    
    const baseInputClass = "w-full bg-white dark:bg-slate-900 text-slate-900 dark:text-white rounded-xl p-3 border border-slate-200 dark:border-slate-700 focus:ring-2 focus:ring-violet-500 focus:border-violet-500 transition-shadow outline-none";
    const labelClass = "block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1.5";


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
        <form onSubmit={handleSubmit} className="space-y-5 pb-12">
             <div>
                <label className={labelClass}>Descrição</label>
                <div className="flex items-center gap-2">
                    <div className="relative flex-grow">
                        <input type="text" value={baseDescription} onChange={e => setBaseDescription(e.target.value)} required className={baseInputClass} placeholder="Ex: Compras no Mercado"/>
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
                    <input type="number" step="0.01" value={amount} onChange={e => setAmount(parseFloat(e.target.value))} required className={baseInputClass} placeholder="0.00"/>
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

            {/* FOOTER ACTIONS - Static relative to form flow */}
            <div className="padding-bottom: 20 -mx-6 md:-mx-8 px-6 pt-4 md:px-8 bg-white dark:bg-slate-900 border-t border-slate-100 dark:border-slate-800 flex justify-end gap-3 mt-6">
                <button type="button" onClick={onClose} className="px-5 py-2.5 rounded-xl text-slate-600 dark:text-slate-300 font-medium hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">Cancelar</button>
                <button type="submit" className="px-5 py-2.5 rounded-xl bg-violet-600 hover:bg-violet-700 text-white font-bold shadow-lg shadow-violet-500/20 transition-all">Salvar</button>
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
    
    const baseInputClass = "w-full bg-white dark:bg-slate-900 text-slate-900 dark:text-white rounded-xl p-3 border border-slate-200 dark:border-slate-700 focus:ring-2 focus:ring-violet-500 focus:border-violet-500 transition-shadow outline-none";
    const labelClass = "block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1.5";

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
        <form onSubmit={handleSubmit} className="space-y-4 pb-12">
            <div>
                <label className={labelClass}>Descrição da Compra</label>
                <input type="text" value={description} onChange={e => setDescription(e.target.value)} required className={baseInputClass} placeholder="Ex: Notebook Novo"/>
            </div>
            <div className="grid grid-cols-2 gap-4">
                <div>
                    <label className={labelClass}>Valor Total</label>
                    <input type="number" step="0.01" value={totalAmount} onChange={e => setTotalAmount(parseFloat(e.target.value))} required min="0.01" className={baseInputClass}/>
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
             <div className="padding-bottom: 20 -mx-6 md:-mx-8 px-6 pt-4 md:px-8 bg-white dark:bg-slate-900 border-t border-slate-100 dark:border-slate-800 flex justify-end gap-3 mt-6">
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
}> = ({ accounts, onSave, onClose }) => {
    const [fromAccountId, setFromAccountId] = useState('');
    const [toAccountId, setToAccountId] = useState('');
    const [amount, setAmount] = useState(0);
    const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
    const [description, setDescription] = useState('');
    
    const baseInputClass = "w-full bg-white dark:bg-slate-900 text-slate-900 dark:text-white rounded-xl p-3 border border-slate-200 dark:border-slate-700 focus:ring-2 focus:ring-violet-500 focus:border-violet-500 transition-shadow outline-none";
    const labelClass = "block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1.5";


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
        <form onSubmit={handleSubmit} className="space-y-4 pb-12">
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
                    <input type="number" step="0.01" value={amount} onChange={e => setAmount(parseFloat(e.target.value))} required min="0.01" className={baseInputClass}/>
                </div>
                 <div>
                    <label className={labelClass}>Data</label>
                    <input type="date" value={date} onChange={e => setDate(e.target.value)} required className={baseInputClass}/>
                </div>
            </div>
           
             <div>
                <label className={labelClass}>Observação (Opcional)</label>
                <input type="text" value={description} onChange={e => setDescription(e.target.value)} className={baseInputClass} placeholder="Motivo da transferência"/>
            </div>

            {/* FOOTER ACTIONS */}
            <div className="padding-bottom: 20 -mx-6 md:-mx-8 px-6 pt-4 md:px-8 bg-white dark:bg-slate-900 border-t border-slate-100 dark:border-slate-800 flex justify-end gap-3 mt-6">
                <button type="button" onClick={onClose} className="px-5 py-2.5 rounded-xl text-slate-600 dark:text-slate-300 font-medium hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">Cancelar</button>
                <button type="submit" className="px-5 py-2.5 rounded-xl bg-violet-600 hover:bg-violet-700 text-white font-bold shadow-lg shadow-violet-500/20 transition-all">Transferir</button>
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
    
    const baseInputClass = "w-full bg-white dark:bg-slate-800 text-slate-900 dark:text-white rounded-lg p-2 border border-slate-200 dark:border-slate-600 text-sm focus:ring-2 focus:ring-violet-500 focus:border-violet-500 outline-none";

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={`Revisar Importação (${reviewedTransactions.length} itens)`} size="5xl">
            <div className="space-y-6 pb-6">
                <div className="bg-slate-50 dark:bg-slate-800/50 p-4 rounded-xl">
                    <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">Importar para a Conta:</label>
                    <select value={selectedAccountId} onChange={e => setSelectedAccountId(e.target.value)} required className="w-full md:w-1/2 bg-white dark:bg-slate-700 text-slate-900 dark:text-white rounded-xl p-2.5 border border-slate-200 dark:border-slate-600 focus:ring-violet-500 focus:border-violet-500">
                        <option value="">-- Selecione uma Conta --</option>
                        {accounts.map(acc => <option key={acc.id} value={acc.id}>{acc.name}</option>)}
                    </select>
                </div>

                <div className="max-h-[50vh] overflow-y-auto border border-slate-200 dark:border-slate-700 rounded-xl shadow-inner">
                    <table className="w-full text-left text-sm" style={{ tableLayout: 'fixed' }}>
                        <thead className="bg-slate-100 dark:bg-slate-800 sticky top-0 z-10 text-slate-600 dark:text-slate-400 text-xs uppercase font-bold">
                            <tr>
                                <th className="p-3" style={{ width: '170px'}}>Data</th>
                                <th className="p-3" style={{ width: '30%'}}>Descrição</th>
                                <th className="p-3 text-right" style={{ width: '140px'}}>Valor</th>
                                <th className="p-3" style={{ width: '110px'}}>Tipo</th>
                                <th className="p-3" style={{ width: '20%'}}>Categoria</th>
                                <th className="p-3" style={{ width: '20%'}}>Subcategoria</th>
                                <th className="p-3 text-center" style={{ width: '50px'}}></th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-200 dark:divide-slate-700 bg-white dark:bg-slate-900">
                            {reviewedTransactions.map(t => {
                                const filteredCategories = categories.filter(c => c.type === t.type);
                                const filteredSubcategories = subcategories.filter(s => s.categoryId === t.categoryId);
                                return (
                                <tr key={t.key} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                                    <td className="p-2">
                                        <input type="date" value={t.date.split('T')[0]} onChange={e => handleTransactionChange(t.key, 'date', e.target.value)} className={baseInputClass} />
                                    </td>
                                    <td className="p-2">
                                        <input type="text" value={t.description} onChange={e => handleTransactionChange(t.key, 'description', e.target.value)} className={baseInputClass} />
                                    </td>
                                    <td className="p-2">
                                        <input type="number" step="0.01" value={t.amount} onChange={e => handleTransactionChange(t.key, 'amount', e.target.value)} className={`${baseInputClass} text-right font-mono ${t.type === TransactionType.INCOME ? 'text-emerald-600' : 'text-rose-600'}`} />
                                    </td>
                                    <td className="p-2">
                                        <select value={t.type} onChange={e => handleTransactionChange(t.key, 'type', e.target.value)} className={baseInputClass}>
                                            <option value={TransactionType.EXPENSE}>Despesa</option>
                                            <option value={TransactionType.INCOME}>Receita</option>
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
                                        <button onClick={() => handleDeleteTransaction(t.key)} className="p-1 text-slate-400 hover:text-rose-500 transition-colors"><TrashIcon /></button>
                                    </td>
                                </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>

                <div className="flex justify-end gap-3">
                    <button type="button" onClick={onClose} className="px-5 py-2.5 rounded-xl text-slate-600 dark:text-slate-300 font-medium hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">Cancelar</button>
                    <button type="button" onClick={handleSave} disabled={!selectedAccountId || reviewedTransactions.length === 0} className="px-5 py-2.5 rounded-xl bg-violet-600 hover:bg-violet-700 text-white font-bold shadow-lg shadow-violet-500/20 transition-all disabled:opacity-50 disabled:cursor-not-allowed">
                       Confirmar Importação
                    </button>
                </div>
            </div>
        </Modal>
    );
};

// ... XLSXImportReviewModal remains very similar structurally to OFX, updating classes to match ...
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

    const baseInputClass = "w-full bg-white dark:bg-slate-800 text-slate-900 dark:text-white rounded-lg p-2 border border-slate-200 dark:border-slate-600 text-sm focus:ring-2 focus:ring-violet-500 focus:border-violet-500 outline-none";

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={`Revisar Planilha (${transactionsToImport.length} itens)`} size="5xl">
             <div className="space-y-6 pb-6">
                <div className="max-h-[60vh] overflow-y-auto border border-slate-200 dark:border-slate-700 rounded-xl shadow-inner">
                    <table className="w-full text-left text-sm" style={{ tableLayout: 'fixed' }}>
                        <thead className="bg-slate-100 dark:bg-slate-800 sticky top-0 z-10 text-slate-600 dark:text-slate-400 text-xs uppercase font-bold">
                            <tr>
                                <th className="p-3" style={{ width: '170px' }}>Data</th>
                                <th className="p-3" style={{ width: '18%' }}>Descrição</th>
                                <th className="p-3" style={{ width: '14%' }}>Conta</th>
                                <th className="p-3" style={{ width: '14%' }}>Categoria</th>
                                <th className="p-3" style={{ width: '14%' }}>Subcategoria</th>
                                <th className="p-3 text-right" style={{ width: '140px' }}>Valor</th>
                                <th className="p-3" style={{ width: '110px' }}>Tipo</th>
                                <th className="p-3 text-center" style={{ width: '50px' }}></th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-200 dark:divide-slate-700 bg-white dark:bg-slate-900">
                            {transactionsToImport.map(t => {
                                const filteredCategories = categories.filter(c => c.type === t.type);
                                const filteredSubcategories = subcategories.filter(s => s.categoryId === t.categoryId);
                                return (
                                <tr key={t.key} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                                    <td className="p-2"><input type="date" value={t.date.split('T')[0]} onChange={e => handleTransactionChange(t.key, 'date', e.target.value)} className={baseInputClass} /></td>
                                    <td className="p-2"><input type="text" value={t.description} onChange={e => handleTransactionChange(t.key, 'description', e.target.value)} className={baseInputClass} /></td>
                                    <td className="p-2">
                                        <select value={t.accountId} onChange={e => handleTransactionChange(t.key, 'accountId', e.target.value)} className={baseInputClass}>
                                            <option value="">Selecione...</option>
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
                                    <td className="p-2"><input type="number" step="0.01" value={t.amount} onChange={e => handleTransactionChange(t.key, 'amount', e.target.value)} className={`${baseInputClass} text-right font-mono`} /></td>
                                    <td className="p-2">
                                        <select value={t.type} onChange={e => handleTransactionChange(t.key, 'type', e.target.value as TransactionType)} className={baseInputClass}>
                                            <option value={TransactionType.EXPENSE}>Despesa</option>
                                            <option value={TransactionType.INCOME}>Receita</option>
                                        </select>
                                    </td>
                                    <td className="p-2 text-center"><button onClick={() => handleDeleteTransaction(t.key)} className="p-1 text-slate-400 hover:text-rose-500 transition-colors"><TrashIcon /></button></td>
                                </tr>
                            )})}
                        </tbody>
                    </table>
                </div>

                <div className="flex justify-end gap-3">
                    <button type="button" onClick={onClose} className="px-5 py-2.5 rounded-xl text-slate-600 dark:text-slate-300 font-medium hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">Cancelar</button>
                    <button type="button" onClick={handleSave} disabled={transactionsToImport.length === 0 || transactionsToImport.some(t => !t.accountId)} className="px-5 py-2.5 rounded-xl bg-violet-600 hover:bg-violet-700 text-white font-bold shadow-lg shadow-violet-500/20 transition-all disabled:opacity-50 disabled:cursor-not-allowed">
                        Confirmar Importação
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
        <div className="p-4 md:p-10 max-w-7xl mx-auto">
            <header className="flex flex-col lg:flex-row justify-between lg:items-center mb-6 md:mb-8 gap-4">
                <div>
                    <h1 className="text-2xl md:text-3xl font-bold text-slate-900 dark:text-white tracking-tight">Transações</h1>
                    <p className="text-sm md:text-base text-slate-500 dark:text-slate-400 mt-1">Gerencie suas entradas, saídas e transferências.</p>
                </div>
                <div className="flex items-center gap-2 md:gap-3 flex-wrap">
                     <input type="file" ref={xlsxFileInputRef} className="hidden" accept=".xlsx, .xls" onChange={handleXLSXFileChange} />
                     <input type="file" ref={ofxFileInputRef} className="hidden" accept=".ofx,.qfx" onChange={handleOFXFileChange} />
                    
                    <div className="flex bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800 p-1">
                        <button onClick={() => xlsxFileInputRef.current?.click()} disabled={isImportingXLSX} className="p-2 text-slate-500 hover:text-emerald-600 transition-colors" title="Importar Planilha">
                            {isImportingXLSX ? <div className="w-5 h-5 border-2 border-t-transparent border-emerald-600 rounded-full animate-spin"></div> : <TableIcon className="h-5 w-5" />}
                        </button>
                        <div className="w-px bg-slate-200 dark:bg-slate-800 my-1"></div>
                        <button onClick={() => ofxFileInputRef.current?.click()} disabled={isImportingOFX} className="p-2 text-slate-500 hover:text-teal-600 transition-colors" title="Importar OFX">
                           {isImportingOFX ? <div className="w-5 h-5 border-2 border-t-transparent border-teal-600 rounded-full animate-spin"></div> : <UploadIcon className="h-5 w-5" />}
                        </button>
                    </div>

                    <div className="flex gap-2 ml-auto lg:ml-0">
                        <button onClick={handleAddTransfer} className="px-3 md:px-4 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-semibold hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors text-xs md:text-sm whitespace-nowrap">
                            Transf.
                        </button>
                        <button onClick={handleAddInstallment} className="px-3 md:px-4 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-semibold hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors text-xs md:text-sm whitespace-nowrap">
                            Parcelado
                        </button>
                        <button onClick={handleAddTransaction} className="flex items-center gap-2 bg-violet-600 hover:bg-violet-700 text-white font-bold py-2.5 px-3 md:px-5 rounded-xl shadow-lg shadow-violet-500/30 transition-all transform hover:-translate-y-0.5 whitespace-nowrap text-xs md:text-sm">
                            <PlusIcon className="h-4 w-4 md:h-5 md:w-5" />
                            <span className="hidden md:inline">Nova Transação</span>
                            <span className="md:hidden">Nova</span>
                        </button>
                    </div>
                </div>
            </header>

            <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-xl shadow-slate-200/50 dark:shadow-none border border-slate-100 dark:border-slate-800 overflow-hidden">
                {/* Filters Toolbar */}
                <div className="p-4 md:p-5 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30 flex flex-col lg:flex-row gap-4">
                    <div className="relative flex-grow group">
                        <input
                            type="text"
                            placeholder="Buscar transação..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full bg-white dark:bg-slate-800 text-slate-900 dark:text-white rounded-xl py-2.5 pl-11 pr-4 border border-slate-200 dark:border-slate-700 focus:ring-2 focus:ring-violet-500 focus:border-violet-500 outline-none transition-all shadow-sm group-hover:shadow-md text-sm md:text-base"
                        />
                        <SearchIcon className="absolute left-3.5 top-3 h-5 w-5 text-slate-400 group-hover:text-violet-500 transition-colors" />
                    </div>
                    <div className="flex gap-3 overflow-x-auto pb-1 lg:pb-0 no-scrollbar">
                         <select
                            value={filterAccountId}
                            onChange={(e) => setFilterAccountId(e.target.value)}
                            className="min-w-[150px] md:min-w-[180px] bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-xl py-2.5 px-4 border border-slate-200 dark:border-slate-700 focus:ring-2 focus:ring-violet-500 outline-none shadow-sm text-sm md:text-base"
                        >
                            <option value="">Todas as Contas</option>
                            {accounts.map(acc => <option key={acc.id} value={acc.id}>{acc.name}</option>)}
                        </select>
                         <select
                            value={filterCategoryId}
                            onChange={(e) => setFilterCategoryId(e.target.value)}
                            className="min-w-[150px] md:min-w-[180px] bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-xl py-2.5 px-4 border border-slate-200 dark:border-slate-700 focus:ring-2 focus:ring-violet-500 outline-none shadow-sm text-sm md:text-base"
                        >
                            <option value="">Todas as Categorias</option>
                            {[...categories].sort((a,b) => {
                                // First prioritize by type (Receita before Despesa)
                                if (a.type !== b.type) {
                                    return a.type === TransactionType.INCOME ? -1 : 1;
                                }
                                // Then sort alphabetically
                                return a.name.localeCompare(b.name);
                            }).map(cat => <option key={cat.id} value={cat.id}>{cat.name}</option>)}
                        </select>
                        {(searchTerm || filterAccountId || filterCategoryId) && (
                            <button
                                onClick={() => {
                                    setSearchTerm('');
                                    setFilterAccountId('');
                                    setFilterCategoryId('');
                                }}
                                className="px-4 py-2.5 bg-rose-50 dark:bg-rose-900/20 text-rose-600 dark:text-rose-400 rounded-xl hover:bg-rose-100 dark:hover:bg-rose-900/40 transition-colors flex items-center gap-1.5 font-medium text-sm whitespace-nowrap"
                            >
                                <XIcon className="h-4 w-4"/>
                                <span className="hidden md:inline">Limpar</span>
                            </button>
                        )}
                    </div>
                </div>

                {/* Month Navigation */}
                <div className="flex justify-between items-center px-4 md:px-6 py-3 bg-white dark:bg-slate-900 border-b border-slate-100 dark:border-slate-800">
                    <button onClick={() => changeMonth(-1)} className="p-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 transition-colors"><ChevronLeftIcon /></button>
                    <h2 className="text-base md:text-lg font-bold text-slate-800 dark:text-white">{formatMonthYear(currentDate)}</h2>
                    <button onClick={() => changeMonth(1)} className="p-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 transition-colors"><ChevronRightIcon /></button>
                </div>

                {/* DESKTOP TABLE VIEW */}
                <div className="hidden md:block overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead className="bg-slate-50 dark:bg-slate-800/50 text-slate-500 dark:text-slate-400 text-xs uppercase tracking-wider font-bold">
                            <tr>
                                <th className="p-5">Data</th>
                                <th className="p-5 w-1/3">Descrição</th>
                                <th className="p-5">Categoria</th>
                                <th className="p-5 text-right">Valor</th>
                                <th className="p-5 text-center">Ações</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                            {filteredTransactions.length > 0 ? filteredTransactions.map(t => {
                                const category = categories.find(c => c.id === t.categoryId);
                                const subcategory = subcategories.find(s => s.id === t.subcategoryId);
                                return (
                                    <tr key={t.id} className="group hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                                        <td className="p-5 text-slate-600 dark:text-slate-400 font-medium whitespace-nowrap">{formatDate(t.date)}</td>
                                        <td className="p-5">
                                            <div className="font-medium text-slate-900 dark:text-white">{t.description}</div>
                                            {t.accountId && <div className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">{accounts.find(a => a.id === t.accountId)?.name}</div>}
                                        </td>
                                        <td className="p-5">
                                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${t.transferId ? 'bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300' : 'bg-indigo-50 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300'}`}>
                                                {t.transferId ? 'Transferência' : (category?.name || 'Sem Categoria')}
                                                {subcategory && <span className="opacity-60 ml-1">/ {subcategory.name}</span>}
                                            </span>
                                        </td>
                                        <td className={`p-5 font-bold text-right whitespace-nowrap ${t.type === TransactionType.INCOME ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
                                            {t.type === TransactionType.INCOME ? '+' : '-'} {formatCurrency(t.amount)}
                                        </td>
                                        <td className="p-5">
                                            <div className="flex justify-center items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                                <button onClick={() => handleEditTransaction(t)} disabled={!!t.transferId} className="p-2 rounded-lg text-slate-400 hover:text-violet-600 hover:bg-violet-50 dark:hover:bg-violet-900/20 transition-colors disabled:opacity-30 cursor-pointer disabled:cursor-not-allowed"><PencilIcon className="w-4 h-4"/></button>
                                                <button onClick={() => handleDeleteRequest(t.id)} className="p-2 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-900/20 transition-colors"><TrashIcon className="w-4 h-4"/></button>
                                            </div>
                                        </td>
                                    </tr>
                                );
                            }) : (
                                <tr>
                                    <td colSpan={5} className="text-center p-12 text-slate-500 dark:text-slate-400">
                                        <div className="flex flex-col items-center">
                                            <SearchIcon className="w-12 h-12 text-slate-300 mb-3"/>
                                            <p className="text-lg font-medium">Nenhuma transação encontrada</p>
                                            <p className="text-sm opacity-70">Tente ajustar os filtros ou adicione uma nova transação.</p>
                                        </div>
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>

                {/* MOBILE CARD VIEW */}
                <div className="md:hidden">
                    <div className="divide-y divide-slate-100 dark:divide-slate-800">
                        {filteredTransactions.length > 0 ? filteredTransactions.map(t => {
                            const category = categories.find(c => c.id === t.categoryId);
                            const subcategory = subcategories.find(s => s.id === t.subcategoryId);
                            return (
                                <div key={t.id} className="p-4 flex flex-col gap-3 active:bg-slate-50 dark:active:bg-slate-800/50 transition-colors">
                                    <div className="flex justify-between items-start">
                                        <div className="flex flex-col">
                                             <span className="text-xs font-bold text-slate-400 dark:text-slate-500 mb-1">{formatDate(t.date)}</span>
                                             <h3 className="font-semibold text-slate-900 dark:text-white text-base leading-tight">{t.description}</h3>
                                             {t.accountId && <span className="text-xs text-slate-400 mt-1">{accounts.find(a => a.id === t.accountId)?.name}</span>}
                                        </div>
                                        <div className={`font-bold text-lg ${t.type === TransactionType.INCOME ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
                                             {t.type === TransactionType.INCOME ? '+' : '-'} {formatCurrency(t.amount)}
                                        </div>
                                    </div>
                                    
                                    <div className="flex justify-between items-center mt-1">
                                        <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wide ${t.transferId ? 'bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300' : 'bg-indigo-50 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300'}`}>
                                            {t.transferId ? 'Transferência' : (category?.name || 'Sem Categoria')}
                                            {subcategory && <span className="opacity-60 ml-1">/ {subcategory.name}</span>}
                                        </span>
                                        
                                        <div className="flex gap-2">
                                            {!t.transferId && (
                                                <button onClick={() => handleEditTransaction(t)} className="p-2 bg-slate-50 dark:bg-slate-800 text-slate-400 rounded-lg active:bg-violet-50 active:text-violet-600"><PencilIcon className="w-4 h-4"/></button>
                                            )}
                                            <button onClick={() => handleDeleteRequest(t.id)} className="p-2 bg-slate-50 dark:bg-slate-800 text-slate-400 rounded-lg active:bg-rose-50 active:text-rose-600"><TrashIcon className="w-4 h-4"/></button>
                                        </div>
                                    </div>
                                </div>
                            );
                        }) : (
                             <div className="flex flex-col items-center justify-center py-12 text-slate-500 dark:text-slate-400 text-center px-4">
                                <SearchIcon className="w-10 h-10 text-slate-300 mb-3"/>
                                <p className="font-medium">Nenhuma transação encontrada</p>
                                <p className="text-xs opacity-70 mt-1">Tente ajustar os filtros.</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>
            
            {/* Modals */}
            <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title={editingTransaction ? "Editar Transação" : "Nova Transação"}>
                <TransactionForm 
                    transaction={editingTransaction}
                    accounts={accounts}
                    categories={categories}
                    subcategories={subcategories}
                    onSave={handleSaveTransaction}
                    onClose={() => setIsModalOpen(false)}
                />
            </Modal>
            
            <Modal isOpen={isTransferModalOpen} onClose={() => setIsTransferModalOpen(false)} title="Nova Transferência">
                <TransferForm
                    accounts={accounts}
                    onSave={handleSaveTransfer}
                    onClose={() => setIsTransferModalOpen(false)}
                />
            </Modal>

            <Modal isOpen={isInstallmentModalOpen} onClose={() => setIsInstallmentModalOpen(false)} title="Lançar Compra Parcelada">
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

export default TransactionsView;