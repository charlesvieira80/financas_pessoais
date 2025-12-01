import React, { useState, useMemo, useCallback } from 'react';
import { Transaction, Account, TransactionType } from '../types';
import { formatCurrency, formatMonthYear } from '../utils';
import { ChevronLeftIcon, ChevronRightIcon, PlusIcon } from './shared/icons';
import { useSwipeNavigation } from '../hooks/useSwipeNavigation';
import { useAuth } from '../contexts/AuthContext';

interface BalanceViewProps {
  transactions: Transaction[];
  accounts: Account[];
}

const BalanceView: React.FC<BalanceViewProps> = ({ transactions, accounts }) => {
    const { user } = useAuth();
    const [currentDate, setCurrentDate] = useState(new Date());
    const [viewMode, setViewMode] = useState<'monthly' | 'yearly'>('monthly');

    const changeMonth = useCallback((offset: number) => {
        setCurrentDate(prev => {
            const newDate = new Date(prev);
            newDate.setDate(1); 
            newDate.setMonth(newDate.getMonth() + offset);
            return newDate;
        });
    }, []);

    const changeYear = useCallback((offset: number) => {
        setCurrentDate(prev => {
            const newDate = new Date(prev);
            newDate.setFullYear(newDate.getFullYear() + offset);
            return newDate;
        });
    }, []);

    const swipeHandlers = useSwipeNavigation({
        onSwipeLeft: () => viewMode === 'monthly' ? changeMonth(1) : changeYear(1),
        onSwipeRight: () => viewMode === 'monthly' ? changeMonth(-1) : changeYear(-1),
    });

    const balanceData = useMemo(() => {
        const now = new Date();
        const currentYear = now.getFullYear();
        const currentMonth = now.getMonth();
        
        let endDate: Date;

        if (viewMode === 'monthly') {
            const selectedYear = currentDate.getFullYear();
            const selectedMonth = currentDate.getMonth();
            if (selectedYear === currentYear && selectedMonth === currentMonth) {
                endDate = now;
            } else {
                endDate = new Date(Date.UTC(selectedYear, selectedMonth + 1, 0, 23, 59, 59, 999));
            }
        } else { // yearly
            const selectedYear = currentDate.getFullYear();
            if (selectedYear === currentYear) {
                endDate = now;
            } else {
                endDate = new Date(Date.UTC(selectedYear, 11, 31, 23, 59, 59, 999));
            }
        }

        const relevantTransactions = transactions.filter(t => new Date(t.date) <= endDate);

        const accountBalances = accounts.map(account => {
            const accountTransactions = relevantTransactions.filter(t => t.accountId === account.id);
            const netValue = accountTransactions.reduce((sum, t) => {
                return t.type === TransactionType.INCOME ? sum + t.amount : sum - t.amount;
            }, 0);
            return {
                ...account,
                currentBalance: account.initialBalance + netValue,
            };
        }).sort((a,b) => b.currentBalance - a.currentBalance);

        const totalBalance = accountBalances.reduce((sum, acc) => sum + acc.currentBalance, 0);
        
        const positiveTotal = accountBalances
            .filter(acc => acc.currentBalance > 0)
            .reduce((sum, acc) => sum + acc.currentBalance, 0);

        return {
            endDate,
            totalBalance,
            accountBalances,
            positiveTotal
        };
    }, [accounts, transactions, currentDate, viewMode]);

    const endDateFormatted = balanceData.endDate.toLocaleDateString('pt-BR', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
    });

    return (
        <div className="p-4 md:p-10 max-w-7xl mx-auto space-y-6 md:space-y-8" {...swipeHandlers}>
            <header className="flex flex-col lg:flex-row lg:items-end justify-between gap-6">
                <div>
                    <h1 className="text-2xl md:text-3xl font-bold text-slate-900 dark:text-white tracking-tight">Saldos e Patrimônio</h1>
                    <p className="text-sm md:text-base text-slate-500 dark:text-slate-400 mt-1">Seu balanço financeiro consolidado.</p>
                </div>
                
                <div className="flex flex-col sm:flex-row sm:items-center gap-3 bg-white dark:bg-slate-900 p-2 md:p-1.5 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800 w-full lg:w-auto">
                     <div className="flex items-center bg-slate-100 dark:bg-slate-800 rounded-xl p-1 w-full sm:w-auto">
                        <button onClick={() => setViewMode('monthly')} className={`flex-1 sm:flex-none px-4 py-2 rounded-lg text-sm font-semibold transition-all ${viewMode === 'monthly' ? 'bg-white dark:bg-slate-700 text-violet-600 dark:text-violet-400 shadow-sm' : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300'}`}>Mensal</button>
                        <button onClick={() => setViewMode('yearly')} className={`flex-1 sm:flex-none px-4 py-2 rounded-lg text-sm font-semibold transition-all ${viewMode === 'yearly' ? 'bg-white dark:bg-slate-700 text-violet-600 dark:text-violet-400 shadow-sm' : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300'}`}>Anual</button>
                    </div>

                    <div className="h-px w-full sm:h-6 sm:w-px bg-slate-200 dark:bg-slate-700 hidden sm:block mx-1"></div>

                    <div className="flex items-center justify-between gap-2 w-full sm:w-auto">
                        {viewMode === 'monthly' ? (
                            <>
                                <button onClick={() => changeMonth(-1)} className="p-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 transition-colors"><ChevronLeftIcon className="w-5 h-5" /></button>
                                <span className="text-sm font-bold w-32 text-center text-slate-700 dark:text-slate-200">{formatMonthYear(currentDate)}</span>
                                <button onClick={() => changeMonth(1)} className="p-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 transition-colors"><ChevronRightIcon className="w-5 h-5" /></button>
                            </>
                        ) : (
                            <>
                                <button onClick={() => changeYear(-1)} className="p-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 transition-colors"><ChevronLeftIcon className="w-5 h-5" /></button>
                                <span className="text-sm font-bold w-20 text-center text-slate-700 dark:text-slate-200">{currentDate.getFullYear()}</span>
                                <button onClick={() => changeYear(1)} className="p-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 transition-colors"><ChevronRightIcon className="w-5 h-5" /></button>
                            </>
                        )}
                    </div>
                </div>
            </header>

            <div className="relative overflow-hidden bg-white dark:bg-slate-900 p-6 md:p-8 rounded-3xl shadow-xl shadow-slate-200/50 dark:shadow-none border border-slate-100 dark:border-slate-800 group">
                 <div className="absolute top-0 right-0 -mt-8 -mr-8 w-32 h-32 md:w-40 md:h-40 bg-violet-50 dark:bg-violet-900/20 rounded-full blur-3xl group-hover:bg-violet-100 dark:group-hover:bg-violet-900/30 transition-colors duration-500"></div>
                <h2 className="relative text-xs md:text-sm font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">Saldo Total Consolidado</h2>
                <div className="relative flex items-baseline gap-2 flex-wrap">
                    <span className="text-4xl sm:text-5xl md:text-6xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-slate-900 to-slate-700 dark:from-white dark:to-slate-300 break-all">
                        {formatCurrency(balanceData.totalBalance)}
                    </span>
                </div>
                <p className="relative mt-3 text-xs md:text-sm font-medium text-slate-400 dark:text-slate-500 flex items-center gap-2">
                    <span className={`w-2 h-2 rounded-full ${balanceData.totalBalance >= 0 ? 'bg-emerald-400' : 'bg-rose-400'} animate-pulse`}></span>
                    Posição em {endDateFormatted}
                </p>
            </div>
            
             <div>
                <h3 className="text-xl font-bold text-slate-800 dark:text-white mb-4">Saldos por Conta</h3>
                {accounts.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 md:gap-6">
                        {balanceData.accountBalances.map(acc => {
                             const percentage = (acc.currentBalance > 0 && balanceData.positiveTotal > 0)
                                ? (acc.currentBalance / balanceData.positiveTotal) * 100
                                : 0;
                            return(
                                <div key={acc.id} className="bg-white dark:bg-slate-900 p-5 rounded-2xl shadow-lg shadow-slate-200/50 dark:shadow-none border border-slate-100 dark:border-slate-800 flex flex-col justify-between">
                                    <div>
                                        <h4 className="font-bold text-lg text-slate-800 dark:text-white truncate">{acc.name}</h4>
                                        <p className={`text-2xl font-bold mt-2 ${acc.currentBalance >= 0 ? 'text-slate-700 dark:text-slate-200' : 'text-rose-600 dark:text-rose-400'}`}>
                                            {formatCurrency(acc.currentBalance)}
                                        </p>
                                    </div>
                                    <div className="mt-4 pt-4 border-t border-slate-100 dark:border-slate-800">
                                         <p className="text-xs text-slate-400 dark:text-slate-500 mb-1.5">Proporção do patrimônio</p>
                                        <div className="w-full bg-slate-100 dark:bg-slate-800 rounded-full h-2.5">
                                            <div 
                                                className="bg-gradient-to-r from-violet-500 to-indigo-500 h-2.5 rounded-full transition-all duration-500 ease-out" 
                                                style={{ width: `${Math.max(0, Math.min(percentage, 100))}%` }}>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )
                        })}
                    </div>
                ) : (
                    <div className="text-center py-12 px-6 bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800">
                        <h3 className="text-lg font-semibold text-slate-800 dark:text-white">Nenhuma conta cadastrada</h3>
                        <p className="text-sm text-slate-500 dark:text-slate-400 mt-2">Adicione sua primeira conta na tela de Configurações para começar a ver seus saldos.</p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default BalanceView;
