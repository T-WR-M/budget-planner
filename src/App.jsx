import { useState, useCallback, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth, UserButton } from '@clerk/clerk-react';
import { PieChart, Pie, Cell, ResponsiveContainer } from 'recharts';
import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import {
  SortableContext,
  verticalListSortingStrategy,
  useSortable,
  arrayMove,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import './App.css';

const PANEL_KEYS = ['bills', 'expenses', 'debt', 'savings'];

const PANELS = [
  {
    key: 'bills',
    title: 'Bills',
    accent: '#2563eb',
    placeholders: ['Rent', 'Utilities', 'Phone', 'Internet', 'Netflix / streaming', 'Car insurance', 'Health insurance', 'Renters insurance'],
  },
  {
    key: 'expenses',
    title: 'Expenses',
    accent: '#f97316',
    placeholders: ['Groceries', 'Gas', 'Dining out', 'Entertainment', 'Clothing', 'Personal care', 'Household', 'Pets'],
  },
  {
    key: 'debt',
    title: 'Debt',
    accent: '#16a34a',
    placeholders: ['Car payment', 'Student loans', 'Credit card', 'Medical debt', 'Personal loan', 'Other card', 'Other loan', 'Medical'],
  },
  {
    key: 'savings',
    title: 'Savings & Investments',
    accent: '#7c3aed',
    placeholders: ['Emergency fund', '401(k)', 'Roth IRA', 'Stocks', 'Sinking fund', 'HSA', 'Other savings', 'Brokerage'],
  },
];

const CHART_COLORS = { bills: '#2563eb', expenses: '#f97316', debt: '#16a34a', savings: '#7c3aed' };
const REMAINING_COLOR = '#14b8a6';
const OVER_BUDGET_COLOR = '#ef4444';

const MONTH_KEYS = ['annual', 'jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'];
const CALENDAR_MONTH_KEYS = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'];
const SIDEBAR_TAB_KEYS = [...CALENDAR_MONTH_KEYS, 'goals', 'annual'];
const MONTH_LABELS = { annual: '📊 Annual Overview', goals: '🎯 Goals', jan: 'Jan', feb: 'Feb', mar: 'Mar', apr: 'Apr', may: 'May', jun: 'Jun', jul: 'Jul', aug: 'Aug', sep: 'Sep', oct: 'Oct', nov: 'Nov', dec: 'Dec' };

const GOAL_CATEGORIES = ['Emergency Fund', 'Vacation', 'Car', 'House', 'Education', 'Wedding', 'Retirement', 'Other'];
const GOAL_CATEGORY_COLORS = {
  'Emergency Fund': '#3b82f6',
  'Vacation': '#06b6d4',
  'Car': '#8b5cf6',
  'House': '#c9a84c',
  'Education': '#22c55e',
  'Wedding': '#ec4899',
  'Retirement': '#f97316',
  'Other': '#64748b',
};
const GOAL_PRIORITIES = ['High', 'Medium', 'Low'];
const GOAL_PRIORITY_EMOJI = { High: '🔴', Medium: '🟡', Low: '🟢' };
const STORAGE_KEY = 'budgetflow-planners';

/** Stripe Payment Link — user reaches /success only after Stripe redirects post-payment */
const STRIPE_PAYMENT_LINK = import.meta.env.VITE_STRIPE_PAYMENT_LINK || 'https://buy.stripe.com/test_00wdR3bYY94te5Z5nYffy00';
const STRIPE_SUCCESS_URL = 'https://budget-planner-production.up.railway.app/success';
const STRIPE_CANCEL_URL = 'https://budget-planner-production.up.railway.app/cancel';

const HELP_FAQ = [
  { id: 'getting-started', title: 'Getting Started', items: [
    { q: 'How do I set up my first budget planner?', a: 'When you first open BudgetFlow you will see profession templates in the sidebar. Click any profession to load a pre-built budget template, or click "+ New Planner" at the bottom of the sidebar to create a custom planner. Enter your monthly take-home pay in the income field at the top. Then fill in your planned amounts for each category — Bills, Expenses, Debt, and Savings. As the month progresses come back and fill in your actual amounts to track your real spending.' },
    { q: 'What is the difference between Planned and Actual amounts?', a: 'Planned amounts are what you budget to spend before the month begins. Actual amounts are what you really spent. Filling in both lets you see where you are over or under budget in real time. The chart updates automatically to reflect your actual spending.' },
    { q: 'How do I add a new planner?', a: 'Click the "+ New Planner" button at the bottom of the sidebar. Enter a name and your monthly income. A new blank planner will be created and added to your sidebar. You can create planners for different scenarios like a side hustle income or a partner\'s budget.' },
    { q: 'How do I save and switch between planners?', a: 'Click the Save button in the top right to save your current planner. To switch planners click any planner name in the sidebar. Your data auto-saves every 30 seconds as well. Each planner stores its own independent data for all 12 months.' },
  ]},
  { id: 'tracking', title: 'Tracking Your Budget', pillLabel: 'Chart', items: [
    { q: 'How do I track planned vs actual spending?', a: 'Each row in the 4 budget panels has three fields: Item name, Planned amount, and Actual amount. Fill in Planned at the start of the month. As you spend money throughout the month update the Actual column. The chart and totals update instantly to show your real spending vs your plan.' },
    { q: 'How do I read the chart?', a: 'The donut chart at the top shows how your actual spending is distributed across all 4 categories plus your remaining balance. Each color represents a category: Blue is Bills, Orange is Expenses, Green is Debt, Purple is Savings, and Teal is your Remaining balance. The percentages show what portion of your income goes to each area. Hover over a slice to see exact amounts.' },
    { q: 'Can I add more line items to a category?', a: 'Free users can have up to 8 rows per category. Premium users can add unlimited rows using the "+ Add row" button at the bottom of each panel. To remove a row hover over it and click the × delete button on the right side.' },
  ]},
  { id: 'goals', title: 'Goals', items: [
    { q: 'How do I use the Goals tab?', a: 'Click the "🎯 Goals" tab under any planner in the sidebar. Click "+ Add Goal" to create a new savings goal. Fill in the goal name, category, target amount, how much you have already saved, and your monthly contribution. BudgetFlow will automatically calculate your estimated completion date. The progress bar updates as you save more money toward your goal.' },
    { q: 'How is the estimated completion date calculated?', a: 'BudgetFlow takes your target amount, subtracts what you have already saved, and divides by your monthly contribution to calculate how many months until you reach your goal. For example if your goal is $10,000, you have saved $2,000, and you contribute $200/month — you have $8,000 remaining which is 40 months or about 3 years and 4 months.' },
  ]},
  { id: 'annual', title: 'Annual Overview', items: [
    { q: 'What is the Annual Overview?', a: 'The Annual Overview tab summarizes your entire year of budgeting in one view. It adds up all 12 months of actual spending for each category and shows your total annual income, total spent, and remaining balance. The line items dropdown shows every expense you entered across all months sorted alphabetically with annual totals.' },
    { q: 'Why are some months showing $0 in the Annual Overview?', a: 'Only months where you have entered actual amounts will show data. Future months you haven\'t filled in yet will show $0 in the actual column but will still show your planned amounts.' },
  ]},
  { id: 'premium', title: 'Premium', items: [
    { q: 'What do I get with Premium?', a: 'BudgetFlow Premium is a one time payment of $17. It unlocks unlimited planners, the Annual Overview tab, and unlimited line items per category. Free users are limited to 1 planner and 8 rows per category.' },
    { q: 'Is Premium a subscription?', a: 'No. It is a one time payment of $17. Pay once and use BudgetFlow Premium forever with no recurring charges.' },
    { q: 'How do I upgrade to Premium?', a: 'Click the lock icon next to any premium feature or click "+ New Planner" when you already have one planner. The upgrade modal will appear with a button to complete your purchase.' },
  ]},
  { id: 'saving-data', title: 'Saving Your Data', items: [
    { q: 'Where is my data stored?', a: 'Your budget data is saved locally in your browser using localStorage. It stays on your device and is never uploaded to a server or shared with anyone. This means your data is private but is tied to the specific browser and device you use.' },
    { q: 'Will I lose my data if I clear my browser?', a: 'Yes. Since data is stored locally in your browser, clearing your browser cache or cookies will erase your budget data. We recommend taking a screenshot or exporting your budget regularly. Cloud sync is coming in a future update.' },
    { q: 'Can I use BudgetFlow on multiple devices?', a: 'Currently your data is stored locally so it does not sync between devices. Cloud sync across devices is on our roadmap for a future update.' },
  ]},
];
const PLANNERS_VERSION = '3';
const PLANNERS_VERSION_KEY = 'budgetflow-planners-version';

function sumTemplatePlanned(arr) {
  if (!Array.isArray(arr)) return 0;
  return arr.reduce((s, r) => s + (Number(r.planned) || 0), 0);
}

const GOAL3_LOWER_IDS = ['teacher', 'socialWorker', 'personalTrainer', 'military', 'chef'];
const GOAL3_HIGH_IDS = ['lawyer', 'software', 'pharmacist'];

function getTemplateGoals(template, professionId) {
  const income = Number(template.income) || 0;
  const monthlyExpenses =
    sumTemplatePlanned(template.bills) + sumTemplatePlanned(template.expenses) + sumTemplatePlanned(template.debt);
  const emergencyTarget = Math.max(1000, Math.round(monthlyExpenses * 4.5));
  const emergencySaved = Math.round(emergencyTarget * 0.35);
  const emergencyMonthly = Math.max(50, Math.round(income * 0.05));

  const isHighEarner = GOAL3_HIGH_IDS.includes(professionId);
  const vacationTarget = isHighEarner ? 5000 : 3000;
  const vacationSaved = Math.round(vacationTarget * 0.22);
  const vacationMonthly = isHighEarner ? 200 : 100;

  let goal3;
  if (GOAL3_LOWER_IDS.includes(professionId)) {
    goal3 = {
      name: 'New Car Fund',
      category: 'Car',
      priority: 'Medium',
      targetAmount: 8000,
      currentSaved: 1000,
      monthlyContribution: 150,
      targetDate: '2028-06-01',
      notes: 'Saving for a reliable used car',
    };
  } else if (isHighEarner) {
    goal3 = {
      name: 'Investment Portfolio',
      category: 'Retirement',
      priority: 'High',
      targetAmount: 50000,
      currentSaved: 11250,
      monthlyContribution: 800,
      targetDate: '2027-12-01',
      notes: 'Building a diversified investment portfolio',
    };
  } else {
    goal3 = {
      name: 'Home Down Payment',
      category: 'House',
      priority: 'High',
      targetAmount: 25000,
      currentSaved: 4375,
      monthlyContribution: 300,
      targetDate: '2028-12-01',
      notes: 'Saving for a 10% down payment on a home',
    };
  }

  return [
    {
      name: 'Emergency Fund',
      category: 'Emergency Fund',
      priority: 'High',
      targetAmount: emergencyTarget,
      currentSaved: emergencySaved,
      monthlyContribution: emergencyMonthly,
      targetDate: '2027-09-01',
      notes: '3-6 months of living expenses for financial security',
    },
    {
      name: 'Vacation Fund',
      category: 'Vacation',
      priority: 'Medium',
      targetAmount: vacationTarget,
      currentSaved: vacationSaved,
      monthlyContribution: vacationMonthly,
      targetDate: '2026-12-01',
      notes: 'Annual vacation savings fund',
    },
    goal3,
  ];
}

if (!localStorage.getItem('budgetflow-v2')) {
  localStorage.removeItem('budgetflow-planners');
  localStorage.setItem('budgetflow-v2', 'true');
}

// Profession templates for default planners: pre-filled item names and planned amounts (realistic for that salary)
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
  lawyer: {
    income: 9500,
    bills: [
      { name: 'Rent', planned: 2800 },
      { name: 'Utilities', planned: 180 },
      { name: 'Phone', planned: 120 },
      { name: 'Internet', planned: 80 },
      { name: 'Bar dues', planned: 150 },
      { name: 'Malpractice insurance', planned: 200 },
      { name: 'Car insurance', planned: 180 },
      { name: 'Renters/home insurance', planned: 100 },
      { name: '', planned: '' },
      { name: '', planned: '' },
    ],
    expenses: [
      { name: 'Groceries', planned: 500 },
      { name: 'Dining out', planned: 400 },
      { name: 'Gas', planned: 150 },
      { name: 'Clothing', planned: 300 },
      { name: 'Personal care', planned: 100 },
      { name: 'Entertainment', planned: 200 },
      { name: 'Travel', planned: 400 },
      { name: 'Household', planned: 100 },
      { name: '', planned: '' },
      { name: '', planned: '' },
    ],
    debt: [
      { name: 'Student loans', planned: 1200 },
      { name: 'Car payment', planned: 450 },
      { name: 'Credit card', planned: 300 },
      { name: 'Personal loan', planned: 0 },
      { name: '', planned: '' },
      { name: '', planned: '' },
      { name: '', planned: '' },
      { name: '', planned: '' },
      { name: '', planned: '' },
      { name: '', planned: '' },
    ],
    savings: [
      { name: 'Emergency fund', planned: 500 },
      { name: '401(k)', planned: 800 },
      { name: 'Roth IRA', planned: 300 },
      { name: 'Stocks', planned: 400 },
      { name: 'Sinking fund', planned: 200 },
      { name: '', planned: '' },
      { name: '', planned: '' },
      { name: '', planned: '' },
      { name: '', planned: '' },
      { name: '', planned: '' },
    ],
  },
  personalTrainer: {
    income: 3200,
    bills: [
      { name: 'Rent', planned: 1100 },
      { name: 'Utilities', planned: 100 },
      { name: 'Phone', planned: 85 },
      { name: 'Internet', planned: 60 },
      { name: 'Gym membership', planned: 50 },
      { name: 'Certification renewal', planned: 30 },
      { name: 'Car insurance', planned: 150 },
      { name: 'Health insurance', planned: 200 },
      { name: '', planned: '' },
      { name: '', planned: '' },
    ],
    expenses: [
      { name: 'Groceries', planned: 400 },
      { name: 'Supplements', planned: 150 },
      { name: 'Gas', planned: 180 },
      { name: 'Dining out', planned: 120 },
      { name: 'Clothing/gear', planned: 100 },
      { name: 'Personal care', planned: 60 },
      { name: 'Entertainment', planned: 80 },
      { name: 'Household', planned: 60 },
      { name: '', planned: '' },
      { name: '', planned: '' },
    ],
    debt: [
      { name: 'Car payment', planned: 280 },
      { name: 'Student loans', planned: 150 },
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
      { name: 'Emergency fund', planned: 100 },
      { name: '401(k)', planned: 0 },
      { name: 'Roth IRA', planned: 100 },
      { name: 'Stocks', planned: 50 },
      { name: 'Sinking fund', planned: 50 },
      { name: '', planned: '' },
      { name: '', planned: '' },
      { name: '', planned: '' },
      { name: '', planned: '' },
      { name: '', planned: '' },
    ],
  },
  flightAttendant: {
    income: 4100,
    bills: [
      { name: 'Rent', planned: 1200 },
      { name: 'Utilities', planned: 100 },
      { name: 'Phone', planned: 85 },
      { name: 'Internet', planned: 60 },
      { name: 'Union dues', planned: 60 },
      { name: 'Car insurance', planned: 130 },
      { name: 'Health insurance', planned: 180 },
      { name: 'Renters insurance', planned: 25 },
      { name: '', planned: '' },
      { name: '', planned: '' },
    ],
    expenses: [
      { name: 'Groceries', planned: 300 },
      { name: 'Dining out', planned: 250 },
      { name: 'Gas', planned: 100 },
      { name: 'Clothing/uniform', planned: 100 },
      { name: 'Personal care', planned: 80 },
      { name: 'Entertainment', planned: 150 },
      { name: 'Travel', planned: 200 },
      { name: 'Household', planned: 80 },
      { name: '', planned: '' },
      { name: '', planned: '' },
    ],
    debt: [
      { name: 'Car payment', planned: 300 },
      { name: 'Student loans', planned: 200 },
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
      { name: 'Emergency fund', planned: 150 },
      { name: '401(k)', planned: 300 },
      { name: 'Roth IRA', planned: 150 },
      { name: 'Stocks', planned: 100 },
      { name: 'Sinking fund', planned: 100 },
      { name: '', planned: '' },
      { name: '', planned: '' },
      { name: '', planned: '' },
      { name: '', planned: '' },
      { name: '', planned: '' },
    ],
  },
  construction: {
    income: 4600,
    bills: [
      { name: 'Rent', planned: 1300 },
      { name: 'Utilities', planned: 150 },
      { name: 'Phone', planned: 85 },
      { name: 'Internet', planned: 60 },
      { name: 'Truck insurance', planned: 220 },
      { name: 'Health insurance', planned: 200 },
      { name: 'Tools/equipment', planned: 100 },
      { name: 'Union dues', planned: 50 },
      { name: '', planned: '' },
      { name: '', planned: '' },
    ],
    expenses: [
      { name: 'Groceries', planned: 450 },
      { name: 'Gas', planned: 250 },
      { name: 'Dining out', planned: 200 },
      { name: 'Work boots/gear', planned: 100 },
      { name: 'Personal care', planned: 60 },
      { name: 'Entertainment', planned: 100 },
      { name: 'Household', planned: 80 },
      { name: 'Pets', planned: 50 },
      { name: '', planned: '' },
      { name: '', planned: '' },
    ],
    debt: [
      { name: 'Truck payment', planned: 450 },
      { name: 'Credit card', planned: 200 },
      { name: 'Personal loan', planned: 150 },
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
      { name: '401(k)', planned: 200 },
      { name: 'Roth IRA', planned: 0 },
      { name: 'Stocks', planned: 50 },
      { name: 'Sinking fund', planned: 100 },
      { name: '', planned: '' },
      { name: '', planned: '' },
      { name: '', planned: '' },
      { name: '', planned: '' },
      { name: '', planned: '' },
    ],
  },
  pharmacist: {
    income: 8200,
    bills: [
      { name: 'Rent', planned: 2200 },
      { name: 'Utilities', planned: 160 },
      { name: 'Phone', planned: 100 },
      { name: 'Internet', planned: 80 },
      { name: 'License renewal', planned: 50 },
      { name: 'Malpractice insurance', planned: 100 },
      { name: 'Car insurance', planned: 160 },
      { name: 'Home insurance', planned: 120 },
      { name: '', planned: '' },
      { name: '', planned: '' },
    ],
    expenses: [
      { name: 'Groceries', planned: 500 },
      { name: 'Dining out', planned: 300 },
      { name: 'Gas', planned: 150 },
      { name: 'Clothing', planned: 200 },
      { name: 'Personal care', planned: 100 },
      { name: 'Entertainment', planned: 200 },
      { name: 'Travel', planned: 300 },
      { name: 'Household', planned: 120 },
      { name: '', planned: '' },
      { name: '', planned: '' },
    ],
    debt: [
      { name: 'Student loans', planned: 1500 },
      { name: 'Car payment', planned: 400 },
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
      { name: 'Emergency fund', planned: 400 },
      { name: '401(k)', planned: 700 },
      { name: 'Roth IRA', planned: 300 },
      { name: 'Stocks', planned: 300 },
      { name: 'Sinking fund', planned: 200 },
      { name: '', planned: '' },
      { name: '', planned: '' },
      { name: '', planned: '' },
      { name: '', planned: '' },
      { name: '', planned: '' },
    ],
  },
  socialWorker: {
    income: 3400,
    bills: [
      { name: 'Rent', planned: 1100 },
      { name: 'Utilities', planned: 100 },
      { name: 'Phone', planned: 85 },
      { name: 'Internet', planned: 60 },
      { name: 'License renewal', planned: 20 },
      { name: 'Car insurance', planned: 130 },
      { name: 'Health insurance', planned: 180 },
      { name: 'Renters insurance', planned: 20 },
      { name: '', planned: '' },
      { name: '', planned: '' },
    ],
    expenses: [
      { name: 'Groceries', planned: 350 },
      { name: 'Gas', planned: 180 },
      { name: 'Dining out', planned: 120 },
      { name: 'Clothing', planned: 80 },
      { name: 'Personal care', planned: 60 },
      { name: 'Entertainment', planned: 80 },
      { name: 'Household', planned: 60 },
      { name: 'Pets', planned: 40 },
      { name: '', planned: '' },
      { name: '', planned: '' },
    ],
    debt: [
      { name: 'Student loans', planned: 400 },
      { name: 'Car payment', planned: 250 },
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
      { name: 'Emergency fund', planned: 100 },
      { name: '401(k)', planned: 150 },
      { name: 'Roth IRA', planned: 50 },
      { name: 'Stocks', planned: 0 },
      { name: 'Sinking fund', planned: 50 },
      { name: '', planned: '' },
      { name: '', planned: '' },
      { name: '', planned: '' },
      { name: '', planned: '' },
      { name: '', planned: '' },
    ],
  },
  military: {
    income: 3800,
    bills: [
      { name: 'Utilities', planned: 80 },
      { name: 'Phone', planned: 85 },
      { name: 'Internet', planned: 60 },
      { name: 'Car insurance', planned: 130 },
      { name: 'Life insurance', planned: 50 },
      { name: 'Storage unit', planned: 60 },
      { name: 'Health insurance', planned: 0 },
      { name: 'Renters insurance', planned: 20 },
      { name: '', planned: '' },
      { name: '', planned: '' },
    ],
    expenses: [
      { name: 'Groceries', planned: 350 },
      { name: 'Gas', planned: 150 },
      { name: 'Dining out', planned: 150 },
      { name: 'Clothing/uniform', planned: 80 },
      { name: 'Personal care', planned: 60 },
      { name: 'Entertainment', planned: 120 },
      { name: 'Travel', planned: 200 },
      { name: 'Household', planned: 80 },
      { name: '', planned: '' },
      { name: '', planned: '' },
    ],
    debt: [
      { name: 'Car payment', planned: 300 },
      { name: 'Student loans', planned: 0 },
      { name: 'Credit card', planned: 100 },
      { name: 'Personal loan', planned: 0 },
      { name: '', planned: '' },
      { name: '', planned: '' },
      { name: '', planned: '' },
      { name: '', planned: '' },
      { name: '', planned: '' },
      { name: '', planned: '' },
    ],
    savings: [
      { name: 'Emergency fund', planned: 200 },
      { name: 'TSP/401(k)', planned: 300 },
      { name: 'Roth IRA', planned: 150 },
      { name: 'Stocks', planned: 100 },
      { name: 'Sinking fund', planned: 100 },
      { name: '', planned: '' },
      { name: '', planned: '' },
      { name: '', planned: '' },
      { name: '', planned: '' },
      { name: '', planned: '' },
    ],
  },
  chef: {
    income: 3100,
    bills: [
      { name: 'Rent', planned: 1000 },
      { name: 'Utilities', planned: 100 },
      { name: 'Phone', planned: 80 },
      { name: 'Internet', planned: 60 },
      { name: 'Knife/tool maintenance', planned: 30 },
      { name: 'Car insurance', planned: 130 },
      { name: 'Health insurance', planned: 180 },
      { name: 'Renters insurance', planned: 20 },
      { name: '', planned: '' },
      { name: '', planned: '' },
    ],
    expenses: [
      { name: 'Groceries', planned: 300 },
      { name: 'Dining out', planned: 150 },
      { name: 'Gas', planned: 150 },
      { name: 'Clothing/uniform', planned: 60 },
      { name: 'Personal care', planned: 60 },
      { name: 'Entertainment', planned: 80 },
      { name: 'Household', planned: 60 },
      { name: 'Pets', planned: 30 },
      { name: '', planned: '' },
      { name: '', planned: '' },
    ],
    debt: [
      { name: 'Car payment', planned: 250 },
      { name: 'Student loans', planned: 100 },
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
      { name: 'Emergency fund', planned: 80 },
      { name: '401(k)', planned: 100 },
      { name: 'Roth IRA', planned: 0 },
      { name: 'Stocks', planned: 0 },
      { name: 'Sinking fund', planned: 50 },
      { name: '', planned: '' },
      { name: '', planned: '' },
      { name: '', planned: '' },
      { name: '', planned: '' },
      { name: '', planned: '' },
    ],
  },
  truckDriver: {
    income: 5100,
    bills: [
      { name: 'Rent/mortgage', planned: 1400 },
      { name: 'Utilities', planned: 150 },
      { name: 'Phone', planned: 100 },
      { name: 'Internet', planned: 60 },
      { name: 'CDL renewal', planned: 20 },
      { name: 'Truck insurance', planned: 300 },
      { name: 'Health insurance', planned: 200 },
      { name: 'Life insurance', planned: 60 },
      { name: '', planned: '' },
      { name: '', planned: '' },
    ],
    expenses: [
      { name: 'Groceries', planned: 400 },
      { name: 'Gas (personal)', planned: 200 },
      { name: 'Dining out', planned: 300 },
      { name: 'Clothing', planned: 80 },
      { name: 'Personal care', planned: 60 },
      { name: 'Entertainment', planned: 100 },
      { name: 'Household', planned: 80 },
      { name: 'Pets', planned: 50 },
      { name: '', planned: '' },
      { name: '', planned: '' },
    ],
    debt: [
      { name: 'Truck payment', planned: 500 },
      { name: 'Car payment', planned: 300 },
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
      { name: 'Emergency fund', planned: 250 },
      { name: '401(k)', planned: 300 },
      { name: 'Roth IRA', planned: 100 },
      { name: 'Stocks', planned: 100 },
      { name: 'Sinking fund', planned: 100 },
      { name: '', planned: '' },
      { name: '', planned: '' },
      { name: '', planned: '' },
      { name: '', planned: '' },
      { name: '', planned: '' },
    ],
  },
  accountant: {
    income: 6200,
    bills: [
      { name: 'Rent', planned: 1800 },
      { name: 'Utilities', planned: 140 },
      { name: 'Phone', planned: 100 },
      { name: 'Internet', planned: 80 },
      { name: 'CPA license', planned: 40 },
      { name: 'Professional dues', planned: 50 },
      { name: 'Car insurance', planned: 150 },
      { name: 'Renters insurance', planned: 30 },
      { name: '', planned: '' },
      { name: '', planned: '' },
    ],
    expenses: [
      { name: 'Groceries', planned: 450 },
      { name: 'Dining out', planned: 250 },
      { name: 'Gas', planned: 130 },
      { name: 'Clothing', planned: 200 },
      { name: 'Personal care', planned: 80 },
      { name: 'Entertainment', planned: 150 },
      { name: 'Travel', planned: 200 },
      { name: 'Household', planned: 100 },
      { name: '', planned: '' },
      { name: '', planned: '' },
    ],
    debt: [
      { name: 'Student loans', planned: 600 },
      { name: 'Car payment', planned: 350 },
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
      { name: 'Emergency fund', planned: 300 },
      { name: '401(k)', planned: 500 },
      { name: 'Roth IRA', planned: 200 },
      { name: 'Stocks', planned: 200 },
      { name: 'Sinking fund', planned: 150 },
      { name: '', planned: '' },
      { name: '', planned: '' },
      { name: '', planned: '' },
      { name: '', planned: '' },
      { name: '', planned: '' },
    ],
  },
  physicalTherapist: {
    income: 6800,
    bills: [
      { name: 'Rent', planned: 1900 },
      { name: 'Utilities', planned: 150 },
      { name: 'Phone', planned: 100 },
      { name: 'Internet', planned: 80 },
      { name: 'License renewal', planned: 50 },
      { name: 'Malpractice insurance', planned: 80 },
      { name: 'Car insurance', planned: 160 },
      { name: 'Renters insurance', planned: 30 },
      { name: '', planned: '' },
      { name: '', planned: '' },
    ],
    expenses: [
      { name: 'Groceries', planned: 450 },
      { name: 'Dining out', planned: 250 },
      { name: 'Gas', planned: 150 },
      { name: 'Clothing', planned: 150 },
      { name: 'Personal care', planned: 80 },
      { name: 'Entertainment', planned: 150 },
      { name: 'Travel', planned: 250 },
      { name: 'Household', planned: 100 },
      { name: '', planned: '' },
      { name: '', planned: '' },
    ],
    debt: [
      { name: 'Student loans', planned: 900 },
      { name: 'Car payment', planned: 380 },
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
      { name: 'Emergency fund', planned: 350 },
      { name: '401(k)', planned: 500 },
      { name: 'Roth IRA', planned: 250 },
      { name: 'Stocks', planned: 200 },
      { name: 'Sinking fund', planned: 150 },
      { name: '', planned: '' },
      { name: '', planned: '' },
      { name: '', planned: '' },
      { name: '', planned: '' },
      { name: '', planned: '' },
    ],
  },
  dentalHygienist: {
    income: 5800,
    bills: [
      { name: 'Rent', planned: 1600 },
      { name: 'Utilities', planned: 130 },
      { name: 'Phone', planned: 100 },
      { name: 'Internet', planned: 80 },
      { name: 'License renewal', planned: 40 },
      { name: 'Malpractice insurance', planned: 60 },
      { name: 'Car insurance', planned: 150 },
      { name: 'Renters insurance', planned: 25 },
      { name: '', planned: '' },
      { name: '', planned: '' },
    ],
    expenses: [
      { name: 'Groceries', planned: 400 },
      { name: 'Dining out', planned: 200 },
      { name: 'Gas', planned: 130 },
      { name: 'Clothing', planned: 150 },
      { name: 'Personal care', planned: 80 },
      { name: 'Entertainment', planned: 150 },
      { name: 'Travel', planned: 200 },
      { name: 'Household', planned: 80 },
      { name: '', planned: '' },
      { name: '', planned: '' },
    ],
    debt: [
      { name: 'Student loans', planned: 700 },
      { name: 'Car payment', planned: 350 },
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
      { name: 'Emergency fund', planned: 300 },
      { name: '401(k)', planned: 450 },
      { name: 'Roth IRA', planned: 200 },
      { name: 'Stocks', planned: 150 },
      { name: 'Sinking fund', planned: 100 },
      { name: '', planned: '' },
      { name: '', planned: '' },
      { name: '', planned: '' },
      { name: '', planned: '' },
      { name: '', planned: '' },
    ],
  },
};

function createRow(id, name = '', planned = '', actual = '', placeholder = '') {
  return {
    id,
    name,
    planned: planned === '' ? '' : String(planned),
    actual: actual === '' ? '' : String(actual),
    placeholder,
  };
}

function createEmptyPanel(placeholders, count = 8) {
  return Array.from({ length: count }, (_, i) =>
    createRow(`row-${Date.now()}-${i}-${Math.random().toString(36).slice(2, 7)}`, '', '', '', placeholders[i] || '')
  );
}

function templateToRows(templateRows, minRows = 8) {
  const sliced = (templateRows || []).slice(0, minRows);
  const base = sliced.map((r, i) =>
    createRow(`row-${Date.now()}-${i}-${Math.random().toString(36).slice(2, 7)}`, r.name, r.planned, '', r.name || '')
  );
  while (base.length < minRows) {
    base.push(createRow(`row-${Date.now()}-${base.length}-${Math.random().toString(36).slice(2, 7)}`, '', '', '', ''));
  }
  return base;
}

const initialPanels = () => {
  const panels = {};
  PANEL_KEYS.forEach((key) => {
    const config = PANELS.find((p) => p.key === key);
    panels[key] = createEmptyPanel(config?.placeholders || [], 8);
  });
  return panels;
};

function buildMonthsWithJanTemplate(template) {
  const months = {};
  const janPanels = {
    bills: templateToRows(template?.bills),
    expenses: templateToRows(template?.expenses),
    debt: templateToRows(template?.debt),
    savings: templateToRows(template?.savings),
  };
  months.jan = { panels: janPanels };
  ['feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'].forEach((m) => {
    months[m] = { panels: initialPanels() };
  });
  months.annual = { panels: initialPanels() };
  return months;
}

function buildMonthsEmpty() {
  const months = {};
  MONTH_KEYS.forEach((m) => {
    months[m] = { panels: initialPanels() };
  });
  return months;
}

function createPlannerFromTemplate(id, name, template, professionId) {
  const templateGoals = getTemplateGoals(template, professionId);
  const goals = templateGoals.map((g, i) => ({
    id: `goal-${id}-${i}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    name: g.name,
    category: g.category,
    priority: g.priority,
    targetAmount: String(g.targetAmount),
    currentSaved: String(g.currentSaved),
    monthlyContribution: String(g.monthlyContribution),
    targetDate: g.targetDate,
    notes: g.notes,
  }));
  return {
    id,
    name,
    income: String(template.income),
    months: buildMonthsWithJanTemplate(template),
    goals,
  };
}

function createEmptyPlanner(id, name, income = '') {
  return {
    id,
    name,
    income: String(income),
    months: buildMonthsEmpty(),
    goals: [],
  };
}

function getDefaultPlanners() {
  const ids = ['nurse', 'teacher', 'software', 'police', 'electrician', 'lawyer', 'personalTrainer', 'flightAttendant', 'construction', 'pharmacist', 'socialWorker', 'military', 'chef', 'truckDriver', 'accountant', 'physicalTherapist', 'dentalHygienist'];
  const names = ['Nurse', 'Teacher', 'Software Engineer', 'Police Officer', 'Electrician', 'Lawyer', 'Personal Trainer', 'Flight Attendant', 'Construction Worker', 'Pharmacist', 'Social Worker', 'Military', 'Chef / Cook', 'Truck Driver', 'Accountant', 'Physical Therapist', 'Dental Hygienist'];
  return ids.map((id, i) => createPlannerFromTemplate(`planner-${id}`, names[i], PROFESSION_TEMPLATES[id], id));
}

function getInitialPlanners() {
  if (localStorage.getItem(PLANNERS_VERSION_KEY) !== PLANNERS_VERSION) {
    localStorage.removeItem(STORAGE_KEY);
    localStorage.setItem(PLANNERS_VERSION_KEY, PLANNERS_VERSION);
    return getDefaultPlanners();
  }
  return loadPlannersFromStorage() ?? getDefaultPlanners();
}

function loadPlannersFromStorage() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed) || parsed.length === 0) return null;
    return parsed.map((p) => {
      if (!p.months) {
        const months = buildMonthsEmpty();
        months.jan = { panels: p.panels || initialPanels() };
        return { ...p, months };
      }
      const months = {};
      for (const monthKey of Object.keys(p.months)) {
        const panels = p.months[monthKey].panels || {};
        const newPanels = {};
        for (const panelKey of PANEL_KEYS) {
          const rows = panels[panelKey] || [];
          const placeholders = PANELS.find((x) => x.key === panelKey)?.placeholders || [];
          newPanels[panelKey] = rows.map((row, i) => ({
            ...row,
            placeholder: row.placeholder !== undefined && row.placeholder !== null ? row.placeholder : (placeholders[i] || ''),
          }));
        }
        months[monthKey] = { panels: newPanels };
      }
      return { ...p, months, goals: Array.isArray(p.goals) ? p.goals : [] };
    });
  } catch {
    return null;
  }
}

function getCurrentMonthKey() {
  const m = new Date().getMonth();
  return MONTH_KEYS[m + 1];
}

function getGoalEstCompletion(targetAmount, currentSaved, monthlyContribution) {
  const target = parseFloat(targetAmount) || 0;
  const saved = parseFloat(currentSaved) || 0;
  const monthly = parseFloat(monthlyContribution) || 0;
  const remaining = target - saved;
  if (remaining <= 0) return { text: '🎉 Goal reached!', isReached: true, monthsLeft: 0 };
  if (monthly <= 0) return { text: '—', isReached: false, monthsLeft: null };
  const monthsLeft = Math.ceil(remaining / monthly);
  const d = new Date();
  d.setMonth(d.getMonth() + monthsLeft);
  const monthName = d.toLocaleDateString('en-US', { month: 'long' });
  const year = d.getFullYear();
  return { text: `${monthName} ${year}`, isReached: false, monthsLeft };
}

function createEmptyGoal() {
  return {
    id: `goal-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
    name: '',
    category: 'Other',
    priority: 'Medium',
    targetAmount: '',
    currentSaved: '',
    monthlyContribution: '',
    targetDate: '',
    notes: '',
  };
}

const EXAMPLE_PLANNER_ID = 'example-budget';

function buildExampleMonthPanels(monthKey, withActuals) {
  const pid = (panelKey, i) => `example-${monthKey}-${panelKey}-${i}`;
  const bills = [
    [1200, 1200], [120, 134], [85, 85], [60, 60], [15, 15], [130, 130], [180, 180], [20, 20],
  ];
  const expenses = [
    [350, 412], [150, 167], [120, 189], [80, 95], [60, 0], [50, 48], [40, 35], [60, 60],
  ];
  const debt = [[280, 280], [200, 200], [100, 100], [50, 50]];
  const savings = [[150, 150], [200, 200], [100, 100], [50, 50]];
  const billNames = ['Rent', 'Utilities', 'Phone', 'Internet', 'Netflix', 'Car insurance', 'Health insurance', 'Renters insurance'];
  const expenseNames = ['Groceries', 'Gas', 'Dining out', 'Entertainment', 'Clothing', 'Personal care', 'Household', 'Pets'];
  const debtNames = ['Car payment', 'Student loans', 'Credit card', 'Medical debt'];
  const savingsNames = ['Emergency fund', '401(k)', 'Roth IRA', 'Stocks'];
  const emptyRow = (panelKey, i) => createRow(pid(panelKey, i), '', '', '', '');
  return {
    bills: bills.map((pair, i) => createRow(pid('bills', i), billNames[i], String(pair[0]), withActuals ? String(pair[1]) : '', billNames[i])),
    expenses: expenses.map((pair, i) => createRow(pid('expenses', i), expenseNames[i], String(pair[0]), withActuals ? String(pair[1]) : '', expenseNames[i])),
    debt: [
      ...debt.map((pair, i) => createRow(pid('debt', i), debtNames[i], String(pair[0]), withActuals ? String(pair[1]) : '', debtNames[i])),
      ...Array.from({ length: 4 }, (_, i) => emptyRow('debt', 4 + i)),
    ],
    savings: [
      ...savings.map((pair, i) => createRow(pid('savings', i), savingsNames[i], String(pair[0]), withActuals ? String(pair[1]) : '', savingsNames[i])),
      ...Array.from({ length: 4 }, (_, i) => emptyRow('savings', 4 + i)),
    ],
  };
}

function getExamplePlanner() {
  const months = {};
  CALENDAR_MONTH_KEYS.forEach((m, idx) => {
    months[m] = { panels: buildExampleMonthPanels(m, idx < 3) };
  });
  months.annual = { panels: buildExampleMonthPanels('annual', false) };
  const goals = [
    { id: 'example-goal-1', name: 'Emergency Fund', category: 'Emergency Fund', priority: 'High', targetAmount: '13500', currentSaved: '4200', monthlyContribution: '150', targetDate: '2027-09-01', notes: '' },
    { id: 'example-goal-2', name: 'Vacation to Europe', category: 'Vacation', priority: 'Medium', targetAmount: '4000', currentSaved: '800', monthlyContribution: '150', targetDate: '2026-12-01', notes: '' },
    { id: 'example-goal-3', name: 'Home Down Payment', category: 'House', priority: 'High', targetAmount: '30000', currentSaved: '3500', monthlyContribution: '300', targetDate: '2028-12-01', notes: '' },
  ];
  return {
    id: EXAMPLE_PLANNER_ID,
    name: 'Example Budget',
    income: '4500',
    months,
    goals,
  };
}

function App() {
  const { isLoaded, isSignedIn } = useAuth();
  const navigate = useNavigate();
  const [planners, setPlanners] = useState(() => getInitialPlanners());
  const [activePlannerId, setActivePlannerId] = useState(() => {
    const initial = getInitialPlanners();
    return (initial && initial[0]?.id) ?? getDefaultPlanners()[0].id;
  });
  const [activeMonthKey, setActiveMonthKey] = useState(() => getCurrentMonthKey());
  const [expandedPlannerIds, setExpandedPlannerIds] = useState(() => {
    const initial = getInitialPlanners();
    const id = (initial && initial[0]?.id) ?? getDefaultPlanners()[0].id;
    return id === EXAMPLE_PLANNER_ID ? [] : [id];
  });
  const [unsavedPlannerIds, setUnsavedPlannerIds] = useState([]);
  const [showNewPlannerForm, setShowNewPlannerForm] = useState(false);
  const [newPlannerName, setNewPlannerName] = useState('');
  const [newPlannerIncome, setNewPlannerIncome] = useState('');
  const [editingPlannerId, setEditingPlannerId] = useState(null);
  const [editingPlannerName, setEditingPlannerName] = useState('');
  const [plannerToDelete, setPlannerToDelete] = useState(null);
  const [saveMessage, setSaveMessage] = useState(null);
  const [expandedAnnualLineItems, setExpandedAnnualLineItems] = useState({});
  const [isPremium, setIsPremium] = useState(() => {
    try {
      return localStorage.getItem('budgetflow-premium') === 'true';
    } catch {
      return false;
    }
  });
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(() => {
    try {
      const saved = localStorage.getItem('budgetflow-theme');
      return saved !== 'light';
    } catch {
      return true;
    }
  });
  const [goalModalOpen, setGoalModalOpen] = useState(false);
  const [goalModalEditingId, setGoalModalEditingId] = useState(null);
  const [goalForm, setGoalForm] = useState(() => createEmptyGoal());
  const [expandedGoalNotes, setExpandedGoalNotes] = useState({});
  const [showHelpModal, setShowHelpModal] = useState(false);
  const [helpSearch, setHelpSearch] = useState('');
  const [helpOpenSection, setHelpOpenSection] = useState(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    if (isPremium) {
      try {
        localStorage.setItem('budgetflow-premium', 'true');
      } catch (_) {}
    }
  }, [isPremium]);

  useEffect(() => {
    if (isLoaded && !isSignedIn) {
      navigate('/sign-in', { replace: true });
    }
  }, [isLoaded, isSignedIn, navigate]);

  useEffect(() => {
    try {
      document.documentElement.setAttribute('data-theme', isDarkMode ? 'dark' : 'light');
      localStorage.setItem('budgetflow-theme', isDarkMode ? 'dark' : 'light');
    } catch (_) {}
  }, [isDarkMode]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(planners));
    } catch (_) {}
  }, [planners]);

  const activePlanner =
    activePlannerId === EXAMPLE_PLANNER_ID
      ? getExamplePlanner()
      : (planners.find((p) => p.id === activePlannerId) ?? planners[0] ?? getExamplePlanner());
  const isExamplePlanner = activePlannerId === EXAMPLE_PLANNER_ID;
  const activeMonthData = activePlanner?.months?.[activeMonthKey];
  const panels = activeMonthData?.panels ?? {};
  const income = activePlanner?.income ?? '';
  const isActiveUnsaved = unsavedPlannerIds.includes(activePlannerId);

  const togglePlannerExpanded = useCallback((e, id) => {
    e.stopPropagation();
    setExpandedPlannerIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  }, []);

  const handleSelectMonth = useCallback((e, plannerId, monthKey) => {
    if (e) e.stopPropagation();
    if (monthKey === 'annual' && !isPremium) {
      setShowUpgradeModal(true);
      return;
    }
    setActivePlannerId(plannerId);
    setActiveMonthKey(monthKey);
    setEditingPlannerId(null);
    setSidebarOpen(false);
  }, [isPremium]);

  const markActiveUnsaved = useCallback(() => {
    setUnsavedPlannerIds((prev) => (prev.includes(activePlannerId) ? prev : [...prev, activePlannerId]));
  }, [activePlannerId]);

  const handleIncomeChange = useCallback(
    (e) => {
      const value = e.target.value;
      setPlanners((prev) =>
        prev.map((p) => (p.id === activePlannerId ? { ...p, income: value } : p))
      );
      markActiveUnsaved();
    },
    [activePlannerId, markActiveUnsaved]
  );

  const updateRow = useCallback(
    (panelKey, rowId, field, value) => {
      setPlanners((prev) => {
        const active = prev.find((p) => p.id === activePlannerId);
        if (!active?.months?.[activeMonthKey]) return prev;
        const currentPanels = active.months[activeMonthKey].panels;
        const newPanels = {
          ...currentPanels,
          [panelKey]: currentPanels[panelKey].map((row) =>
            row.id === rowId ? { ...row, [field]: value } : row
          ),
        };
        return prev.map((p) =>
          p.id === activePlannerId
            ? { ...p, months: { ...p.months, [activeMonthKey]: { panels: newPanels } } }
            : p
        );
      });
      markActiveUnsaved();
    },
    [activePlannerId, activeMonthKey, markActiveUnsaved]
  );

  const addRow = useCallback(
    (panelKey) => {
      setPlanners((prev) => {
        const active = prev.find((p) => p.id === activePlannerId);
        if (!active?.months?.[activeMonthKey]) return prev;
        const currentPanels = active.months[activeMonthKey].panels;
        const newPanels = {
          ...currentPanels,
          [panelKey]: [...currentPanels[panelKey], createRow(`row-${Date.now()}-${Math.random().toString(36).slice(2, 11)}`, '', '', '', '')],
        };
        return prev.map((p) =>
          p.id === activePlannerId
            ? { ...p, months: { ...p.months, [activeMonthKey]: { panels: newPanels } } }
            : p
        );
      });
      markActiveUnsaved();
    },
    [activePlannerId, activeMonthKey, markActiveUnsaved]
  );

  const deleteRow = useCallback(
    (panelKey, rowId) => {
      setPlanners((prev) => {
        const active = prev.find((p) => p.id === activePlannerId);
        if (!active?.months?.[activeMonthKey]) return prev;
        const currentRows = active.months[activeMonthKey].panels[panelKey] || [];
        if (currentRows.length <= 1) return prev;
        const newRows = currentRows.filter((r) => r.id !== rowId);
        const newPanels = { ...active.months[activeMonthKey].panels, [panelKey]: newRows };
        const nextPlanners = prev.map((p) =>
          p.id === activePlannerId
            ? { ...p, months: { ...p.months, [activeMonthKey]: { panels: newPanels } } }
            : p
        );
        try {
          localStorage.setItem(STORAGE_KEY, JSON.stringify(nextPlanners));
        } catch (_) {}
        return nextPlanners;
      });
      markActiveUnsaved();
    },
    [activePlannerId, activeMonthKey, markActiveUnsaved]
  );

  const handlePanelDragEnd = useCallback((panelKey, event) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    setPlanners((prev) => {
      const activePlanner = prev.find((p) => p.id === activePlannerId);
      if (!activePlanner?.months?.[activeMonthKey]) return prev;

      const items = activePlanner.months[activeMonthKey].panels[panelKey] || [];
      const activeId = String(active.id);
      const overId = String(over.id);
      const oldIndex = items.findIndex((item) => String(item.id) === activeId);
      const newIndex = items.findIndex((item) => String(item.id) === overId);
      if (oldIndex === -1 || newIndex === -1) return prev;

      const newArray = arrayMove(items, oldIndex, newIndex);
      const newPanels = { ...activePlanner.months[activeMonthKey].panels, [panelKey]: newArray };
      const nextPlanners = prev.map((p) =>
        p.id === activePlannerId
          ? { ...p, months: { ...p.months, [activeMonthKey]: { panels: newPanels } } }
          : p
      );

      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(nextPlanners));
      } catch (_) {}

      return nextPlanners;
    });
    markActiveUnsaved();
  }, [activePlannerId, activeMonthKey, markActiveUnsaved]);

  const handleSelectPlanner = useCallback((id) => {
    setActivePlannerId(id);
    setEditingPlannerId(null);
    setExpandedPlannerIds((prev) => (prev.includes(id) ? prev : [...prev, id]));
  }, []);

  const handleSave = useCallback(() => {
    setUnsavedPlannerIds((prev) => prev.filter((id) => id !== activePlannerId));
    setSaveMessage('saved');
  }, [activePlannerId]);

  useEffect(() => {
    if (saveMessage === null) return;
    const t = setTimeout(() => setSaveMessage(null), 2000);
    return () => clearTimeout(t);
  }, [saveMessage]);

  useEffect(() => {
    const interval = setInterval(() => {
      setUnsavedPlannerIds((prev) => {
        if (!prev.includes(activePlannerId)) return prev;
        setSaveMessage('auto-saved');
        return prev.filter((id) => id !== activePlannerId);
      });
    }, 30000);
    return () => clearInterval(interval);
  }, [activePlannerId]);

  const handleNewPlannerOpen = useCallback(() => {
    if (!isPremium && planners.length >= 1) {
      setShowUpgradeModal(true);
      return;
    }
    setShowNewPlannerForm(true);
    setNewPlannerName('');
    setNewPlannerIncome('');
  }, [isPremium, planners.length]);

  const handleNewPlannerCreate = useCallback(() => {
    const name = newPlannerName.trim() || 'My Budget';
    const incomeVal = newPlannerIncome.trim() || '0';
    const id = `planner-${Date.now()}`;
    setPlanners((prev) => [...prev, createEmptyPlanner(id, name, incomeVal)]);
    setActivePlannerId(id);
    setActiveMonthKey(getCurrentMonthKey());
    setExpandedPlannerIds((prev) => (prev.includes(id) ? prev : [...prev, id]));
    setShowNewPlannerForm(false);
    setNewPlannerName('');
    setNewPlannerIncome('');
  }, [newPlannerName, newPlannerIncome]);

  const handleNewPlannerCancel = useCallback(() => {
    setShowNewPlannerForm(false);
    setNewPlannerName('');
    setNewPlannerIncome('');
  }, []);

  const handleRenameStart = useCallback((e, planner) => {
    e.stopPropagation();
    setEditingPlannerId(planner.id);
    setEditingPlannerName(planner.name);
  }, []);

  const handleRenameCancel = useCallback(() => {
    setEditingPlannerId(null);
    setEditingPlannerName('');
  }, []);

  const handleRenameSubmit = useCallback(
    (id) => {
      const name = editingPlannerName.trim() || 'My Budget';
      setPlanners((prev) => prev.map((p) => (p.id === id ? { ...p, name } : p)));
      setEditingPlannerId(null);
      setEditingPlannerName('');
    },
    [editingPlannerName]
  );

  const openAddGoalModal = useCallback(() => {
    setGoalModalEditingId(null);
    setGoalForm(createEmptyGoal());
    setGoalModalOpen(true);
  }, []);

  const openEditGoalModal = useCallback((goal) => {
    setGoalModalEditingId(goal.id);
    setGoalForm({ ...goal });
    setGoalModalOpen(true);
  }, []);

  const closeGoalModal = useCallback(() => {
    setGoalModalOpen(false);
    setGoalModalEditingId(null);
  }, []);

  const saveGoalModal = useCallback(() => {
    const g = goalForm;
    const name = (g.name || '').trim();
    if (!name) return;
    setPlanners((prev) => {
      const active = prev.find((p) => p.id === activePlannerId);
      if (!active) return prev;
      const goals = Array.isArray(active.goals) ? [...active.goals] : [];
      const payload = {
        ...g,
        name,
        category: GOAL_CATEGORIES.includes(g.category) ? g.category : 'Other',
        priority: GOAL_PRIORITIES.includes(g.priority) ? g.priority : 'Medium',
        targetAmount: String(g.targetAmount ?? ''),
        currentSaved: String(g.currentSaved ?? ''),
        monthlyContribution: String(g.monthlyContribution ?? ''),
        targetDate: String(g.targetDate ?? ''),
        notes: String(g.notes ?? ''),
      };
      let nextGoals;
      if (goalModalEditingId) {
        nextGoals = goals.map((o) => (o.id === goalModalEditingId ? payload : o));
      } else {
        nextGoals = [...goals, { ...payload, id: `goal-${Date.now()}-${Math.random().toString(36).slice(2, 9)}` }];
      }
      const next = prev.map((p) => (p.id === activePlannerId ? { ...p, goals: nextGoals } : p));
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      } catch (_) {}
      return next;
    });
    markActiveUnsaved();
    closeGoalModal();
  }, [goalForm, goalModalEditingId, activePlannerId, markActiveUnsaved, closeGoalModal]);

  const deleteGoal = useCallback(
    (goalId) => {
      setPlanners((prev) => {
        const next = prev.map((p) => {
          if (p.id !== activePlannerId) return p;
          const goals = (p.goals || []).filter((g) => g.id !== goalId);
          return { ...p, goals };
        });
        try {
          localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
        } catch (_) {}
        return next;
      });
      markActiveUnsaved();
      if (goalModalEditingId === goalId) closeGoalModal();
    },
    [activePlannerId, markActiveUnsaved, goalModalEditingId, closeGoalModal]
  );

  const updateGoalField = useCallback((goalId, field, value) => {
    setPlanners((prev) => {
      const next = prev.map((p) => {
        if (p.id !== activePlannerId) return p;
        const goals = (p.goals || []).map((g) => (g.id === goalId ? { ...g, [field]: value } : g));
        return { ...p, goals };
      });
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      } catch (_) {}
      return next;
    });
    markActiveUnsaved();
  }, [activePlannerId, markActiveUnsaved]);

  const toggleGoalNotes = useCallback((goalId) => {
    setExpandedGoalNotes((prev) => ({ ...prev, [goalId]: !prev[goalId] }));
  }, []);

  const handleDeleteClick = useCallback((e, id) => {
    e.stopPropagation();
    if (planners.length <= 1) return;
    setPlannerToDelete(id);
  }, [planners.length]);

  const handleDragEnd = useCallback((event) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    setPlanners((prev) => {
      const oldIndex = prev.findIndex((p) => p.id === active.id);
      const newIndex = prev.findIndex((p) => p.id === over.id);
      if (oldIndex === -1 || newIndex === -1) return prev;
      return arrayMove(prev, oldIndex, newIndex);
    });
  }, []);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 8 },
    })
  );

  const handleDeleteConfirm = useCallback((confirm) => {
    if (!plannerToDelete) return;
    if (confirm) {
      const remaining = planners.filter((p) => p.id !== plannerToDelete);
      const nextActiveId = remaining[0]?.id;
      setPlanners((prev) => prev.filter((p) => p.id !== plannerToDelete));
      setActivePlannerId((current) => (current === plannerToDelete ? nextActiveId : current));
      setUnsavedPlannerIds((prev) => prev.filter((id) => id !== plannerToDelete));
    }
    setPlannerToDelete(null);
  }, [plannerToDelete, planners]);

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

  const isGoalsView = activeMonthKey === 'goals';
  const isAnnualView = activeMonthKey === 'annual';
  const goals = activePlanner?.goals ?? [];
  const goalsSummary = goals.reduce(
    (acc, g) => {
      const target = parseFloat(g.targetAmount) || 0;
      const saved = parseFloat(g.currentSaved) || 0;
      acc.totalTarget += target;
      acc.totalSaved += saved;
      return acc;
    },
    { totalTarget: 0, totalSaved: 0 }
  );
  const goalsOverallPct =
    goalsSummary.totalTarget > 0
      ? Math.min(100, Math.round((goalsSummary.totalSaved / goalsSummary.totalTarget) * 100))
      : 0;
  const monthlyIncomeForAnnual = parseFloat(activePlanner?.income) || 0;
  const annualIncome = monthlyIncomeForAnnual * 12;
  const annualPanelTotals = isAnnualView
    ? PANEL_KEYS.reduce((acc, panelKey) => {
        let planned = 0;
        let actual = 0;
        CALENDAR_MONTH_KEYS.forEach((m) => {
          const rows = activePlanner?.months?.[m]?.panels?.[panelKey] || [];
          rows.forEach((row) => {
            planned += parseFloat(row.planned) || 0;
            actual += parseFloat(row.actual) || 0;
          });
        });
        acc[panelKey] = { planned, actual };
        return acc;
      }, {})
    : null;
  const totalAnnualActual = annualPanelTotals
    ? PANEL_KEYS.reduce((sum, key) => sum + (annualPanelTotals[key]?.actual ?? 0), 0)
    : 0;
  const annualRemaining = annualIncome - totalAnnualActual;
  const annualLineItemsByPanel = isAnnualView
    ? PANEL_KEYS.reduce((acc, panelKey) => {
        const map = new Map();
        CALENDAR_MONTH_KEYS.forEach((m) => {
          const rows = activePlanner?.months?.[m]?.panels?.[panelKey] || [];
          rows.forEach((row) => {
            const val = parseFloat(row.actual) || 0;
            if (val <= 0) return;
            const name = (row.name || '').trim();
            if (!name) return;
            const key = name.toLowerCase();
            if (!map.has(key)) map.set(key, { name, actual: 0 });
            const entry = map.get(key);
            entry.actual += val;
          });
        });
        acc[panelKey] = Array.from(map.values()).sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: 'base' }));
        return acc;
      }, {})
    : null;
  const annualChartData = isAnnualView
    ? annualIncome === 0
      ? [
          { name: 'Bills', value: 1, color: '#94a3b8' },
          { name: 'Expenses', value: 1, color: '#cbd5e1' },
          { name: 'Debt', value: 1, color: '#e2e8f0' },
          { name: 'Savings', value: 1, color: '#f1f5f9' },
        ]
      : totalAnnualActual === 0
        ? [{ name: 'Remaining', value: annualIncome, color: REMAINING_COLOR }]
        : annualRemaining >= 0
          ? [
              ...PANEL_KEYS.map((key) => ({
                name: PANELS.find((p) => p.key === key).title,
                value: annualPanelTotals[key].actual,
                color: CHART_COLORS[key],
              })),
              { name: 'Remaining', value: annualRemaining, color: REMAINING_COLOR },
            ]
          : (() => {
              const scale = (2 * annualIncome - totalAnnualActual) / totalAnnualActual;
              return [
                ...PANEL_KEYS.map((key) => ({
                  name: PANELS.find((p) => p.key === key).title,
                  value: annualPanelTotals[key].actual * scale,
                  color: CHART_COLORS[key],
                })),
                { name: 'Over Budget', value: totalAnnualActual - annualIncome, color: OVER_BUDGET_COLOR },
              ];
            })()
    : null;
  const annualChartLegendItems = isAnnualView && annualPanelTotals
    ? [
        ...PANEL_KEYS.map((key) => ({
          name: PANELS.find((p) => p.key === key).title,
          actual: annualPanelTotals[key].actual,
          color: CHART_COLORS[key],
          pct: annualIncome > 0 ? (annualPanelTotals[key].actual / annualIncome) * 100 : 0,
        })),
        {
          name: annualRemaining >= 0 ? 'Remaining' : 'Over Budget',
          actual: annualRemaining,
          color: annualRemaining >= 0 ? REMAINING_COLOR : OVER_BUDGET_COLOR,
          pct: annualIncome > 0 ? (Math.abs(annualRemaining) / annualIncome) * 100 : 0,
          isOverBudget: annualRemaining < 0,
        },
      ]
    : null;
  const toggleAnnualLineItems = useCallback((panelKey) => {
    setExpandedAnnualLineItems((prev) => ({ ...prev, [panelKey]: !prev[panelKey] }));
  }, []);

  const chartData =
    numIncome === 0
      ? [
          { name: 'Bills', value: 1, color: '#94a3b8' },
          { name: 'Expenses', value: 1, color: '#cbd5e1' },
          { name: 'Debt', value: 1, color: '#e2e8f0' },
          { name: 'Savings', value: 1, color: '#f1f5f9' },
        ]
      : numIncome > 0 && totalActual === 0
        ? [{ name: 'Remaining', value: numIncome, color: REMAINING_COLOR }]
        : remaining >= 0
          ? [
              ...PANEL_KEYS.map((key) => ({
                name: PANELS.find((p) => p.key === key).title,
                value: panelTotals[key].actual,
                color: CHART_COLORS[key],
              })),
              { name: 'Remaining', value: remaining, color: REMAINING_COLOR },
            ]
          : (() => {
              const scale = (2 * numIncome - totalActual) / totalActual;
              return [
                ...PANEL_KEYS.map((key) => ({
                  name: PANELS.find((p) => p.key === key).title,
                  value: panelTotals[key].actual * scale,
                  color: CHART_COLORS[key],
                })),
                { name: 'Over Budget', value: totalActual - numIncome, color: OVER_BUDGET_COLOR },
              ];
            })();

  const chartLegendItems =
    numIncome === 0
      ? [
          ...PANELS.map((p) => ({ name: p.title, actual: 0, color: CHART_COLORS[p.key], pct: 0 })),
          { name: 'Remaining', actual: 0, color: REMAINING_COLOR, pct: 0, isOverBudget: false },
        ]
      : [
          ...PANEL_KEYS.map((key) => ({
            name: PANELS.find((p) => p.key === key).title,
            actual: panelTotals[key].actual,
            color: CHART_COLORS[key],
            pct: numIncome > 0 ? (panelTotals[key].actual / numIncome) * 100 : 0,
          })),
          {
            name: remaining >= 0 ? 'Remaining' : 'Over Budget',
            actual: remaining,
            color: remaining >= 0 ? REMAINING_COLOR : OVER_BUDGET_COLOR,
            pct: numIncome > 0 ? (Math.abs(remaining) / numIncome) * 100 : 0,
            isOverBudget: remaining < 0,
          },
        ];

  function SortablePlannerItem({ planner }) {
    const isExpanded = expandedPlannerIds.includes(planner.id);
    const {
      attributes,
      listeners,
      setNodeRef,
      transform,
      transition,
      isDragging,
    } = useSortable({ id: planner.id, disabled: !!editingPlannerId });

    const style = {
      transform: CSS.Transform.toString(transform),
      transition,
    };

    return (
      <li key={planner.id} className="sidebar-planner-wrap">
        <div
          ref={setNodeRef}
          style={style}
          className={`sidebar-tab ${planner.id === activePlannerId ? 'sidebar-tab-active' : ''} ${isDragging ? 'sidebar-tab-dragging-dnd' : ''}`}
          onClick={(e) => {
            if (editingPlannerId === planner.id) return;
            const target = e.target;
            if (target.closest('.sidebar-tab-delete')) return;
            if (target.closest('.sidebar-tab-rename-input')) return;
            if (target.closest('.sidebar-drag-handle')) return;
            togglePlannerExpanded(e, planner.id);
          }}
        >
          <span
            className="sidebar-drag-handle"
            title="Drag to reorder"
            {...attributes}
            {...listeners}
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
              <circle cx="9" cy="6" r="1.5" />
              <circle cx="15" cy="6" r="1.5" />
              <circle cx="9" cy="12" r="1.5" />
              <circle cx="15" cy="12" r="1.5" />
              <circle cx="9" cy="18" r="1.5" />
              <circle cx="15" cy="18" r="1.5" />
            </svg>
          </span>
          <span className={`sidebar-chevron ${isExpanded ? 'sidebar-chevron-open' : ''}`} />
          <span className="sidebar-tab-dot" />
          <div className="sidebar-tab-content">
            {editingPlannerId === planner.id ? (
              <input
                type="text"
                className="sidebar-tab-rename-input"
                value={editingPlannerName}
                onChange={(e) => setEditingPlannerName(e.target.value)}
                onBlur={() => handleRenameSubmit(planner.id)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleRenameSubmit(planner.id);
                  if (e.key === 'Escape') handleRenameCancel();
                }}
                onClick={(e) => e.stopPropagation()}
                autoFocus
              />
            ) : (
              <>
                <span
                  className="sidebar-tab-name-wrap"
                  onDoubleClick={(e) => handleRenameStart(e, planner)}
                  title="Double-click to rename"
                >
                  <span className="sidebar-tab-name">
                    {planner.name}
                    {unsavedPlannerIds.includes(planner.id) && <span className="sidebar-tab-unsaved" title="Unsaved changes"> •</span>}
                  </span>
                  <span className="sidebar-pencil-icon" aria-hidden>
                    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                      <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                    </svg>
                  </span>
                </span>
                <span className="sidebar-tab-income">
                  {new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(parseFloat(planner.income) || 0)}/mo
                </span>
              </>
            )}
          </div>
          {planners.length > 1 && editingPlannerId !== planner.id && (
            <button
              type="button"
              className="sidebar-tab-delete"
              onClick={(e) => handleDeleteClick(e, planner.id)}
              title="Delete planner"
              aria-label="Delete planner"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="3 6 5 6 21 6" />
                <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                <line x1="10" y1="11" x2="10" y2="17" />
                <line x1="14" y1="11" x2="14" y2="17" />
              </svg>
            </button>
          )}
        </div>
        {isExpanded && (
          <ul className="sidebar-month-tabs">
            {SIDEBAR_TAB_KEYS.map((monthKey) => (
              <li key={monthKey}>
                <button
                  type="button"
                  className={`sidebar-month-tab ${planner.id === activePlannerId && activeMonthKey === monthKey ? 'sidebar-month-tab-active' : ''} ${monthKey === 'annual' ? 'sidebar-month-tab-annual' : ''} ${monthKey === 'goals' ? 'sidebar-month-tab-goals' : ''} ${monthKey === 'annual' && !isPremium ? 'sidebar-month-tab-locked' : ''}`}
                  onClick={(e) => handleSelectMonth(e, planner.id, monthKey)}
                >
                  {monthKey === 'annual' && !isPremium ? '🔒 ' : ''}{MONTH_LABELS[monthKey]}
                </button>
              </li>
            ))}
          </ul>
        )}
      </li>
    );
  }

  function SortablePanelRow({ id, row, panelKey, panel, index, canDelete, readOnly }) {
    const {
      attributes,
      listeners,
      setNodeRef,
      transform,
      transition,
      isDragging,
    } = useSortable({ id });

    const style = {
      transform: CSS.Transform.toString(transform),
      transition,
    };

    return (
      <div
        ref={setNodeRef}
        style={style}
        className={`panel-row ${isDragging ? 'panel-row-dragging' : ''}`}
      >
        <span
          className="panel-row-grip"
          title="Drag to reorder"
          {...attributes}
          {...listeners}
        >
          <svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor">
            <circle cx="9" cy="6" r="1.5" />
            <circle cx="15" cy="6" r="1.5" />
            <circle cx="9" cy="12" r="1.5" />
            <circle cx="15" cy="12" r="1.5" />
            <circle cx="9" cy="18" r="1.5" />
            <circle cx="15" cy="18" r="1.5" />
          </svg>
        </span>
        <input
          type="text"
          className="row-input row-name"
          placeholder={row.placeholder || 'Item'}
          value={row.name}
          onChange={(e) => updateRow(panelKey, row.id, 'name', e.target.value)}
          readOnly={readOnly}
        />
        <input
          type="number"
          inputMode="decimal"
          className="row-input row-amount"
          placeholder="0"
          value={row.planned}
          onChange={(e) => updateRow(panelKey, row.id, 'planned', e.target.value)}
          min="0"
          step="0.01"
          readOnly={readOnly}
        />
        <input
          type="number"
          inputMode="decimal"
          className="row-input row-amount"
          placeholder="0"
          value={row.actual}
          onChange={(e) => updateRow(panelKey, row.id, 'actual', e.target.value)}
          min="0"
          step="0.01"
          readOnly={readOnly}
        />
        {!readOnly && canDelete ? (
          <button
            type="button"
            className="panel-row-delete"
            onClick={() => deleteRow(panelKey, row.id)}
            title="Remove row"
            aria-label="Remove row"
          >
            ✕
          </button>
        ) : (
          <span className="panel-row-delete-spacer" aria-hidden />
        )}
      </div>
    );
  }

  if (!isLoaded) {
    return (
      <div className="app" style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#0f0f0f' }}>
        <div style={{ width: 40, height: 40, border: '3px solid #2a2a2a', borderTopColor: '#c9a84c', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
      </div>
    );
  }

  if (!isSignedIn) {
    return null;
  }

  return (
    <div className="app">
      {sidebarOpen && (
        <div className="sidebar-backdrop" onClick={() => setSidebarOpen(false)} aria-hidden="true" />
      )}
      <aside className={`sidebar ${sidebarOpen ? 'sidebar-open' : ''}`}>
        <button
          type="button"
          className="sidebar-close-btn"
          onClick={() => setSidebarOpen(false)}
          aria-label="Close menu"
        >
          ×
        </button>
        <h2 className="sidebar-title">
          My Planners
          {isPremium && <span className="sidebar-premium-badge">Premium ✨</span>}
        </h2>
        <div className="sidebar-example-wrap">
          <div className="sidebar-planner-wrap">
            <div
              className={`sidebar-tab ${activePlannerId === EXAMPLE_PLANNER_ID ? 'sidebar-tab-active' : ''}`}
              onClick={() => {
                setExpandedPlannerIds((prev) => (prev.includes(EXAMPLE_PLANNER_ID) ? prev.filter((x) => x !== EXAMPLE_PLANNER_ID) : [...prev, EXAMPLE_PLANNER_ID]));
              }}
            >
              <span className="sidebar-drag-handle sidebar-example-drag-spacer" aria-hidden>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
                  <circle cx="9" cy="6" r="1.5" />
                  <circle cx="15" cy="6" r="1.5" />
                  <circle cx="9" cy="12" r="1.5" />
                  <circle cx="15" cy="12" r="1.5" />
                  <circle cx="9" cy="18" r="1.5" />
                  <circle cx="15" cy="18" r="1.5" />
                </svg>
              </span>
              <span
                className={`sidebar-chevron ${expandedPlannerIds.includes(EXAMPLE_PLANNER_ID) ? 'sidebar-chevron-open' : ''}`}
                onClick={(e) => {
                  e.stopPropagation();
                  setExpandedPlannerIds((prev) => (prev.includes(EXAMPLE_PLANNER_ID) ? prev.filter((x) => x !== EXAMPLE_PLANNER_ID) : [...prev, EXAMPLE_PLANNER_ID]));
                }}
              />
              <span className="sidebar-tab-dot" />
              <div className="sidebar-tab-content">
                <span className="sidebar-tab-name-wrap">
                  <span className="sidebar-tab-name">Example Budget</span>
                </span>
                <span className="sidebar-tab-income">Reference</span>
              </div>
            </div>
            {expandedPlannerIds.includes(EXAMPLE_PLANNER_ID) && (
              <ul className="sidebar-month-tabs">
                {SIDEBAR_TAB_KEYS.map((monthKey) => (
                  <li key={monthKey}>
                    <button
                      type="button"
                      className={`sidebar-month-tab ${activePlannerId === EXAMPLE_PLANNER_ID && activeMonthKey === monthKey ? 'sidebar-month-tab-active' : ''} ${monthKey === 'annual' ? 'sidebar-month-tab-annual' : ''} ${monthKey === 'goals' ? 'sidebar-month-tab-goals' : ''}`}
                      onClick={(e) => {
                        e.stopPropagation();
                        setActiveMonthKey(monthKey);
                        setActivePlannerId(EXAMPLE_PLANNER_ID);
                        setSidebarOpen(false);
                      }}
                    >
                      {MONTH_LABELS[monthKey]}
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
        {showNewPlannerForm ? (
          <div className="sidebar-new-form">
            <input
              type="text"
              className="sidebar-new-input"
              placeholder="Profession / Planner name"
              value={newPlannerName}
              onChange={(e) => setNewPlannerName(e.target.value)}
            />
            <input
              type="number"
              inputMode="decimal"
              className="sidebar-new-input"
              placeholder="Monthly income"
              value={newPlannerIncome}
              onChange={(e) => setNewPlannerIncome(e.target.value)}
            />
            <div className="sidebar-new-actions">
              <button type="button" className="sidebar-new-create" onClick={handleNewPlannerCreate}>
                Create Planner
              </button>
              <button type="button" className="sidebar-new-cancel" onClick={handleNewPlannerCancel}>
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <button
            type="button"
            className={`sidebar-new-btn ${!isPremium && planners.length >= 1 ? 'sidebar-new-btn-locked' : ''}`}
            onClick={handleNewPlannerOpen}
          >
            {!isPremium && planners.length >= 1 ? '🔒 ' : ''}+ New Planner
          </button>
        )}
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleDragEnd}
        >
          <SortableContext
            items={planners.map((p) => p.id)}
            strategy={verticalListSortingStrategy}
          >
            <ul className="sidebar-tabs">
              {planners.map((planner) => (
                <SortablePlannerItem key={planner.id} planner={planner} />
              ))}
            </ul>
          </SortableContext>
        </DndContext>
      </aside>

      <div className="app-main">
        <header className="header">
          <div className="header-top">
            <button
              type="button"
              className="header-hamburger"
              onClick={() => setSidebarOpen(true)}
              aria-label="Open menu"
            >
              ☰
            </button>
            <div className="header-center">
              <h1 className="app-title">BudgetFlow</h1>
            </div>
            <div className="header-actions">
              <div className="header-user-btn-wrap">
                <UserButton afterSignOutUrl="/" />
              </div>
              <button
                type="button"
                className="header-help-btn"
                onClick={() => setShowHelpModal(true)}
                title="Help"
                aria-label="Open help"
              >
                ?
              </button>
              {!isExamplePlanner && (
              <button
                type="button"
                className="save-btn"
                onClick={handleSave}
                title="Save current planner"
                disabled={!isActiveUnsaved}
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z" />
                  <polyline points="17 21 17 13 7 13 7 21" />
                  <polyline points="7 3 7 8 15 8" />
                </svg>
                <span className="save-btn-text">Save</span>
              </button>
              )}
              <button
                type="button"
                className="theme-toggle-btn"
                onClick={() => setIsDarkMode((prev) => !prev)}
                title={isDarkMode ? 'Switch to light mode' : 'Switch to dark mode'}
                aria-label={isDarkMode ? 'Switch to light mode' : 'Switch to dark mode'}
              >
                {isDarkMode ? (
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="5" /><line x1="12" y1="1" x2="12" y2="3" /><line x1="12" y1="21" x2="12" y2="23" /><line x1="4.22" y1="4.22" x2="5.64" y2="5.64" /><line x1="18.36" y1="18.36" x2="19.78" y2="19.78" /><line x1="1" y1="12" x2="3" y2="12" /><line x1="21" y1="12" x2="23" y2="12" /><line x1="4.22" y1="19.78" x2="5.64" y2="18.36" /><line x1="18.36" y1="5.64" x2="19.78" y2="4.22" /></svg>
                ) : (
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" /></svg>
                )}
              </button>
            </div>
          </div>
          <div className="header-below">
            <span className="header-context">
              {activePlanner?.name} — {MONTH_LABELS[activeMonthKey]}
            </span>
            <p className="app-tagline">Your monthly budget tracker</p>
          </div>
        </header>

        {saveMessage && (
          <div className={`save-toast save-toast-${saveMessage}`}>
            {saveMessage === 'saved' ? 'Saved!' : 'Auto-saved'}
          </div>
        )}

        {isExamplePlanner && (
          <div className="example-banner">
            <span className="example-banner-text">📋 This is a reference example — create your own planner to start budgeting</span>
            <button type="button" className="example-banner-btn" onClick={handleNewPlannerOpen}>
              Create My Planner
            </button>
          </div>
        )}

        <main className="main">
          {!isGoalsView && (isAnnualView ? (
            <section className="income-section annual-income-section">
              <div className="income-label">
                Annual income <span className="income-planner-name">— {activePlanner?.name}</span>
              </div>
              <p className="annual-income-value">{formatCurrency(String(annualIncome))}</p>
            </section>
          ) : (
            <section className="income-section">
              <label htmlFor="income" className="income-label">
                Monthly income <span className="income-planner-name">— {activePlanner?.name}</span>
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
                readOnly={isExamplePlanner}
              />
              <p className="remaining-balance">
                Remaining balance: <span className={remaining >= 0 ? 'remaining-positive' : 'remaining-negative'}>{formatCurrency(String(remaining))}</span>
              </p>
            </section>
          ))}

        {isGoalsView ? (
          <section className="goals-page">
            <div className="goals-page-header">
              <div>
                <h1 className="goals-page-title">Savings Goals</h1>
                <p className="goals-page-sub">Track your financial goals and see your progress</p>
              </div>
              {!isExamplePlanner && (
                <button type="button" className="goals-add-btn" onClick={openAddGoalModal}>
                  + Add Goal
                </button>
              )}
            </div>
            <div className="goals-summary-bar card">
              <div className="panel-accent" style={{ background: '#c9a84c' }} />
              <div className="goals-summary-stats">
                <span className="goals-summary-stat"><strong>{goals.length}</strong> goals</span>
                <span className="goals-summary-stat">Target: {formatCurrency(String(goalsSummary.totalTarget))}</span>
                <span className="goals-summary-stat">Saved: {formatCurrency(String(goalsSummary.totalSaved))}</span>
                <span className="goals-summary-stat">{goalsOverallPct}% overall</span>
              </div>
            </div>
            <div className="goals-grid">
              {goals.map((goal) => {
                const target = parseFloat(goal.targetAmount) || 0;
                const saved = parseFloat(goal.currentSaved) || 0;
                const pct = target > 0 ? Math.min(100, Math.round((saved / target) * 100)) : 0;
                const est = getGoalEstCompletion(goal.targetAmount, goal.currentSaved, goal.monthlyContribution);
                const targetDateMs = goal.targetDate ? new Date(goal.targetDate).getTime() : null;
                const estDateMs = est.monthsLeft != null ? (() => { const d = new Date(); d.setMonth(d.getMonth() + est.monthsLeft); return d.getTime(); })() : null;
                const behindSchedule = targetDateMs != null && estDateMs != null && estDateMs > targetDateMs && !est.isReached;
                const notesExpanded = expandedGoalNotes[goal.id];
                return (
                  <div key={goal.id} className="goal-card card">
                    <div className="panel-accent" style={{ background: '#c9a84c' }} />
                    {!isExamplePlanner && (
                      <div className="goal-card-actions">
                        <button type="button" className="goal-card-btn" onClick={() => openEditGoalModal(goal)} title="Edit" aria-label="Edit goal">✎</button>
                        <button type="button" className="goal-card-btn goal-card-btn-delete" onClick={() => deleteGoal(goal.id)} title="Delete" aria-label="Delete goal">🗑</button>
                      </div>
                    )}
                    <h3 className="goal-card-name">{goal.name || 'Unnamed Goal'}</h3>
                    <div className="goal-card-badges">
                      <span className="goal-badge goal-badge-category" style={{ backgroundColor: `${GOAL_CATEGORY_COLORS[goal.category] || GOAL_CATEGORY_COLORS.Other}33`, color: GOAL_CATEGORY_COLORS[goal.category] || GOAL_CATEGORY_COLORS.Other }}>{goal.category}</span>
                      <span className="goal-badge goal-badge-priority">{GOAL_PRIORITY_EMOJI[goal.priority]} {goal.priority}</span>
                    </div>
                    <p className="goal-card-target">Goal: {formatCurrency(String(goal.targetAmount || '0'))}</p>
                    <div className="goal-card-saved-row">
                      <label className="goal-card-saved-label">Saved:</label>
                      <input
                        type="number"
                        inputMode="decimal"
                        className="goal-card-saved-input"
                        value={goal.currentSaved}
                        onChange={(e) => updateGoalField(goal.id, 'currentSaved', e.target.value)}
                        min="0"
                        step="0.01"
                        readOnly={isExamplePlanner}
                      />
                    </div>
                    <div className="goal-card-progress">
                      <div className="goal-progress-bar">
                        <div className="goal-progress-fill" style={{ width: `${pct}%` }} />
                      </div>
                      <span className="goal-progress-pct">{pct}% complete</span>
                    </div>
                    <div className="goal-card-monthly">
                      <label className="goal-card-monthly-label">Monthly:</label>
                      <input
                        type="number"
                        inputMode="decimal"
                        className="goal-card-monthly-input"
                        value={goal.monthlyContribution}
                        onChange={(e) => updateGoalField(goal.id, 'monthlyContribution', e.target.value)}
                        placeholder="0"
                        min="0"
                        step="0.01"
                        readOnly={isExamplePlanner}
                      />
                    </div>
                    <p className="goal-card-est">
                      Est. completion: {est.text}
                      {behindSchedule && <span className="goal-card-behind" title="Behind target date"> ⚠</span>}
                    </p>
                    {goal.targetDate && (
                      <p className="goal-card-target-date">Target date: {new Date(goal.targetDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</p>
                    )}
                    <div className="goal-card-notes">
                      <button type="button" className="goal-card-notes-toggle" onClick={() => toggleGoalNotes(goal.id)}>
                        {notesExpanded ? '▼' : '▶'} Notes
                      </button>
                      {notesExpanded && (
                        <p className="goal-card-notes-text">{goal.notes || '—'}</p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
            {goalModalOpen && (
              <div className="goal-modal-overlay" onClick={closeGoalModal}>
                <div className="goal-modal card" onClick={(e) => e.stopPropagation()}>
                  <div className="panel-accent" style={{ background: '#c9a84c' }} />
                  <h2 className="goal-modal-title">{goalModalEditingId ? 'Edit Goal' : 'Add Goal'}</h2>
                  <div className="goal-modal-form">
                    <label>Goal name</label>
                    <input type="text" value={goalForm.name} onChange={(e) => setGoalForm((f) => ({ ...f, name: e.target.value }))} placeholder="e.g. Emergency Fund" />
                    <label>Category</label>
                    <select value={goalForm.category} onChange={(e) => setGoalForm((f) => ({ ...f, category: e.target.value }))}>
                      {GOAL_CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
                    </select>
                    <label>Priority</label>
                    <select value={goalForm.priority} onChange={(e) => setGoalForm((f) => ({ ...f, priority: e.target.value }))}>
                      {GOAL_PRIORITIES.map((p) => <option key={p} value={p}>{p}</option>)}
                    </select>
                    <label>Target amount ($)</label>
                    <input type="number" inputMode="decimal" value={goalForm.targetAmount} onChange={(e) => setGoalForm((f) => ({ ...f, targetAmount: e.target.value }))} min="0" step="0.01" />
                    <label>Current saved ($)</label>
                    <input type="number" inputMode="decimal" value={goalForm.currentSaved} onChange={(e) => setGoalForm((f) => ({ ...f, currentSaved: e.target.value }))} min="0" step="0.01" />
                    <label>Monthly contribution ($)</label>
                    <input type="number" inputMode="decimal" value={goalForm.monthlyContribution} onChange={(e) => setGoalForm((f) => ({ ...f, monthlyContribution: e.target.value }))} min="0" step="0.01" />
                    <label>Target date (optional)</label>
                    <input type="date" value={goalForm.targetDate} onChange={(e) => setGoalForm((f) => ({ ...f, targetDate: e.target.value }))} />
                    <label>Notes (optional)</label>
                    <textarea value={goalForm.notes} onChange={(e) => setGoalForm((f) => ({ ...f, notes: e.target.value }))} rows={3} placeholder="Notes..." />
                  </div>
                  <div className="goal-modal-actions">
                    <button type="button" className="goal-modal-cancel" onClick={closeGoalModal}>Cancel</button>
                    <button type="button" className="goal-modal-save" onClick={saveGoalModal}>Save</button>
                  </div>
                </div>
              </div>
            )}
          </section>
        ) : isAnnualView ? (
          totalAnnualActual === 0 ? (
            <section className="annual-placeholder">
              <p className="annual-placeholder-text">No monthly data yet — start filling in your monthly budgets</p>
            </section>
          ) : (
            <>
              <section className="chart-section">
                <div className="chart-card">
                  <div className="chart-wrapper">
                    <ResponsiveContainer width="100%" height={160}>
                      <PieChart>
                        <Pie
                          data={annualChartData}
                          dataKey="value"
                          nameKey="name"
                          innerRadius="58%"
                          outerRadius="88%"
                          paddingAngle={0}
                          isAnimationActive
                          animationDuration={500}
                          animationEasing="ease-out"
                        >
                          {annualChartData.map((entry, index) => (
                            <Cell key={`${entry.name}-${index}`} fill={entry.color} />
                          ))}
                        </Pie>
                      </PieChart>
                    </ResponsiveContainer>
                    <div className={`chart-center-label ${annualIncome === 0 ? 'chart-center-label-placeholder' : ''}`}>
                      {annualIncome > 0 ? formatCurrency(String(totalAnnualActual)) : '$0'}
                    </div>
                  </div>
                  <div className="chart-stats">
                    {annualChartLegendItems.map((item) => (
                      <div key={item.name} className={`chart-stat-block ${item.isOverBudget ? 'chart-stat-overbudget' : ''}`}>
                        <span className="chart-stat-dot" style={{ backgroundColor: item.color }} />
                        <div className="chart-stat-content">
                          <span className="chart-stat-name">
                            {item.name}
                            {item.isOverBudget && <span className="chart-stat-warning" title="Over budget"> ⚠</span>}
                          </span>
                          <span className="chart-stat-amount">
                            {item.actual < 0 ? `-${formatCurrency(String(Math.abs(item.actual)))}` : formatCurrency(item.actual)}
                          </span>
                          <span className="chart-stat-pct">{item.pct.toFixed(1)}%</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </section>

              <section className="panels-section annual-panels-section">
                {PANELS.map((panel) => {
                  const totals = annualPanelTotals[panel.key] || { planned: 0, actual: 0 };
                  const pctIncome = annualIncome > 0 ? (totals.actual / annualIncome) * 100 : 0;
                  const plannedPct = annualIncome > 0 ? (totals.planned / annualIncome) * 100 : 0;
                  const lineItems = annualLineItemsByPanel[panel.key] || [];
                  const isExpanded = expandedAnnualLineItems[panel.key];
                  return (
                    <div key={panel.key} className="budget-panel card annual-panel" data-panel={panel.key}>
                      <div className="panel-accent" style={{ background: panel.accent }} />
                      <h2 className="panel-title" style={{ borderBottomColor: panel.accent }}>{panel.title}</h2>
                      <div className="panel-totals panel-totals-top">
                        <div className="panel-totals-main">
                          <span className="panel-total-actual" style={{ color: panel.accent }}>{formatCurrency(totals.actual)}</span>
                          <span className="panel-total-pct-large">{pctIncome.toFixed(1)}%</span>
                        </div>
                        <span className="panel-total-planned">Planned {formatCurrency(totals.planned)} ({plannedPct.toFixed(1)}% of annual income)</span>
                      </div>
                      <button
                        type="button"
                        className="annual-line-items-toggle"
                        onClick={() => toggleAnnualLineItems(panel.key)}
                      >
                        {isExpanded ? 'View Line Items ▲' : 'View Line Items ▼'}
                      </button>
                      {isExpanded && lineItems.length > 0 && (
                        <ul className="annual-line-items-list">
                          {lineItems.map((item, i) => (
                            <li key={`${item.name}-${i}`} className="annual-line-item">
                              <span className="annual-line-item-name">{item.name}</span>
                              <span className="annual-line-item-amount" style={{ color: panel.accent }}>{formatCurrency(item.actual)}</span>
                            </li>
                          ))}
                        </ul>
                      )}
                      {isExpanded && lineItems.length === 0 && (
                        <p className="annual-line-items-empty">No line items with actual amounts</p>
                      )}
                    </div>
                  );
                })}
              </section>

              {goals.length > 0 && (
                <section className="annual-goals-section">
                  <h2 className="annual-goals-title">Savings Goals Progress</h2>
                  <div className="annual-goals-list">
                    {goals.map((goal) => {
                      const target = parseFloat(goal.targetAmount) || 0;
                      const saved = parseFloat(goal.currentSaved) || 0;
                      const pct = target > 0 ? Math.min(100, Math.round((saved / target) * 100)) : 0;
                      const est = getGoalEstCompletion(goal.targetAmount, goal.currentSaved, goal.monthlyContribution);
                      return (
                        <div key={goal.id} className="annual-goal-item card">
                          <div className="panel-accent" style={{ background: '#c9a84c' }} />
                          <div className="annual-goal-item-header">
                            <span className="annual-goal-item-name">{goal.name || 'Unnamed'}</span>
                            <span className="annual-goal-item-amounts">{formatCurrency(String(saved))} / {formatCurrency(String(goal.targetAmount || '0'))}</span>
                          </div>
                          <div className="goal-progress-bar">
                            <div className="goal-progress-fill" style={{ width: `${pct}%` }} />
                          </div>
                          <span className="annual-goal-item-est">Est. {est.text}</span>
                        </div>
                      );
                    })}
                  </div>
                </section>
              )}
            </>
          )
        ) : (
          <>
        <section className="chart-section">
          <div className="chart-card">
            <div className="chart-wrapper">
              <ResponsiveContainer width="100%" height={160}>
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
                {numIncome > 0 ? formatCurrency(String(totalActual)) : '$0'}
              </div>
            </div>
            <div className="chart-stats">
              {chartLegendItems.map((item) => (
                <div key={item.name} className={`chart-stat-block ${item.isOverBudget ? 'chart-stat-overbudget' : ''}`}>
                  <span className="chart-stat-dot" style={{ backgroundColor: item.color }} />
                  <div className="chart-stat-content">
                    <span className="chart-stat-name">
                      {item.name}
                      {item.isOverBudget && <span className="chart-stat-warning" title="Over budget"> ⚠</span>}
                    </span>
                    <span className="chart-stat-amount">
                      {item.actual < 0 ? `-${formatCurrency(String(Math.abs(item.actual)))}` : formatCurrency(item.actual)}
                    </span>
                    <span className="chart-stat-pct">{item.pct.toFixed(1)}%</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
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
                    <span className="panel-total-pct-large">{pctIncome.toFixed(1)}%</span>
                  </div>
                  <span className="panel-total-planned">Planned {formatCurrency(totals.planned)}</span>
                </div>
                <div className="panel-rows">
                  <div className="panel-row panel-row-header">
                    <span className="panel-row-grip-spacer" aria-hidden />
                    <span className="row-label">Item</span>
                    <span className="row-planned">Planned</span>
                    <span className="row-actual">Actual</span>
                    <span className="panel-row-delete-spacer" aria-hidden />
                  </div>
                  <DndContext
                    sensors={sensors}
                    collisionDetection={closestCenter}
                    onDragEnd={(e) => handlePanelDragEnd(panel.key, e)}
                  >
                    <SortableContext
                      items={rows.map((r) => r.id)}
                      strategy={verticalListSortingStrategy}
                    >
                      {rows.map((row, idx) => (
                        <SortablePanelRow
                          key={row.id}
                          id={row.id}
                          row={row}
                          panelKey={panel.key}
                          panel={panel}
                          index={idx}
                          canDelete={rows.length > 1}
                          readOnly={isExamplePlanner}
                        />
                      ))}
                    </SortableContext>
                  </DndContext>
                </div>
                {!isExamplePlanner && (isPremium || rows.length < 8) && (
                  <button type="button" className="add-row-btn" onClick={() => addRow(panel.key)} style={{ borderColor: panel.accent, color: panel.accent }}>
                    + Add row
                  </button>
                )}
              </div>
            );
          })}
        </section>
          </>
        )}
        </main>
      </div>

      {plannerToDelete && (
        <div className="sidebar-delete-overlay" onClick={() => handleDeleteConfirm(false)}>
          <div className="sidebar-delete-modal" onClick={(e) => e.stopPropagation()}>
            <p>Delete this planner?</p>
            <div className="sidebar-delete-actions">
              <button type="button" className="sidebar-delete-yes" onClick={() => handleDeleteConfirm(true)}>Yes</button>
              <button type="button" className="sidebar-delete-no" onClick={() => handleDeleteConfirm(false)}>No</button>
            </div>
          </div>
        </div>
      )}
      {showUpgradeModal && (
        <div className="upgrade-modal-overlay" onClick={() => setShowUpgradeModal(false)}>
          <div className="upgrade-modal" onClick={(e) => e.stopPropagation()}>
            <h2 className="upgrade-modal-logo">BudgetFlow</h2>
            <h3 className="upgrade-modal-headline">Unlock BudgetFlow Premium</h3>
            <p className="upgrade-modal-subheadline">One time payment — yours forever</p>
            <p className="upgrade-modal-price">$17</p>
            <ul className="upgrade-modal-features">
              <li><span className="upgrade-modal-check">✅</span> Unlimited planners</li>
              <li><span className="upgrade-modal-check">✅</span> Annual overview & reporting</li>
              <li><span className="upgrade-modal-check">✅</span> Unlimited line items per category</li>
            </ul>
            <button
              type="button"
              className="upgrade-modal-cta"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                const url = `${STRIPE_PAYMENT_LINK}${STRIPE_PAYMENT_LINK.includes('?') ? '&' : '?'}success_url=${encodeURIComponent(STRIPE_SUCCESS_URL)}&cancel_url=${encodeURIComponent(STRIPE_CANCEL_URL)}`;
                window.location.href = url;
              }}
            >
              Get Premium — $17
            </button>
            <button type="button" className="upgrade-modal-later" onClick={() => setShowUpgradeModal(false)}>
              Maybe later
            </button>
          </div>
        </div>
      )}
      {showHelpModal && (
        <div className="help-modal-overlay" onClick={() => setShowHelpModal(false)}>
          <div className="help-modal card" onClick={(e) => e.stopPropagation()}>
            <div className="panel-accent" style={{ background: '#c9a84c' }} />
            <div className="help-modal-header">
              <h2 className="help-modal-title"><span className="help-modal-title-icon">?</span> Help Center</h2>
              <button type="button" className="help-modal-close" onClick={() => setShowHelpModal(false)} aria-label="Close">×</button>
            </div>
            <div className="help-modal-search-wrap">
              <input
                type="text"
                className="help-modal-search"
                placeholder="Search for help... (e.g. 'how to add a planner')"
                value={helpSearch}
                onChange={(e) => setHelpSearch(e.target.value)}
              />
              {helpSearch && (
                <button type="button" className="help-modal-search-clear" onClick={() => setHelpSearch('')} aria-label="Clear">×</button>
              )}
            </div>
            <div className="help-modal-pills">
              {HELP_FAQ.map((sec) => (
                <button
                  key={sec.id}
                  type="button"
                  className="help-modal-pill"
                  onClick={() => {
                    document.getElementById(`help-section-${sec.id}`)?.scrollIntoView({ behavior: 'smooth' });
                    setHelpOpenSection(sec.id);
                  }}
                >
                  {sec.pillLabel || sec.title}
                </button>
              ))}
            </div>
            <div className="help-modal-faq">
              {(() => {
                const query = helpSearch.trim().toLowerCase();
                const filtered = query
                  ? HELP_FAQ.map((sec) => ({
                      ...sec,
                      items: sec.items.filter((item) =>
                        item.q.toLowerCase().includes(query) || item.a.toLowerCase().includes(query) || sec.title.toLowerCase().includes(query)
                      ),
                    })).filter((sec) => sec.items.length > 0)
                  : HELP_FAQ;
                if (filtered.length === 0) {
                  return (
                    <p className="help-modal-no-results">
                      No results found for &quot;{helpSearch}&quot;. Try different keywords.
                    </p>
                  );
                }
                return filtered.map((section) => (
                  <div key={section.id} id={`help-section-${section.id}`} className="help-faq-section">
                    <button
                      type="button"
                      className={`help-faq-section-head ${helpOpenSection === section.id ? 'help-faq-section-open' : ''}`}
                      onClick={() => setHelpOpenSection(helpOpenSection === section.id ? null : section.id)}
                    >
                      <span className="help-faq-chevron">{helpOpenSection === section.id ? '▼' : '▶'}</span>
                      {section.title}
                    </button>
                    {helpOpenSection === section.id && (
                      <div className="help-faq-section-body">
                        {section.items.map((item, i) => (
                          <div key={i} className="help-faq-item">
                            <div className="help-faq-q">{item.q}</div>
                            <div className="help-faq-a">{item.a}</div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ));
              })()}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
