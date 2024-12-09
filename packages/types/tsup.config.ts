import { defineConfig } from 'tsup'

export default defineConfig({
  entry: {
    index: 'src/index.ts'
  },
  splitting: false,
  sourcemap: true,
  clean: true,
  dts: {
    compilerOptions: {
      composite: false,
      incremental: false
    }
  },
  format: ['esm'],
  noExternal: ['zod'],
  outDir: 'dist',
  tsconfig: './tsconfig.build.json'
})
