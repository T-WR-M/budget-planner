import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import './PaymentResult.css';

export default function CancelPage() {
  const navigate = useNavigate();

  useEffect(() => {
    const t = setTimeout(() => navigate('/', { replace: true }), 3000);
    return () => clearTimeout(t);
  }, [navigate]);

  return (
    <div className="payment-result-page payment-result-cancel">
      <div className="payment-result-card">
        <div className="payment-result-accent" />
        <p className="payment-result-emoji">👋</p>
        <h1 className="payment-result-title">Payment cancelled</h1>
        <p className="payment-result-sub">No charge was made. Redirecting you back...</p>
      </div>
    </div>
  );
}
