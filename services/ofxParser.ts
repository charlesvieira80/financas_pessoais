import { TransactionType } from '../types';

export interface ParsedTransaction {
  date: string; // ISO string
  description: string;
  amount: number;
  type: TransactionType;
}

// A simple parser for OFX files. This is not a comprehensive implementation
// and focuses on the most common tags for bank statements.
export const parseOFX = (ofxContent: string): ParsedTransaction[] => {
  const transactions: ParsedTransaction[] = [];
  
  // Normalize CCSTMTTRN to STMTTRN to handle credit card statements
  const normalizedContent = ofxContent.replace(/<CCSTMTTRN>/g, '<STMTTRN>').replace(/<\/CCSTMTTRN>/g, '</STMTTRN>');

  // Find the list of transactions
  const transactionListMatch = normalizedContent.match(/<BANKTRANLIST>([\s\S]*?)<\/BANKTRANLIST>/);
  if (!transactionListMatch && !normalizedContent.includes('<STMTTRN>')) {
      return [];
  }

  // Split content into individual transaction blocks
  const transactionBlocks = normalizedContent.split('<STMTTRN>');

  // The first element is before the first transaction, so skip it
  for (let i = 1; i < transactionBlocks.length; i++) {
    const block = transactionBlocks[i];
    
    const typeMatch = block.match(/<TRNTYPE>([^<]+)/);
    const dateMatch = block.match(/<DTPOSTED>([^<]+)/);
    const amountMatch = block.match(/<TRNAMT>([^<]+)/);
    const memoMatch = block.match(/<MEMO>([^<]+)/);
    
    if (dateMatch && amountMatch && memoMatch) {
      const amount = parseFloat(amountMatch[1].trim());
      
      let transactionType: TransactionType;
      if (typeMatch) {
          transactionType = typeMatch[1].trim().toUpperCase() === 'CREDIT' ? TransactionType.INCOME : TransactionType.EXPENSE;
      } else {
          // Fallback to amount sign if TRNTYPE is not present
          transactionType = amount >= 0 ? TransactionType.INCOME : TransactionType.EXPENSE;
      }
      
      // OFX amounts can be negative for debits. We store all as positive.
      const finalAmount = Math.abs(amount);

      // OFX dates are YYYYMMDDHHMMSS or YYYYMMDD
      const dateStr = dateMatch[1].substring(0, 8);
      const year = parseInt(dateStr.substring(0, 4), 10);
      const month = parseInt(dateStr.substring(4, 6), 10) - 1; // Month is 0-indexed
      const day = parseInt(dateStr.substring(6, 8), 10);
      const date = new Date(Date.UTC(year, month, day));

      transactions.push({
        date: date.toISOString(),
        description: memoMatch[1].trim(),
        amount: finalAmount,
        type: transactionType,
      });
    }
  }

  return transactions;
};