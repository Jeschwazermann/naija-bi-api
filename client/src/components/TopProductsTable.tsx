import type { TopProduct } from '../api/types';

function nairaFormat(amount: number): string {
  return `₦${Math.round(amount).toLocaleString('en-NG')}`;
}

export function TopProductsTable({ products }: { products: TopProduct[] }) {
  if (products.length === 0) {
    return <p className="empty-note">Nothing sold in this period yet.</p>;
  }

  return (
    <table className="ledger-table">
      <thead>
        <tr>
          <th scope="col">Product</th>
          <th scope="col" className="num">
            Amount
          </th>
          <th scope="col" className="num">
            Qty
          </th>
        </tr>
      </thead>
      <tbody>
        {products.map((p) => (
          <tr key={p.product}>
            <td>{p.product}</td>
            <td className="num">{nairaFormat(p.amountNaira)}</td>
            <td className="num">{p.quantity}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
