import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import './PaymentResult.css';

export default function SuccessPage() {
  const navigate = useNavigate();

  useEffect(() => {
    try {
      localStorage.setItem('budgetflow-premium', 'true');
    } catch (_) {}
    const t = setTimeout(() => navigate('/app', { replace: true }), 5000);
    return () => clearTimeout(t);
  }, [navigate]);

  return (
    <div
      className="payment-result-page payment-result-success"
      style={{ minHeight: '100vh', backgroundColor: '#0f0f0f', color: '#f0f0f0' }}
    >
      <div className="payment-result-card">
        <div className="payment-result-accent" />
        <p className="payment-result-emoji" aria-hidden>🎉</p>
        <h1 className="payment-result-title">Welcome to BudgetFlow Premium!</h1>
        <p className="payment-result-sub">
          Your payment was successful. You now have full access to all premium features.
        </p>
        <button
          type="button"
          className="payment-result-btn"
          onClick={() => navigate('/app', { replace: true })}
        >
          Go to My Budget →
        </button>
      </div>
    </div>
  );
}
