import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
export default defineConfig({base:process.env.ADMIN_BASE||'/',plugins:[react()],server:{host:'127.0.0.1',port:3001,strictPort:true,proxy:{'/api':'http://127.0.0.1:5000','/uploads':'http://127.0.0.1:5000','/socket.io':{target:'http://127.0.0.1:5000',ws:true}}}});
