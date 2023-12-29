import i18next from 'i18next'
import ReactDOM from 'react-dom/client'
import { initReactI18next } from 'react-i18next'
import { setupI18n } from 'vite-plugin-i18n-detector/client'
import App from './App'
import { FALLBACKLANG } from './locales'
import './styles/index.css'

const root = ReactDOM.createRoot(document.querySelector('#root') as HTMLElement)

interface IWebviewComponents {
  [componentName: string]: () => JSX.Element
}

i18next.use(initReactI18next).init({
  returnNull: false,
  react: {
    useSuspense: true,
  },
  debug: import.meta.env.DEV,
  resources: {},
  nsSeparator: '.',
  keySeparator: false,
  interpolation: {
    escapeValue: false,
  },
  lowerCaseLng: true,
  fallbackLng: FALLBACKLANG,
})

export function registerApp(webviewComponents: IWebviewComponents) {
  const vscodeEnv = window.vscodeEnv

  const lng = vscodeEnv?.language || FALLBACKLANG

  const { loadResourceByLang } = setupI18n({
    language: lng,
    onInited() {
      root.render(<App components={webviewComponents} />)
    },
    onResourceLoaded: (langs, currentLang) => {
      Object.keys(langs).forEach((ns) => {
        i18next.addResourceBundle(currentLang, ns, langs[ns], true, true)
      })
    },
    fallbackLng: FALLBACKLANG,
    cache: {
      htmlTag: true,
    },
  })

  const _changeLanguage = i18next.changeLanguage
  i18next.changeLanguage = async (lang: string, ...args) => {
    await loadResourceByLang(lang)
    return _changeLanguage(lang, ...args)
  }
}
