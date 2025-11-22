import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  // Carrega variáveis de ambiente com base no modo (development/production)
  const env = loadEnv(mode, '.', '');
  
  return {
    plugins: [react()],
    define: {
      // Mapeia process.env.API_KEY para que funcione no código client-side
      'process.env.API_KEY': JSON.stringify(env.API_KEY)
    }
  }
})