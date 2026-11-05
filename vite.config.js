import { defineConfig } from 'vite';
export default defineConfig({server:{proxy:{'/realtime':{target:'ws://localhost:3001',ws:true}}}});
