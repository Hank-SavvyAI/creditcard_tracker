import i18next from 'i18next';

export const initI18n = () => {
  i18next.init({
    lng: 'zh-TW',
    fallbackLng: 'en',
    resources: {
      'zh-TW': {
        translation: {
          welcome: '歡迎使用信用卡福利追蹤系統！',
          start_description: '開始使用此機器人來追蹤您的信用卡福利',
          register_success: '註冊成功！',
          card_added: '信用卡已新增',
          benefit_completed: '福利已標記為完成',
          reminder: '提醒：{{cardName}} 的 {{benefitTitle}} 將於 {{days}} 天後到期',
          commands: {
            start: '開始使用',
            mycards: '我的信用卡',
            addcard: '新增信用卡',
            benefits: '查看福利',
            complete: '標記完成',
            settings: '設定',
            language: '語言設定',
          },
        },
      },
      'en': {
        translation: {
          welcome: 'Welcome to Credit Card Benefits Tracker!',
          start_description: 'Start using this bot to track your credit card benefits',
          register_success: 'Registration successful!',
          card_added: 'Credit card added',
          benefit_completed: 'Benefit marked as completed',
          reminder: 'Reminder: {{benefitTitle}} for {{cardName}} expires in {{days}} days',
          commands: {
            start: 'Start',
            mycards: 'My Cards',
            addcard: 'Add Card',
            benefits: 'View Benefits',
            complete: 'Mark Complete',
            settings: 'Settings',
            language: 'Language',
          },
        },
      },
    },
  });

  return i18next;
};

export { i18next };
