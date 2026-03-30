export default function ResultScreen({ drinks, onRestart }) {
  const total = drinks.reduce((sum, d) => sum + d.priceNum, 0);

  return (
    <div className="result-overlay">
      <div className="result-screen">
        <h2 className="result-title">Tonight's Selection</h2>
        <p className="result-subtitle">本日のお選び</p>

        <div className="result-drinks">
          {drinks.map((drink, i) => (
            <div key={`${drink.id}-${i}`} className="result-drink-card">
              <div className="result-drink-color" style={{ background: drink.color }} />
              <div className="result-drink-info">
                <span className="result-drink-type">{drink.typeLabel}</span>
                <h3>{drink.nameJa}</h3>
                <p className="result-drink-en">{drink.name}</p>
                <span className="result-drink-price">{drink.price}</span>
              </div>
            </div>
          ))}
        </div>

        <div className="result-total">
          <span>合計</span>
          <span className="result-total-price">¥{total.toLocaleString()}</span>
        </div>

        <p className="result-thanks">ありがとうございました。またのお越しをお待ちしております。</p>

        <button className="btn-primary" onClick={onRestart}>もう一度来店する</button>
      </div>
    </div>
  );
}
