# 信用卡資訊爬蟲

這個腳本用於抓取不同地區的信用卡資訊，並生成 SQL 插入語句。

## 安裝

```bash
cd scripts
pip install -r requirements.txt
```

## 使用方法

### 基本用法

抓取美國地區信用卡並生成 SQL：

```bash
python credit_card_scraper.py --region america
```

### 指定輸出檔案

```bash
python credit_card_scraper.py --region america --output-sql seed-usa-cards.sql
```

### 同時輸出 JSON 格式

```bash
python credit_card_scraper.py --region canada --output-sql canada.sql --output-json canada.json
```

### 只顯示結果不生成檔案

```bash
python credit_card_scraper.py --region japan --display-only
```

## 支援的地區

- `america` - 美國
- `canada` - 加拿大
- `taiwan` - 台灣
- `japan` - 日本
- `singapore` - 新加坡

## 參數說明

- `--region` - 指定要抓取的地區（預設：america）
- `--output-sql` - SQL 輸出檔案路徑
- `--output-json` - JSON 輸出檔案路徑
- `--display-only` - 只顯示結果，不生成檔案

## 輸出範例

### SQL 輸出

生成的 SQL 檔案可以直接匯入資料庫：

```bash
cd ../apps/backend
sqlite3 prisma/dev.db < ../../scripts/seed-america-cards.sql
```

### JSON 輸出

JSON 格式方便進一步處理或檢視：

```json
{
  "region": "america",
  "generated_at": "2025-10-13T10:30:00",
  "total_cards": 3,
  "cards": [
    {
      "name": "Chase Sapphire Preferred",
      "bank": "Chase",
      "benefits": [...]
    }
  ]
}
```

## 注意事項

⚠️ **當前版本使用示例數據**

當前版本為示範用途，使用內建的示例數據。實際使用時需要：

1. 實作真實的網頁爬蟲功能
2. 處理網站的反爬蟲機制
3. 遵守網站的 robots.txt 和服務條款
4. 考慮使用合法的 API 服務（如 SerpAPI）

## 擴展功能

如需實作真實的網頁爬蟲，可以使用：

1. **BeautifulSoup** - 解析靜態網頁
2. **Selenium** - 處理動態網頁
3. **Scrapy** - 大規模爬蟲框架
4. **API 服務** - SerpAPI, ScraperAPI 等

## 範例：添加新地區

```python
elif self.region == "australia":
    return {
        "cards": [
            {
                "name": "ANZ Rewards Travel Adventures",
                "nameEn": "ANZ Rewards Travel Adventures Card",
                "bank": "ANZ",
                # ...
            }
        ]
    }
```

## 授權

此腳本僅供學習和個人使用。使用時請遵守相關網站的服務條款和法律規定。
