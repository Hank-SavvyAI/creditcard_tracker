'use client'

import { useTranslation } from 'react-i18next'
import { motion } from 'framer-motion'
import { Target, Eye } from 'lucide-react'

export default function About() {
  const { t } = useTranslation()

  return (
    <section id="about" className="py-20 bg-gray-50 dark:bg-gray-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          viewport={{ once: true }}
          className="text-center mb-16"
        >
          <h2 className="text-4xl md:text-5xl font-bold text-gray-900 dark:text-white mb-6">
            {t('about.title')}
          </h2>
          <p className="text-xl text-gray-600 dark:text-gray-300 max-w-4xl mx-auto leading-relaxed">
            {t('about.description')}
          </p>
        </motion.div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            whileInView={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6 }}
            viewport={{ once: true }}
            className="space-y-8"
          >
            <div className="bg-white dark:bg-gray-900 p-8 rounded-2xl shadow-lg">
              <div className="flex items-center mb-4">
                <Target className="h-8 w-8 text-primary-600 dark:text-primary-400 mr-3" />
                <h3 className="text-2xl font-bold text-gray-900 dark:text-white">
                  {t('about.mission')}
                </h3>
              </div>
              <p className="text-gray-600 dark:text-gray-300 leading-relaxed">
                {t('about.missionText')}
              </p>
            </div>

            <div className="bg-white dark:bg-gray-900 p-8 rounded-2xl shadow-lg">
              <div className="flex items-center mb-4">
                <Eye className="h-8 w-8 text-primary-600 dark:text-primary-400 mr-3" />
                <h3 className="text-2xl font-bold text-gray-900 dark:text-white">
                  {t('about.vision')}
                </h3>
              </div>
              <p className="text-gray-600 dark:text-gray-300 leading-relaxed">
                {t('about.visionText')}
              </p>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, x: 20 }}
            whileInView={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6 }}
            viewport={{ once: true }}
            className="relative"
          >
            <div className="bg-gradient-to-br from-primary-500 to-primary-700 rounded-2xl p-8 text-white">
              <h3 className="text-3xl font-bold mb-6">Innovation First</h3>
              <div className="space-y-4">
                <div className="flex items-center">
                  <div className="w-3 h-3 bg-white rounded-full mr-4"></div>
                  <span>AI-Powered Financial Optimization</span>
                </div>
                <div className="flex items-center">
                  <div className="w-3 h-3 bg-white rounded-full mr-4"></div>
                  <span>Real-time Credit Card Tracking</span>
                </div>
                <div className="flex items-center">
                  <div className="w-3 h-3 bg-white rounded-full mr-4"></div>
                  <span>Smart Reward Maximization</span>
                </div>
                <div className="flex items-center">
                  <div className="w-3 h-3 bg-white rounded-full mr-4"></div>
                  <span>Advanced Analytics & Insights</span>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  )
}
