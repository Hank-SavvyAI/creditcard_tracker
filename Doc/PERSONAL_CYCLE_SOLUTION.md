# 個人化週期福利解決方案

## 問題描述
某些福利的週期依據每個用戶的開卡日期而不同，例如：
- **年費減免**：開卡週年前消費滿額免年費
- **週年禮**：每年開卡週年月份送禮
- **首年優惠**：開卡一年內有效

每個用戶的開卡日期不同，因此週期起始/結束日期也不同。

---

## 解決方案設計

### 資料庫 Schema

#### Benefit 新增欄位
```prisma
model Benefit {
  // ... 現有欄位
  isPersonalCycle Boolean @default(false)  // 是否需要用戶自訂起始日期
}
```

#### UserBenefit 新增欄位
```prisma
model UserBenefit {
  // ... 現有欄位
  customStartDate DateTime?  // 用戶的個人起始日期
}
```

---

## 實作步驟

### 1. 資料庫 Migration

```bash
cd apps/backend
npx prisma migrate dev --name add_personal_cycle_support
```

### 2. Admin UI - 福利設定頁面

**檔案**: `apps/frontend/src/app/admin/cards/[id]/benefits/new/page.tsx`

**新增欄位**:
```typescript
// 在 formData 中添加
const [formData, setFormData] = useState({
  // ... 現有欄位
  isPersonalCycle: false,  // ← 新增
})

// 在表單中添加 checkbox
<div className="form-group checkbox-group">
  <label>
    <input
      type="checkbox"
      name="isPersonalCycle"
      checked={formData.isPersonalCycle}
      onChange={handleChange}
    />
    <span>依用戶個人日期計算週期</span>
  </label>
  <small style={{ marginLeft: '1.5rem', color: '#666' }}>
    勾選後，每個用戶需要自行設定此福利的起始日期（例如：開卡日）
  </small>
</div>
```

**條件顯示說明**:
```typescript
{formData.isPersonalCycle && (
  <div className="alert alert-info">
    ℹ️ 此福利已設為個人化週期。用戶在追蹤此卡片時，需要輸入起始日期。
    <br />
    例如：年費減免（開卡週年前消費免年費）
  </div>
)}
```

### 3. 用戶 UI - 追蹤卡片時輸入起始日期

**情境 1: 追蹤卡片時顯示彈窗**

```typescript
// 檔案: apps/frontend/src/app/cards/page.tsx (或 dashboard)

// 用戶點擊「追蹤」按鈕時
async function handleTrackCard(cardId) {
  // 1. 獲取該卡片的所有福利
  const benefits = await api.getBenefitsByCard(cardId)

  // 2. 檢查是否有需要個人化週期的福利
  const personalCycleBenefits = benefits.filter(b => b.isPersonalCycle)

  if (personalCycleBenefits.length > 0) {
    // 顯示彈窗讓用戶輸入起始日期
    setShowPersonalCycleModal(true)
    setPersonalCycleBenefits(personalCycleBenefits)
  } else {
    // 直接追蹤
    await api.trackCard(cardId)
  }
}
```

**彈窗範例**:
```tsx
{showPersonalCycleModal && (
  <div className="modal">
    <div className="modal-content">
      <h3>設定福利起始日期</h3>
      <p>此卡片包含以下需要設定起始日期的福利：</p>

      {personalCycleBenefits.map(benefit => (
        <div key={benefit.id} className="form-group">
          <label>{benefit.title}</label>
          <input
            type="date"
            value={startDates[benefit.id] || ''}
            onChange={(e) => setStartDate(benefit.id, e.target.value)}
          />
          <small>例如：開卡日期、首次使用日期等</small>
        </div>
      ))}

      <button onClick={handleConfirmTrack}>確認追蹤</button>
      <button onClick={() => setShowPersonalCycleModal(false)}>取消</button>
    </div>
  </div>
)}
```

**情境 2: Dashboard 已追蹤卡片的福利設定**

```typescript
// 在 Dashboard 的福利卡片上顯示
<div className="benefit-card">
  <h4>{benefit.title}</h4>

  {benefit.isPersonalCycle && (
    <div className="custom-start-date">
      <label>起始日期：</label>
      <input
        type="date"
        value={userBenefit.customStartDate || ''}
        onChange={(e) => updateCustomStartDate(benefit.id, e.target.value)}
      />
    </div>
  )}

  <p>到期日：{userBenefit.periodEnd}</p>
</div>
```

### 4. Backend API - 處理個人化週期

**檔案**: `apps/backend/src/services/archive.ts`

**修改 getCurrentCycle 函數**:
```typescript
function getCurrentCycle(
  cycleType: string | null,
  customStartDate?: Date | null,  // ← 新增參數
  endMonth?: number,
  endDay?: number
): { year: number; cycleNumber: number | null; periodEnd: Date | null } {
  const now = new Date();
  const year = now.getFullYear();

  // 如果有個人化起始日期
  if (customStartDate) {
    const startDate = new Date(customStartDate);

    switch (cycleType) {
      case 'YEARLY':
        // 計算從起始日期開始的週年
        const anniversaryThisYear = new Date(
          year,
          startDate.getMonth(),
          startDate.getDate()
        );

        // 如果今年的週年日已過，使用明年的
        if (now > anniversaryThisYear) {
          return {
            year: year + 1,
            cycleNumber: 1,
            periodEnd: new Date(year + 1, startDate.getMonth(), startDate.getDate())
          };
        } else {
          return {
            year: year,
            cycleNumber: 1,
            periodEnd: anniversaryThisYear
          };
        }

      case 'MONTHLY':
        // 每月的相同日期
        const dayOfMonth = startDate.getDate();
        const currentMonth = now.getMonth() + 1;
        const periodEnd = new Date(year, now.getMonth() + 1, dayOfMonth);

        if (now > periodEnd) {
          // 下個月
          return {
            year,
            cycleNumber: currentMonth + 1,
            periodEnd: new Date(year, now.getMonth() + 2, dayOfMonth)
          };
        }

        return {
          year,
          cycleNumber: currentMonth,
          periodEnd
        };

      // ... 其他 cycleType
    }
  }

  // 原有邏輯（非個人化週期）
  // ... 現有代碼
}
```

**修改 createCurrentCycleBenefits 函數**:
```typescript
export async function createCurrentCycleBenefits(
  userId: number,
  cardId: number,
  customStartDates?: { [benefitId: number]: Date }  // ← 新增參數
) {
  const card = await prisma.creditCard.findUnique({
    where: { id: cardId },
    include: { benefits: true },
  });

  if (!card) {
    throw new Error('Card not found');
  }

  const results = [];

  for (const benefit of card.benefits) {
    if (!benefit.isActive) continue;

    // 取得該福利的個人起始日期
    const customStartDate = benefit.isPersonalCycle
      ? customStartDates?.[benefit.id]
      : null;

    const { year, cycleNumber, periodEnd } = getCurrentCycle(
      benefit.cycleType,
      customStartDate,  // ← 傳入個人日期
      benefit.endMonth ?? undefined,
      benefit.endDay ?? undefined
    );

    // 檢查是否已存在當前週期的記錄
    const existing = await prisma.userBenefit.findFirst({
      where: {
        userId,
        benefitId: benefit.id,
        year,
        cycleNumber,
      },
    });

    if (!existing) {
      const created = await prisma.userBenefit.create({
        data: {
          userId,
          benefitId: benefit.id,
          year,
          cycleNumber,
          periodEnd,
          customStartDate,  // ← 儲存個人日期
        },
      });
      results.push(created);
    }
  }

  return results;
}
```

### 5. API Endpoint - 追蹤卡片

**檔案**: `apps/backend/src/routes/cards.ts` (或相關路由)

```typescript
// 修改追蹤卡片的 endpoint
router.post('/:cardId/track', authenticate, async (req: AuthRequest, res) => {
  try {
    const userId = req.userId!;
    const cardId = parseInt(req.params.cardId);
    const { customStartDates } = req.body;  // ← 接收個人起始日期

    // 檢查是否已追蹤
    const existing = await prisma.userCard.findFirst({
      where: { userId, cardId },
    });

    if (existing) {
      return res.status(400).json({ error: 'Already tracking this card' });
    }

    // 追蹤卡片
    await prisma.userCard.create({
      data: { userId, cardId },
    });

    // 創建福利記錄（傳入個人起始日期）
    const benefits = await createCurrentCycleBenefits(
      userId,
      cardId,
      customStartDates  // ← 傳入
    );

    res.json({ success: true, benefits });
  } catch (error) {
    res.status(500).json({ error: 'Failed to track card' });
  }
});
```

**Request 格式**:
```json
POST /api/cards/123/track
{
  "customStartDates": {
    "45": "2024-03-15",  // benefitId: 開卡日期
    "67": "2024-06-20"   // benefitId: 另一個福利的起始日
  }
}
```

---

## UI/UX 設計建議

### Admin 後台

```
┌─────────────────────────────────────┐
│ 新增福利                              │
├─────────────────────────────────────┤
│                                     │
│ 福利標題: [年費減免              ]  │
│ 類別: [優惠                      ]  │
│ 頻率: [每年 ▼]                      │
│                                     │
│ ☑ 依用戶個人日期計算週期              │
│   勾選後，用戶需自行設定起始日期       │
│   (例如：開卡日、首次使用日)          │
│                                     │
│ [儲存] [取消]                        │
└─────────────────────────────────────┘
```

### 用戶前台 - 追蹤卡片時

```
┌─────────────────────────────────────┐
│ 設定福利起始日期                      │
├─────────────────────────────────────┤
│                                     │
│ 您選擇的卡片包含以下福利需要設定起始   │
│ 日期：                               │
│                                     │
│ 年費減免                             │
│ └ 起始日期: [2024-03-15 📅]         │
│   提示：請輸入開卡日期                │
│                                     │
│ 週年禮金                             │
│ └ 起始日期: [2024-03-15 📅]         │
│   提示：請輸入開卡日期                │
│                                     │
│ [確認追蹤] [取消]                    │
└─────────────────────────────────────┘
```

### Dashboard - 已追蹤的福利

```
┌──────────────────────────────┐
│ 💳 Chase Sapphire Preferred  │
├──────────────────────────────┤
│                              │
│ 🎁 年費減免                   │
│ 起始日期: 2024-03-15         │
│ 到期日: 2025-03-14          │
│ 剩餘天數: 89 天              │
│                              │
│ [編輯起始日期] [標記完成]     │
└──────────────────────────────┘
```

---

## 測試案例

### 案例 1: 年費減免（每年週期）

**Admin 設定**:
```json
{
  "title": "年費減免",
  "frequency": "YEARLY",
  "cycleType": "YEARLY",
  "isPersonalCycle": true,
  "description": "開卡週年前消費滿額免年費"
}
```

**用戶 A（開卡日：2024-03-15）**:
```
customStartDate: 2024-03-15
periodEnd: 2025-03-14
提醒日: 2025-03-07 (7天前)
```

**用戶 B（開卡日：2024-07-20）**:
```
customStartDate: 2024-07-20
periodEnd: 2025-07-19
提醒日: 2025-07-12 (7天前)
```

### 案例 2: 首年優惠（一次性）

**Admin 設定**:
```json
{
  "title": "新戶首年禮",
  "frequency": "ONE_TIME",
  "cycleType": null,
  "isPersonalCycle": true,
  "description": "開卡一年內完成任務送禮金"
}
```

**用戶設定**:
```
customStartDate: 2024-06-01
periodEnd: 2025-05-31 (一年後)
```

---

## Migration 指令

```bash
# 1. 生成 migration
cd apps/backend
npx prisma migrate dev --name add_personal_cycle_support

# 2. 更新 Prisma Client
npx prisma generate

# 3. (可選) 填充測試數據
npx ts-node prisma/seed-personal-cycle-test.ts
```

---

## 後續優化

1. **批量設定**: 同一張卡的多個個人化福利可以共用同一個起始日期
2. **自動提示**: 根據用戶的消費記錄自動推薦起始日期
3. **歷史記錄**: 顯示過去週期的使用情況
4. **提醒優化**: 個人化週期的提醒訊息更明確（距離週年X天）

---

## 注意事項

1. **必須輸入**: 對於 `isPersonalCycle: true` 的福利，`customStartDate` 是必填的
2. **驗證日期**: 起始日期不能是未來日期
3. **更新處理**: 如果用戶修改起始日期，需要重新計算 periodEnd
4. **UI 提示**: 清楚說明「起始日期」的意義（開卡日、首次使用日等）
