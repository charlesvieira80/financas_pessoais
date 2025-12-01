

export enum TransactionType {
  INCOME = 'Income',
  EXPENSE = 'Expense',
}

export type ActiveView = 'dashboard' | 'transactions' | 'statement' | 'balance' | 'settings';

export interface Subcategory {
  id: string;
  name: string;
  categoryId: string;
}

export interface Category {
  id: string;
  name: string;
  type: TransactionType;
}

export interface Account {
  id: string;
  name: string;
  initialBalance: number;
}

export interface Transaction {
  id: string;
  date: string; // ISO string
  description: string;
  amount: number;
  accountId: string;
  categoryId: string;
  subcategoryId: string;
  type: TransactionType;
  transferId?: string;
}

export interface UserProfile {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
}