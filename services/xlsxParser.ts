import { read, utils } from 'xlsx';
import { TransactionType } from '../types';

export interface ParsedXLSXTransaction {
  key: string; // For React list rendering
  date: string; // ISO string
  description: string;
  amount: number;
  type: TransactionType;
  categoryFullName: string; // e.g., "Lazer / Restaurantes"
  accountName: string;
}

export const parseXLSX = (xlsxContent: ArrayBuffer): ParsedXLSXTransaction[] => {
  try {
    const workbook = read(xlsxContent, { type: 'buffer', cellDates: true });
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    
    const jsonData = utils.sheet_to_json(worksheet, {
        defval: null
    }) as any[];

    if (!jsonData || jsonData.length === 0) {
        alert("A planilha parece estar vazia ou não contém dados válidos.");
        return [];
    }

    const header = Object.keys(jsonData[0]);
    const findKey = (possibleNames: string[]) => {
        for (const name of possibleNames) {
            const key = header.find(h => h.toLowerCase().trim() === name);
            if (key) return key;
        }
        return null;
    };

    const dateKey = findKey(['data ocorrência', 'data']);
    const descKey = findKey(['descrição', 'descricao', 'description']);
    const valueKey = findKey(['valor', 'value', 'amount']);
    const catKey = findKey(['categoria', 'category']);
    const accKey = findKey(['conta', 'account']);

    const missing = [];
    if (!dateKey) missing.push('Data');
    if (!descKey) missing.push('Descrição');
    if (!valueKey) missing.push('Valor');
    if (!catKey) missing.push('Categoria');
    if (!accKey) missing.push('Conta');

    if (missing.length > 0) {
        alert(`As seguintes colunas obrigatórias não foram encontradas na planilha: ${missing.join(', ')}.`);
        return [];
    }

    const transactions: ParsedXLSXTransaction[] = [];

    for (const row of jsonData) {
        if (!row || Object.values(row).every(cell => cell === null)) {
            continue; // Skip empty rows
        }

        const dateValue = row[dateKey!];
        const descValue = row[descKey!];
        const valorRaw = row[valueKey!];

        if (!dateValue || !descValue || valorRaw === null) {
            continue; // Skip rows missing essential data
        }
        
        const valor = parseFloat(String(valorRaw).replace(',', '.'));
        if (isNaN(valor)) {
            continue; // Skip invalid rows
        }

        let date: Date;

        // The xlsx library with `cellDates: true` should return a Date object.
        // It might also be a string if the cell format is text.
        // This will parse it into a local Date object.
        const tempDate = new Date(dateValue);
        
        if (isNaN(tempDate.getTime())) {
            continue; // Skip if date is invalid.
        }
        
        // The tempDate is in the browser's local timezone. To avoid the "day before" issue,
        // we extract the year, month, and day components from this local date...
        const year = tempDate.getFullYear();
        const month = tempDate.getMonth();
        const day = tempDate.getDate();
        
        // ...and then create a new Date object at midnight UTC for that specific day.
        date = new Date(Date.UTC(year, month, day));
        
        transactions.push({
            key: crypto.randomUUID(),
            date: date.toISOString(),
            description: String(descValue).trim(),
            amount: Math.abs(valor),
            type: valor >= 0 ? TransactionType.INCOME : TransactionType.EXPENSE,
            categoryFullName: String(row[catKey!] || '').trim(),
            accountName: String(row[accKey!] || '').trim(),
        });
    }

    return transactions;
  } catch (error) {
    console.error("Error parsing XLSX file:", error);
    alert("Ocorreu um erro ao processar o arquivo. Verifique se o formato está correto.")
    return [];
  }
};