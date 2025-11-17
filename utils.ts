import { TransactionType } from "./types";

export const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(amount);
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