#!/usr/bin/env python3
"""
信用卡資訊爬蟲
抓取美國、加拿大等地區的信用卡資訊並生成 SQL 插入語句
"""

import requests
import json
from datetime import datetime
from typing import List, Dict, Optional
import argparse


class CreditCardScraper:
    """信用卡資訊爬蟲類別"""

    def __init__(self, region: str = "america"):
        self.region = region
        self.cards = []

    def search_web(self, query: str) -> Dict:
        """
        使用 DuckDuckGo 搜尋引擎進行網頁搜尋
        注意: 實際使用時需要處理反爬蟲機制
        """
        print(f"🔍 搜尋: {query}")

        # 這裡使用模擬數據，實際應用中可以使用以下方法:
        # 1. requests + BeautifulSoup 抓取網頁
        # 2. Selenium 處理動態網頁
        # 3. 使用 API (如 SerpAPI, ScraperAPI)

        # 示例: 使用公開的搜尋 API
        # url = f"https://api.duckduckgo.com/?q={query}&format=json"
        # response = requests.get(url)
        # return response.json()

        return self._get_sample_data()

    def _get_sample_data(self) -> Dict:
        """返回示例數據（實際使用時應該從網頁抓取）"""
        if self.region == "america":
            return {
                "cards": [
                    {
                        "name": "Chase Sapphire Preferred",
                        "nameEn": "Chase Sapphire Preferred® Card",
                        "bank": "Chase",
                        "bankEn": "Chase Bank",
                        "issuer": "Visa",
                        "description": "旅行回饋信用卡，享2-5倍積分",
                        "descriptionEn": "Travel rewards card with 2-5x points",
                        "benefits": [
                            {
                                "category": "旅行回饋",
                                "categoryEn": "Travel Rewards",
                                "title": "旅行預訂5倍積分",
                                "titleEn": "5x Points on Travel",
                                "description": "透過Chase旅行網站預訂獲得5倍積分",
                                "descriptionEn": "5x points on travel purchased through Chase Travel",
                                "amount": None,
                                "currency": "USD",
                                "frequency": "YEARLY"
                            },
                            {
                                "category": "餐飲回饋",
                                "categoryEn": "Dining Rewards",
                                "title": "餐廳3倍積分",
                                "titleEn": "3x Points on Dining",
                                "description": "餐廳消費獲得3倍積分",
                                "descriptionEn": "3x points on dining",
                                "amount": None,
                                "currency": "USD",
                                "frequency": "YEARLY"
                            },
                            {
                                "category": "新戶禮",
                                "categoryEn": "Sign-up Bonus",
                                "title": "開卡禮60,000積分",
                                "titleEn": "60,000 Bonus Points",
                                "description": "開卡三個月內消費$4,000獲得60,000積分",
                                "descriptionEn": "60,000 bonus points after spending $4,000 in first 3 months",
                                "amount": 60000,
                                "currency": "POINTS",
                                "frequency": "ONE_TIME"
                            }
                        ]
                    },
                    {
                        "name": "Capital One Venture X",
                        "nameEn": "Capital One Venture X Rewards Credit Card",
                        "bank": "Capital One",
                        "bankEn": "Capital One",
                        "issuer": "Visa",
                        "description": "高端旅行信用卡，提供機場貴賓室和旅行回饋",
                        "descriptionEn": "Premium travel card with lounge access and travel credits",
                        "benefits": [
                            {
                                "category": "旅行回饋",
                                "categoryEn": "Travel Rewards",
                                "title": "所有消費2倍里程",
                                "titleEn": "2x Miles on Everything",
                                "description": "所有消費獲得2倍里程",
                                "descriptionEn": "2x miles on every purchase",
                                "amount": None,
                                "currency": "USD",
                                "frequency": "YEARLY"
                            },
                            {
                                "category": "旅行回饋",
                                "categoryEn": "Travel Credit",
                                "title": "年度旅行回饋$300",
                                "titleEn": "$300 Annual Travel Credit",
                                "description": "每年$300旅行回饋",
                                "descriptionEn": "$300 annual travel credit",
                                "amount": 300,
                                "currency": "USD",
                                "frequency": "YEARLY"
                            },
                            {
                                "category": "機場貴賓室",
                                "categoryEn": "Airport Lounge",
                                "title": "機場貴賓室通行證",
                                "titleEn": "Airport Lounge Access",
                                "description": "Priority Pass貴賓室和Capital One機場貴賓室",
                                "descriptionEn": "Priority Pass and Capital One Lounge access",
                                "amount": None,
                                "currency": "USD",
                                "frequency": "YEARLY"
                            }
                        ]
                    },
                    {
                        "name": "Citi Double Cash Card",
                        "nameEn": "Citi® Double Cash Card",
                        "bank": "Citibank",
                        "bankEn": "Citibank",
                        "issuer": "Mastercard",
                        "description": "無年費2%現金回饋卡",
                        "descriptionEn": "No annual fee 2% cash back card",
                        "benefits": [
                            {
                                "category": "現金回饋",
                                "categoryEn": "Cash Back",
                                "title": "所有消費2%現金回饋",
                                "titleEn": "2% Cash Back on Everything",
                                "description": "購買時1%，付款時再1%，總計2%",
                                "descriptionEn": "1% when you buy, 1% when you pay, totaling 2%",
                                "amount": None,
                                "currency": "USD",
                                "frequency": "YEARLY"
                            }
                        ]
                    }
                ]
            }
        elif self.region == "canada":
            return {
                "cards": [
                    {
                        "name": "Scotiabank Gold American Express",
                        "nameEn": "Scotiabank Gold American Express® Card",
                        "bank": "Scotiabank",
                        "bankEn": "Scotiabank",
                        "issuer": "American Express",
                        "description": "餐飲和娛樂5倍積分",
                        "descriptionEn": "5x points on dining and entertainment",
                        "benefits": [
                            {
                                "category": "餐飲回饋",
                                "categoryEn": "Dining Rewards",
                                "title": "餐飲娛樂5倍積分",
                                "titleEn": "5x Points on Dining & Entertainment",
                                "description": "餐廳和娛樂消費5倍積分",
                                "descriptionEn": "5x points on dining and entertainment",
                                "amount": None,
                                "currency": "CAD",
                                "frequency": "YEARLY"
                            }
                        ]
                    },
                    {
                        "name": "TD Aeroplan Visa Infinite",
                        "nameEn": "TD® Aeroplan® Visa Infinite* Card",
                        "bank": "TD Bank",
                        "bankEn": "TD Bank",
                        "issuer": "Visa",
                        "description": "加航Aeroplan積分最佳選擇",
                        "descriptionEn": "Best for Air Canada Aeroplan points",
                        "benefits": [
                            {
                                "category": "航空回饋",
                                "categoryEn": "Flight Rewards",
                                "title": "加航消費2倍積分",
                                "titleEn": "2x Points on Air Canada",
                                "description": "加拿大航空消費2倍Aeroplan積分",
                                "descriptionEn": "2x Aeroplan points on Air Canada purchases",
                                "amount": None,
                                "currency": "CAD",
                                "frequency": "YEARLY"
                            }
                        ]
                    }
                ]
            }

        return {"cards": []}

    def fetch_cards(self):
        """抓取信用卡資訊"""
        print(f"\n{'='*60}")
        print(f"開始抓取 {self.region.upper()} 地區的信用卡資訊")
        print(f"{'='*60}\n")

        # 根據地區設定搜尋關鍵字
        if self.region == "america":
            query = "best credit cards USA 2025 rewards cashback"
        elif self.region == "canada":
            query = "best credit cards Canada 2025 rewards"
        elif self.region == "japan":
            query = "best credit cards Japan 2025 rewards"
        else:
            query = f"best credit cards {self.region} 2025"

        # 執行搜尋
        data = self.search_web(query)
        self.cards = data.get("cards", [])

        print(f"✅ 成功抓取 {len(self.cards)} 張信用卡資訊\n")
        return self.cards

    def display_results(self):
        """顯示抓取結果"""
        if not self.cards:
            print("❌ 沒有找到任何信用卡資訊")
            return

        print(f"\n{'='*60}")
        print(f"抓取結果 - {self.region.upper()}")
        print(f"{'='*60}\n")

        for i, card in enumerate(self.cards, 1):
            print(f"{i}. {card['nameEn']}")
            print(f"   銀行: {card['bank']}")
            print(f"   發卡機構: {card['issuer']}")
            print(f"   描述: {card['descriptionEn']}")
            print(f"   福利數量: {len(card.get('benefits', []))}")
            print()

    def generate_sql(self, output_file: Optional[str] = None) -> str:
        """生成 SQL 插入語句"""
        if not self.cards:
            print("❌ 沒有資料可以生成 SQL")
            return ""

        sql_statements = []
        sql_statements.append(f"-- Credit Cards for {self.region.upper()}")
        sql_statements.append(f"-- Generated at {datetime.now().isoformat()}\n")

        for card in self.cards:
            # 插入信用卡
            sql_statements.append(f"-- {card['nameEn']}")
            sql_statements.append(
                f"INSERT INTO CreditCard (name, nameEn, bank, bankEn, issuer, region, "
                f"description, descriptionEn, isActive, createdAt, updatedAt)\n"
                f"VALUES (\n"
                f"  '{card['name']}',\n"
                f"  '{card['nameEn']}',\n"
                f"  '{card['bank']}',\n"
                f"  '{card['bankEn']}',\n"
                f"  '{card['issuer']}',\n"
                f"  '{self.region}',\n"
                f"  '{card['description']}',\n"
                f"  '{card['descriptionEn']}',\n"
                f"  1,\n"
                f"  datetime('now'),\n"
                f"  datetime('now')\n"
                f");\n"
            )

            # 插入福利
            for benefit in card.get('benefits', []):
                amount = benefit['amount'] if benefit['amount'] is not None else 'NULL'
                sql_statements.append(
                    f"INSERT INTO Benefit (cardId, category, categoryEn, title, titleEn, "
                    f"description, descriptionEn, amount, currency, frequency, endMonth, endDay, "
                    f"reminderDays, isActive, createdAt, updatedAt)\n"
                    f"VALUES (\n"
                    f"  (SELECT id FROM CreditCard WHERE nameEn = '{card['nameEn']}'),\n"
                    f"  '{benefit['category']}',\n"
                    f"  '{benefit['categoryEn']}',\n"
                    f"  '{benefit['title']}',\n"
                    f"  '{benefit['titleEn']}',\n"
                    f"  '{benefit['description']}',\n"
                    f"  '{benefit['descriptionEn']}',\n"
                    f"  {amount},\n"
                    f"  '{benefit['currency']}',\n"
                    f"  '{benefit['frequency']}',\n"
                    f"  12,\n"
                    f"  31,\n"
                    f"  30,\n"
                    f"  1,\n"
                    f"  datetime('now'),\n"
                    f"  datetime('now')\n"
                    f");\n"
                )

            sql_statements.append("")

        sql_content = "\n".join(sql_statements)

        # 寫入檔案
        if output_file:
            with open(output_file, 'w', encoding='utf-8') as f:
                f.write(sql_content)
            print(f"✅ SQL 已生成並儲存至: {output_file}")

        return sql_content

    def export_json(self, output_file: str):
        """匯出為 JSON 格式"""
        if not self.cards:
            print("❌ 沒有資料可以匯出")
            return

        data = {
            "region": self.region,
            "generated_at": datetime.now().isoformat(),
            "total_cards": len(self.cards),
            "cards": self.cards
        }

        with open(output_file, 'w', encoding='utf-8') as f:
            json.dump(data, f, ensure_ascii=False, indent=2)

        print(f"✅ JSON 已匯出至: {output_file}")


def main():
    """主程式"""
    parser = argparse.ArgumentParser(
        description="信用卡資訊爬蟲 - 抓取並生成 SQL 插入語句"
    )
    parser.add_argument(
        "--region",
        type=str,
        default="america",
        choices=["america", "canada", "taiwan", "japan", "singapore"],
        help="指定要抓取的地區 (預設: america)"
    )
    parser.add_argument(
        "--output-sql",
        type=str,
        help="SQL 輸出檔案路徑"
    )
    parser.add_argument(
        "--output-json",
        type=str,
        help="JSON 輸出檔案路徑"
    )
    parser.add_argument(
        "--display-only",
        action="store_true",
        help="只顯示結果，不生成檔案"
    )

    args = parser.parse_args()

    # 創建爬蟲實例
    scraper = CreditCardScraper(region=args.region)

    # 抓取資料
    scraper.fetch_cards()

    # 顯示結果
    scraper.display_results()

    if args.display_only:
        return

    # 生成輸出檔案
    if args.output_sql:
        scraper.generate_sql(args.output_sql)
    else:
        # 預設輸出檔案
        default_sql = f"seed-{args.region}-cards.sql"
        scraper.generate_sql(default_sql)

    if args.output_json:
        scraper.export_json(args.output_json)


if __name__ == "__main__":
    main()
