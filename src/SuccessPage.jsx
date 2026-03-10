import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import './PaymentResult.css';

export default function SuccessPage() {
  const navigate = useNavigate();

  useEffect(() => {
    try {
      localStorage.setItem('budgetflow-premium', 'true');
    } catch (_) {}
    const t = setTimeout(() => navigate('/app', { replace: true }), 3000);
    return () => clearTimeout(t);
  }, [navigate]);

  return (
    <div className="payment-result-page payment-result-success">
      <div className="payment-result-card">
        <div className="payment-result-accent" />
        <p className="payment-result-emoji">🎉</p>
        <h1 className="payment-result-title">Welcome to BudgetFlow Premium!</h1>
        <p className="payment-result-sub">Redirecting you to the app...</p>
      </div>
    </div>
  );
}
