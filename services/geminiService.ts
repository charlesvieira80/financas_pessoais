import { GoogleGenAI } from "@google/genai";
// FIX: Import the 'Account' type.
import { Account, Category, Transaction, TransactionType } from "../types";

const getAiClient = () => {
  const apiKey = process.env.GEMINI_API_KEY || process.env.API_KEY;
  if (!apiKey) {
    console.error("Gemini API key is not set. Please set the GEMINI_API_KEY or API_KEY environment variable.");
    return null;
  }
  return new GoogleGenAI({ apiKey });
};

export const suggestCategory = async (
  description: string,
  categories: Category[],
): Promise<{ categoryId: string; subcategoryId: string } | null> => {
  const ai = getAiClient();
  if (!ai) return null;

  // Changed from 'gemini-flash-latest' to 'gemini-2.5-flash' for better stability and quota management
  const model = 'gemini-2.5-flash';
  
  const incomeCategories = categories.filter(c => c.type === TransactionType.INCOME).map(c => c.name).join(', ');
  const expenseCategories = categories.filter(c => c.type === TransactionType.EXPENSE).map(c => c.name).join(', ');

  const prompt = `
    Com base na descrição da transação "${description}", sugira a categoria mais provável.
    
    Escolha uma das seguintes categorias de despesa: ${expenseCategories}
    Ou uma das seguintes categorias de receita: ${incomeCategories}

    Responda APENAS com o nome da categoria. Por exemplo: "Supermercado".
  `;
  try {
    const response = await ai.models.generateContent({
        model: model,
        contents: prompt
    });
    
    const suggestedCategoryName = response.text?.trim();
    if (!suggestedCategoryName) return null;

    const foundCategory = categories.find(c => c.name.toLowerCase() === suggestedCategoryName.toLowerCase());

    if (foundCategory) {
      // For simplicity, we are not suggesting a subcategory via AI yet.
      // A more advanced implementation could do a second call or a more complex prompt.
      // We'll return the category and a null subcategory, which the UI can handle.
      return { categoryId: foundCategory.id, subcategoryId: '' };
    }
    return null;
  } catch (error) {
    console.error("Error suggesting category:", error);
    return null;
  }
};

export const getFinancialInsights = async (
    transactions: Transaction[], 
    categories: Category[], 
    accounts: Account[],
    period: string
): Promise<string> => {
  const ai = getAiClient();
  if (!ai) return "A chave da API não está configurada. Por favor, configure sua chave da API Gemini.";

  // Changed from 'gemini-2.5-pro' to 'gemini-2.5-flash' to reduce quota consumption
  const model = 'gemini-2.5-flash';

  const transactionData = transactions.map(t => {
      const category = categories.find(c => c.id === t.categoryId);
      const typeTranslated = t.type === TransactionType.INCOME ? 'Receita' : 'Despesa';
      return `- ${t.description}: ${t.amount.toFixed(2)} (${typeTranslated}) na categoria '${category?.name}'`;
  }).join('\n');

  const totalIncome = transactions.filter(t => t.type === TransactionType.INCOME).reduce((sum, t) => sum + t.amount, 0);
  const totalExpense = transactions.filter(t => t.type === TransactionType.EXPENSE).reduce((sum, t) => sum + t.amount, 0);

  const prompt = `
    Você é um consultor financeiro amigável e encorajador. Analise os seguintes dados financeiros ${period} e forneça um resumo curto e de fácil leitura em português do Brasil.

    Resumo dos Dados:
    Receita Total: R$${totalIncome.toFixed(2)}
    Despesas Totais: R$${totalExpense.toFixed(2)}
    Saldo: R$${(totalIncome - totalExpense).toFixed(2)}

    Lista de Transações:
    ${transactionData.length > 0 ? transactionData : 'Nenhuma transação para este período.'}

    Sua tarefa:
    1. Comece com uma frase de abertura breve e positiva sobre a atividade financeira.
    2. Identifique as 2-3 principais categorias de gastos.
    3. Aponte uma área onde os gastos são altos e poderiam ser potencialmente reduzidos.
    4. Forneça uma dica prática e simples para melhorar a saúde financeira no próximo período.
    
    Mantenha toda a resposta com menos de 150 palavras. Formate a resposta usando markdown para facilitar a leitura (por exemplo, use listas com marcadores).
  `;

  try {
     const response = await ai.models.generateContent({
        model: model,
        contents: prompt
    });
    return response.text || "Não foi possível gerar insights.";
  } catch (error: any) {
    console.error("Error getting financial insights:", error);
    // Provide more specific feedback if possible
    if (error.message && (error.message.includes('429') || error.message.includes('quota'))) {
        return "Você excedeu a cota de uso da API Gemini. Tente novamente mais tarde.";
    }
    return "Desculpe, não consegui gerar os insights no momento. Por favor, tente novamente mais tarde.";
  }
};