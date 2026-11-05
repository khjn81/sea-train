import { defineConfig } from 'vite';
export default defineConfig({server:{proxy:{'/realtime':{target:`ws://127.0.0.1:${process.env.REALTIME_PORT||3001}`,ws:true}}}});
