import React, { createContext, useContext, useState, ReactNode, useEffect } from 'react';
import { UserProfile } from '../types';
import { 
    createUserWithEmailAndPassword, 
    signInWithEmailAndPassword, 
    signOut, 
    onAuthStateChanged, 
    updateProfile,
    User
} from 'firebase/auth';
import { auth } from '../services/firebase';

interface AuthContextType {
  isAuthenticated: boolean;
  user: UserProfile | null;
  login: (email: string, pass: string) => Promise<{ success: boolean; message: string }>;
  register: (firstName: string, lastName: string, email: string, pass: string) => Promise<{ success: boolean; message: string }>;
  logout: () => void;
  changePassword: (currentPass: string, newPass: string) => Promise<{ success: boolean; message: string; }>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  // Monitorar estado de autenticação do Firebase
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
        if (firebaseUser) {
            // Extrair nome do displayName (geralmente guardamos "Nome Sobrenome")
            const [firstName, ...rest] = (firebaseUser.displayName || '').split(' ');
            const lastName = rest.join(' ');

            setUser({
                id: firebaseUser.uid,
                email: firebaseUser.email || '',
                firstName: firstName || 'Usuário',
                lastName: lastName || ''
            });
        } else {
            setUser(null);
        }
        setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const login = async (email: string, pass: string): Promise<{ success: boolean; message: string }> => {
    try {
        await signInWithEmailAndPassword(auth, email, pass);
        return { success: true, message: 'Login realizado com sucesso.' };
    } catch (error: any) {
        let msg = 'Erro ao realizar login.';
        if (error.code === 'auth/invalid-credential') msg = 'E-mail ou senha incorretos.';
        if (error.code === 'auth/user-not-found') msg = 'Usuário não encontrado.';
        if (error.code === 'auth/wrong-password') msg = 'Senha incorreta.';
        return { success: false, message: msg };
    }
  };

  const register = async (firstName: string, lastName: string, email: string, pass: string): Promise<{ success: boolean; message: string }> => {
      try {
          const userCredential = await createUserWithEmailAndPassword(auth, email, pass);
          
          // Atualizar o perfil do usuário no Firebase Auth com o nome
          await updateProfile(userCredential.user, {
              displayName: `${firstName} ${lastName}`.trim()
          });

          // Forçar atualização do estado local já que o onAuthStateChanged pode disparar antes do updateProfile
          setUser({
              id: userCredential.user.uid,
              email: email,
              firstName,
              lastName
          });

          return { success: true, message: 'Cadastro realizado com sucesso!' };
      } catch (error: any) {
          let msg = 'Erro ao cadastrar.';
          if (error.code === 'auth/email-already-in-use') msg = 'Este e-mail já está em uso.';
          if (error.code === 'auth/weak-password') msg = 'A senha é muito fraca.';
          return { success: false, message: msg };
      }
  };

  const logout = async () => {
    try {
        await signOut(auth);
    } catch (error) {
        console.error("Erro ao sair", error);
    }
  };
  
  const changePassword = async (currentPass: string, newPass: string): Promise<{ success: boolean; message: string; }> => {
    // Nota: O Firebase Auth exige re-autenticação para trocar senha em operações sensíveis,
    // ou o uso de sendPasswordResetEmail. Para manter simples aqui, retornamos um aviso.
    // Uma implementação completa exigiria a função updatePassword(user, newPass).
    return { success: false, message: 'Para alterar a senha, utilize a função "Esqueci minha senha" na tela de login.' };
  };

  return (
    <AuthContext.Provider value={{ isAuthenticated: !!user, user, login, register, logout, changePassword }}>
      {!loading && children}
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