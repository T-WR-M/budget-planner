import { useState, useCallback, useEffect } from 'react';
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
const MONTH_LABELS = { annual: '📊 Annual Overview', jan: 'Jan', feb: 'Feb', mar: 'Mar', apr: 'Apr', may: 'May', jun: 'Jun', jul: 'Jul', aug: 'Aug', sep: 'Sep', oct: 'Oct', nov: 'Nov', dec: 'Dec' };
const STORAGE_KEY = 'budgetflow-planners';

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

function createPlannerFromTemplate(id, name, template) {
  return {
    id,
    name,
    income: String(template.income),
    months: buildMonthsWithJanTemplate(template),
  };
}

function createEmptyPlanner(id, name, income = '') {
  return {
    id,
    name,
    income: String(income),
    months: buildMonthsEmpty(),
  };
}

function getDefaultPlanners() {
  const ids = ['nurse', 'teacher', 'software', 'police'];
  const names = ['Nurse', 'Teacher', 'Software Engineer', 'Police Officer'];
  return ids.map((id, i) => createPlannerFromTemplate(`planner-${id}`, names[i], PROFESSION_TEMPLATES[id]));
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
      return { ...p, months };
    });
  } catch {
    return null;
  }
}

function getCurrentMonthKey() {
  const m = new Date().getMonth();
  return MONTH_KEYS[m + 1];
}

function App() {
  const [planners, setPlanners] = useState(() => loadPlannersFromStorage() ?? getDefaultPlanners());
  const [activePlannerId, setActivePlannerId] = useState(() => {
    const loaded = loadPlannersFromStorage();
    return (loaded && loaded[0]?.id) ?? getDefaultPlanners()[0].id;
  });
  const [activeMonthKey, setActiveMonthKey] = useState(() => getCurrentMonthKey());
  const [expandedPlannerIds, setExpandedPlannerIds] = useState(() => {
    const loaded = loadPlannersFromStorage();
    const id = (loaded && loaded[0]?.id) ?? getDefaultPlanners()[0].id;
    return [id];
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

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(planners));
    } catch (_) {}
  }, [planners]);

  const activePlanner = planners.find((p) => p.id === activePlannerId) ?? planners[0];
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
    setActivePlannerId(plannerId);
    setActiveMonthKey(monthKey);
    setEditingPlannerId(null);
  }, []);

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
    setShowNewPlannerForm(true);
    setNewPlannerName('');
    setNewPlannerIncome('');
  }, []);

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

  const isAnnualView = activeMonthKey === 'annual';
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
          <span className="sidebar-tab-dot" style={{ backgroundColor: planner.id === activePlannerId ? '#3b82f6' : '#64748b' }} />
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
            {MONTH_KEYS.map((monthKey) => (
              <li key={monthKey}>
                <button
                  type="button"
                  className={`sidebar-month-tab ${planner.id === activePlannerId && activeMonthKey === monthKey ? 'sidebar-month-tab-active' : ''} ${monthKey === 'annual' ? 'sidebar-month-tab-annual' : ''}`}
                  onClick={(e) => handleSelectMonth(e, planner.id, monthKey)}
                >
                  {MONTH_LABELS[monthKey]}
                </button>
              </li>
            ))}
          </ul>
        )}
      </li>
    );
  }

  function SortablePanelRow({ id, row, panelKey, panel, index }) {
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
        />
      </div>
    );
  }

  return (
    <div className="app">
      <aside className="sidebar">
        <h2 className="sidebar-title">My Planners</h2>
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
          <button type="button" className="sidebar-new-btn" onClick={handleNewPlannerOpen}>
            + New Planner
          </button>
        )}
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
      </aside>

      <div className="app-main">
        <header className="header">
          <div className="header-top">
            <h1 className="app-title">BudgetFlow</h1>
            <span className="header-context">
              {activePlanner?.name} — {MONTH_LABELS[activeMonthKey]}
            </span>
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
              Save
            </button>
          </div>
          <p className="app-tagline">Your monthly budget tracker</p>
        </header>

        {saveMessage && (
          <div className={`save-toast save-toast-${saveMessage}`}>
            {saveMessage === 'saved' ? 'Saved!' : 'Auto-saved'}
          </div>
        )}

        <main className="main">
          {isAnnualView ? (
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
              />
              <p className="remaining-balance">
                Remaining balance: <span className={remaining >= 0 ? 'remaining-positive' : 'remaining-negative'}>{formatCurrency(String(remaining))}</span>
              </p>
            </section>
          )}

        {isAnnualView ? (
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
                        />
                      ))}
                    </SortableContext>
                  </DndContext>
                </div>
                <button type="button" className="add-row-btn" onClick={() => addRow(panel.key)} style={{ borderColor: panel.accent, color: panel.accent }}>
                  + Add row
                </button>
              </div>
            );
          })}
        </section>
          </>
        )}
        </main>
      </div>
    </div>
  );
}

export default App;
