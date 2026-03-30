export default function SelectedList({ drinks, onRemove }) {
  if (drinks.length === 0) return null;

  const total = drinks.reduce((sum, d) => sum + d.priceNum, 0);

  return (
    <div className="selected-list">
      <h3 className="selected-title">
        <span className="selected-icon">📋</span>
        Your Order
      </h3>
      <div className="selected-items">
        {drinks.map((drink, i) => (
          <div key={`${drink.id}-${i}`} className="selected-item">
            <div className="selected-item-color" style={{ background: drink.color }} />
            <div className="selected-item-info">
              <span className="selected-item-name">{drink.nameJa}</span>
              <span className="selected-item-price">{drink.price}</span>
            </div>
            <button className="selected-item-remove" onClick={() => onRemove(drink.id)}>×</button>
          </div>
        ))}
      </div>
      <div className="selected-total">
        <span>合計</span>
        <span>¥{total.toLocaleString()}</span>
      </div>
    </div>
  );
}
