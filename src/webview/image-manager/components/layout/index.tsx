import { memo, type PropsWithChildren, useEffect, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import Logo from '~/../assets/logo.svg?react'
import { useUpdateEffect } from 'ahooks'
import { Button } from 'antd'
import { toLower } from 'lodash-es'
import { IoSettingsOutline } from 'react-icons/io5'
import { getCssVar, setHtmlTheme } from '~/webview/ui-framework/src/utils/theme'
import SettingsContext from '../../contexts/settings-context'
import useSettings from '../../hooks/use-settings/use-settings'

function Layout(props: PropsWithChildren) {
  const { children } = props
  const { i18n } = useTranslation()

  const { theme, language } = SettingsContext.usePicker(['theme', 'language'])

  const { t } = useTranslation()

  const domRef = useRef<HTMLDivElement>(null)
  useEffect(() => {
    const fontSize = getCssVar('--ant-font-size', domRef.current!).split('px')[0]
    document.documentElement.style.fontSize = `${fontSize}px`
  }, [])

  // every time the theme changes, update the html theme (for tailwindcss)
  useEffect(() => {
    setHtmlTheme(theme)
  }, [theme])

  useUpdateEffect(() => {
    i18n.changeLanguage(language)
  }, [language])

  const [showSettings] = useSettings()

  return (
    <div className={'min-w-screen min-h-screen space-y-2 p-4'} ref={domRef}>
      <header className={'mb-4 flex items-center justify-between'}>
        <Logo className='fill-ant-color-primary text-4xl' />

        <Button
          type='text'
          icon={
            <div className={'flex items-center text-2xl'}>
              <IoSettingsOutline />
            </div>
          }
          title={toLower(t('im.settings'))}
          onClick={showSettings}
        ></Button>
      </header>
      {children}
    </div>
  )
}

export default memo(Layout)