-- American Express USA Credit Cards

-- 1. The Platinum Card from American Express
INSERT INTO CreditCard (name, nameEn, bank, bankEn, issuer, region, description, descriptionEn, isActive, createdAt, updatedAt)
VALUES (
  'American Express 白金卡',
  'The Platinum Card® from American Express',
  'American Express',
  'American Express',
  'American Express',
  'america',
  '頂級旅行信用卡，提供機場貴賓室、酒店優惠和多項旅行福利',
  'Premium travel card with airport lounge access, hotel benefits, and travel perks',
  1,
  datetime('now'),
  datetime('now')
);

-- 2. American Express Gold Card
INSERT INTO CreditCard (name, nameEn, bank, bankEn, issuer, region, description, descriptionEn, isActive, createdAt, updatedAt)
VALUES (
  'American Express 金卡',
  'American Express® Gold Card',
  'American Express',
  'American Express',
  'American Express',
  'america',
  '餐廳和超市消費最佳選擇，享4倍積分回饋',
  'Best for dining and groceries with 4x points rewards',
  1,
  datetime('now'),
  datetime('now')
);

-- 3. Blue Cash Preferred Card
INSERT INTO CreditCard (name, nameEn, bank, bankEn, issuer, region, description, descriptionEn, isActive, createdAt, updatedAt)
VALUES (
  'American Express 藍色現金優選卡',
  'Blue Cash Preferred® Card from American Express',
  'American Express',
  'American Express',
  'American Express',
  'america',
  '超市和串流媒體消費最高6%現金回饋',
  'Up to 6% cash back on groceries and streaming services',
  1,
  datetime('now'),
  datetime('now')
);

-- 4. Blue Cash Everyday Card
INSERT INTO CreditCard (name, nameEn, bank, bankEn, issuer, region, description, descriptionEn, isActive, createdAt, updatedAt)
VALUES (
  'American Express 藍色現金天天卡',
  'Blue Cash Everyday® Card from American Express',
  'American Express',
  'American Express',
  'American Express',
  'america',
  '無年費現金回饋卡，超市消費3%回饋',
  'No annual fee cash back card with 3% on groceries',
  1,
  datetime('now'),
  datetime('now')
);

-- 5. American Express Business Gold Card
INSERT INTO CreditCard (name, nameEn, bank, bankEn, issuer, region, description, descriptionEn, isActive, createdAt, updatedAt)
VALUES (
  'American Express 商務金卡',
  'American Express® Business Gold Card',
  'American Express',
  'American Express',
  'American Express',
  'america',
  '商務消費最佳選擇，前兩大類別4倍積分',
  'Best for business spending with 4x points on top 2 categories',
  1,
  datetime('now'),
  datetime('now')
);

-- 6. The Business Platinum Card
INSERT INTO CreditCard (name, nameEn, bank, bankEn, issuer, region, description, descriptionEn, isActive, createdAt, updatedAt)
VALUES (
  'American Express 商務白金卡',
  'The Business Platinum Card® from American Express',
  'American Express',
  'American Express',
  'American Express',
  'america',
  '商務旅行頂級卡，提供飯店會籍和旅行福利',
  'Premium business travel card with hotel elite status and travel benefits',
  1,
  datetime('now'),
  datetime('now')
);

-- Benefits for Platinum Card (ID will be determined after insert)
-- Airport lounge access
INSERT INTO Benefit (cardId, category, categoryEn, title, titleEn, description, descriptionEn, amount, currency, frequency, endMonth, endDay, reminderDays, isActive, createdAt, updatedAt)
VALUES (
  (SELECT id FROM CreditCard WHERE nameEn = 'The Platinum Card® from American Express'),
  '機場貴賓室',
  'Airport Lounge',
  '全球機場貴賓室通行證',
  'Global Airport Lounge Access',
  '進入1,550+間機場貴賓室，包括Priority Pass和Centurion Lounge',
  'Access to 1,550+ airport lounges including Priority Pass and Centurion Lounges',
  NULL,
  'USD',
  'YEARLY',
  12,
  31,
  30,
  1,
  datetime('now'),
  datetime('now')
);

-- Hotel credits
INSERT INTO Benefit (cardId, category, categoryEn, title, titleEn, description, descriptionEn, amount, currency, frequency, endMonth, endDay, reminderDays, isActive, createdAt, updatedAt)
VALUES (
  (SELECT id FROM CreditCard WHERE nameEn = 'The Platinum Card® from American Express'),
  '酒店優惠',
  'Hotel Credit',
  '酒店預訂回饋最高$600',
  'Up to $600 in Hotel Credits',
  '每半年最高$300酒店預訂回饋（總計每年$600）',
  'Up to $300 semi-annually for hotel bookings (total $600 per year)',
  600,
  'USD',
  'YEARLY',
  12,
  31,
  30,
  1,
  datetime('now'),
  datetime('now')
);

-- Streaming credits
INSERT INTO Benefit (cardId, category, categoryEn, title, titleEn, description, descriptionEn, amount, currency, frequency, endMonth, endDay, reminderDays, isActive, createdAt, updatedAt)
VALUES (
  (SELECT id FROM CreditCard WHERE nameEn = 'The Platinum Card® from American Express'),
  '串流媒體',
  'Streaming Credit',
  '串流服務每月回饋$25',
  'Up to $25 Monthly Streaming Credits',
  'Disney+, Hulu, Peacock等串流服務每月最高$25回饋',
  'Up to $25 per month on streaming services like Disney+, Hulu, Peacock',
  300,
  'USD',
  'YEARLY',
  12,
  31,
  7,
  1,
  datetime('now'),
  datetime('now')
);

-- Benefits for Gold Card
-- Dining rewards
INSERT INTO Benefit (cardId, category, categoryEn, title, titleEn, description, descriptionEn, amount, currency, frequency, endMonth, endDay, reminderDays, isActive, createdAt, updatedAt)
VALUES (
  (SELECT id FROM CreditCard WHERE nameEn = 'American Express® Gold Card'),
  '餐廳回饋',
  'Dining Rewards',
  '餐廳消費4倍積分',
  '4x Points on Dining',
  '在餐廳消費每$1獲得4倍Membership Rewards積分',
  '4 Membership Rewards points per $1 spent at restaurants',
  NULL,
  'USD',
  'YEARLY',
  12,
  31,
  30,
  1,
  datetime('now'),
  datetime('now')
);

-- Grocery rewards
INSERT INTO Benefit (cardId, category, categoryEn, title, titleEn, description, descriptionEn, amount, currency, frequency, endMonth, endDay, reminderDays, isActive, createdAt, updatedAt)
VALUES (
  (SELECT id FROM CreditCard WHERE nameEn = 'American Express® Gold Card'),
  '超市回饋',
  'Grocery Rewards',
  '超市消費4倍積分',
  '4x Points on Groceries',
  '美國超市消費每$1獲得4倍積分（年度上限$25,000）',
  '4 points per $1 at U.S. supermarkets (up to $25,000 per year)',
  NULL,
  'USD',
  'YEARLY',
  12,
  31,
  30,
  1,
  datetime('now'),
  datetime('now')
);

-- Dining credits
INSERT INTO Benefit (cardId, category, categoryEn, title, titleEn, description, descriptionEn, amount, currency, frequency, endMonth, endDay, reminderDays, isActive, createdAt, updatedAt)
VALUES (
  (SELECT id FROM CreditCard WHERE nameEn = 'American Express® Gold Card'),
  '餐飲回饋',
  'Dining Credit',
  '年度餐飲回饋$120',
  'Up to $120 Annual Dining Credit',
  '符合條件的餐飲消費每年最高$120回饋（每月$10）',
  'Up to $120 per year in dining credits (monthly increments)',
  120,
  'USD',
  'YEARLY',
  12,
  31,
  7,
  1,
  datetime('now'),
  datetime('now')
);

-- Benefits for Blue Cash Preferred
-- Grocery cashback
INSERT INTO Benefit (cardId, category, categoryEn, title, titleEn, description, descriptionEn, amount, currency, frequency, endMonth, endDay, reminderDays, isActive, createdAt, updatedAt)
VALUES (
  (SELECT id FROM CreditCard WHERE nameEn = 'Blue Cash Preferred® Card from American Express'),
  '超市現金回饋',
  'Grocery Cashback',
  '超市6%現金回饋',
  '6% Cash Back on Groceries',
  '美國超市消費6%現金回饋（年度上限$6,000）',
  '6% cash back at U.S. supermarkets (up to $6,000 per year)',
  NULL,
  'USD',
  'YEARLY',
  12,
  31,
  30,
  1,
  datetime('now'),
  datetime('now')
);

-- Streaming cashback
INSERT INTO Benefit (cardId, category, categoryEn, title, titleEn, description, descriptionEn, amount, currency, frequency, endMonth, endDay, reminderDays, isActive, createdAt, updatedAt)
VALUES (
  (SELECT id FROM CreditCard WHERE nameEn = 'Blue Cash Preferred® Card from American Express'),
  '串流媒體回饋',
  'Streaming Cashback',
  '串流服務6%現金回饋',
  '6% Cash Back on Streaming',
  'Disney+, Hulu, Netflix等串流服務6%現金回饋',
  '6% cash back on streaming services like Disney+, Hulu, Netflix',
  NULL,
  'USD',
  'YEARLY',
  12,
  31,
  30,
  1,
  datetime('now'),
  datetime('now')
);

-- Gas cashback
INSERT INTO Benefit (cardId, category, categoryEn, title, titleEn, description, descriptionEn, amount, currency, frequency, endMonth, endDay, reminderDays, isActive, createdAt, updatedAt)
VALUES (
  (SELECT id FROM CreditCard WHERE nameEn = 'Blue Cash Preferred® Card from American Express'),
  '加油現金回饋',
  'Gas Cashback',
  '加油站3%現金回饋',
  '3% Cash Back on Gas',
  '美國加油站消費3%現金回饋（年度上限$6,000）',
  '3% cash back at U.S. gas stations (up to $6,000 per year)',
  NULL,
  'USD',
  'YEARLY',
  12,
  31,
  30,
  1,
  datetime('now'),
  datetime('now')
);

-- Benefits for Blue Cash Everyday
-- Grocery cashback
INSERT INTO Benefit (cardId, category, categoryEn, title, titleEn, description, descriptionEn, amount, currency, frequency, endMonth, endDay, reminderDays, isActive, createdAt, updatedAt)
VALUES (
  (SELECT id FROM CreditCard WHERE nameEn = 'Blue Cash Everyday® Card from American Express'),
  '超市現金回饋',
  'Grocery Cashback',
  '超市3%現金回饋',
  '3% Cash Back on Groceries',
  '美國超市消費3%現金回饋（年度上限$6,000）',
  '3% cash back at U.S. supermarkets (up to $6,000 per year)',
  NULL,
  'USD',
  'YEARLY',
  12,
  31,
  30,
  1,
  datetime('now'),
  datetime('now')
);

-- Gas cashback
INSERT INTO Benefit (cardId, category, categoryEn, title, titleEn, description, descriptionEn, amount, currency, frequency, endMonth, endDay, reminderDays, isActive, createdAt, updatedAt)
VALUES (
  (SELECT id FROM CreditCard WHERE nameEn = 'Blue Cash Everyday® Card from American Express'),
  '加油現金回饋',
  'Gas Cashback',
  '加油站2%現金回饋',
  '2% Cash Back on Gas',
  '美國加油站消費2%現金回饋',
  '2% cash back at U.S. gas stations',
  NULL,
  'USD',
  'YEARLY',
  12,
  31,
  30,
  1,
  datetime('now'),
  datetime('now')
);

-- Benefits for Business Gold Card
-- Category rewards
INSERT INTO Benefit (cardId, category, categoryEn, title, titleEn, description, descriptionEn, amount, currency, frequency, endMonth, endDay, reminderDays, isActive, createdAt, updatedAt)
VALUES (
  (SELECT id FROM CreditCard WHERE nameEn = 'American Express® Business Gold Card'),
  '商務消費回饋',
  'Business Spending Rewards',
  '前兩大類別4倍積分',
  '4x Points on Top 2 Categories',
  '每個帳單週期前兩大消費類別4倍積分（年度前$150,000）',
  '4 points per dollar in top 2 spending categories each billing cycle (first $150,000 per year)',
  NULL,
  'USD',
  'YEARLY',
  12,
  31,
  30,
  1,
  datetime('now'),
  datetime('now')
);

-- Benefits for Business Platinum Card
-- Hotel elite status
INSERT INTO Benefit (cardId, category, categoryEn, title, titleEn, description, descriptionEn, amount, currency, frequency, endMonth, endDay, reminderDays, isActive, createdAt, updatedAt)
VALUES (
  (SELECT id FROM CreditCard WHERE nameEn = 'The Business Platinum Card® from American Express'),
  '飯店會籍',
  'Hotel Elite Status',
  'Hilton和Marriott金卡會籍',
  'Hilton Honors and Marriott Bonvoy Gold Elite Status',
  '自動獲得Hilton Honors和Marriott Bonvoy金卡會籍',
  'Automatic Hilton Honors and Marriott Bonvoy Gold elite status',
  NULL,
  'USD',
  'YEARLY',
  12,
  31,
  30,
  1,
  datetime('now'),
  datetime('now')
);

-- Flight rewards
INSERT INTO Benefit (cardId, category, categoryEn, title, titleEn, description, descriptionEn, amount, currency, frequency, endMonth, endDay, reminderDays, isActive, createdAt, updatedAt)
VALUES (
  (SELECT id FROM CreditCard WHERE nameEn = 'The Business Platinum Card® from American Express'),
  '航班回饋',
  'Flight Rewards',
  '機票預訂5倍積分',
  '5x Points on Flights',
  '透過amextravel.com預訂機票和酒店5倍積分',
  '5 points per dollar on flights and prepaid hotels booked through amextravel.com',
  NULL,
  'USD',
  'YEARLY',
  12,
  31,
  30,
  1,
  datetime('now'),
  datetime('now')
);
