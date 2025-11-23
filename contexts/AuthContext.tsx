
import React, { createContext, useContext, useState, ReactNode, useEffect } from 'react';
import { hashPassword } from '../services/cryptoService';
import { UserProfile } from '../types';

interface AuthContextType {
  isAuthenticated: boolean;
  user: UserProfile | null;
  login: (email: string, pass: string) => Promise<{ success: boolean; message: string }>;
  register: (firstName: string, lastName: string, email: string, pass: string) => Promise<{ success: boolean; message: string }>;
  logout: () => void;
  changePassword: (currentPass: string, newPass: string) => Promise<{ success: boolean; message: string; }>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Keys for our "Simulated Database" in localStorage
const DB_USERS_KEY = 'finance_db_users'; 
const SESSION_KEY = 'finance_session_user';

interface StoredUser extends UserProfile {
    passwordHash: string;
}

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<UserProfile | null>(null);

  // Initialize session from storage
  useEffect(() => {
    const sessionEmail = localStorage.getItem(SESSION_KEY);
    if (sessionEmail) {
        const usersStr = localStorage.getItem(DB_USERS_KEY);
        if (usersStr) {
            const users: StoredUser[] = JSON.parse(usersStr);
            const foundUser = users.find(u => u.email === sessionEmail);
            if (foundUser) {
                // eslint-disable-next-line @typescript-eslint/no-unused-vars
                const { passwordHash, ...profile } = foundUser;
                setUser(profile);
            }
        }
    }
  }, []);

  const getUsers = (): StoredUser[] => {
      const usersStr = localStorage.getItem(DB_USERS_KEY);
      return usersStr ? JSON.parse(usersStr) : [];
  };

  const login = async (email: string, pass: string): Promise<{ success: boolean; message: string }> => {
    const users = getUsers();
    const normalizedEmail = email.toLowerCase().trim();
    const foundUser = users.find(u => u.email === normalizedEmail);

    if (!foundUser) {
        // Fallback for legacy admin user if it exists in the old format, purely for migration
        // But for this request, we strictly enforce the new system.
        return { success: false, message: 'Usuário não encontrado.' };
    }

    const inputHash = await hashPassword(pass);
    if (foundUser.passwordHash === inputHash) {
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const { passwordHash, ...profile } = foundUser;
        setUser(profile);
        localStorage.setItem(SESSION_KEY, normalizedEmail);
        return { success: true, message: 'Login realizado com sucesso.' };
    }

    return { success: false, message: 'Senha incorreta.' };
  };

  const register = async (firstName: string, lastName: string, email: string, pass: string): Promise<{ success: boolean; message: string }> => {
      const users = getUsers();
      const normalizedEmail = email.toLowerCase().trim();

      if (users.some(u => u.email === normalizedEmail)) {
          return { success: false, message: 'Este e-mail já está cadastrado.' };
      }

      const passwordHash = await hashPassword(pass);
      
      const newUser: StoredUser = {
          id: crypto.randomUUID(),
          firstName,
          lastName,
          email: normalizedEmail,
          passwordHash
      };

      const updatedUsers = [...users, newUser];
      localStorage.setItem(DB_USERS_KEY, JSON.stringify(updatedUsers));

      // Auto login after register
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { passwordHash: _, ...profile } = newUser;
      setUser(profile);
      localStorage.setItem(SESSION_KEY, normalizedEmail);

      return { success: true, message: 'Cadastro realizado com sucesso!' };
  };

  const logout = () => {
    localStorage.removeItem(SESSION_KEY);
    setUser(null);
  };
  
  const changePassword = async (currentPass: string, newPass: string): Promise<{ success: boolean; message: string; }> => {
    if (!user) return { success: false, message: 'Usuário não autenticado.' };

    const users = getUsers();
    const userIndex = users.findIndex(u => u.email === user.email);

    if (userIndex === -1) return { success: false, message: 'Usuário não encontrado no banco de dados.' };

    const currentHash = await hashPassword(currentPass);
    if (users[userIndex].passwordHash !== currentHash) {
        return { success: false, message: 'A senha atual está incorreta.' };
    }

    const newHash = await hashPassword(newPass);
    users[userIndex].passwordHash = newHash;
    
    localStorage.setItem(DB_USERS_KEY, JSON.stringify(users));
    return { success: true, message: 'Senha alterada com sucesso!' };
  };

  return (
    <AuthContext.Provider value={{ isAuthenticated: !!user, user, login, register, logout, changePassword }}>
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
