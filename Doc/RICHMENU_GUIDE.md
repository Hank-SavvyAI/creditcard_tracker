# LINE Rich Menu 設定指南

## 什麼是 Rich Menu？

Rich Menu 是顯示在 LINE 聊天室底部的固定選單，讓用戶可以快速訪問機器人的功能，無需輸入文字指令。

## 選單布局

我們的 Rich Menu 採用 **3x2 網格布局**（6 個按鈕）：

```
┌──────────────┬──────────────┬──────────────┐
│ 📇 我的信用卡 │ 📅 7天內到期  │ 📆 當月到期   │
├──────────────┼──────────────┼──────────────┤
│ 📆 本季到期   │ 📆 當年到期   │ 💻 開啟網站   │
└──────────────┴──────────────┴──────────────┘
```

## 設定步驟

### 方法 1：使用程式碼自動設定

1. **執行設定腳本**：
   ```bash
   cd apps/backend
   npx ts-node src/scripts/setupRichMenu.ts
   ```

2. **準備 Rich Menu 圖片**（如果還沒有）：
   - 尺寸：2500 x 1686 像素
   - 格式：PNG
   - 位置：`apps/backend/assets/richmenu.png`

3. **重新執行腳本上傳圖片**：
   ```bash
   npx ts-node src/scripts/setupRichMenu.ts
   ```

### 方法 2：使用 LINE Developers Console 手動設定

1. 前往 [LINE Developers Console](https://developers.line.biz/console/)
2. 選擇你的 Messaging API Channel
3. 點擊左側選單的「Rich menus」
4. 點擊「Create」建立新的 Rich Menu
5. 設定以下資訊：
   - **Title**: 信用卡福利追蹤選單
   - **Chat bar text**: 功能選單
   - **Selected by default**: ✅ 勾選
   - **Size**: Large (2500 x 1686)
   - **Template**: 選擇 6 個按鈕的模板

6. 設定每個按鈕的動作：

   | 位置 | 按鈕文字 | 動作類型 | 內容 |
   |------|---------|---------|------|
   | 左上 | 📇 我的信用卡 | Message | `查看我的信用卡` |
   | 中上 | 📅 7天內到期 | Message | `查詢7天內到期的福利` |
   | 右上 | 📆 當月到期 | Message | `當月到期的福利` |
   | 左下 | 📆 本季到期 | Message | `本季到期的福利` |
   | 中下 | 📆 當年到期 | Message | `當年到期的福利` |
   | 右下 | 💻 開啟網站 | URI | `https://api.savvyaihelper.com/api/auth/line` |

7. 上傳 Rich Menu 圖片（2500 x 1686 PNG）
8. 點擊「Save」儲存
9. 在 Rich Menu 列表中，點擊「Set as default」設為預設選單

## 建立 Rich Menu 圖片

### 使用線上工具（推薦）

1. 使用 [Canva](https://www.canva.com/)：
   - 建立自訂尺寸：2500 x 1686 像素
   - 使用網格工具分割成 3x2 的區域
   - 每個區域尺寸：833 x 843 像素
   - 添加文字和圖示
   - 匯出為 PNG

2. 使用 [Figma](https://www.figma.com/)：
   - 建立 2500 x 1686 的畫框
   - 使用參考線分割區域
   - 設計按鈕樣式
   - 匯出為 PNG

### 圖片範本建議

```
┌─────────────────┬─────────────────┬─────────────────┐
│   📇            │   📅            │   📆            │
│ 我的信用卡      │ 7天內到期       │ 當月到期        │
│                 │                 │                 │
│  (833x843)      │  (834x843)      │  (833x843)      │
├─────────────────┼─────────────────┼─────────────────┤
│   📆            │   📆            │   💻            │
│ 本季到期        │ 當年到期        │ 開啟網站        │
│                 │                 │                 │
│  (833x843)      │  (834x843)      │  (833x843)      │
└─────────────────┴─────────────────┴─────────────────┘
```

**設計建議**：
- 使用清晰易讀的字體（至少 40pt）
- 使用對比鮮明的顏色
- 圖示要夠大（建議 100-150px）
- 保持設計簡潔，避免過多文字
- 建議使用品牌色或主題色

## 測試 Rich Menu

1. 在 LINE 中打開你的機器人
2. 點擊聊天室右下角的「鍵盤」圖示
3. 應該會看到 Rich Menu 出現在底部
4. 點擊每個按鈕測試功能是否正常

## API 管理 Rich Menu

### 查看所有 Rich Menu

```typescript
import { getAllRichMenus } from './services/lineRichMenu';

const menus = await getAllRichMenus();
console.log('Rich Menus:', menus);
```

### 刪除 Rich Menu

```typescript
import { deleteRichMenu } from './services/lineRichMenu';

await deleteRichMenu('richmenu-xxxxxxxxxxxxx');
```

### 設定預設 Rich Menu

```typescript
import { setDefaultRichMenu } from './services/lineRichMenu';

await setDefaultRichMenu('richmenu-xxxxxxxxxxxxx');
```

## 常見問題

### Q: Rich Menu 沒有顯示？

**A**: 檢查以下項目：
1. Rich Menu 是否已設為預設？
2. 圖片是否已成功上傳？
3. 用戶是否需要重新加入機器人為好友？

### Q: 點擊按鈕沒有反應？

**A**: 確認：
1. 按鈕的 action 設定是否正確
2. Webhook 是否正常運作
3. 查看後端 log 是否有收到訊息

### Q: 圖片尺寸不對？

**A**: Rich Menu 圖片必須是：
- 大尺寸：2500 x 1686 像素
- 小尺寸：2500 x 843 像素
- 格式：PNG 或 JPEG
- 檔案大小：< 1 MB

### Q: 如何為不同用戶顯示不同的 Rich Menu？

**A**: 使用 LINE Rich Menu API 的 `linkRichMenuToUser` 方法：

```typescript
await axios.post(
  `https://api.line.me/v2/bot/user/{userId}/richmenu/{richMenuId}`,
  {},
  {
    headers: {
      'Authorization': `Bearer ${LINE_ACCESS_TOKEN}`
    }
  }
);
```

## 參考資料

- [LINE Rich Menu API 文件](https://developers.line.biz/en/reference/messaging-api/#rich-menu)
- [Rich Menu 設計指南](https://developers.line.biz/en/docs/messaging-api/design-rich-menu/)
- [LINE Bot Designer](https://developers.line.biz/en/services/bot-designer/)
