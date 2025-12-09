import { defineConfig } from 'astro/config';
import mdx from '@astrojs/mdx';
import sitemap from '@astrojs/sitemap';

export default defineConfig({
  site: 'https://meetwork.com.tr',
  base: '/',
  output: 'static',

  vite: {
    css: {
      preprocessorOptions: {
        scss: {
          // Bootstrap gibi bağımlılıklardan gelen Sass uyarılarını bastır
          quietDeps: true,
          silenceDeprecations: [
            'import',           // @import kullanımı
            'global-builtin',   // global fonksiyonlar (örn. red(), green())
            'color-functions'   // eski color.xxx() fonksiyonları
          ]
        }
      }
    },
    build: {
      minify: 'terser',
      terserOptions: {
        compress: {
          warnings: false,
          unsafe: true,
          unsafe_math: true,
          unsafe_methods: true
        }
      }
    },
    esbuild: {
      legalComments: 'none',
      minifySyntax: true,
      minifyIdentifiers: true,
      minifyWhitespace: true,
      charset: 'utf8',
      keepNames: true,
      logOverride: {
        'unterminated-string-literal': 'warning'
      }
    }
  },

  integrations: [
    mdx(),
    sitemap()
  ]
});