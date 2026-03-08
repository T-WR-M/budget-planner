import { useState } from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer } from 'recharts';
import './App.css';

const CHART_COLORS = {
  needs: '#2563eb',
  wants: '#f97316',
  savings: '#16a34a',
};

const PROFESSIONS = [
  { id: 'nurse', emoji: '👩‍⚕️', label: 'Nurse', monthly: 5200 },
  { id: 'teacher', emoji: '👨‍🏫', label: 'Teacher', monthly: 3800 },
  { id: 'software', emoji: '💻', label: 'Software Engineer', monthly: 7500 },
  { id: 'police', emoji: '🚔', label: 'Police Officer', monthly: 4200 },
  { id: 'electrician', emoji: '🔧', label: 'Electrician', monthly: 4800 },
  { id: 'custom', emoji: '✏️', label: 'Custom', monthly: null },
];

function App() {
  const [income, setIncome] = useState('');
  const [selectedProfession, setSelectedProfession] = useState(null);

  const handleProfessionClick = (prof) => {
    setSelectedProfession(prof.id);
    setIncome(prof.monthly !== null ? String(prof.monthly) : '');
  };

  const handleIncomeChange = (e) => {
    setIncome(e.target.value);
    setSelectedProfession('custom');
  };

  const numIncome = parseFloat(income) || 0;
  const needsAmount = (numIncome * 0.5).toFixed(2);
  const wantsAmount = (numIncome * 0.3).toFixed(2);
  const savingsAmount = (numIncome * 0.2).toFixed(2);

  const formatCurrency = (value) => {
    const num = parseFloat(value);
    if (isNaN(num) || num === 0) return '$0.00';
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(num);
  };

  const chartData =
    numIncome > 0
      ? [
          { name: 'Needs', value: numIncome * 0.5, color: CHART_COLORS.needs },
          { name: 'Wants', value: numIncome * 0.3, color: CHART_COLORS.wants },
          { name: 'Savings & debt', value: numIncome * 0.2, color: CHART_COLORS.savings },
        ]
      : [
          { name: 'Needs', value: 1, color: '#94a3b8' },
          { name: 'Wants', value: 1, color: '#cbd5e1' },
          { name: 'Savings & debt', value: 1, color: '#e2e8f0' },
        ];

  const legendItems = [
    { name: 'Needs', amount: needsAmount, color: CHART_COLORS.needs },
    { name: 'Wants', amount: wantsAmount, color: CHART_COLORS.wants },
    { name: 'Savings & debt', amount: savingsAmount, color: CHART_COLORS.savings },
  ];

  return (
    <div className="app">
      <header className="header">
        <h1 className="app-title">BudgetFlow</h1>
        <p className="app-tagline">Plan your money with the 50/30/20 rule</p>
      </header>

      <main className="main">
        <section className="income-section">
          <p className="profession-label">Choose a profession or enter your own</p>
          <div className="profession-row">
            {PROFESSIONS.map((prof) => (
              <button
                key={prof.id}
                type="button"
                className={`profession-btn ${selectedProfession === prof.id ? 'profession-btn-selected' : ''} profession-btn-${prof.id === 'custom' ? 'custom' : prof.id}`}
                onClick={() => handleProfessionClick(prof)}
              >
                <span className="profession-emoji">{prof.emoji}</span>
                <span className="profession-name">{prof.label}</span>
                {prof.monthly !== null && (
                  <span className="profession-amount">
                    {new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(prof.monthly)}/mo
                  </span>
                )}
              </button>
            ))}
          </div>
          <label htmlFor="income" className="income-label">
            Monthly take-home pay
          </label>
          <input
            id="income"
            type="number"
            inputMode="decimal"
            placeholder="0.00"
            value={income}
            onChange={handleIncomeChange}
            className="income-input"
            min="0"
            step="0.01"
          />
        </section>

        <section className="breakdown-section">
          <h2 className="breakdown-title">Your budget breakdown</h2>
          <div className="cards">
            <div className="card card-needs">
              <div className="card-accent" />
              <div className="card-content">
                <span className="card-label">Needs</span>
                <span className="card-percent">50%</span>
                <p className="card-desc">Rent, bills, groceries</p>
                <p className="card-amount">{formatCurrency(needsAmount)}</p>
              </div>
            </div>
            <div className="card card-wants">
              <div className="card-accent" />
              <div className="card-content">
                <span className="card-label">Wants</span>
                <span className="card-percent">30%</span>
                <p className="card-desc">Dining, entertainment</p>
                <p className="card-amount">{formatCurrency(wantsAmount)}</p>
              </div>
            </div>
            <div className="card card-savings">
              <div className="card-accent" />
              <div className="card-content">
                <span className="card-label">Savings & debt</span>
                <span className="card-percent">20%</span>
                <p className="card-desc">Emergency fund, payoff debt</p>
                <p className="card-amount">{formatCurrency(savingsAmount)}</p>
              </div>
            </div>
          </div>

          <div className="chart-card">
            <div className="chart-wrapper">
              <ResponsiveContainer width="100%" height={280}>
                <PieChart>
                  <Pie
                    data={chartData}
                    dataKey="value"
                    nameKey="name"
                    innerRadius="58%"
                    outerRadius="88%"
                    paddingAngle={0}
                    isAnimationActive
                    animationDuration={500}
                    animationEasing="ease-out"
                  >
                    {chartData.map((entry, index) => (
                      <Cell key={`${entry.name}-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
              <div className={`chart-center-label ${numIncome === 0 ? 'chart-center-label-placeholder' : ''}`}>
                {numIncome > 0 ? formatCurrency(String(numIncome)) : '$0'}
              </div>
            </div>
            <div className="chart-legend">
              {legendItems.map((item) => (
                <div key={item.name} className="chart-legend-item">
                  <span className="chart-legend-dot" style={{ backgroundColor: item.color }} />
                  <span className="chart-legend-name">{item.name}</span>
                  <span className="chart-legend-amount">{formatCurrency(item.amount)}</span>
                </div>
              ))}
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}

export default App;
