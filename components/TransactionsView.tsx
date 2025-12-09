import React, { useState, useMemo, useRef, useEffect } from 'react';
import { Transaction, Account, Category, Subcategory, TransactionType } from '../types';
import { formatCurrency, formatDate, formatMonthYear } from '../utils';
import { ChevronLeftIcon, ChevronRightIcon, PencilIcon, PlusIcon, TrashIcon, UploadIcon, SearchIcon, XIcon, TableIcon } from './shared/icons';
import { parseOFX, ParsedTransaction } from '../services/ofxParser';
import { parseXLSX, ParsedXLSXTransaction } from '../services/xlsxParser';
import Modal from './shared/Modal';
import { useSwipeNavigation } from '../hooks/useSwipeNavigation';

interface TransactionsViewProps {
  transactions: Transaction[];
  accounts: Account[];
  categories: Category[];
  subcategories: Subcategory[];
  addTransaction: () => void;
  deleteTransaction: (id: string) => void;
  handleEditTransaction: (transaction: Transaction) => void;
  handleOpenInstallmentModal: () => void;
  handleOpenTransferModal: () => void;
  addAccount: (account: Omit<Account, 'id'>) => Account;
  addCategory: (category: Omit<Category, 'id'>) => Category;
  addSubcategory: (subcategory: Omit<Subcategory, 'id'>) => Subcategory;
  onImportTransactions: (transactions: Omit<Transaction, 'id'>[]) => void;
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

// All Modals and Forms have been moved to App.tsx to be controlled globally.
// This component now only displays the list and filters.

const TransactionsView: React.FC<TransactionsViewProps> = ({ 
    transactions, 
    accounts, 
    categories, 
    subcategories, 
    addTransaction, 
    deleteTransaction, 
    handleEditTransaction,
    handleOpenInstallmentModal,
    handleOpenTransferModal,
    onImportTransactions
}) => {
    const [currentDate, setCurrentDate] = useState(new Date());
    const [searchTerm, setSearchTerm] = useState('');
    const [filterAccountId, setFilterAccountId] = useState('');
    const [filterCategoryId, setFilterCategoryId] = useState('');
    
    // OFX/XLSX import states remain here for now as they are specific to this view's buttons
    const [isImportingOFX, setIsImportingOFX] = useState(false);
    const ofxFileInputRef = useRef<HTMLInputElement>(null);
    const [isImportingXLSX, setIsImportingXLSX] = useState(false);
    const xlsxFileInputRef = useRef<HTMLInputElement>(null);

    const filteredTransactions = useMemo(() => {
        return transactions
            .filter(t => {
                const tDate = new Date(t.date);
                // FIX: Use UTC methods to compare against the local date's components.
                // This ensures a date like '2025-12-01T00:00:00.000Z' is correctly
                // identified as belonging to December, regardless of the user's timezone.
                if (tDate.getUTCFullYear() !== currentDate.getFullYear() || tDate.getUTCMonth() !== currentDate.getMonth()) {
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

    const swipeHandlers = useSwipeNavigation({
        onSwipeLeft: () => changeMonth(1), // Next month
        onSwipeRight: () => changeMonth(-1), // Previous month
    });
    
    const handleOFXFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;

        // Validation removed to allow import without pre-selecting filter
        setIsImportingOFX(true);
        try {
            const text = await file.text();
            const parsedTransactions = parseOFX(text);
            
            if (parsedTransactions.length === 0) {
                alert("Nenhuma transação encontrada ou formato inválido.");
                return;
            }

            const transactionsToImport: Omit<Transaction, 'id'>[] = parsedTransactions.map(pt => ({
                description: pt.description,
                amount: pt.amount,
                date: pt.date,
                type: pt.type,
                accountId: filterAccountId || '', // Pass empty if no filter selected, will be handled in Modal
                categoryId: '',
                subcategoryId: ''
            }));

            onImportTransactions(transactionsToImport);

        } catch (e) {
            console.error(e);
            alert("Erro ao importar OFX. Verifique se o arquivo é válido.");
        } finally {
             setIsImportingOFX(false);
             if (ofxFileInputRef.current) ofxFileInputRef.current.value = '';
        }
    };
    
    const handleXLSXFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;

        // Validation removed to allow import without pre-selecting filter
        setIsImportingXLSX(true);
        try {
            const buffer = await file.arrayBuffer();
            const parsedTransactions = parseXLSX(buffer);

            if (parsedTransactions.length === 0) {
                // parseXLSX already alerts on empty/invalid
                return;
            }

            const transactionsToImport: Omit<Transaction, 'id'>[] = parsedTransactions.map(pt => ({
                description: pt.description,
                amount: pt.amount,
                date: pt.date,
                type: pt.type,
                accountId: filterAccountId || '', // Pass empty if no filter selected, will be handled in Modal
                categoryId: '', 
                subcategoryId: ''
            }));

            onImportTransactions(transactionsToImport);

        } catch (e) {
             console.error(e);
             alert("Erro crítico ao processar planilha.");
        } finally {
            setIsImportingXLSX(false);
            if (xlsxFileInputRef.current) xlsxFileInputRef.current.value = '';
        }
    }

    return (
        <div className="p-4 md:p-10 max-w-7xl mx-auto" {...swipeHandlers}>
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
                        <button onClick={handleOpenTransferModal} className="px-3 md:px-4 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-semibold hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors text-xs md:text-sm whitespace-nowrap">
                            Transf.
                        </button>
                        <button onClick={handleOpenInstallmentModal} className="px-3 md:px-4 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-semibold hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors text-xs md:text-sm whitespace-nowrap">
                            Parcelado
                        </button>
                        <button onClick={addTransaction} className="flex items-center gap-2 bg-violet-600 hover:bg-violet-700 text-white font-bold py-2.5 px-3 md:px-5 rounded-xl shadow-lg shadow-violet-500/30 transition-all transform hover:-translate-y-0.5 whitespace-nowrap text-xs md:text-sm">
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
                
                <div key={currentDate.toISOString()} className="animate-content-in">
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
                                                    <button onClick={() => handleEditTransaction(t)} className="p-2 rounded-lg text-slate-400 hover:text-violet-600 hover:bg-violet-50 dark:hover:bg-violet-900/20 transition-colors cursor-pointer"><PencilIcon className="w-4 h-4"/></button>
                                                    <button onClick={() => deleteTransaction(t.id)} className="p-2 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-900/20 transition-colors"><TrashIcon className="w-4 h-4"/></button>
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
                                                <button onClick={() => handleEditTransaction(t)} className="p-2 bg-slate-50 dark:bg-slate-800 text-slate-400 rounded-lg active:bg-violet-50 active:text-violet-600"><PencilIcon className="w-4 h-4"/></button>
                                                <button onClick={() => deleteTransaction(t.id)} className="p-2 bg-slate-50 dark:bg-slate-800 text-slate-400 rounded-lg active:bg-rose-50 active:text-rose-600"><TrashIcon className="w-4 h-4"/></button>
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
            </div>
        </div>
    );
};

export default TransactionsView;