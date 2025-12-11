import React, { useState, useMemo, useCallback, useRef, useEffect } from 'react';
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, PieChart, Pie, Cell, Legend } from 'recharts';
import { Transaction, Category, Account, TransactionType, Subcategory, ActiveView } from '../types';
import { formatCurrency, formatMonthYear } from '../utils';
import { getFinancialInsights } from '../services/geminiService';
import { ChevronLeftIcon, ChevronRightIcon, SparklesIcon, FilterIcon, XIcon } from './shared/icons';
import { useTheme } from '../contexts/ThemeContext';
import { useSwipeNavigation } from '../hooks/useSwipeNavigation';

// Modern palette for charts
const COLORS = ['#8b5cf6', '#10b981', '#f59e0b', '#f43f5e', '#3b82f6', '#06b6d4', '#ec4899'];

interface DashboardProps {
    transactions: Transaction[];
    categories: Category[];
    accounts: Account[];
    subcategories: Subcategory[];
    setActiveView: (view: ActiveView) => void;
}

const Dashboard: React.FC<DashboardProps> = ({ transactions, categories, accounts, subcategories, setActiveView }) => {
    const { theme } = useTheme();
    const [insights, setInsights] = useState<string>('');
    const [isLoadingInsights, setIsLoadingInsights] = useState(false);
    const [currentDate, setCurrentDate] = useState(new Date());
    const [viewMode, setViewMode] = useState<'monthly' | 'yearly'>('monthly');
    const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null);
    
    // Filter State
    const [hiddenCategoryIds, setHiddenCategoryIds] = useState<string[]>([]);
    const [isFilterOpen, setIsFilterOpen] = useState(false);
    const filterRef = useRef<HTMLDivElement>(null);

    // Click outside to close filter menu
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (filterRef.current && !filterRef.current.contains(event.target as Node)) {
                setIsFilterOpen(false);
            }
        };
        if (isFilterOpen) {
            document.addEventListener('mousedown', handleClickOutside);
        }
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [isFilterOpen]);

    const gridColor = theme === 'dark' ? '#334155' : '#e2e8f0';
    const textColor = theme === 'dark' ? '#94a3b8' : '#64748b';
    const tooltipBg = theme === 'dark' ? '#1e293b' : '#ffffff';
    const tooltipBorder = theme === 'dark' ? '#334155' : '#e2e8f0';

    const changeMonth = (offset: number) => {
        setCurrentDate(prev => {
            const newDate = new Date(prev);
            newDate.setDate(1); 
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
    
    const toggleCategoryFilter = (categoryId: string) => {
        setHiddenCategoryIds(prev => {
            if (prev.includes(categoryId)) {
                return prev.filter(id => id !== categoryId);
            } else {
                return [...prev, categoryId];
            }
        });
    };

    const clearFilters = () => {
        setHiddenCategoryIds([]);
    };

    // 1. Filter by Date
    const filteredTransactionsByDate = useMemo(() => {
        return transactions.filter(t => {
            const tDate = new Date(t.date);
            if (viewMode === 'yearly') {
                return tDate.getUTCFullYear() === currentDate.getFullYear();
            }
            return tDate.getUTCFullYear() === currentDate.getFullYear() && tDate.getUTCMonth() === currentDate.getMonth();
        });
    }, [transactions, currentDate, viewMode]);

    // 2. Filter by Category (Hidden IDs)
    // This filtered list is used for Charts and Insights
    const filteredTransactionsVisible = useMemo(() => {
        if (hiddenCategoryIds.length === 0) return filteredTransactionsByDate;
        return filteredTransactionsByDate.filter(t => !t.categoryId || !hiddenCategoryIds.includes(t.categoryId));
    }, [filteredTransactionsByDate, hiddenCategoryIds]);

    const nonTransferTransactions = useMemo(() => {
        return filteredTransactionsVisible.filter(t => !t.transferId);
    }, [filteredTransactionsVisible]);
    
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
            const dayOfMonth = new Date(t.date).getUTCDate() - 1;
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
            const monthIndex = new Date(t.date).getUTCMonth();
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
            const dataMap = new Map<string, { id: string; name: string; value: number }>();
            nonTransferTransactions
                .filter(t => t.categoryId === selectedCategoryId && t.type === TransactionType.EXPENSE)
                .forEach(t => {
                    let subcategoryName = 'Outros';
                    let subcategoryId = `other-${selectedCategoryId}`; 

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
    
    // Total Balance Logic - Should NOT be affected by Category Filters to maintain Account Reality
    const totalBalance = useMemo(() => {
        const initialBalances = accounts.reduce((sum, acc) => sum + acc.initialBalance, 0);
        
        const endOfPeriod = viewMode === 'monthly'
            ? new Date(Date.UTC(currentDate.getFullYear(), currentDate.getMonth() + 1, 0, 23, 59, 59, 999))
            : new Date(Date.UTC(currentDate.getFullYear(), 11, 31, 23, 59, 59, 999));

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

    const handleSwipeLeft = useCallback(() => {
        if (viewMode === 'monthly') {
            changeMonth(1); // Next month
        } else {
            changeYear(1); // Next year
        }
    }, [viewMode]);
    
    const handleSwipeRight = useCallback(() => {
        if (viewMode === 'monthly') {
            changeMonth(-1); // Previous month
        } else {
            changeYear(-1); // Previous year
        }
    }, [viewMode]);

    const swipeHandlers = useSwipeNavigation({
        onSwipeLeft: handleSwipeLeft,
        onSwipeRight: handleSwipeRight,
    });


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
        : `Gastos por Categoria`;

    return (
        <div className="p-4 md:p-10 max-w-7xl mx-auto" {...swipeHandlers}>
            <header className="flex flex-col xl:flex-row xl:items-end justify-between gap-6 mb-6 md:mb-8">
                <div>
                    <h1 className="text-2xl md:text-3xl font-bold text-slate-900 dark:text-white tracking-tight">Painel Financeiro</h1>
                    <p className="text-sm md:text-base text-slate-500 dark:text-slate-400 mt-1">Visão geral do seu patrimônio e movimentações.</p>
                </div>
                
                <div className="flex flex-col sm:flex-row gap-3 w-full xl:w-auto">
                    {/* Date Navigation & View Mode */}
                    <div className="flex flex-col sm:flex-row sm:items-center gap-3 bg-white dark:bg-slate-900 p-2 md:p-1.5 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800 w-full xl:w-auto">
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

                    {/* Filter Button */}
                    <div className="relative z-20" ref={filterRef}>
                        <button 
                            onClick={() => setIsFilterOpen(!isFilterOpen)} 
                            className={`flex items-center justify-center gap-2 p-3.5 sm:px-5 rounded-2xl border font-semibold transition-all w-full sm:w-auto h-full ${
                                isFilterOpen || hiddenCategoryIds.length > 0
                                ? 'bg-violet-600 text-white border-violet-600 shadow-lg shadow-violet-500/30' 
                                : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800'
                            }`}
                        >
                            <FilterIcon className="w-5 h-5" />
                            <span className="hidden sm:inline">Categorias</span>
                            {hiddenCategoryIds.length > 0 && (
                                <span className="flex items-center justify-center w-5 h-5 bg-white text-violet-600 rounded-full text-xs font-bold">
                                    {categories.length - hiddenCategoryIds.length}
                                </span>
                            )}
                        </button>

                        {/* Dropdown Menu */}
                        {isFilterOpen && (
                            <div className="absolute right-0 top-full mt-2 w-72 bg-white dark:bg-slate-900 rounded-2xl shadow-xl border border-slate-100 dark:border-slate-800 overflow-hidden animate-content-in origin-top-right">
                                <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center">
                                    <h3 className="font-bold text-slate-800 dark:text-white text-sm">Filtrar Visualização</h3>
                                    {hiddenCategoryIds.length > 0 && (
                                        <button onClick={clearFilters} className="text-xs font-semibold text-rose-500 hover:text-rose-600">
                                            Limpar
                                        </button>
                                    )}
                                </div>
                                <div className="max-h-64 overflow-y-auto p-2">
                                    {categories.map(cat => (
                                        <label key={cat.id} className="flex items-center gap-3 p-2.5 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer transition-colors">
                                            <div className={`w-5 h-5 rounded-md border flex items-center justify-center transition-colors ${
                                                !hiddenCategoryIds.includes(cat.id) 
                                                ? 'bg-violet-600 border-violet-600' 
                                                : 'border-slate-300 dark:border-slate-600'
                                            }`}>
                                                {!hiddenCategoryIds.includes(cat.id) && (
                                                    <svg className="w-3.5 h-3.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                                                    </svg>
                                                )}
                                            </div>
                                            <input 
                                                type="checkbox" 
                                                className="hidden" 
                                                checked={!hiddenCategoryIds.includes(cat.id)}
                                                onChange={() => toggleCategoryFilter(cat.id)}
                                            />
                                            <span className={`text-sm font-medium ${!hiddenCategoryIds.includes(cat.id) ? 'text-slate-800 dark:text-white' : 'text-slate-400 dark:text-slate-500 line-through'}`}>
                                                {cat.name}
                                            </span>
                                        </label>
                                    ))}
                                    {categories.length === 0 && (
                                        <p className="text-xs text-center text-slate-400 p-2">Nenhuma categoria encontrada.</p>
                                    )}
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </header>
            
            <div key={currentDate.toISOString()} className="space-y-6 md:space-y-8 animate-content-in">
                {/* Total Balance Card */}
                <div
                    onClick={() => setActiveView('balance')}
                    className="relative overflow-hidden bg-white dark:bg-slate-900 p-6 md:p-8 rounded-3xl shadow-xl shadow-slate-200/50 dark:shadow-none border border-slate-100 dark:border-slate-800 group cursor-pointer transition-all duration-300 hover:shadow-2xl hover:-translate-y-1"
                    role="button"
                    tabIndex={0}
                    aria-label="Ver detalhes do saldo"
                >
                     <div className="absolute top-0 right-0 -mt-4 -mr-4 w-24 h-24 md:w-32 md:h-32 bg-violet-50 dark:bg-violet-900/20 rounded-full blur-3xl group-hover:bg-violet-100 dark:group-hover:bg-violet-900/30 transition-colors duration-500"></div>
                    <h2 className="relative text-xs md:text-sm font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">Saldo Total Acumulado</h2>
                    <div className="relative flex items-baseline gap-2 flex-wrap">
                        <span className="text-4xl sm:text-5xl md:text-6xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-slate-900 to-slate-700 dark:from-white dark:to-slate-300 break-all">
                            {formatCurrency(totalBalance)}
                        </span>
                    </div>
                    <p className="relative mt-3 text-xs md:text-sm font-medium text-slate-400 dark:text-slate-500 flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                        Atualizado em {endOfPeriodFormatted}
                    </p>
                </div>

                {hiddenCategoryIds.length > 0 && (
                     <div className="flex items-center gap-2 px-4 py-2 bg-amber-50 dark:bg-amber-900/20 text-amber-800 dark:text-amber-200 rounded-xl text-sm border border-amber-100 dark:border-amber-900/30">
                        <FilterIcon className="w-4 h-4" />
                        <span>Visualizando dados parciais. {categories.length - hiddenCategoryIds.length} de {categories.length} categorias selecionadas.</span>
                    </div>
                )}

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 md:gap-8">
                    {/* Area Chart */}
                    <div className="bg-white dark:bg-slate-900 p-4 md:p-6 rounded-2xl shadow-lg shadow-slate-200/50 dark:shadow-none border border-slate-100 dark:border-slate-800">
                        <div className="mb-6">
                            <h2 className="text-lg font-bold text-slate-800 dark:text-slate-100">Fluxo de Caixa</h2>
                            <p className="text-sm text-slate-500 dark:text-slate-400">Entradas vs Saídas em {currentPeriodLabel}</p>
                        </div>
                        <div className="h-64 md:h-80 w-full -ml-2 md:ml-0">
                             <ResponsiveContainer width="100%" height="100%">
                                <AreaChart data={viewMode === 'monthly' ? dailyData : monthlyData}>
                                    <defs>
                                        <linearGradient id="colorIncome" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/>
                                            <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                                        </linearGradient>
                                        <linearGradient id="colorExpense" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="#f43f5e" stopOpacity={0.3}/>
                                            <stop offset="95%" stopColor="#f43f5e" stopOpacity={0}/>
                                        </linearGradient>
                                    </defs>
                                    <CartesianGrid strokeDasharray="3 3" stroke={gridColor} vertical={false} />
                                    <XAxis 
                                        dataKey={viewMode === 'monthly' ? "date" : "month"} 
                                        stroke={textColor} 
                                        tick={{fontSize: 11}}
                                        tickLine={false}
                                        axisLine={false}
                                        tickMargin={10}
                                        tickFormatter={viewMode === 'monthly' ? (value) => `${value}` : undefined} 
                                    />
                                    <YAxis 
                                        stroke={textColor} 
                                        allowDecimals={false} 
                                        tick={{fontSize: 11}}
                                        tickLine={false}
                                        axisLine={false}
                                        tickFormatter={(value) => `${(value / 1000).toFixed(0)}k`}
                                        width={40}
                                    />
                                    <Tooltip 
                                        contentStyle={{ backgroundColor: tooltipBg, borderColor: tooltipBorder, borderRadius: '12px', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' }} 
                                        formatter={(value) => formatCurrency(value as number)}
                                        labelStyle={{ color: textColor, fontWeight: 'bold', marginBottom: '4px' }}
                                    />
                                    <Legend wrapperStyle={{ paddingTop: '20px', fontSize: '12px' }} iconType="circle" />
                                    <Area type="monotone" dataKey="receita" name="Receitas" stroke="#10b981" strokeWidth={3} fillOpacity={1} fill="url(#colorIncome)" activeDot={{ r: 6, strokeWidth: 0 }} />
                                    <Area type="monotone" dataKey="despesas" name="Despesas" stroke="#f43f5e" strokeWidth={3} fillOpacity={1} fill="url(#colorExpense)" activeDot={{ r: 6, strokeWidth: 0 }} />
                                </AreaChart>
                            </ResponsiveContainer>
                        </div>
                    </div>

                    {/* Pie Chart */}
                    <div className="bg-white dark:bg-slate-900 p-4 md:p-6 rounded-2xl shadow-lg shadow-slate-200/50 dark:shadow-none border border-slate-100 dark:border-slate-800">
                        <div className="flex flex-col sm:flex-row justify-between items-start mb-6 gap-2">
                            <div>
                                <h2 className="text-lg font-bold text-slate-800 dark:text-slate-100">{pieChartTitle}</h2>
                                <p className="text-sm text-slate-500 dark:text-slate-400">Distribuição de despesas</p>
                            </div>
                            {selectedCategoryId && (
                                <button onClick={() => setSelectedCategoryId(null)} className="text-xs font-semibold text-violet-600 dark:text-violet-400 bg-violet-50 dark:bg-violet-900/30 px-3 py-1 rounded-full hover:bg-violet-100 transition-colors self-start">
                                    &larr; Voltar
                                </button>
                            )}
                        </div>
                         <div className="h-64 md:h-80 w-full relative">
                            {pieChartData.length > 0 ? (
                                <ResponsiveContainer width="100%" height="100%">
                                    <PieChart>
                                        <Pie
                                            data={pieChartData}
                                            cx="50%"
                                            cy="50%"
                                            innerRadius={60}
                                            outerRadius={80}
                                            paddingAngle={5}
                                            dataKey="value"
                                            nameKey="name"
                                            stroke="none"
                                            onClick={handlePieClick}
                                            className="cursor-pointer focus:outline-none"
                                        >
                                            {pieChartData.map((entry, index) => (
                                                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} className="stroke-white dark:stroke-slate-900 stroke-2" />
                                            ))}
                                        </Pie>
                                        <Tooltip 
                                            contentStyle={{ backgroundColor: tooltipBg, borderColor: tooltipBorder, borderRadius: '12px', boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)' }} 
                                            itemStyle={{ color: textColor }}
                                            formatter={(value, name) => [formatCurrency(value as number), name]} 
                                        />
                                        <Legend 
                                            layout="vertical" 
                                            verticalAlign="middle" 
                                            align="right"
                                            iconType="circle"
                                            wrapperStyle={{ color: textColor, fontSize: '11px', maxWidth: '100px' }}
                                        />
                                    </PieChart>
                                </ResponsiveContainer>
                            ) : (
                                <div className="absolute inset-0 flex flex-col items-center justify-center text-slate-400 dark:text-slate-500">
                                    <div className="p-4 bg-slate-50 dark:bg-slate-800 rounded-full mb-3">
                                        <SparklesIcon className="w-8 h-8 opacity-50" />
                                    </div>
                                    <p className="text-sm">Sem dados para exibir</p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* AI Insights Section */}
                <div className="relative bg-gradient-to-br from-slate-900 to-violet-900 dark:from-slate-800 dark:to-violet-950 p-1 rounded-3xl shadow-xl">
                    <div className="bg-white/5 dark:bg-slate-900/50 backdrop-blur-sm p-6 md:p-8 rounded-[20px] text-white h-full">
                        <div className="flex flex-col md:flex-row justify-between md:items-center mb-6 gap-6">
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-gradient-to-br from-amber-400 to-orange-500 rounded-lg shadow-lg shadow-orange-500/20">
                                    <SparklesIcon className="h-6 w-6 text-white" />
                                </div>
                                <div>
                                    <h2 className="text-xl font-bold">Assistente Financeiro</h2>
                                    <p className="text-slate-300 text-sm">Análise inteligente baseada em IA.</p>
                                </div>
                            </div>
                             <button
                                onClick={handleGetInsights}
                                disabled={isLoadingInsights || nonTransferTransactions.length === 0}
                                className="w-full md:w-auto group relative overflow-hidden bg-white text-violet-900 hover:text-white font-bold py-3 px-6 rounded-xl transition-all duration-300 shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                <span className="absolute inset-0 w-full h-full bg-violet-600 scale-x-0 group-hover:scale-x-100 transition-transform duration-300 origin-left"></span>
                                <span className="relative flex items-center justify-center gap-2">
                                    {isLoadingInsights ? (
                                        <>
                                            <div className="w-4 h-4 border-2 border-violet-900/30 border-t-violet-900 rounded-full animate-spin"></div>
                                            <span>Processando...</span>
                                        </>
                                    ) : (
                                        <>
                                            <SparklesIcon className="h-4 w-4" />
                                            <span>Gerar Insights</span>
                                        </>
                                    )}
                                </span>
                            </button>
                        </div>
                        
                        <div className="min-h-[100px] bg-black/20 rounded-xl p-6 backdrop-blur-md border border-white/10">
                            {insights ? (
                                <div className="prose prose-invert max-w-none prose-p:text-slate-200 prose-headings:text-white prose-strong:text-amber-300 text-sm md:text-base">
                                    {insights.split('\n').map((line, index) => {
                                        if (line.startsWith('* ')) {
                                            return <p key={index} className="flex items-start gap-2 mb-2"><span className="text-amber-400 mt-1.5 w-1.5 h-1.5 rounded-full bg-amber-400 block flex-shrink-0"></span><span>{line.substring(2)}</span></p>;
                                        }
                                        return <p key={index} className="mb-2 leading-relaxed">{line}</p>
                                    })}
                                </div>
                            ) : (
                                <div className="h-full flex flex-col items-center justify-center text-slate-400 py-4 text-center">
                                    {isLoadingInsights ? (
                                        <p className="animate-pulse">A IA está analisando suas finanças...</p>
                                    ) : nonTransferTransactions.length === 0 && filteredTransactionsByDate.length > 0 ? (
                                        <p>Apenas transferências ou categorias ocultas. Ajuste os filtros para ver análises.</p>
                                    ) : nonTransferTransactions.length > 0 ? (
                                        <p>Clique no botão acima para descobrir oportunidades de economia.</p>
                                    ) : (
                                        <p>Nenhuma transação registrada neste período.</p>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Dashboard;