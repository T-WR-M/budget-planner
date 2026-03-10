import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import './PaymentResult.css';

export default function CancelPage() {
  const navigate = useNavigate();

  useEffect(() => {
    const t = setTimeout(() => navigate('/', { replace: true }), 5000);
    return () => clearTimeout(t);
  }, [navigate]);

  return (
    <div
      className="payment-result-page payment-result-cancel"
      style={{ minHeight: '100vh', backgroundColor: '#0f0f0f', color: '#f0f0f0' }}
    >
      <div className="payment-result-card">
        <div className="payment-result-accent" />
        <h1 className="payment-result-title">No worries — your payment was cancelled.</h1>
        <p className="payment-result-sub">No charge was made.</p>
        <button
          type="button"
          className="payment-result-btn"
          onClick={() => navigate('/', { replace: true })}
        >
          Back to BudgetFlow
        </button>
      </div>
    </div>
  );
}
