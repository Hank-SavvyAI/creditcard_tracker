import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('開始新增測試資料...');

  // 新增信用卡
  const card1 = await prisma.creditCard.create({
    data: {
      name: '台新銀行 @GoGo 卡',
      nameEn: 'Taishin @GoGo Card',
      bank: '台新銀行',
      bankEn: 'Taishin Bank',
      description: '網購、行動支付最高 3.8% 回饋',
      descriptionEn: 'Up to 3.8% cashback on online shopping and mobile payments',
      isActive: true,
      benefits: {
        create: [
          {
            category: '網購回饋',
            categoryEn: 'Online Shopping',
            title: '網購通路 3.8% 回饋',
            titleEn: '3.8% cashback on online shopping',
            description: '每月需完成任務，當月一般消費達 5,000 元',
            descriptionEn: 'Complete monthly mission: spend NT$5,000 on general purchases',
            amount: 800,
            currency: 'TWD',
            frequency: 'MONTHLY',
            endMonth: 12,
            endDay: 31,
            reminderDays: 7,
            isActive: true,
          },
        ],
      },
    },
  });

  const card2 = await prisma.creditCard.create({
    data: {
      name: '國泰世華 CUBE 卡',
      nameEn: 'Cathay CUBE Card',
      bank: '國泰世華銀行',
      bankEn: 'Cathay United Bank',
      description: '自選通路 3% 回饋',
      descriptionEn: 'Select your own category for 3% cashback',
      isActive: true,
      benefits: {
        create: [
          {
            category: '自選回饋',
            categoryEn: 'Custom Category',
            title: '自選通路 3% 回饋',
            titleEn: '3% cashback on selected category',
            description: '每季可自選一個通路享 3% 回饋，上限 2,000 元',
            descriptionEn: 'Choose one category per quarter, max NT$2,000 cashback',
            amount: 2000,
            currency: 'TWD',
            frequency: 'QUARTERLY',
            endMonth: 12,
            endDay: 31,
            reminderDays: 14,
            isActive: true,
          },
        ],
      },
    },
  });

  const card3 = await prisma.creditCard.create({
    data: {
      name: '中國信託 LINE Pay 卡',
      nameEn: 'CTBC LINE Pay Card',
      bank: '中國信託',
      bankEn: 'CTBC Bank',
      description: 'LINE Pay 消費最高 5% 回饋',
      descriptionEn: 'Up to 5% cashback on LINE Pay purchases',
      isActive: true,
      benefits: {
        create: [
          {
            category: 'LINE Pay',
            categoryEn: 'LINE Pay',
            title: 'LINE Pay 5% 回饋',
            titleEn: '5% cashback on LINE Pay',
            description: 'LINE Pay 消費享 5% LINE Points 回饋',
            descriptionEn: '5% LINE Points on LINE Pay purchases',
            amount: 1000,
            currency: 'TWD',
            frequency: 'MONTHLY',
            endMonth: 12,
            endDay: 31,
            reminderDays: 7,
            isActive: true,
          },
          {
            category: '新戶禮',
            categoryEn: 'New Member Gift',
            title: '新戶首刷禮 500 點',
            titleEn: 'New member 500 points',
            description: '核卡後 60 天內首刷任意金額',
            descriptionEn: 'First purchase within 60 days of card approval',
            amount: 500,
            currency: 'TWD',
            frequency: 'ONE_TIME',
            reminderDays: 30,
            isActive: true,
          },
        ],
      },
    },
  });

  console.log('✅ 測試資料新增完成！');
  console.log(`已新增 3 張信用卡，共 4 個福利項目`);
}

main()
  .catch((e) => {
    console.error('❌ 錯誤:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
