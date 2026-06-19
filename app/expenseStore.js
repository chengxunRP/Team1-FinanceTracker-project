// Expense CRUD store — in-memory until database is ready
// Categories and expenses live here; import this wherever needed.

let idCounter = 100;
function newId() { return String(++idCounter); }

const categories = [
  { id: 'cat-1', name: 'Food',          icon: 'food',          color: '#e07b39' },
  { id: 'cat-2', name: 'Transport',     icon: 'transport',     color: '#1976d2' },
  { id: 'cat-3', name: 'School',        icon: 'school',        color: '#7c4dff' },
  { id: 'cat-4', name: 'Shopping',      icon: 'shopping',      color: '#e91e8c' },
  { id: 'cat-5', name: 'Bills',         icon: 'bills',         color: '#fb8c00' },
  { id: 'cat-6', name: 'Entertainment', icon: 'entertainment', color: '#43a047' },
  { id: 'cat-7', name: 'Others',        icon: 'others',        color: '#64748b' },
];

const expenses = [
  { id: newId(), title: 'Chicken rice at hawker centre', amount: 4.50,  categoryId: 'cat-1', date: '2025-05-28', notes: 'Lunch at Toa Payoh' },
  { id: newId(), title: 'MRT top-up',                   amount: 20.00, categoryId: 'cat-2', date: '2025-05-27', notes: '' },
  { id: newId(), title: 'Textbooks',                    amount: 65.00, categoryId: 'cat-3', date: '2025-05-25', notes: 'Semester 2 materials' },
  { id: newId(), title: 'Netflix subscription',         amount: 15.98, categoryId: 'cat-6', date: '2025-05-20', notes: 'Monthly plan' },
  { id: newId(), title: 'Electricity bill',             amount: 87.30, categoryId: 'cat-5', date: '2025-05-15', notes: 'May bill' },
];

function getCategoryById(id) {
  return categories.find(c => c.id === id) || categories.find(c => c.id === 'cat-7');
}

function getExpensesWithCategory() {
  return expenses.map(e => ({ ...e, category: getCategoryById(e.categoryId) }));
}

module.exports = { categories, expenses, newId, getCategoryById, getExpensesWithCategory };
