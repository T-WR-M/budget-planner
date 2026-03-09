import { SignIn } from '@clerk/clerk-react';
import { Link } from 'react-router-dom';
import './AuthPages.css';

export default function SignInPage() {
  return (
    <div className="auth-page">
      <h1 className="auth-page-logo">BudgetFlow</h1>
      <div className="auth-page-clerk">
        <SignIn />
      </div>
      <Link to="/" className="auth-page-back">
        ← Back to home
      </Link>
    </div>
  );
}
