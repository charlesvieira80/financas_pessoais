import React, { useState, useMemo, useEffect } from 'react';
import { Transaction, Account, Category, TransactionType } from '../types';
import { formatCurrency, formatDate, formatMonthYear } from '../utils';
import { ChevronLeftIcon, ChevronRightIcon } from './shared/icons';

interface StatementViewProps {
  transactions: Transaction[];
  accounts: Account[];
  categories: Category[];
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

const StatementView: React.FC<StatementViewProps> = ({ transactions, accounts, categories }) => {
    const [currentDate, setCurrentDate] = useState(new Date());
    const [selectedAccountId, setSelectedAccountId] = useState<string>('');

    // Set default account on load
    useEffect(() => {
        if (accounts.length > 0 && !selectedAccountId) {
            setSelectedAccountId(accounts[0].id);
        }
    }, [accounts, selectedAccountId]);
    
    const changeMonth = (offset: number) => {
        setCurrentDate(prev => {
            const newDate = new Date(prev);
            newDate.setDate(1); // Avoid issues with different month lengths
            newDate.setMonth(newDate.getMonth() + offset);
            return newDate;
        });
    };

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
        <div className="p-4 md:p-8 text-gray-800 dark:text-white">
            <header className="flex flex-col md:flex-row justify-between md:items-center mb-6">
                <h1 className="text-3xl font-bold text-gray-900 dark:text-slate-100">Extratos Bancários</h1>
            </header>

            {/* Controls */}
            <div className="flex flex-col md:flex-row gap-4 mb-6 p-4 bg-white dark:bg-slate-800 rounded-lg items-center">
                <div className="w-full md:w-1/3">
                    <label htmlFor="account-select" className="block text-sm font-medium text-gray-600 dark:text-slate-300 mb-1">Conta</label>
                    <select
                        id="account-select"
                        value={selectedAccountId}
                        onChange={(e) => setSelectedAccountId(e.target.value)}
                        className="w-full bg-gray-100 dark:bg-slate-700 text-gray-900 dark:text-white rounded-md py-2 px-3 border border-gray-300 dark:border-slate-600 focus:ring-sky-500 focus:border-sky-500"
                        aria-label="Selecionar conta"
                    >
                        {accounts.length > 0 ? (
                            accounts.map(acc => <option key={acc.id} value={acc.id}>{acc.name}</option>)
                        ) : (
                            <option>Nenhuma conta cadastrada</option>
                        )}
                    </select>
                </div>
                <div className="flex-grow flex justify-center items-center gap-2">
                    <button onClick={() => changeMonth(-1)} className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-slate-700 transition-colors" aria-label="Mês anterior">
                        <ChevronLeftIcon />
                    </button>
                    <h2 className="text-xl font-semibold w-48 text-center">{formatMonthYear(currentDate)}</h2>
                    <button onClick={() => changeMonth(1)} className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-slate-700 transition-colors" aria-label="Próximo mês">
                        <ChevronRightIcon />
                    </button>
                </div>
            </div>

            {/* Statement Display */}
            <div className="bg-white dark:bg-slate-800 rounded-lg shadow-lg">
                {!selectedAccountId ? (
                    <p className="p-8 text-center text-gray-500 dark:text-slate-400">Por favor, selecione uma conta para ver o extrato.</p>
                ) : !statementData ? (
                    <p className="p-8 text-center text-gray-500 dark:text-slate-400">Carregando dados da conta...</p>
                ) : (
                    <div>
                        {/* Summary Header */}
                        <div className="p-4 border-b border-gray-200 dark:border-slate-700 grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
                            <div>
                                <p className="text-sm text-gray-500 dark:text-slate-400">Saldo Inicial</p>
                                <p className="text-lg font-semibold">{formatCurrency(statementData.initialBalance)}</p>
                            </div>
                            <div>
                                <p className="text-sm text-gray-500 dark:text-slate-400">Total de Entradas</p>
                                <p className="text-lg font-semibold text-emerald-500">{formatCurrency(statementData.totalIncome)}</p>
                            </div>
                            <div>
                                <p className="text-sm text-gray-500 dark:text-slate-400">Total de Saídas</p>
                                <p className="text-lg font-semibold text-rose-500">{formatCurrency(statementData.totalExpense)}</p>
                            </div>
                            <div>
                                <p className="text-sm text-gray-500 dark:text-slate-400">Saldo Final</p>
                                <p className="text-lg font-semibold">{formatCurrency(statementData.finalBalance)}</p>
                            </div>
                        </div>

                        {/* Transactions List */}
                        <div className="p-4 md:p-6">
                            {statementData.dailyGroups.length === 0 ? (
                                <p className="py-8 text-center text-gray-500 dark:text-slate-400">Nenhuma transação encontrada para este mês.</p>
                            ) : (
                                <div className="space-y-6">
                                    {statementData.dailyGroups.map(group => (
                                        <div key={group.date}>
                                            <div className="flex justify-between items-baseline pb-2 border-b border-gray-300 dark:border-slate-600 mb-2">
                                                <h3 className="font-bold text-lg">{formatDate(group.date)}</h3>
                                                <div className="text-right">
                                                    <span className="text-sm text-gray-500 dark:text-slate-400">Saldo do Dia: </span>
                                                    <span className="font-semibold">{formatCurrency(group.closingBalance)}</span>
                                                </div>
                                            </div>
                                            <ul className="space-y-2">
                                                {group.transactions.map(t => {
                                                    const category = t.categoryId ? categories.find(c => c.id === t.categoryId) : null;
                                                    const isIncome = t.type === TransactionType.INCOME;
                                                    return (
                                                        <li key={t.id} className="flex justify-between items-center p-2 rounded hover:bg-gray-100 dark:hover:bg-slate-700/50">
                                                            <div>
                                                                <p>{t.description}</p>
                                                                <p className="text-xs text-gray-500 dark:text-slate-400">{category?.name || (t.transferId ? 'Transferência' : 'Sem Categoria')}</p>
                                                            </div>
                                                            <p className={`font-medium ${isIncome ? 'text-emerald-500' : 'text-rose-500'}`}>
                                                                {isIncome ? '+' : '-'} {formatCurrency(t.amount)}
                                                            </p>
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
        </div>
    );
};

export default StatementView;