'use client'

import { useTranslation } from 'react-i18next'
import { motion } from 'framer-motion'
import { Brain, TrendingUp, Bell, BarChart3 } from 'lucide-react'

export default function Features() {
  const { t } = useTranslation()

  const features = [
    {
      icon: Brain,
      key: 'ai_optimization',
    },
    {
      icon: TrendingUp,
      key: 'real_time_tracking',
    },
    {
      icon: Bell,
      key: 'smart_reminders',
    },
    {
      icon: BarChart3,
      key: 'analytics',
    },
  ]

  return (
    <section id="services" className="py-20 bg-white dark:bg-gray-900">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          viewport={{ once: true }}
          className="text-center mb-16"
        >
          <h2 className="text-4xl md:text-5xl font-bold text-gray-900 dark:text-white mb-6">
            {t('features.title')}
          </h2>
          <p className="text-xl text-gray-600 dark:text-gray-300 max-w-3xl mx-auto">
            {t('features.subtitle')}
          </p>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          {features.map((feature, index) => {
            const Icon = feature.icon
            return (
              <motion.div
                key={feature.key}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: index * 0.1 }}
                viewport={{ once: true }}
                className="bg-gray-50 dark:bg-gray-800 p-8 rounded-2xl hover:shadow-lg transition-shadow duration-300"
              >
                <div className="w-12 h-12 bg-primary-100 dark:bg-primary-900 rounded-lg flex items-center justify-center mb-6">
                  <Icon className="h-6 w-6 text-primary-600 dark:text-primary-400" />
                </div>
                <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
                  {t(`features.items.${feature.key}.title`)}
                </h3>
                <p className="text-gray-600 dark:text-gray-300 leading-relaxed">
                  {t(`features.items.${feature.key}.description`)}
                </p>
              </motion.div>
            )
          })}
        </div>
      </div>
    </section>
  )
}
