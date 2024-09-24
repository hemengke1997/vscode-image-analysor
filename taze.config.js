import { defineConfig } from 'taze'

export default defineConfig({
  exclude: [
    '@types/vscode',
    // 解压 tar.gz 包，功能稳定，不需要更新
    'tar-fs',
    '@types/tar-fs',
    // 读取文件流，功能稳定，不需要更新
    'pump',
    '@types/pump',
    // execa@9 requires Node ^18.19.0 || >=20.5.0
    'execa',
    // optional dependencies
    '@swc/core',
  ],
  packageMode: {
    'ts-key-enum': 'patch',
  },
  force: true,
  write: true,
  install: true,
  interactive: true,
  depFields: {
    overrides: false,
  },
})
