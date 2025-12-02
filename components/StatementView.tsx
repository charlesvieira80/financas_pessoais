import React, { useState, useMemo, useEffect } from 'react';
import { Transaction, Account, Category, TransactionType } from '../types';
import { formatCurrency, formatDate, formatMonthYear } from '../utils';
import { ChevronLeftIcon, ChevronRightIcon, PlusIcon, PencilIcon, TrashIcon } from './shared/icons';
import { useSwipeNavigation } from '../hooks/useSwipeNavigation';

interface StatementViewProps {
  transactions: Transaction[];
  accounts: Account[];
  categories: Category[];
  handleOpenAddTransaction: (preselect: { accountId: string }) => void;
  handleOpenInstallmentModal: (preselect: { accountId: string }) => void;
  handleOpenTransferModal: (preselect: { accountId: string }) => void;
  handleEditTransaction: (transaction: Transaction) => void;
  handleDeleteRequest: (id: string) => void;
  initialAccountId?: string | null;
}

interface DailyGroup {
    date: string;
    transactions: Transaction[];
    dayTotal: number;
    closingBalance: number;
}

interface StatementData {
    initialBalance: number;
    dailyGroups: DailyGroup[];
    finalBalance: number;
    totalIncome: number;
    totalExpense: number;
}

const StatementView: React.FC<StatementViewProps> = ({ 
    transactions, 
    accounts, 
    categories,
    handleOpenAddTransaction,
    handleOpenInstallmentModal,
    handleOpenTransferModal,
    handleEditTransaction,
    handleDeleteRequest,
    initialAccountId
}) => {
    const [currentDate, setCurrentDate] = useState(new Date());
    const [selectedAccountId, setSelectedAccountId] = useState<string>('');
    const [isFabMenuOpen, setIsFabMenuOpen] = useState(false);


    // Set default account on load or when navigating from another view
    useEffect(() => {
        if (initialAccountId) {
            setSelectedAccountId(initialAccountId);
        } else if (accounts.length > 0 && !selectedAccountId) {
            setSelectedAccountId(accounts[0].id);
        }
    }, [accounts, selectedAccountId, initialAccountId]);
    
    const changeMonth = (offset: number) => {
        setCurrentDate(prev => {
            const newDate = new Date(prev);
            newDate.setDate(1); // Avoid issues with different month lengths
            newDate.setMonth(newDate.getMonth() + offset);
            return newDate;
        });
    };

    const swipeHandlers = useSwipeNavigation({
        onSwipeLeft: () => changeMonth(1), // Next month
        onSwipeRight: () => changeMonth(-1), // Previous month
    });

    const statementData = useMemo((): StatementData | null => {
        if (!selectedAccountId) return null;

        const account = accounts.find(a => a.id === selectedAccountId);
        if (!account) return null;

        const year = currentDate.getFullYear();
        const month = currentDate.getMonth();

        const startDate = new Date(Date.UTC(year, month, 1));
        const endDate = new Date(Date.UTC(year, month + 1, 0, 23, 59, 59, 999));

        const previousTransactions = transactions.filter(t => 
            t.accountId === selectedAccountId && new Date(t.date) < startDate
        );

        const initialBalance = previousTransactions.reduce((balance, t) => {
            return t.type === TransactionType.INCOME ? balance + t.amount : balance - t.amount;
        }, account.initialBalance);

        const monthTransactions = transactions.filter(t => {
            const tDate = new Date(t.date);
            return t.accountId === selectedAccountId && tDate >= startDate && tDate <= endDate;
        }).sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
        
        let totalIncome = 0;
        let totalExpense = 0;
        
        const groupedByDay = monthTransactions.reduce((acc, t) => {
            const dateStr = t.date.split('T')[0];
            if (!acc[dateStr]) {
                acc[dateStr] = [];
            }
            acc[dateStr].push(t);
            
            if (t.type === TransactionType.INCOME) totalIncome += t.amount;
            else totalExpense += t.amount;

            return acc;
        }, {} as Record<string, Transaction[]>);

        let runningBalance = initialBalance;
        const dailyGroups = Object.keys(groupedByDay).map(dateStr => {
            const dailyTransactions = groupedByDay[dateStr];
            const dayTotal = dailyTransactions.reduce((sum, t) => {
                return t.type === TransactionType.INCOME ? sum + t.amount : sum - t.amount;
            }, 0);
            runningBalance += dayTotal;
            return {
                date: new Date(dateStr + 'T00:00:00Z').toISOString(),
                transactions: dailyTransactions,
                dayTotal,
                closingBalance: runningBalance
            };
        });

        return {
            initialBalance,
            dailyGroups,
            finalBalance: runningBalance,
            totalIncome,
            totalExpense
        };
    }, [selectedAccountId, currentDate, transactions, accounts]);

    return (
        <div className="p-4 md:p-8 text-gray-800 dark:text-white max-w-7xl mx-auto" {...swipeHandlers}>
            <header className="flex flex-col md:flex-row justify-between md:items-center mb-6">
                <h1 className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-slate-100">Extratos Bancários</h1>
            </header>

            {/* Controls */}
            <div className="flex flex-col md:flex-row gap-4 mb-6 p-4 bg-white dark:bg-slate-800 rounded-2xl items-center shadow-sm border border-slate-100 dark:border-slate-700">
                <div className="w-full md:w-1/3">
                    <label htmlFor="account-select" className="block text-xs font-bold uppercase text-gray-500 dark:text-slate-400 mb-1 tracking-wider">Conta</label>
                    <select
                        id="account-select"
                        value={selectedAccountId}
                        onChange={(e) => setSelectedAccountId(e.target.value)}
                        className="w-full bg-gray-50 dark:bg-slate-700/50 text-gray-900 dark:text-white rounded-xl py-2.5 px-3 border border-gray-200 dark:border-slate-600 focus:ring-2 focus:ring-violet-500 outline-none transition-all"
                        aria-label="Selecionar conta"
                    >
                        {accounts.length > 0 ? (
                            accounts.map(acc => <option key={acc.id} value={acc.id}>{acc.name}</option>)
                        ) : (
                            <option>Nenhuma conta cadastrada</option>
                        )}
                    </select>
                </div>
                <div className="w-full md:flex-grow flex justify-center items-center gap-3 md:gap-4 pt-2 md:pt-5">
                    <button onClick={() => changeMonth(-1)} className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-slate-700 transition-colors text-slate-500" aria-label="Mês anterior">
                        <ChevronLeftIcon />
                    </button>
                    <h2 className="text-lg md:text-xl font-bold text-slate-800 dark:text-white w-40 text-center">{formatMonthYear(currentDate)}</h2>
                    <button onClick={() => changeMonth(1)} className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-slate-700 transition-colors text-slate-500" aria-label="Próximo mês">
                        <ChevronRightIcon />
                    </button>
                </div>
            </div>

            {/* Statement Display */}
            <div key={`${selectedAccountId}-${currentDate.toISOString()}`} className="bg-white dark:bg-slate-800 rounded-2xl shadow-lg shadow-slate-200/50 dark:shadow-none border border-slate-100 dark:border-slate-800 overflow-hidden animate-content-in">
                {!selectedAccountId ? (
                    <p className="p-8 text-center text-gray-500 dark:text-slate-400">Por favor, selecione uma conta para ver o extrato.</p>
                ) : !statementData ? (
                    <p className="p-8 text-center text-gray-500 dark:text-slate-400">Carregando dados da conta...</p>
                ) : (
                    <div>
                        {/* Summary Header */}
                        <div className="p-4 md:p-6 border-b border-slate-100 dark:border-slate-700 grid grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6 text-center">
                            <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-700/30">
                                <p className="text-xs uppercase font-bold text-slate-400 dark:text-slate-500 mb-1">Saldo Inicial</p>
                                <p className="text-base md:text-lg font-bold text-slate-700 dark:text-slate-200">{formatCurrency(statementData.initialBalance)}</p>
                            </div>
                            <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-900/10">
                                <p className="text-xs uppercase font-bold text-emerald-600/70 dark:text-emerald-400/70 mb-1">Entradas</p>
                                <p className="text-base md:text-lg font-bold text-emerald-600 dark:text-emerald-400">{formatCurrency(statementData.totalIncome)}</p>
                            </div>
                            <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-900/10">
                                <p className="text-xs uppercase font-bold text-rose-600/70 dark:text-rose-400/70 mb-1">Saídas</p>
                                <p className="text-base md:text-lg font-bold text-rose-600 dark:text-rose-400">{formatCurrency(statementData.totalExpense)}</p>
                            </div>
                            <div className="p-3 rounded-xl bg-slate-100 dark:bg-slate-700/50">
                                <p className="text-xs uppercase font-bold text-slate-500 dark:text-slate-400 mb-1">Saldo Final</p>
                                <p className="text-base md:text-lg font-bold text-slate-900 dark:text-white">{formatCurrency(statementData.finalBalance)}</p>
                            </div>
                        </div>

                        {/* Transactions List */}
                        <div className="p-4 md:p-6">
                            {statementData.dailyGroups.length === 0 ? (
                                <p className="py-12 text-center text-slate-400 dark:text-slate-500 flex flex-col items-center">
                                    <span className="text-4xl mb-2">📅</span>
                                    Nenhuma transação encontrada para este mês.
                                </p>
                            ) : (
                                <div className="space-y-6">
                                    {statementData.dailyGroups.map(group => (
                                        <div key={group.date}>
                                            <div className="flex justify-between items-baseline pb-2 border-b border-slate-200 dark:border-slate-700 mb-2">
                                                <h3 className="font-bold text-base md:text-lg text-slate-800 dark:text-slate-200 capitalize">
                                                    {new Date(group.date).toLocaleDateString('pt-BR', { weekday: 'short', day: 'numeric', month: 'short', timeZone: 'UTC' })}
                                                </h3>
                                                <div className="text-right">
                                                    <span className="text-xs text-slate-400 dark:text-slate-500 mr-2 hidden sm:inline">Saldo do Dia: </span>
                                                    <span className="font-mono font-semibold text-sm text-slate-600 dark:text-slate-300">{formatCurrency(group.closingBalance)}</span>
                                                </div>
                                            </div>
                                            <ul className="space-y-0">
                                                {group.transactions.map(t => {
                                                    const category = t.categoryId ? categories.find(c => c.id === t.categoryId) : null;
                                                    const isIncome = t.type === TransactionType.INCOME;
                                                    return (
                                                        <li key={t.id} className="flex justify-between items-center p-3 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors border-b border-slate-50 dark:border-slate-800 last:border-0">
                                                            <div className="flex-1 overflow-hidden mr-4">
                                                                <p className="font-medium text-sm md:text-base text-slate-900 dark:text-slate-100 truncate">{t.description}</p>
                                                                <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">{category?.name || (t.transferId ? 'Transferência' : 'Sem Categoria')}</p>
                                                            </div>
                                                            <div className="flex items-center gap-2 md:gap-4">
                                                                <p className={`font-bold text-sm md:text-base whitespace-nowrap ${isIncome ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
                                                                    {isIncome ? '+' : '-'} {formatCurrency(t.amount)}
                                                                </p>
                                                                <div className="flex gap-1">
                                                                    <button 
                                                                        onClick={() => handleEditTransaction(t)} 
                                                                        disabled={!!t.transferId} 
                                                                        className="p-2 rounded-lg text-slate-400 hover:text-violet-600 hover:bg-violet-50 dark:hover:bg-violet-900/20 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                                                                        aria-label="Editar transação"
                                                                    >
                                                                        <PencilIcon className="w-4 h-4"/>
                                                                    </button>
                                                                    <button 
                                                                        onClick={() => handleDeleteRequest(t.id)} 
                                                                        className="p-2 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-900/20 transition-colors"
                                                                        aria-label="Excluir transação"
                                                                    >
                                                                        <TrashIcon className="w-4 h-4"/>
                                                                    </button>
                                                                </div>
                                                            </div>
                                                        </li>
                                                    );
                                                })}
                                            </ul>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </div>

            {/* Quick Add FAB */}
            {selectedAccountId && (
                <div className="fixed bottom-24 right-4 md:bottom-8 md:right-8 z-30">
                    <div 
                        className={`flex flex-col items-end gap-3 transition-all duration-300 ${isFabMenuOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
                        style={{ transform: isFabMenuOpen ? 'translateY(0)' : 'translateY(10px)' }}
                    >
                        <button
                            onClick={() => { handleOpenTransferModal({ accountId: selectedAccountId }); setIsFabMenuOpen(false); }}
                            className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-xl shadow-lg text-sm font-semibold hover:bg-slate-100 dark:hover:bg-slate-600 transition-all"
                        >
                            Transferência
                        </button>
                        <button
                            onClick={() => { handleOpenInstallmentModal({ accountId: selectedAccountId }); setIsFabMenuOpen(false); }}
                            className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-xl shadow-lg text-sm font-semibold hover:bg-slate-100 dark:hover:bg-slate-600 transition-all"
                        >
                            Parcelamento
                        </button>
                        <button
                            onClick={() => { handleOpenAddTransaction({ accountId: selectedAccountId }); setIsFabMenuOpen(false); }}
                            className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-xl shadow-lg text-sm font-semibold hover:bg-slate-100 dark:hover:bg-slate-600 transition-all"
                        >
                            Transação
                        </button>
                    </div>
                    <button
                        onClick={() => setIsFabMenuOpen(!isFabMenuOpen)}
                        className="mt-3 w-16 h-16 bg-gradient-to-br from-violet-500 to-indigo-600 text-white rounded-full flex items-center justify-center shadow-2xl shadow-violet-500/40 transform hover:scale-105 transition-all"
                        aria-label="Adicionar transação"
                    >
                        <PlusIcon className={`w-8 h-8 transition-transform duration-300 ${isFabMenuOpen ? 'rotate-45' : 'rotate-0'}`} />
                    </button>
                </div>
            )}
        </div>
    );
};

export default StatementView;