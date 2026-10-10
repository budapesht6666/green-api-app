/// <reference types="vitest/config" />
import { defineConfig, type Connect, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';

/** Страница «О проекте» лежит в public/about/: отдаём её по /about/ и в dev, и в preview (как это делает веб-сервер). */
const aboutPage = (): Plugin => {
  const rewrite: Connect.NextHandleFunction = (req, _res, next) => {
    if (req.url && /^\/about\/?(\?.*)?$/.test(req.url)) req.url = '/about/index.html';
    next();
  };
  return {
    name: 'about-page',
    configureServer: (server) => void server.middlewares.use(rewrite),
    configurePreviewServer: (server) => void server.middlewares.use(rewrite),
  };
};

export default defineConfig({
  plugins: [react(), aboutPage()],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/test/setup.ts'],
  },
});
