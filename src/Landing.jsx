import { useRef, useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import './Landing.css';

const PROFESSIONS = [
  { emoji: '🩺', name: 'Nurse', income: 5200, bar: [35, 30, 20, 15] },
  { emoji: '📚', name: 'Teacher', income: 3800, bar: [38, 28, 22, 12] },
  { emoji: '💻', name: 'Software Engineer', income: 7500, bar: [32, 32, 18, 18] },
  { emoji: '👮', name: 'Police Officer', income: 4200, bar: [36, 30, 20, 14] },
  { emoji: '🔧', name: 'Electrician', income: 4800, bar: [34, 30, 20, 16] },
  { emoji: '⚖️', name: 'Lawyer', income: 9500, bar: [42, 23, 21, 23] },
  { emoji: '💪', name: 'Personal Trainer', income: 3200, bar: [55, 33, 17, 9] },
  { emoji: '✈️', name: 'Flight Attendant', income: 4100, bar: [45, 31, 16, 20] },
  { emoji: '🏗️', name: 'Construction Worker', income: 4600, bar: [46, 28, 17, 12] },
  { emoji: '💊', name: 'Pharmacist', income: 8200, bar: [36, 23, 26, 23] },
  { emoji: '🤝', name: 'Social Worker', income: 3400, bar: [50, 29, 22, 10] },
  { emoji: '🎖️', name: 'Military', income: 3800, bar: [15, 29, 11, 22] },
  { emoji: '👨‍🍳', name: 'Chef / Cook', income: 3100, bar: [52, 32, 16, 7] },
  { emoji: '🚛', name: 'Truck Driver', income: 5100, bar: [45, 25, 20, 17] },
  { emoji: '📊', name: 'Accountant', income: 6200, bar: [39, 25, 19, 22] },
  { emoji: '🩹', name: 'Physical Therapist', income: 6800, bar: [37, 23, 21, 21] },
  { emoji: '🦷', name: 'Dental Hygienist', income: 5800, bar: [38, 24, 21, 21] },
];

const CATEGORY_COLORS = ['#3b82f6', '#f97316', '#22c55e', '#a855f7'];

const FAQ_ITEMS = [
  {
    q: 'Is this a subscription?',
    a: 'No. BudgetFlow Premium is a one time payment of $17. Pay once and use it forever with no recurring charges.',
  },
  {
    q: 'What happens to my data?',
    a: 'Your budget data is saved locally in your browser. It stays on your device and is never shared or sold.',
  },
  {
    q: 'Can I use it on my phone?',
    a: 'Yes. BudgetFlow works on any device with a browser including iPhone and Android.',
  },
  {
    q: 'What professions are included?',
    a: 'We include templates for Nurse, Teacher, Software Engineer, Police Officer, Electrician, Lawyer, Personal Trainer, Flight Attendant, Construction Worker, Pharmacist, Social Worker, Military, Chef, Truck Driver, Accountant, Physical Therapist, Dental Hygienist and more. You can also create fully custom planners for any income.',
  },
  {
    q: 'Can I try it before buying?',
    a: 'Absolutely. The free tier gives you full access to one planner with no credit card required.',
  },
];

export default function Landing() {
  const navigate = useNavigate();
  const featuresRef = useRef(null);
  const [openFaq, setOpenFaq] = useState(null);
  const sectionRefs = useRef({});
  const [visibleSections, setVisibleSections] = useState(() => []);

  useEffect(() => {
    const refs = sectionRefs.current;
    const indices = [0, 1, 2, 3, 4];
    const observers = [];
    indices.forEach((i) => {
      const el = refs[i];
      if (!el) return;
      const observer = new IntersectionObserver(
        ([entry]) => {
          if (!entry.isIntersecting) return;
          setVisibleSections((prev) => (prev.includes(i) ? prev : [...prev, i]));
        },
        { threshold: 0.1, rootMargin: '0px 0px -40px 0px' }
      );
      observer.observe(el);
      observers.push(observer);
    });
    return () => observers.forEach((o) => o.disconnect());
  }, []);

  const scrollToFeatures = () => {
    featuresRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <div className="landing">
      <style>{`html { scroll-behavior: smooth; }`}</style>

      <header className="landing-header">
        <span className="landing-header-brand">BudgetFlow</span>
        <Link to="/sign-in" className="landing-header-signin">Sign In</Link>
      </header>

      {/* Hero */}
      <section className="landing-hero">
        <div className="landing-hero-glow" aria-hidden />
        <h1 className="landing-hero-title">Take Control of Your Money</h1>
        <p className="landing-hero-sub">
          The budgeting tool built for real people with real incomes. Track every dollar, plan every month, and finally see where your money goes.
        </p>
        <div className="landing-hero-ctas">
          <button type="button" className="landing-btn landing-btn-primary" onClick={() => navigate('/sign-up')}>
            Start Budgeting Free →
          </button>
          <button type="button" className="landing-btn landing-btn-secondary" onClick={scrollToFeatures}>
            See How It Works
          </button>
        </div>
      </section>

      {/* Profession Examples */}
      <section id="features" className={`landing-section ${visibleSections.includes(0) ? 'landing-section-visible' : ''}`} ref={(el) => { featuresRef.current = el; sectionRefs.current[0] = el; }}>
        <h2 className="landing-section-title">Built for Every Profession</h2>
        <div className="landing-profession-cards">
          {PROFESSIONS.map((p) => (
            <div key={p.name} className="landing-profession-card">
              <span className="landing-profession-emoji">{p.emoji}</span>
              <span className="landing-profession-name">{p.name}</span>
              <span className="landing-profession-income">
                {new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(p.income)}/mo
              </span>
              <div className="landing-profession-bar">
                {p.bar.map((pct, i) => (
                  <span
                    key={i}
                    className="landing-profession-bar-seg"
                    style={{ width: `${pct}%`, backgroundColor: CATEGORY_COLORS[i] }}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
        <p className="landing-profession-note">Don't see your profession? Create a custom planner for any income.</p>
      </section>

      {/* App Preview */}
      <section className={`landing-section ${visibleSections.includes(1) ? 'landing-section-visible' : ''}`} ref={(el) => { sectionRefs.current[1] = el; }}>
        <h2 className="landing-section-title">Everything in One View</h2>
        <div className="landing-preview-frame">
          <div className="landing-preview-titlebar">
            <span className="landing-preview-dots">● ● ●</span>
            <span>BudgetFlow</span>
          </div>
          <div className="landing-preview-inner">
            <div className="landing-preview-panels">
              {['Bills', 'Expenses', 'Debt', 'Savings'].map((title) => (
                <div key={title} className="landing-preview-panel">
                  <div className="landing-preview-panel-title">{title}</div>
                  <div className="landing-preview-row" />
                  <div className="landing-preview-row" />
                  <div className="landing-preview-row" />
                </div>
              ))}
            </div>
            <div className="landing-preview-chart">
              <div className="landing-preview-donut" />
              <span className="landing-preview-chart-label">$4,200</span>
            </div>
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section className={`landing-section ${visibleSections.includes(2) ? 'landing-section-visible' : ''}`} ref={(el) => { sectionRefs.current[2] = el; }}>
        <h2 className="landing-section-title">Simple Pricing</h2>
        <div className="landing-pricing">
          <div className="landing-pricing-card">
            <h3 className="landing-pricing-title">Free</h3>
            <p className="landing-pricing-price">$0</p>
            <ul className="landing-pricing-features">
              <li className="landing-pricing-yes">1 budget planner</li>
              <li className="landing-pricing-yes">All 4 spending categories</li>
              <li className="landing-pricing-yes">Live chart breakdown</li>
              <li className="landing-pricing-yes">Profession templates</li>
              <li className="landing-pricing-no">Multiple planners</li>
              <li className="landing-pricing-no">Annual overview</li>
              <li className="landing-pricing-no">Unlimited line items</li>
            </ul>
            <button type="button" className="landing-btn landing-btn-outline" onClick={() => navigate('/sign-up')}>
              Get Started Free
            </button>
          </div>
          <div className="landing-pricing-card landing-pricing-card-premium">
            <span className="landing-pricing-badge">Most Popular</span>
            <h3 className="landing-pricing-title">Premium</h3>
            <p className="landing-pricing-price landing-pricing-price-gold">$17</p>
            <p className="landing-pricing-sub">One time payment — yours forever</p>
            <ul className="landing-pricing-features">
              <li className="landing-pricing-yes">Everything in Free</li>
              <li className="landing-pricing-yes">Unlimited planners</li>
              <li className="landing-pricing-yes">Annual overview & reporting</li>
              <li className="landing-pricing-yes">Unlimited line items</li>
              <li className="landing-pricing-yes">Priority support</li>
            </ul>
            <button
              type="button"
              className="landing-btn landing-btn-primary"
              onClick={() => {
                const base = 'https://buy.stripe.com/00wdR3bYY94te5Z5nYffy00';
                const successUrl = 'https://budget-planner-production.up.railway.app/success';
                const cancelUrl = 'https://budget-planner-production.up.railway.app/cancel';
                const url = `${base}?success_url=${encodeURIComponent(successUrl)}&cancel_url=${encodeURIComponent(cancelUrl)}`;
                window.location.href = url;
              }}
            >
              Get Premium — $17
            </button>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className={`landing-section ${visibleSections.includes(3) ? 'landing-section-visible' : ''}`} ref={(el) => { sectionRefs.current[3] = el; }}>
        <h2 className="landing-section-title">Common Questions</h2>
        <div className="landing-faq">
          {FAQ_ITEMS.map((item, i) => (
            <div
              key={i}
              className={`landing-faq-item ${openFaq === i ? 'landing-faq-item-open' : ''}`}
              onClick={() => setOpenFaq(openFaq === i ? null : i)}
            >
              <button type="button" className="landing-faq-q" aria-expanded={openFaq === i}>
                {item.q}
                <span className="landing-faq-icon">{openFaq === i ? '−' : '+'}</span>
              </button>
              <div className="landing-faq-a">{item.a}</div>
            </div>
          ))}
        </div>
      </section>

      {/* Footer */}
      <footer className={`landing-footer ${visibleSections.includes(4) ? 'landing-section-visible' : ''}`} ref={(el) => { sectionRefs.current[4] = el; }}>
        <span className="landing-footer-brand">BudgetFlow</span>
        <p className="landing-footer-copy">© 2026 BudgetFlow. All rights reserved.</p>
        <div className="landing-footer-links">
          <a href="#privacy">Privacy Policy</a>
          <a href="#terms">Terms of Service</a>
        </div>
      </footer>
    </div>
  );
}
