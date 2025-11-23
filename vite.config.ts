import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  // Carrega variáveis de ambiente com base no modo (development/production)
  // O terceiro argumento '' garante que carregamos TODAS as variáveis, não apenas as com prefixo VITE_
  const env = loadEnv(mode, '.', '');
  
  return {
    plugins: [react()],
    define: {
      // Define o objeto process.env globalmente com as variáveis carregadas.
      // Isso substitui o uso de process.env no código pelo objeto literal contendo as chaves.
      'process.env': env
    }
  }
})