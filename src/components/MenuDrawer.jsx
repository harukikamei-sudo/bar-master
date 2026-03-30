import { useState } from 'react';

const pages = [
  {
    id: 'tokushoho',
    label: '特定商取引法に基づく表記',
    content: `【販売業者】
BAR MASTER 運営事務局

【運営統括責任者】
（氏名を記載）

【所在地】
〒000-0000 東京都○○区○○ 0-0-0

【電話番号】
000-0000-0000
※お問い合わせはメールにてお願いいたします

【メールアドレス】
info@barmaster.example.com

【販売価格】
各商品ページに記載

【商品代金以外の必要料金】
送料: 全国一律 ¥800（¥10,000以上で送料無料）

【支払方法】
クレジットカード / 銀行振込 / コンビニ決済

【支払時期】
クレジットカード: 注文時
銀行振込・コンビニ決済: 注文後7日以内

【商品の引渡時期】
ご注文確認後、3〜7営業日以内に発送

【返品・交換について】
商品到着後7日以内にご連絡ください。
未開封・未使用の場合に限り返品を承ります。
お客様都合による返品の送料はお客様負担となります。
不良品・誤送品の場合は当店負担で交換いたします。

【酒類販売について】
20歳未満の方への酒類の販売は法律で禁止されています。
酒類販売業免許番号: ○○税務署 法○○○号`,
  },
  {
    id: 'privacy',
    label: 'プライバシーポリシー',
    content: `BAR MASTER（以下「当サービス」）は、お客様の個人情報の保護を重要な責務と考え、以下のとおりプライバシーポリシーを定めます。

【収集する情報】
・ご注文時にご提供いただく氏名、住所、メールアドレス、電話番号
・お支払いに関する情報
・サービス利用履歴、Cookie情報

【利用目的】
・商品の発送およびお客様対応
・サービスの改善および新機能の開発
・キャンペーンや新商品のご案内（同意いただいた場合のみ）

【第三者提供】
お客様の同意なく、個人情報を第三者に提供することはありません。
ただし、法令に基づく場合を除きます。

【Cookie の使用】
当サービスでは、利便性向上のためCookieを使用しています。
ブラウザの設定により無効にすることが可能です。

【お問い合わせ】
個人情報に関するお問い合わせは下記までご連絡ください。
info@barmaster.example.com`,
  },
  {
    id: 'terms',
    label: '利用規約',
    content: `【第1条 適用】
本規約は、BAR MASTER（以下「当サービス」）の利用に関する条件を定めるものです。

【第2条 年齢制限】
当サービスは20歳以上の方を対象としています。20歳未満の方のご利用およびご購入はお断りいたします。

【第3条 禁止事項】
・虚偽の情報を登録する行為
・他のお客様への迷惑行為
・当サービスの運営を妨害する行為
・法令または公序良俗に反する行為

【第4条 免責事項】
・当サービスの情報の正確性について万全を期しておりますが、その内容を保証するものではありません。
・天災、システム障害等やむを得ない事由による損害について、当サービスは責任を負いません。

【第5条 規約の変更】
当サービスは、必要に応じて本規約を変更できるものとします。変更後の規約は、当サイトに掲載した時点で効力を生じます。`,
  },
  {
    id: 'about',
    label: '運営者情報',
    content: `【運営】
BAR MASTER 運営事務局

【コンセプト】
AIバーテンダーとの会話を通じて、あなたにぴったりのお酒を見つける体験型レコメンドサービスです。

【お問い合わせ】
メール: info@barmaster.example.com
受付時間: 平日 10:00〜18:00（土日祝を除く）`,
  },
];

export default function MenuDrawer({ open, onClose }) {
  const [activePage, setActivePage] = useState(null);

  const handleClose = () => {
    setActivePage(null);
    onClose();
  };

  const handleBack = () => {
    setActivePage(null);
  };

  if (!open) return null;

  return (
    <div className="menu-overlay" onClick={handleClose}>
      <div className="menu-drawer" onClick={e => e.stopPropagation()}>
        <div className="menu-header">
          {activePage ? (
            <button className="menu-back" onClick={handleBack}>← 戻る</button>
          ) : (
            <span className="menu-title">MENU</span>
          )}
          <button className="menu-close" onClick={handleClose}>×</button>
        </div>

        {!activePage ? (
          <nav className="menu-nav">
            {pages.map(page => (
              <button
                key={page.id}
                className="menu-nav-item"
                onClick={() => setActivePage(page)}
              >
                {page.label}
              </button>
            ))}
          </nav>
        ) : (
          <div className="menu-page">
            <h2 className="menu-page-title">{activePage.label}</h2>
            <div className="menu-page-content">{activePage.content}</div>
          </div>
        )}
      </div>
    </div>
  );
}
