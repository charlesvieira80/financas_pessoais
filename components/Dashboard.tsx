import React, { useState, useMemo, useCallback } from 'react';
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, PieChart, Pie, Cell, Legend } from 'recharts';
import { Transaction, Category, Account, TransactionType, Subcategory } from '../types';
import { formatCurrency, formatMonthYear } from '../utils';
import { getFinancialInsights } from '../services/geminiService';
import { ChevronLeftIcon, ChevronRightIcon, SparklesIcon } from './shared/icons';
import { useTheme } from '../contexts/ThemeContext';

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8', '#82ca9d', '#ffc658'];

interface DashboardProps {
    transactions: Transaction[];
    categories: Category[];
    accounts: Account[];
    subcategories: Subcategory[];
}

const Dashboard: React.FC<DashboardProps> = ({ transactions, categories, accounts, subcategories }) => {
    const { theme } = useTheme();
    const [insights, setInsights] = useState<string>('');
    const [isLoadingInsights, setIsLoadingInsights] = useState(false);
    const [currentDate, setCurrentDate] = useState(new Date());
    const [viewMode, setViewMode] = useState<'monthly' | 'yearly'>('monthly');
    const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null);
    
    const gridColor = theme === 'dark' ? '#374151' : '#e5e7eb';
    const textColor = theme === 'dark' ? '#9ca3af' : '#6b7280';
    const tooltipBg = theme === 'dark' ? '#1f2937' : '#ffffff';
    const tooltipBorder = theme === 'dark' ? '#374151' : '#e5e7eb';

    const changeMonth = (offset: number) => {
        setCurrentDate(prev => {
            const newDate = new Date(prev);
            newDate.setDate(1); // Avoid month skipping issues
            newDate.setMonth(newDate.getMonth() + offset);
            return newDate;
        });
    };

    const changeYear = (offset: number) => {
        setCurrentDate(prev => {
            const newDate = new Date(prev);
            newDate.setFullYear(newDate.getFullYear() + offset);
            return newDate;
        });
    };
    
    const handleYearChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        setCurrentDate(prev => {
            const newDate = new Date(prev);
            newDate.setFullYear(parseInt(e.target.value, 10));
            return newDate;
        });
    };
    
    const availableYears = useMemo(() => {
        const years = new Set(transactions.map(t => new Date(t.date).getFullYear()));
        const currentYear = new Date().getFullYear();
        if (!years.has(currentYear)) {
            years.add(currentYear);
        }
        // FIX: Explicitly cast sort parameters to Number to resolve arithmetic operation error.
        return Array.from(years).sort((a, b) => Number(b) - Number(a));
    }, [transactions]);

    const filteredTransactionsByDate = useMemo(() => {
        return transactions.filter(t => {
            const tDate = new Date(t.date);
            if (viewMode === 'yearly') {
                return tDate.getFullYear() === currentDate.getFullYear();
            }
            return tDate.getFullYear() === currentDate.getFullYear() && tDate.getMonth() === currentDate.getMonth();
        });
    }, [transactions, currentDate, viewMode]);

    const nonTransferTransactions = useMemo(() => {
        return filteredTransactionsByDate.filter(t => !t.transferId);
    }, [filteredTransactionsByDate]);
    
    const dailyData = useMemo(() => {
        if (viewMode !== 'monthly') return [];

        const year = currentDate.getFullYear();
        const month = currentDate.getMonth();
        const daysInMonth = new Date(year, month + 1, 0).getDate();
        const data = Array.from({ length: daysInMonth }, (_, i) => ({
            date: (i + 1).toString(),
            receita: 0,
            despesas: 0,
        }));

        nonTransferTransactions.forEach(t => {
            const dayOfMonth = new Date(t.date).getDate() - 1;
            if (data[dayOfMonth]) {
                if (t.type === TransactionType.INCOME) {
                    data[dayOfMonth].receita += t.amount;
                } else {
                    data[dayOfMonth].despesas += t.amount;
                }
            }
        });

        return data;
    }, [currentDate, nonTransferTransactions, viewMode]);
    
    const monthlyData = useMemo(() => {
        if (viewMode !== 'yearly') return [];
        const monthNames = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];
        const data = monthNames.map(month => ({ month, receita: 0, despesas: 0 }));

        nonTransferTransactions.forEach(t => {
            const monthIndex = new Date(t.date).getMonth();
            if (t.type === TransactionType.INCOME) {
                data[monthIndex].receita += t.amount;
            } else {
                data[monthIndex].despesas += t.amount;
            }
        });
        return data;
    }, [viewMode, nonTransferTransactions]);

    const pieChartData = useMemo(() => {
        if (!selectedCategoryId) {
            // Group by Category
            const dataMap = new Map<string, { id: string; name: string; value: number }>();
            nonTransferTransactions.forEach(t => {
                if (t.type === TransactionType.EXPENSE && t.categoryId) {
                    const category = categories.find(c => c.id === t.categoryId);
                    if (category) {
                        const current = dataMap.get(t.categoryId) || { id: t.categoryId, name: category.name, value: 0 };
                        dataMap.set(t.categoryId, { ...current, value: current.value + t.amount });
                    }
                }
            });
            return Array.from(dataMap.values()).sort((a, b) => b.value - a.value);
        } else {
            // Group by Subcategory for the selected Category
            const dataMap = new Map<string, { id: string; name: string; value: number }>();
            nonTransferTransactions
                .filter(t => t.categoryId === selectedCategoryId && t.type === TransactionType.EXPENSE)
                .forEach(t => {
                    let subcategoryName = 'Outros';
                    let subcategoryId = `other-${selectedCategoryId}`; // Unique key for uncategorized within a category

                    if (t.subcategoryId) {
                        const sub = subcategories.find(s => s.id === t.subcategoryId);
                        if (sub) {
                            subcategoryName = sub.name;
                            subcategoryId = sub.id;
                        }
                    }
                    const current = dataMap.get(subcategoryId) || { id: subcategoryId, name: subcategoryName, value: 0 };
                    dataMap.set(subcategoryId, { ...current, value: current.value + t.amount });
                });
            return Array.from(dataMap.values()).sort((a, b) => b.value - a.value);
        }
    }, [nonTransferTransactions, categories, subcategories, selectedCategoryId]);
    
    const totalBalance = useMemo(() => {
        const initialBalances = accounts.reduce((sum, acc) => sum + acc.initialBalance, 0);
        
        const endOfPeriod = viewMode === 'monthly'
            ? new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0, 23, 59, 59)
            : new Date(currentDate.getFullYear(), 11, 31, 23, 59, 59);

        const netTransactions = transactions
            .filter(t => new Date(t.date) <= endOfPeriod)
            .reduce((sum, t) => {
                return t.type === TransactionType.INCOME ? sum + t.amount : sum - t.amount;
            }, 0);
        return initialBalances + netTransactions;
    }, [accounts, transactions, currentDate, viewMode]);

    const handleGetInsights = useCallback(async () => {
        setIsLoadingInsights(true);
        setInsights('');
        const period = viewMode === 'monthly' 
            ? `de ${formatMonthYear(currentDate)}` 
            : `do ano de ${currentDate.getFullYear()}`;

        const result = await getFinancialInsights(nonTransferTransactions, categories, accounts, period);
        setInsights(result);
        setIsLoadingInsights(false);
    }, [nonTransferTransactions, categories, accounts, viewMode, currentDate]);

    const handlePieClick = (data: any) => {
        if (!selectedCategoryId && data.payload?.id) {
            const hasSubcategories = subcategories.some(s => s.categoryId === data.payload.id);
            if (hasSubcategories) {
                setSelectedCategoryId(data.payload.id);
            }
        }
    };

    const endOfPeriodFormatted = (viewMode === 'monthly'
        ? new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0)
        : new Date(currentDate.getFullYear(), 11, 31)
    ).toLocaleDateString('pt-BR', { month: 'short', day: 'numeric', year: 'numeric' });

    const currentPeriodLabel = viewMode === 'monthly' ? formatMonthYear(currentDate) : currentDate.getFullYear().toString();
    
    const selectedCategoryName = useMemo(() => {
        if (!selectedCategoryId) return null;
        return categories.find(c => c.id === selectedCategoryId)?.name;
    }, [selectedCategoryId, categories]);
    
    const pieChartTitle = selectedCategoryId 
        ? `Gastos em "${selectedCategoryName}"` 
        : `Gastos por Categoria (${currentPeriodLabel})`;

    return (
        <div className="p-4 md:p-8 text-gray-800 dark:text-white space-y-8">
            <header>
                <h1 className="text-3xl font-bold text-gray-900 dark:text-slate-100">Painel</h1>
                <p className="text-gray-500 dark:text-slate-400 mt-1">Sua visão geral financeira, mês a mês.</p>
            </header>
            
            <div className="flex justify-center bg-gray-200 dark:bg-slate-700/50 rounded-lg p-1 w-fit mx-auto">
              <button onClick={() => setViewMode('monthly')} className={`px-4 py-1.5 rounded-md text-sm font-semibold transition-colors ${viewMode === 'monthly' ? 'bg-sky-600 text-white shadow' : 'text-gray-600 dark:text-slate-300 hover:bg-gray-300 dark:hover:bg-slate-600/50'}`}>Mensal</button>
              <button onClick={() => setViewMode('yearly')} className={`px-4 py-1.5 rounded-md text-sm font-semibold transition-colors ${viewMode === 'yearly' ? 'bg-sky-600 text-white shadow' : 'text-gray-600 dark:text-slate-300 hover:bg-gray-300 dark:hover:bg-slate-600/50'}`}>Anual</button>
            </div>

            <div className="flex flex-col sm:flex-row justify-center items-center gap-4">
                {viewMode === 'monthly' ? (
                    <div className="flex items-center gap-2">
                        <button onClick={() => changeMonth(-1)} className="p-2 rounded-full hover:bg-gray-200 dark:hover:bg-slate-700 transition-colors" aria-label="Mês anterior">
                            <ChevronLeftIcon />
                        </button>
                        <span className="text-xl font-semibold w-40 text-center">{formatMonthYear(currentDate)}</span>
                        <button onClick={() => changeMonth(1)} className="p-2 rounded-full hover:bg-gray-200 dark:hover:bg-slate-700 transition-colors" aria-label="Próximo mês">
                            <ChevronRightIcon />
                        </button>
                    </div>
                ) : (
                    <div className="flex items-center gap-2">
                        <button onClick={() => changeYear(-1)} className="p-2 rounded-full hover:bg-gray-200 dark:hover:bg-slate-700 transition-colors" aria-label="Ano anterior">
                            <ChevronLeftIcon />
                        </button>
                        <span className="text-xl font-semibold w-40 text-center">{currentDate.getFullYear()}</span>
                        <button onClick={() => changeYear(1)} className="p-2 rounded-full hover:bg-gray-200 dark:hover:bg-slate-700 transition-colors" aria-label="Próximo ano">
                            <ChevronRightIcon />
                        </button>
                    </div>
                )}
                <select 
                    value={currentDate.getFullYear()} 
                    onChange={handleYearChange} 
                    className="bg-gray-100 dark:bg-slate-700 text-gray-900 dark:text-white rounded-md py-2 px-3 border border-gray-300 dark:border-slate-600 focus:ring-sky-500 focus:border-sky-500 font-semibold"
                    aria-label="Selecione o ano"
                >
                    {availableYears.map(year => <option key={year} value={year}>{year}</option>)}
                </select>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-white dark:bg-slate-800 p-6 rounded-lg shadow-lg col-span-1 md:col-span-3">
                    <h2 className="text-xl font-semibold text-gray-800 dark:text-slate-200 mb-2">Saldo Total</h2>
                    <p className="text-4xl font-bold text-sky-500 dark:text-sky-400">{formatCurrency(totalBalance)}</p>
                    <p className="text-sm text-gray-500 dark:text-slate-400 mt-1">Em {endOfPeriodFormatted}</p>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <div className="bg-white dark:bg-slate-800 p-6 rounded-lg shadow-lg">
                    <h2 className="text-xl font-semibold text-gray-800 dark:text-slate-200 mb-4">Receitas vs. Despesas ({currentPeriodLabel})</h2>
                    <div className="h-80">
                         <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={viewMode === 'monthly' ? dailyData : monthlyData}>
                                <defs>
                                    <linearGradient id="colorIncome" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#10b981" stopOpacity={0.8}/>
                                        <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                                    </linearGradient>
                                    <linearGradient id="colorExpense" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#f43f5e" stopOpacity={0.8}/>
                                        <stop offset="95%" stopColor="#f43f5e" stopOpacity={0}/>
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" stroke={gridColor} />
                                <XAxis dataKey={viewMode === 'monthly' ? "date" : "month"} stroke={textColor} tickFormatter={viewMode === 'monthly' ? (value) => `Dia ${value}` : undefined} />
                                <YAxis stroke={textColor} allowDecimals={false} tickFormatter={(value) => `${value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', minimumFractionDigits: 0, maximumFractionDigits: 0 })}`} />
                                <Tooltip contentStyle={{ backgroundColor: tooltipBg, border: `1px solid ${tooltipBorder}`, borderRadius: '0.5rem' }} formatter={(value) => formatCurrency(value as number)}/>
                                <Legend wrapperStyle={{ color: textColor }}/>
                                <Area type="monotone" dataKey="receita" name="Receitas" stroke="#10b981" fillOpacity={1} fill="url(#colorIncome)" />
                                <Area type="monotone" dataKey="despesas" name="Despesas" stroke="#f43f5e" fillOpacity={1} fill="url(#colorExpense)" />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                <div className="bg-white dark:bg-slate-800 p-6 rounded-lg shadow-lg">
                    <div className="flex justify-between items-center mb-4">
                        <h2 className="text-xl font-semibold text-gray-800 dark:text-slate-200">{pieChartTitle}</h2>
                        {selectedCategoryId && (
                            <button onClick={() => setSelectedCategoryId(null)} className="text-sm font-semibold text-sky-500 dark:text-sky-400 hover:text-sky-600 dark:hover:text-sky-300 transition-colors">
                                &larr; Voltar para Categorias
                            </button>
                        )}
                    </div>
                     <div className="h-80">
                        {pieChartData.length > 0 ? (
                            <ResponsiveContainer width="100%" height="100%">
                                <PieChart>
                                    <Pie
                                        data={pieChartData}
                                        cx="50%"
                                        cy="50%"
                                        labelLine={false}
                                        outerRadius={100}
                                        fill="#8884d8"
                                        dataKey="value"
                                        nameKey="name"
                                        label={({ name, percent }) => `${(percent * 100).toFixed(0)}%`}
                                        onClick={handlePieClick}
                                        className="cursor-pointer"
                                    >
                                        {pieChartData.map((entry, index) => (
                                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                        ))}
                                    </Pie>
                                    <Tooltip contentStyle={{ backgroundColor: tooltipBg, border: `1px solid ${tooltipBorder}`, borderRadius: '0.5rem' }} formatter={(value, name) => [formatCurrency(value as number), name]} />
                                    <Legend wrapperStyle={{ color: textColor }} />
                                </PieChart>
                            </ResponsiveContainer>
                        ) : (
                            <div className="flex items-center justify-center h-full text-gray-500 dark:text-slate-400">
                                {selectedCategoryId ? 'Nenhum dado de subcategoria para este período.' : 'Nenhum dado de despesa para este período.'}
                            </div>
                        )}
                    </div>
                </div>
            </div>

            <div className="bg-white dark:bg-slate-800 p-6 rounded-lg shadow-lg">
                <div className="flex flex-col md:flex-row justify-between md:items-center mb-4">
                    <h2 className="text-xl font-semibold text-gray-800 dark:text-slate-200">Assistente Financeiro com IA</h2>
                     <button
                        onClick={handleGetInsights}
                        disabled={isLoadingInsights || nonTransferTransactions.length === 0}
                        className="mt-4 md:mt-0 flex items-center justify-center gap-2 bg-sky-600 hover:bg-sky-700 disabled:bg-slate-400 dark:disabled:bg-slate-600 text-white font-bold py-2 px-4 rounded-lg transition-colors disabled:cursor-not-allowed"
                    >
                        <SparklesIcon className="h-5 w-5" />
                        {isLoadingInsights ? 'Analisando...' : `Obter Insights para ${currentPeriodLabel}`}
                    </button>
                </div>
                {isLoadingInsights && <div className="text-center text-gray-500 dark:text-slate-400">Gerando seu resumo financeiro...</div>}
                {insights && (
                    <div className="prose dark:prose-invert prose-p:text-gray-600 dark:prose-p:text-slate-300 prose-headings:text-gray-800 dark:prose-headings:text-slate-100 prose-strong:text-gray-900 dark:prose-strong:text-white mt-4 bg-gray-100 dark:bg-slate-700/50 p-4 rounded-md whitespace-pre-wrap">
                        {insights.split('\n').map((line, index) => {
                            if (line.startsWith('* ')) {
                                return <p key={index} className="flex items-start"><span className="mr-2 mt-1">&#8226;</span><span>{line.substring(2)}</span></p>;
                            }
                            return <p key={index}>{line}</p>
                        })}
                    </div>
                )}
                 {!insights && !isLoadingInsights && nonTransferTransactions.length > 0 && (
                    <p className="text-gray-500 dark:text-slate-400 text-center py-4">Clique no botão acima para obter insights financeiros personalizados para este período.</p>
                )}
                 {!insights && !isLoadingInsights && nonTransferTransactions.length === 0 && filteredTransactionsByDate.length > 0 && (
                     <p className="text-gray-500 dark:text-slate-400 text-center py-4">Apenas transferências foram registradas neste período. Clique para obter insights de um período diferente.</p>
                 )}
            </div>
        </div>
    );
};

export default Dashboard;
