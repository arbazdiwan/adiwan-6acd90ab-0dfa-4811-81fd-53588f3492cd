import { useEffect, useState } from 'react';
import { useTaskStore } from '../store/taskStore';
import { useAuthStore } from '../store/authStore';
import { useThemeStore } from '../store/themeStore';
import TaskBoard from '../components/TaskBoard';
import TaskForm from '../components/TaskForm';
import {
  Plus,
  Search,
  LayoutGrid,
  List,
  X,
} from 'lucide-react';

export default function Dashboard() {
  const { tasks, isLoading, error, fetchTasks, setFilters } = useTaskStore();
  const user = useAuthStore((s) => s.user);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [viewMode, setViewMode] = useState<'board' | 'list'>('board');
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');

  const canCreate = user?.role === 'admin' || user?.role === 'owner';

  useEffect(() => {
    fetchTasks();
  }, [fetchTasks]);

  useEffect(() => {
    const timeout = setTimeout(() => {
      setFilters({
        status: statusFilter || undefined,
        category: categoryFilter || undefined,
        search: searchQuery || undefined,
      });
      fetchTasks();
    }, 300);
    return () => clearTimeout(timeout);
  }, [searchQuery, statusFilter, categoryFilter, setFilters, fetchTasks]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.key === 'd') {
        e.preventDefault();
        useThemeStore.getState().toggle();
      }
      if (e.key === 'n' && !e.ctrlKey && !e.metaKey && canCreate) {
        const active = document.activeElement;
        if (active?.tagName !== 'INPUT' && active?.tagName !== 'TEXTAREA') {
          e.preventDefault();
          setShowCreateForm(true);
        }
      }
      if (e.key === 'Escape') setShowCreateForm(false);
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [canCreate]);

  const clearFilters = () => {
    setSearchQuery('');
    setStatusFilter('');
    setCategoryFilter('');
  };

  const hasActiveFilters = searchQuery || statusFilter || categoryFilter;

  return (
    <div className="flex flex-col h-[calc(100vh-3.5rem)]">
      {/* ── Compact toolbar — single row ────────────────── */}
      <div className="flex items-center gap-2 py-2.5 flex-shrink-0 flex-wrap">
        {/* Search */}
        <div className="relative flex-1 min-w-[180px]">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
          <input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="input-field pl-8 pr-3 h-8 text-xs"
            placeholder="Search tasks..."
          />
        </div>

        {/* Filters */}
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="input-field text-xs h-8 py-0 w-[120px]"
        >
          <option value="">All statuses</option>
          <option value="todo">To Do</option>
          <option value="in_progress">In Progress</option>
          <option value="done">Done</option>
        </select>

        <select
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value)}
          className="input-field text-xs h-8 py-0 w-[130px]"
        >
          <option value="">All categories</option>
          <option value="work">Work</option>
          <option value="personal">Personal</option>
          <option value="urgent">Urgent</option>
          <option value="other">Other</option>
        </select>

        {hasActiveFilters && (
          <button
            onClick={clearFilters}
            className="h-8 w-8 flex items-center justify-center rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors shrink-0"
            title="Clear filters"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        )}

        <div className="w-px h-5 bg-gray-200 dark:bg-gray-700 hidden sm:block" />

        {/* View toggle */}
        <div className="flex rounded-lg border border-gray-200 dark:border-gray-600 overflow-hidden shrink-0">
          <button
            onClick={() => setViewMode('board')}
            className={`h-8 w-8 flex items-center justify-center transition-colors ${
              viewMode === 'board'
                ? 'bg-primary-600 text-white'
                : 'text-gray-400 hover:text-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700'
            }`}
            title="Board view"
          >
            <LayoutGrid className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => setViewMode('list')}
            className={`h-8 w-8 flex items-center justify-center transition-colors ${
              viewMode === 'list'
                ? 'bg-primary-600 text-white'
                : 'text-gray-400 hover:text-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700'
            }`}
            title="List view"
          >
            <List className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* New task */}
        {canCreate && (
          <button
            onClick={() => setShowCreateForm(true)}
            className="btn-primary text-xs h-8 py-0 px-3 flex items-center gap-1.5 shrink-0"
          >
            <Plus className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">New Task</span>
          </button>
        )}
      </div>

      {/* Error */}
      {error && (
        <div className="p-2.5 mb-2 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-red-600 dark:text-red-400 text-xs flex-shrink-0">
          {error}
        </div>
      )}

      {/* ── Board — fills remaining space ───────────────── */}
      <div className="flex-1 min-h-0 overflow-auto pb-4">
        {isLoading && tasks.length === 0 ? (
          <div className="flex items-center justify-center h-full">
            <div className="w-7 h-7 border-[3px] border-primary-600 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : (
          <TaskBoard viewMode={viewMode} />
        )}
      </div>

      {/* Create form modal */}
      {showCreateForm && (
        <TaskForm onClose={() => setShowCreateForm(false)} />
      )}
    </div>
  );
}
