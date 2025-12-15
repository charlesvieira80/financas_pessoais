import { TransactionType } from "./types";

export const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(amount);
};

// Formats a number to "0,00" style string for inputs
export const formatCurrencyInput = (amount: number) => {
    return amount.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
};

// Parses a string input (e.g. "0,056") extracting digits and returning the float value
export const parseCurrencyInput = (value: string): number => {
    // Remove all non-numeric characters
    const digits = value.replace(/\D/g, "");
    // Divide by 100 to shift decimals
    return Number(digits) / 100;
};

export const formatDate = (dateString: string) => {
  return new Date(dateString).toLocaleDateString('pt-BR', {
    timeZone: 'UTC', // Ensure date is not shifted by timezone
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
};

export const formatMonthYear = (date: Date) => {
    return date.toLocaleString('pt-BR', { month: 'long', year: 'numeric' });
}

export const translateTransactionType = (type: TransactionType): string => {
    switch (type) {
        case TransactionType.INCOME:
            return 'Receita';
        case TransactionType.EXPENSE:
            return 'Despesa';
        default:
            return type;
    }
}