'use client'

import { useTranslation } from 'react-i18next'
import { Heart } from 'lucide-react'

export default function Footer() {
  const { t } = useTranslation()

  return (
    <footer className="bg-gray-900 dark:bg-black text-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          <div className="col-span-1 md:col-span-2">
            <h3 className="text-2xl font-bold text-primary-400 mb-4">
              {t('footer.company')}
            </h3>
            <p className="text-gray-300 mb-6 max-w-md">
              {t('footer.description')}
            </p>
            <div className="flex items-center text-gray-400">
              <span>Made with</span>
              <Heart className="h-4 w-4 mx-1 text-red-500" />
              <span>by SavvyAIHelper Team</span>
            </div>
          </div>

          <div>
            <h4 className="text-lg font-semibold mb-4">Quick Links</h4>
            <ul className="space-y-2">
              <li>
                <a href="#home" className="text-gray-300 hover:text-primary-400 transition-colors duration-200">
                  {t('nav.home')}
                </a>
              </li>
              <li>
                <a href="#about" className="text-gray-300 hover:text-primary-400 transition-colors duration-200">
                  {t('nav.about')}
                </a>
              </li>
              <li>
                <a href="#services" className="text-gray-300 hover:text-primary-400 transition-colors duration-200">
                  {t('nav.services')}
                </a>
              </li>
              <li>
                <a href="#contact" className="text-gray-300 hover:text-primary-400 transition-colors duration-200">
                  {t('nav.contact')}
                </a>
              </li>
            </ul>
          </div>

          <div>
            <h4 className="text-lg font-semibold mb-4">Legal</h4>
            <ul className="space-y-2">
              <li>
                <a href="#" className="text-gray-300 hover:text-primary-400 transition-colors duration-200">
                  {t('footer.links.privacy')}
                </a>
              </li>
              <li>
                <a href="#" className="text-gray-300 hover:text-primary-400 transition-colors duration-200">
                  {t('footer.links.terms')}
                </a>
              </li>
              <li>
                <a href="#" className="text-gray-300 hover:text-primary-400 transition-colors duration-200">
                  {t('footer.links.support')}
                </a>
              </li>
            </ul>
          </div>
        </div>

        <div className="border-t border-gray-800 mt-8 pt-8 text-center">
          <p className="text-gray-400">
            {t('footer.copyright')}
          </p>
        </div>
      </div>
    </footer>
  )
}
