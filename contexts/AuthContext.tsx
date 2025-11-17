import React, { createContext, useContext, useState, ReactNode, useEffect } from 'react';
import { hashPassword } from '../services/cryptoService';

interface AuthContextType {
  isAuthenticated: boolean;
  login: (user: string, pass: string) => Promise<boolean>;
  logout: () => void;
  changePassword: (currentPass: string, newPass: string) => Promise<{ success: boolean; message: string; }>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const PASSWORD_HASH_KEY = 'finance-passwordHash';
const DEFAULT_PASSWORD = 'password';

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(() => {
    return sessionStorage.getItem('isAuthenticated') === 'true';
  });

  // Set up the default password on first load if it doesn't exist
  useEffect(() => {
    const initializePassword = async () => {
      const storedHash = localStorage.getItem(PASSWORD_HASH_KEY);
      if (!storedHash) {
        const defaultHash = await hashPassword(DEFAULT_PASSWORD);
        localStorage.setItem(PASSWORD_HASH_KEY, defaultHash);
      }
    };
    initializePassword();
  }, []);

  const login = async (user: string, pass: string): Promise<boolean> => {
    const storedHash = localStorage.getItem(PASSWORD_HASH_KEY);
    // The app should have initialized the hash by now.
    if (!storedHash) {
      console.error("Password hash not found.");
      return false;
    }
    
    const inputHash = await hashPassword(pass);

    if (user === 'admin' && inputHash === storedHash) {
      sessionStorage.setItem('isAuthenticated', 'true');
      setIsAuthenticated(true);
      return true;
    }
    return false;
  };

  const logout = () => {
    sessionStorage.removeItem('isAuthenticated');
    setIsAuthenticated(false);
  };
  
  const changePassword = async (currentPass: string, newPass: string): Promise<{ success: boolean; message: string; }> => {
    const storedHash = localStorage.getItem(PASSWORD_HASH_KEY);
    if (!storedHash) {
      return { success: false, message: 'Erro: Nenhuma senha encontrada para alterar.' };
    }
    
    const currentPassHash = await hashPassword(currentPass);
    if (currentPassHash !== storedHash) {
      return { success: false, message: 'A senha atual está incorreta.' };
    }

    const newPassHash = await hashPassword(newPass);
    localStorage.setItem(PASSWORD_HASH_KEY, newPassHash);
    return { success: true, message: 'Senha alterada com sucesso!' };
  };

  return (
    <AuthContext.Provider value={{ isAuthenticated, login, logout, changePassword }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
