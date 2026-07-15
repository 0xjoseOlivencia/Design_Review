import { defineConfig } from 'vite'
import path from 'path'
import react from '@vitejs/plugin-react'

const __dirname = path.resolve();

export default defineConfig({
  plugins: [
    react(),
    localizationPlugin(),
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@components': path.resolve(__dirname, './src/components'),
      '@pages': path.resolve(__dirname, './src/pages'),
      '@hooks': path.resolve(__dirname, './src/hooks'),
      '@utils': path.resolve(__dirname, './src/utils'),
      '@services': path.resolve(__dirname, './src/services'),
      '@styles': path.resolve(__dirname, './src/styles'),
      '@assets': path.resolve(__dirname, './src/assets'),
      '@config': path.resolve(__dirname, './src/config'),
    },
  },
  server: SERVER_CONFIG,
  build: BUILD_OPTIMIZATION,
  css: CSS_CONFIG,
  optimizeDeps: DEPENDENCY_OPTIMIZATION,
  esbuild: {
    target: 'es2015',
  },
  assetsInclude: ['**/*.svg', '**/*.csv'],
})

function validateEnvironment() {
  const required = ['VITE_API_URL', 'VITE_ENVIRONMENT']
  const missing = required.filter(key => !process.env[key])
  
  return {
    isValid: missing.length === 0,
    missing,
    mode: process.env.NODE_ENV || 'development',
    apiUrl: process.env.VITE_API_URL || 'http://localhost:4000',
  }
}

const env = validateEnvironment()

const BUILD_ANALYTICS = {
  enabled: process.env.VITE_ANALYZE_BUNDLE === 'true',
  thresholds: {
    warning: 500 * 1024, // 500KB
    error: 1024 * 1024,  // 1MB
  },
  exclude: ['react', 'react-dom', 'react-router-dom'],
}

const PERFORMANCE = {
  preload: true,
  prefetch: true,
  dnsPrefetch: [
    'https://fonts.googleapis.com',
    'https://cdn.jsdelivr.net',
  ],
  preconnect: [
    'https://fonts.gstatic.com',
    'https://cdn.jsdelivr.net',
  ],
}

const DEPENDENCY_OPTIMIZATION = {
  include: [
    'react',
    'react-dom',
    'react-router-dom',
    'framer-motion',
    'lucide-react',
  ],
  exclude: [],
}

const loadLocaleSystem = async () => {
  try {
    const localeModule = await import('./src/assets/locales/index.js')
    
    const { getSupportedLocales, getMessages } = localeModule
    
    const locales = getSupportedLocales()
    const messageCache = {}
    
    for (const locale of locales) {
      messageCache[locale] = getMessages(locale)
    }
    
    return {
      ...localeModule,
      messageCache,
      _initialized: true,
    }
  } catch (error) {
    return null
  }
}

const localeSystemPromise = loadLocaleSystem()

function localizationPlugin() {
  return {
    name: 'vite-plugin-localization',
    
    configureServer(server) {
      setTimeout(async () => {
        try {
          const localeSystem = await localeSystemPromise
          if (localeSystem) {
            const { getLocaleList, detectLocale } = localeSystem
            const preferredLocale = detectLocale()
            const localeList = getLocaleList()
          }
        } catch (error) {
          // Silently fail
        }
      }, 500)
    },
    
    transformIndexHtml(html) {
      const metaTags = `
    <!-- Localization Configuration -->
    <meta name="default-locale" content="en">
    <meta name="supported-locales" content="en,es,fr">
    <meta name="locale-detection" content="enabled">
    <script>
      // Preload locale system
      window.__LOCALE_CONFIG__ = {
        defaultLocale: 'en',
        supportedLocales: ['en', 'es', 'fr'],
        fallbackLocale: 'en',
      };
    </script>`
      
      return html.replace('</head>', `${metaTags}\n  </head>`)
    },
    
    generateBundle() {
      // Placeholder for locale manifest generation
    },
  }
}

const COMPRESSION = {
  gzip: true,
  brotli: true,
  minify: process.env.VITE_MINIFY !== 'false',
  target: 'es2015',
}

const CSS_CONFIG = {
  preprocessorOptions: {
    scss: {
      additionalData: `@import "@/styles/variables.scss";`,
    },
  },
  modules: {
    localsConvention: 'camelCase',
    generateScopedName: '[name]__[local]___[hash:base64:5]',
  },
}

const SERVER_CONFIG = {
  port: parseInt(process.env.VITE_DEV_PORT || '5174', 10),
  host: process.env.VITE_DEV_HOST || 'localhost',
  https: process.env.VITE_DEV_HTTPS === 'true',
  open: process.env.VITE_DEV_OPEN === 'true',
  cors: true,
  hmr: {
    overlay: true,
    timeout: 3000,
  },
  proxy: {
    '/api': {
      target: env.apiUrl,
      changeOrigin: true,
      secure: false,
      rewrite: (path) => path.replace(/^\/api/, ''),
    },
  },
}

const BUILD_OPTIMIZATION = {
  outDir: 'dist',
  assetsDir: 'assets',
  assetsInlineLimit: 4096,
  sourcemap: process.env.NODE_ENV === 'development',
  minify: COMPRESSION.minify,
  target: COMPRESSION.target,
  chunkSizeWarningLimit: 500,
  rollupOptions: {
    output: {
      manualChunks: {
        'vendor-react': ['react', 'react-dom', 'react-router-dom'],
        'vendor-motion': ['framer-motion'],
        'vendor-ui': ['lucide-react', '@radix-ui/react-dialog', '@radix-ui/react-slider'],
      },
    },
  },
  commonjsOptions: {
    include: [/node_modules/],
    extensions: ['.js', '.cjs'],
  },
}

export {
  localeSystemPromise,
  env,
  BUILD_ANALYTICS,
  PERFORMANCE,
  DEPENDENCY_OPTIMIZATION,
  COMPRESSION,
  CSS_CONFIG,
  SERVER_CONFIG,
  BUILD_OPTIMIZATION,
}