/// <reference types="vitest" />

import path from 'node:path'
import { visualizer as rollupVisualizer } from 'rollup-plugin-visualizer'
import { type PluginOption, defineConfig, loadConfigFromFile, mergeConfig } from 'vite'
import { createHtmlPlugin } from 'vite-plugin-html'
import { i18nAlly } from 'vite-plugin-i18n-ally'
import { DEV_PORT } from './src/meta'

function visualizer(): PluginOption {
  if (process.env.REPORT === 'true') {
    return rollupVisualizer({
      filename: './node_modules/.cache/visualizer/stats.html',
      open: true,
      gzipSize: true,
      brotliSize: false,
    }) as PluginOption
  }
  return undefined
}

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
    envPrefix: 'IM_',
    preview: {
      host: '0.0.0.0',
      port: DEV_PORT,
    },
    resolve: {
      alias: [{ find: '~', replacement: path.resolve(__dirname, './src') }],
    },
    plugins: [
      visualizer(),
      createHtmlPlugin({
        entry: path.resolve(__dirname, './src/webview/main.tsx'),
        minify: env.command === 'build',
      }),
      i18nAlly({
        root: __dirname,
        useVscodeI18nAllyConfig: true,
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
