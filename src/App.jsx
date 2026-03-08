import { useState, useCallback } from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer } from 'recharts';
import './App.css';

const PANEL_KEYS = ['bills', 'expenses', 'debt', 'savings'];

const PANELS = [
  {
    key: 'bills',
    title: 'Bills',
    accent: '#2563eb',
    placeholders: ['Rent', 'Utilities', 'Netflix', 'Insurance', 'Phone', 'Internet', 'Streaming', 'Renters insurance', 'Gym', 'Other'],
  },
  {
    key: 'expenses',
    title: 'Expenses',
    accent: '#f97316',
    placeholders: ['Groceries', 'Gas', 'Dining', 'Entertainment', 'Clothing', 'Personal care', 'Household', 'Pets', 'Travel', 'Other'],
  },
  {
    key: 'debt',
    title: 'Debt',
    accent: '#16a34a',
    placeholders: ['Credit card', 'Student loans', 'Car payment', 'Medical debt', 'Personal loan', 'Other card', 'Other loan', 'Medical', 'Other', 'Other'],
  },
  {
    key: 'savings',
    title: 'Savings & Investments',
    accent: '#7c3aed',
    placeholders: ['Emergency fund', '401(k)', 'Roth IRA', 'Stocks', 'Sinking fund', 'HSA', 'Other savings', 'Brokerage', 'Savings goal', 'Other'],
  },
];

const CHART_COLORS = { bills: '#2563eb', expenses: '#f97316', debt: '#16a34a', savings: '#7c3aed' };

const PROFESSIONS = [
  { id: 'nurse', emoji: '👩‍⚕️', label: 'Nurse', monthly: 5200 },
  { id: 'teacher', emoji: '👨‍🏫', label: 'Teacher', monthly: 3800 },
  { id: 'software', emoji: '💻', label: 'Software Engineer', monthly: 7500 },
  { id: 'police', emoji: '🚔', label: 'Police Officer', monthly: 4200 },
  { id: 'electrician', emoji: '🔧', label: 'Electrician', monthly: 4800 },
  { id: 'custom', emoji: '✏️', label: 'Custom', monthly: null },
];

// Profession templates: pre-filled item names and planned amounts (realistic for that salary)
const PROFESSION_TEMPLATES = {
  nurse: {
    income: 5200,
    bills: [
      { name: 'Rent', planned: 1300 },
      { name: 'Utilities', planned: 150 },
      { name: 'Phone', planned: 85 },
      { name: 'Internet', planned: 65 },
      { name: 'Netflix / streaming', planned: 45 },
      { name: 'Car insurance', planned: 180 },
      { name: 'Health insurance', planned: 120 },
      { name: 'Renters insurance', planned: 25 },
      { name: 'Gym', planned: 40 },
      { name: '', planned: '' },
    ],
    expenses: [
      { name: 'Groceries', planned: 450 },
      { name: 'Gas', planned: 220 },
      { name: 'Dining out', planned: 150 },
      { name: 'Entertainment', planned: 80 },
      { name: 'Clothing', planned: 60 },
      { name: 'Personal care', planned: 50 },
      { name: 'Household', planned: 75 },
      { name: 'Pets', planned: 0 },
      { name: 'Travel', planned: 100 },
      { name: '', planned: '' },
    ],
    debt: [
      { name: 'Car payment', planned: 320 },
      { name: 'Student loans', planned: 280 },
      { name: 'Credit card', planned: 150 },
      { name: '', planned: '' },
      { name: '', planned: '' },
      { name: '', planned: '' },
      { name: '', planned: '' },
      { name: '', planned: '' },
      { name: '', planned: '' },
      { name: '', planned: '' },
    ],
    savings: [
      { name: 'Emergency fund', planned: 200 },
      { name: '401(k)', planned: 260 },
      { name: 'Roth IRA', planned: 0 },
      { name: '', planned: '' },
      { name: '', planned: '' },
      { name: '', planned: '' },
      { name: '', planned: '' },
      { name: '', planned: '' },
      { name: '', planned: '' },
      { name: '', planned: '' },
    ],
  },
  teacher: {
    income: 3800,
    bills: [
      { name: 'Rent', planned: 950 },
      { name: 'Utilities', planned: 120 },
      { name: 'Phone', planned: 75 },
      { name: 'Internet', planned: 55 },
      { name: 'Streaming', planned: 35 },
      { name: 'Car insurance', planned: 140 },
      { name: 'Health insurance', planned: 90 },
      { name: 'Renters insurance', planned: 20 },
      { name: '', planned: '' },
      { name: '', planned: '' },
    ],
    expenses: [
      { name: 'Groceries', planned: 350 },
      { name: 'Gas', planned: 180 },
      { name: 'Dining out', planned: 100 },
      { name: 'Entertainment', planned: 50 },
      { name: 'Clothing', planned: 40 },
      { name: 'Personal care', planned: 35 },
      { name: 'Household', planned: 50 },
      { name: 'Classroom supplies', planned: 30 },
      { name: '', planned: '' },
      { name: '', planned: '' },
    ],
    debt: [
      { name: 'Student loans', planned: 350 },
      { name: 'Car payment', planned: 0 },
      { name: 'Credit card', planned: 100 },
      { name: '', planned: '' },
      { name: '', planned: '' },
      { name: '', planned: '' },
      { name: '', planned: '' },
      { name: '', planned: '' },
      { name: '', planned: '' },
      { name: '', planned: '' },
    ],
    savings: [
      { name: 'Emergency fund', planned: 150 },
      { name: '403(b)', planned: 190 },
      { name: '', planned: '' },
      { name: '', planned: '' },
      { name: '', planned: '' },
      { name: '', planned: '' },
      { name: '', planned: '' },
      { name: '', planned: '' },
      { name: '', planned: '' },
      { name: '', planned: '' },
    ],
  },
  software: {
    income: 7500,
    bills: [
      { name: 'Rent / mortgage', planned: 2200 },
      { name: 'Utilities', planned: 200 },
      { name: 'Phone', planned: 90 },
      { name: 'Internet', planned: 80 },
      { name: 'Streaming', planned: 60 },
      { name: 'Car insurance', planned: 220 },
      { name: 'Health insurance', planned: 150 },
      { name: 'Home insurance', planned: 120 },
      { name: 'Gym', planned: 50 },
      { name: '', planned: '' },
    ],
    expenses: [
      { name: 'Groceries', planned: 600 },
      { name: 'Gas', planned: 250 },
      { name: 'Dining out', planned: 350 },
      { name: 'Entertainment', planned: 150 },
      { name: 'Clothing', planned: 100 },
      { name: 'Personal care', planned: 80 },
      { name: 'Household', planned: 100 },
      { name: 'Travel', planned: 200 },
      { name: 'Subscriptions', planned: 80 },
      { name: '', planned: '' },
    ],
    debt: [
      { name: 'Car payment', planned: 450 },
      { name: 'Student loans', planned: 300 },
      { name: 'Credit card', planned: 200 },
      { name: '', planned: '' },
      { name: '', planned: '' },
      { name: '', planned: '' },
      { name: '', planned: '' },
      { name: '', planned: '' },
      { name: '', planned: '' },
      { name: '', planned: '' },
    ],
    savings: [
      { name: 'Emergency fund', planned: 500 },
      { name: '401(k)', planned: 750 },
      { name: 'Roth IRA', planned: 500 },
      { name: 'Brokerage', planned: 300 },
      { name: 'HSA', planned: 200 },
      { name: '', planned: '' },
      { name: '', planned: '' },
      { name: '', planned: '' },
      { name: '', planned: '' },
      { name: '', planned: '' },
    ],
  },
  police: {
    income: 4200,
    bills: [
      { name: 'Rent', planned: 1100 },
      { name: 'Utilities', planned: 140 },
      { name: 'Phone', planned: 80 },
      { name: 'Internet', planned: 60 },
      { name: 'Streaming', planned: 40 },
      { name: 'Car insurance', planned: 160 },
      { name: 'Health insurance', planned: 95 },
      { name: 'Renters insurance', planned: 22 },
      { name: '', planned: '' },
      { name: '', planned: '' },
    ],
    expenses: [
      { name: 'Groceries', planned: 400 },
      { name: 'Gas', planned: 200 },
      { name: 'Dining out', planned: 120 },
      { name: 'Entertainment', planned: 70 },
      { name: 'Clothing', planned: 50 },
      { name: 'Personal care', planned: 45 },
      { name: 'Household', planned: 60 },
      { name: 'Uniform / gear', planned: 30 },
      { name: '', planned: '' },
      { name: '', planned: '' },
    ],
    debt: [
      { name: 'Car payment', planned: 380 },
      { name: 'Credit card', planned: 120 },
      { name: 'Student loans', planned: 0 },
      { name: '', planned: '' },
      { name: '', planned: '' },
      { name: '', planned: '' },
      { name: '', planned: '' },
      { name: '', planned: '' },
      { name: '', planned: '' },
      { name: '', planned: '' },
    ],
    savings: [
      { name: 'Emergency fund', planned: 200 },
      { name: '457 / 401(k)', planned: 210 },
      { name: '', planned: '' },
      { name: '', planned: '' },
      { name: '', planned: '' },
      { name: '', planned: '' },
      { name: '', planned: '' },
      { name: '', planned: '' },
      { name: '', planned: '' },
      { name: '', planned: '' },
    ],
  },
  electrician: {
    income: 4800,
    bills: [
      { name: 'Rent / mortgage', planned: 1200 },
      { name: 'Utilities', planned: 160 },
      { name: 'Phone', planned: 85 },
      { name: 'Internet', planned: 65 },
      { name: 'Streaming', planned: 45 },
      { name: 'Car insurance', planned: 175 },
      { name: 'Health insurance', planned: 110 },
      { name: 'Tools / work insurance', planned: 50 },
      { name: '', planned: '' },
      { name: '', planned: '' },
    ],
    expenses: [
      { name: 'Groceries', planned: 450 },
      { name: 'Gas', planned: 220 },
      { name: 'Dining out', planned: 140 },
      { name: 'Entertainment', planned: 80 },
      { name: 'Clothing / workwear', planned: 70 },
      { name: 'Personal care', planned: 50 },
      { name: 'Household', planned: 65 },
      { name: 'Vehicle maintenance', planned: 100 },
      { name: '', planned: '' },
      { name: '', planned: '' },
    ],
    debt: [
      { name: 'Car payment', planned: 400 },
      { name: 'Credit card', planned: 150 },
      { name: '', planned: '' },
      { name: '', planned: '' },
      { name: '', planned: '' },
      { name: '', planned: '' },
      { name: '', planned: '' },
      { name: '', planned: '' },
      { name: '', planned: '' },
      { name: '', planned: '' },
    ],
    savings: [
      { name: 'Emergency fund', planned: 250 },
      { name: '401(k) / union', planned: 240 },
      { name: 'Sinking fund (tools)', planned: 80 },
      { name: '', planned: '' },
      { name: '', planned: '' },
      { name: '', planned: '' },
      { name: '', planned: '' },
      { name: '', planned: '' },
      { name: '', planned: '' },
      { name: '', planned: '' },
    ],
  },
};

function createRow(id, name = '', planned = '', actual = '') {
  return { id, name, planned: planned === '' ? '' : String(planned), actual: actual === '' ? '' : String(actual) };
}

function createEmptyPanel(placeholders, count = 10) {
  return Array.from({ length: count }, (_, i) =>
    createRow(`row-${Date.now()}-${i}`, '', '', '')
  );
}

function templateToRows(templateRows, minRows = 10) {
  const base = (templateRows || []).map((r, i) =>
    createRow(`row-${Date.now()}-${i}`, r.name, r.planned, '')
  );
  while (base.length < minRows) {
    base.push(createRow(`row-${Date.now()}-${base.length}`, '', '', ''));
  }
  return base;
}

const initialPanels = () => {
  const panels = {};
  PANEL_KEYS.forEach((key) => {
    const config = PANELS.find((p) => p.key === key);
    panels[key] = createEmptyPanel(config?.placeholders || [], 10);
  });
  return panels;
};

function App() {
  const [income, setIncome] = useState('');
  const [selectedProfession, setSelectedProfession] = useState(null);
  const [panels, setPanels] = useState(initialPanels);

  const handleProfessionClick = useCallback((prof) => {
    setSelectedProfession(prof.id);
    if (prof.id === 'custom') {
      setIncome('');
      return;
    }
    const template = PROFESSION_TEMPLATES[prof.id];
    if (!template) return;
    setIncome(String(template.income));
    setPanels({
      bills: templateToRows(template.bills),
      expenses: templateToRows(template.expenses),
      debt: templateToRows(template.debt),
      savings: templateToRows(template.savings),
    });
  }, []);

  const handleIncomeChange = useCallback((e) => {
    setIncome(e.target.value);
    setSelectedProfession('custom');
  }, []);

  const updateRow = useCallback((panelKey, rowId, field, value) => {
    setPanels((prev) => ({
      ...prev,
      [panelKey]: prev[panelKey].map((row) =>
        row.id === rowId ? { ...row, [field]: value } : row
      ),
    }));
  }, []);

  const addRow = useCallback((panelKey) => {
    const config = PANELS.find((p) => p.key === panelKey);
    const placeholder = config?.placeholders[0] || '';
    setPanels((prev) => ({
      ...prev,
      [panelKey]: [...prev[panelKey], createRow(`row-${Date.now()}`, '', '', '')],
    }));
  }, []);

  const numIncome = parseFloat(income) || 0;

  const panelTotals = PANEL_KEYS.reduce((acc, key) => {
    const rows = panels[key] || [];
    let planned = 0;
    let actual = 0;
    rows.forEach((row) => {
      planned += parseFloat(row.planned) || 0;
      actual += parseFloat(row.actual) || 0;
    });
    acc[key] = { planned, actual };
    return acc;
  }, {});

  const totalPlanned = PANEL_KEYS.reduce((sum, key) => sum + panelTotals[key].planned, 0);
  const totalActual = PANEL_KEYS.reduce((sum, key) => sum + panelTotals[key].actual, 0);
  const remaining = numIncome - totalActual;

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
    totalActual > 0
      ? PANEL_KEYS.filter((key) => panelTotals[key].actual > 0).map((key) => ({
          name: PANELS.find((p) => p.key === key).title,
          value: panelTotals[key].actual,
          color: CHART_COLORS[key],
        }))
      : [
          { name: 'Bills', value: 1, color: '#94a3b8' },
          { name: 'Expenses', value: 1, color: '#cbd5e1' },
          { name: 'Debt', value: 1, color: '#e2e8f0' },
          { name: 'Savings', value: 1, color: '#f1f5f9' },
        ];

  const chartLegendItems =
    totalActual > 0
      ? PANEL_KEYS.map((key) => ({
          name: PANELS.find((p) => p.key === key).title,
          actual: panelTotals[key].actual,
          color: CHART_COLORS[key],
          pct: numIncome > 0 ? (panelTotals[key].actual / numIncome) * 100 : 0,
        }))
      : [];

  return (
    <div className="app">
      <header className="header">
        <h1 className="app-title">BudgetFlow</h1>
        <p className="app-tagline">Your monthly budget tracker</p>
      </header>

      <main className="main">
        <section className="income-section">
          <p className="profession-label">Choose a profession to pre-fill your budget</p>
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
            Monthly income
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
          <p className="remaining-balance">
            Remaining balance: <span className={remaining >= 0 ? 'remaining-positive' : 'remaining-negative'}>{formatCurrency(String(remaining))}</span>
          </p>
        </section>

        <section className="panels-section">
          {PANELS.map((panel) => {
            const rows = panels[panel.key] || [];
            const totals = panelTotals[panel.key] || { planned: 0, actual: 0 };
            const pctIncome = numIncome > 0 ? (totals.actual / numIncome) * 100 : 0;
            return (
              <div key={panel.key} className="budget-panel card" data-panel={panel.key}>
                <div className="panel-accent" style={{ background: panel.accent }} />
                <h2 className="panel-title" style={{ borderBottomColor: panel.accent }}>{panel.title}</h2>
                <div className="panel-totals panel-totals-top">
                  <div className="panel-totals-main">
                    <span className="panel-total-actual" style={{ color: panel.accent }}>{formatCurrency(totals.actual)}</span>
                    <span className="panel-total-planned">Planned {formatCurrency(totals.planned)}</span>
                  </div>
                  <span className="panel-total-pct-large">{pctIncome.toFixed(1)}%</span>
                </div>
                <div className="panel-rows">
                  <div className="panel-row panel-row-header">
                    <span className="row-label">Item</span>
                    <span className="row-planned">Planned</span>
                    <span className="row-actual">Actual</span>
                  </div>
                  {rows.map((row, idx) => (
                    <div key={row.id} className="panel-row">
                      <input
                        type="text"
                        className="row-input row-name"
                        placeholder={panel.placeholders[idx] || 'Item'}
                        value={row.name}
                        onChange={(e) => updateRow(panel.key, row.id, 'name', e.target.value)}
                      />
                      <input
                        type="number"
                        inputMode="decimal"
                        className="row-input row-amount"
                        placeholder="0"
                        value={row.planned}
                        onChange={(e) => updateRow(panel.key, row.id, 'planned', e.target.value)}
                        min="0"
                        step="0.01"
                      />
                      <input
                        type="number"
                        inputMode="decimal"
                        className="row-input row-amount"
                        placeholder="0"
                        value={row.actual}
                        onChange={(e) => updateRow(panel.key, row.id, 'actual', e.target.value)}
                        min="0"
                        step="0.01"
                      />
                    </div>
                  ))}
                </div>
                <button type="button" className="add-row-btn" onClick={() => addRow(panel.key)} style={{ borderColor: panel.accent, color: panel.accent }}>
                  + Add row
                </button>
              </div>
            );
          })}
        </section>

        <section className="chart-section">
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
              <div className={`chart-center-label ${totalActual === 0 ? 'chart-center-label-placeholder' : ''}`}>
                {totalActual > 0 ? formatCurrency(String(totalActual)) : '$0'}
              </div>
              {totalActual > 0 && <div className="chart-center-sublabel">Total spent</div>}
            </div>
            <div className="chart-legend">
              {totalActual > 0
                ? chartLegendItems.map((item) => (
                    <div key={item.name} className="chart-legend-item">
                      <span className="chart-legend-dot" style={{ backgroundColor: item.color }} />
                      <span className="chart-legend-name">{item.name}</span>
                      <span className="chart-legend-amount">{formatCurrency(item.actual)}</span>
                      <span className="chart-legend-pct">({item.pct.toFixed(1)}%)</span>
                    </div>
                  ))
                : chartData.map((entry) => (
                    <div key={entry.name} className="chart-legend-item chart-legend-placeholder">
                      <span className="chart-legend-dot" style={{ backgroundColor: entry.color }} />
                      <span className="chart-legend-name">{entry.name}</span>
                    </div>
                  ))}
            </div>
          </div>
        </section>

        <section className="summary-bar">
          <div className="summary-item">
            <span className="summary-label">Total income</span>
            <span className="summary-value">{formatCurrency(income || '0')}</span>
          </div>
          <div className="summary-item">
            <span className="summary-label">Total planned</span>
            <span className="summary-value">{formatCurrency(String(totalPlanned))}</span>
          </div>
          <div className="summary-item">
            <span className="summary-label">Total actual spent</span>
            <span className="summary-value">{formatCurrency(String(totalActual))}</span>
          </div>
          <div className="summary-item">
            <span className="summary-label">Remaining balance</span>
            <span className={`summary-value summary-remaining ${remaining >= 0 ? 'summary-remaining-positive' : 'summary-remaining-negative'}`}>
              {formatCurrency(String(remaining))}
            </span>
          </div>
        </section>
      </main>
    </div>
  );
}

export default App;
