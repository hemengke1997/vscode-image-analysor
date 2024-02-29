/// <reference types="vitest" />

import path from 'node:path'
import { defineConfig, loadConfigFromFile, mergeConfig } from 'vite'
import { createHtmlPlugin } from 'vite-plugin-html'
import { i18nDetector } from 'vite-plugin-i18n-detector'
import { DEV_PORT } from './src/meta'

export default defineConfig(async (env) => {
  const loadResult = await loadConfigFromFile(
    env,
    path.resolve(__dirname, './src/webview/ui-framework/vite.config.mts'),
  )

  const config = defineConfig({
    server: {
      host: '0.0.0.0',
      port: DEV_PORT,
      watch: {},
      hmr: {
        host: 'localhost',
        protocol: 'ws',
      },
    },
    preview: {
      host: '0.0.0.0',
      port: DEV_PORT,
    },
    resolve: {
      alias: [{ find: '~', replacement: path.resolve(__dirname, './src') }],
    },
    plugins: [
      createHtmlPlugin({
        entry: path.resolve(__dirname, './src/webview/main.tsx'),
        minify: env.command === 'build',
      }),
      i18nDetector({
        root: __dirname,
        autoDetectI18nConfig: true,
        localesPaths: [path.resolve(__dirname, './src/webview/locales')],
      }),
    ],
    build: {
      outDir: path.resolve(__dirname, './dist-webview/'),
      emptyOutDir: true,
      minify: true,
      rollupOptions: {
        treeshake: true,
        output: {
          entryFileNames: 'assets/[name].js',
          chunkFileNames: 'assets/[name].js',
          assetFileNames: 'assets/[name].[ext]',
        },
      },
    },
    test: {
      include: ['**/__test__/**/*.test.ts'],
    },
  })

  return mergeConfig(loadResult!.config, config)
})
