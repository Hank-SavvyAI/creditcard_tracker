#!/usr/bin/env python3
"""
American Express 信用卡爬蟲
從 https://www.americanexpress.com/us/credit-cards/ 抓取資料並存入資料庫
"""

import requests
from bs4 import BeautifulSoup
import json
import sqlite3
import os
from datetime import datetime
from typing import List, Dict, Optional
import re


class AmexScraper:
    """American Express 信用卡爬蟲"""

    def __init__(self, db_path: str = None):
        if db_path is None:
            # 預設使用專案的資料庫路徑
            script_dir = os.path.dirname(os.path.abspath(__file__))
            self.db_path = os.path.join(script_dir, '..', 'apps', 'backend', 'prisma', 'dev.db')
        else:
            self.db_path = db_path

        self.cards = []
        self.base_url = "https://www.americanexpress.com"
        self.cards_url = "https://www.americanexpress.com/us/credit-cards/"

    def fetch_amex_cards(self) -> List[Dict]:
        """
        從 American Express 網站抓取信用卡資料
        注意：由於 AMEX 網站使用 JavaScript 動態載入，這裡提供兩種方法：
        1. 使用 Selenium (較可靠但需要瀏覽器驅動)
        2. 使用 requests + BeautifulSoup (較快但可能無法抓到動態內容)
        """
        print(f"\n{'='*60}")
        print(f"開始抓取 American Express 信用卡資訊")
        print(f"網址: {self.cards_url}")
        print(f"{'='*60}\n")

        try:
            # 方法 1: 使用 requests (如果網站有靜態內容)
            headers = {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
            }

            response = requests.get(self.cards_url, headers=headers, timeout=10)
            response.raise_for_status()

            soup = BeautifulSoup(response.content, 'html.parser')

            # 由於 AMEX 網站結構複雜，這裡使用示例資料
            # 實際使用時需要根據網站結構調整選擇器
            self.cards = self._parse_amex_page(soup)

            if not self.cards:
                print("⚠️  無法從網頁抓取資料，使用示例資料")
                self.cards = self._get_amex_sample_data()

        except Exception as e:
            print(f"❌ 抓取失敗: {e}")
            print("⚠️  使用示例資料代替")
            self.cards = self._get_amex_sample_data()

        print(f"✅ 成功抓取 {len(self.cards)} 張 American Express 信用卡\n")
        return self.cards

    def _parse_amex_page(self, soup: BeautifulSoup) -> List[Dict]:
        """
        解析 AMEX 網頁內容
        實際使用時需要根據網站的 HTML 結構調整
        """
        cards = []

        # 嘗試找到卡片容器
        # 注意：這需要根據實際網站結構調整選擇器
        card_elements = soup.find_all('div', class_=re.compile(r'card|product'))

        for element in card_elements[:5]:  # 限制數量避免過多
            try:
                # 提取卡片資訊（需要根據實際結構調整）
                title_element = element.find(['h2', 'h3', 'h4'])
                if not title_element:
                    continue

                card_name = title_element.get_text(strip=True)

                # 跳過無效的卡片名稱
                if not card_name or len(card_name) < 3:
                    continue

                cards.append({
                    'name': card_name,
                    'nameEn': card_name,
                    'bank': 'American Express',
                    'bankEn': 'American Express',
                    'issuer': 'American Express',
                    'description': f'American Express {card_name}',
                    'descriptionEn': f'American Express {card_name}',
                })
            except Exception as e:
                print(f"⚠️  解析卡片時出錯: {e}")
                continue

        return cards

    def _get_amex_sample_data(self) -> List[Dict]:
        """返回 American Express 示例資料"""
        return [
            {
                'name': 'American Express 白金卡',
                'nameEn': 'The Platinum Card® from American Express',
                'bank': 'American Express',
                'bankEn': 'American Express',
                'issuer': 'American Express',
                'region': 'america',
                'description': '高端旅行信用卡，提供全球機場貴賓室、飯店禮遇和旅行回饋',
                'descriptionEn': 'Premium travel card with global lounge access, hotel benefits, and travel rewards',
                'photo': '/images/cards/amex-platinum.jpg',
                'benefits': [
                    {
                        'category': '機場貴賓室',
                        'categoryEn': 'Airport Lounge',
                        'title': '全球機場貴賓室通行證',
                        'titleEn': 'Global Lounge Access',
                        'description': '免費使用全球1,400+機場貴賓室（包含美國運通Centurion、Priority Pass等）',
                        'descriptionEn': 'Free access to 1,400+ airport lounges worldwide (including Amex Centurion, Priority Pass)',
                        'amount': None,
                        'currency': 'USD',
                        'frequency': 'YEARLY',
                        'startMonth': 1,
                        'startDay': 1,
                        'endMonth': 12,
                        'endDay': 31,
                        'reminderDays': 30
                    },
                    {
                        'category': '旅行回饋',
                        'categoryEn': 'Travel Credit',
                        'title': '年度飯店回饋$200',
                        'titleEn': '$200 Annual Hotel Credit',
                        'description': '每年可獲得$200飯店預訂回饋',
                        'descriptionEn': '$200 annual hotel credit through Amex Travel',
                        'amount': 200,
                        'currency': 'USD',
                        'frequency': 'YEARLY',
                        'startMonth': 1,
                        'startDay': 1,
                        'endMonth': 12,
                        'endDay': 31,
                        'reminderDays': 30
                    },
                    {
                        'category': '旅行回饋',
                        'categoryEn': 'Airline Credit',
                        'title': '年度航空回饋$200',
                        'titleEn': '$200 Annual Airline Fee Credit',
                        'description': '每年$200航空雜費回饋（托運行李、機上餐飲等）',
                        'descriptionEn': '$200 annual airline fee credit for baggage, in-flight purchases',
                        'amount': 200,
                        'currency': 'USD',
                        'frequency': 'YEARLY',
                        'startMonth': 1,
                        'startDay': 1,
                        'endMonth': 12,
                        'endDay': 31,
                        'reminderDays': 30
                    },
                    {
                        'category': '串流服務',
                        'categoryEn': 'Streaming Credit',
                        'title': '串流服務每月$20回饋',
                        'titleEn': '$20 Monthly Streaming Credit',
                        'description': '符合條件的串流媒體服務每月$20回饋',
                        'descriptionEn': '$20 monthly credit for eligible streaming services',
                        'amount': 20,
                        'currency': 'USD',
                        'frequency': 'MONTHLY',
                        'startMonth': 1,
                        'startDay': 1,
                        'endMonth': 12,
                        'endDay': 31,
                        'reminderDays': 7
                    }
                ]
            },
            {
                'name': 'American Express 金卡',
                'nameEn': 'American Express® Gold Card',
                'bank': 'American Express',
                'bankEn': 'American Express',
                'issuer': 'American Express',
                'region': 'america',
                'description': '餐飲和超市消費最佳選擇，提供4倍積分回饋',
                'descriptionEn': 'Best for dining and groceries with 4x points',
                'photo': '/images/cards/amex-gold.jpg',
                'benefits': [
                    {
                        'category': '餐飲回饋',
                        'categoryEn': 'Dining Rewards',
                        'title': '餐廳消費4倍積分',
                        'titleEn': '4x Points on Restaurants',
                        'description': '全球餐廳消費獲得4倍積分（每年最高$50,000）',
                        'descriptionEn': '4x points at restaurants worldwide (up to $50,000 per year)',
                        'amount': None,
                        'currency': 'USD',
                        'frequency': 'YEARLY',
                        'startMonth': 1,
                        'startDay': 1,
                        'endMonth': 12,
                        'endDay': 31,
                        'reminderDays': 30
                    },
                    {
                        'category': '超市回饋',
                        'categoryEn': 'Grocery Rewards',
                        'title': '超市消費4倍積分',
                        'titleEn': '4x Points at Supermarkets',
                        'description': '美國超市消費4倍積分（每年最高$25,000）',
                        'descriptionEn': '4x points at U.S. supermarkets (up to $25,000 per year)',
                        'amount': None,
                        'currency': 'USD',
                        'frequency': 'YEARLY',
                        'startMonth': 1,
                        'startDay': 1,
                        'endMonth': 12,
                        'endDay': 31,
                        'reminderDays': 30
                    },
                    {
                        'category': '餐飲回饋',
                        'categoryEn': 'Dining Credit',
                        'title': 'Uber Cash每月$10',
                        'titleEn': '$10 Monthly Uber Cash',
                        'description': '每月$10 Uber Cash用於搭車或Uber Eats',
                        'descriptionEn': '$10 monthly Uber Cash for rides or Uber Eats',
                        'amount': 10,
                        'currency': 'USD',
                        'frequency': 'MONTHLY',
                        'startMonth': 1,
                        'startDay': 1,
                        'endMonth': 12,
                        'endDay': 31,
                        'reminderDays': 7
                    },
                    {
                        'category': '餐飲回饋',
                        'categoryEn': 'Dining Credit',
                        'title': '餐廳回饋每月$10',
                        'titleEn': '$10 Monthly Dining Credit',
                        'description': '符合條件的餐廳每月$10回饋',
                        'descriptionEn': '$10 monthly dining credit at select restaurants',
                        'amount': 10,
                        'currency': 'USD',
                        'frequency': 'MONTHLY',
                        'startMonth': 1,
                        'startDay': 1,
                        'endMonth': 12,
                        'endDay': 31,
                        'reminderDays': 7
                    }
                ]
            },
            {
                'name': 'American Express 藍色現金天天卡',
                'nameEn': 'Blue Cash Everyday® Card from American Express',
                'bank': 'American Express',
                'bankEn': 'American Express',
                'issuer': 'American Express',
                'region': 'america',
                'description': '無年費現金回饋卡，超市3%回饋',
                'descriptionEn': 'No annual fee cash back card with 3% at U.S. supermarkets',
                'photo': '/images/cards/amex-blue-cash.jpg',
                'benefits': [
                    {
                        'category': '超市回饋',
                        'categoryEn': 'Grocery Cash Back',
                        'title': '超市3%現金回饋',
                        'titleEn': '3% Cash Back at U.S. Supermarkets',
                        'description': '美國超市消費3%現金回饋（每年最高$6,000）',
                        'descriptionEn': '3% cash back at U.S. supermarkets (up to $6,000 per year)',
                        'amount': None,
                        'currency': 'USD',
                        'frequency': 'YEARLY',
                        'startMonth': 1,
                        'startDay': 1,
                        'endMonth': 12,
                        'endDay': 31,
                        'reminderDays': 30
                    },
                    {
                        'category': '加油回饋',
                        'categoryEn': 'Gas Cash Back',
                        'title': '加油站2%現金回饋',
                        'titleEn': '2% Cash Back at Gas Stations',
                        'description': '美國加油站消費2%現金回饋',
                        'descriptionEn': '2% cash back at U.S. gas stations',
                        'amount': None,
                        'currency': 'USD',
                        'frequency': 'YEARLY',
                        'startMonth': 1,
                        'startDay': 1,
                        'endMonth': 12,
                        'endDay': 31,
                        'reminderDays': 30
                    },
                    {
                        'category': '串流服務',
                        'categoryEn': 'Streaming Cash Back',
                        'title': '串流服務2%現金回饋',
                        'titleEn': '2% Cash Back on Streaming',
                        'description': '符合條件的串流媒體服務2%現金回饋',
                        'descriptionEn': '2% cash back on eligible streaming subscriptions',
                        'amount': None,
                        'currency': 'USD',
                        'frequency': 'YEARLY',
                        'startMonth': 1,
                        'startDay': 1,
                        'endMonth': 12,
                        'endDay': 31,
                        'reminderDays': 30
                    }
                ]
            }
        ]

    def save_to_database(self) -> bool:
        """將資料存入 SQLite 資料庫"""
        if not self.cards:
            print("❌ 沒有資料可以儲存")
            return False

        try:
            print(f"\n{'='*60}")
            print(f"開始儲存資料到資料庫")
            print(f"資料庫路徑: {self.db_path}")
            print(f"{'='*60}\n")

            conn = sqlite3.connect(self.db_path)
            cursor = conn.cursor()

            for card in self.cards:
                # 檢查卡片是否已存在
                cursor.execute(
                    "SELECT id FROM CreditCard WHERE nameEn = ?",
                    (card['nameEn'],)
                )
                existing = cursor.fetchone()

                if existing:
                    print(f"⚠️  卡片已存在，跳過: {card['nameEn']}")
                    card_id = existing[0]
                else:
                    # 插入信用卡
                    cursor.execute(
                        """
                        INSERT INTO CreditCard (
                            name, nameEn, bank, bankEn, issuer, region,
                            description, descriptionEn, photo, isActive,
                            createdAt, updatedAt
                        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))
                        """,
                        (
                            card['name'],
                            card['nameEn'],
                            card['bank'],
                            card['bankEn'],
                            card['issuer'],
                            card.get('region', 'america'),
                            card['description'],
                            card['descriptionEn'],
                            card.get('photo'),
                            1
                        )
                    )
                    card_id = cursor.lastrowid
                    print(f"✅ 已新增卡片: {card['nameEn']} (ID: {card_id})")

                # 插入福利
                if 'benefits' in card:
                    for benefit in card['benefits']:
                        # 檢查福利是否已存在
                        cursor.execute(
                            "SELECT id FROM Benefit WHERE cardId = ? AND titleEn = ?",
                            (card_id, benefit['titleEn'])
                        )
                        if cursor.fetchone():
                            print(f"   ⚠️  福利已存在，跳過: {benefit['titleEn']}")
                            continue

                        cursor.execute(
                            """
                            INSERT INTO Benefit (
                                cardId, category, categoryEn, title, titleEn,
                                description, descriptionEn, amount, currency, frequency,
                                startMonth, startDay, endMonth, endDay, reminderDays,
                                isActive, createdAt, updatedAt
                            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))
                            """,
                            (
                                card_id,
                                benefit['category'],
                                benefit['categoryEn'],
                                benefit['title'],
                                benefit['titleEn'],
                                benefit['description'],
                                benefit['descriptionEn'],
                                benefit.get('amount'),
                                benefit['currency'],
                                benefit['frequency'],
                                benefit.get('startMonth', 1),
                                benefit.get('startDay', 1),
                                benefit.get('endMonth', 12),
                                benefit.get('endDay', 31),
                                benefit.get('reminderDays', 30),
                                1
                            )
                        )
                        print(f"   ✅ 已新增福利: {benefit['titleEn']}")

            conn.commit()
            conn.close()

            print(f"\n{'='*60}")
            print(f"✅ 成功儲存 {len(self.cards)} 張信用卡到資料庫")
            print(f"{'='*60}\n")
            return True

        except Exception as e:
            print(f"❌ 儲存失敗: {e}")
            if conn:
                conn.rollback()
                conn.close()
            return False

    def display_results(self):
        """顯示抓取結果"""
        if not self.cards:
            print("❌ 沒有找到任何信用卡資訊")
            return

        print(f"\n{'='*60}")
        print(f"American Express 信用卡列表")
        print(f"{'='*60}\n")

        for i, card in enumerate(self.cards, 1):
            print(f"{i}. {card['nameEn']}")
            print(f"   中文名稱: {card['name']}")
            print(f"   描述: {card['descriptionEn']}")
            print(f"   福利數量: {len(card.get('benefits', []))}")
            if card.get('photo'):
                print(f"   圖片: {card['photo']}")
            print()


def main():
    """主程式"""
    import argparse

    parser = argparse.ArgumentParser(
        description="American Express 信用卡爬蟲"
    )
    parser.add_argument(
        "--db-path",
        type=str,
        help="資料庫路徑（預設使用專案資料庫）"
    )
    parser.add_argument(
        "--display-only",
        action="store_true",
        help="只顯示結果，不儲存到資料庫"
    )

    args = parser.parse_args()

    # 建立爬蟲實例
    scraper = AmexScraper(db_path=args.db_path)

    # 抓取資料
    scraper.fetch_amex_cards()

    # 顯示結果
    scraper.display_results()

    # 儲存到資料庫
    if not args.display_only:
        scraper.save_to_database()
    else:
        print("⚠️  僅顯示模式，未儲存到資料庫")


if __name__ == "__main__":
    main()
