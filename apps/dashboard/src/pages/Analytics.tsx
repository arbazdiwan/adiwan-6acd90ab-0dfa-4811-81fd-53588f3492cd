import { useEffect, useMemo } from 'react';
import { useTaskStore, Task } from '../store/taskStore';
import { useAuthStore } from '../store/authStore';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
  PieChart,
  Pie,
  Legend,
} from 'recharts';
import {
  BarChart3,
  CheckCircle2,
  Clock,
  Circle,
  Target,
  TrendingUp,
  Users,
  AlertTriangle,
  Layers,
  CalendarDays,
  AlertOctagon,
} from 'lucide-react';

// ── Helpers ────────────────────────────────────────────────
function pct(n: number, d: number) {
  return d > 0 ? Math.round((n / d) * 100) : 0;
}

function plural(n: number, word: string) {
  return `${n} ${word}${n !== 1 ? 's' : ''}`;
}

// ── Sub-components ─────────────────────────────────────────

function KpiCard({
  icon: Icon,
  label,
  value,
  sub,
  color,
}: {
  icon: React.ElementType;
  label: string;
  value: string | number;
  sub?: string;
  color: string;
}) {
  return (
    <div className="card p-5">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm font-medium text-gray-500 dark:text-gray-400">
            {label}
          </p>
          <p className="text-3xl font-bold text-gray-900 dark:text-white mt-1">
            {value}
          </p>
          {sub && (
            <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
              {sub}
            </p>
          )}
        </div>
        <div className={`p-2.5 rounded-xl ${color}`}>
          <Icon className="w-5 h-5" />
        </div>
      </div>
    </div>
  );
}

function ProgressRing({
  value,
  label,
  color,
}: {
  value: number;
  label: string;
  color: string;
}) {
  const circumference = 2 * Math.PI * 40;
  const offset = circumference - (value / 100) * circumference;

  return (
    <div className="flex flex-col items-center">
      <div className="relative w-24 h-24">
        <svg className="w-24 h-24 -rotate-90" viewBox="0 0 96 96">
          <circle
            cx="48"
            cy="48"
            r="40"
            fill="none"
            stroke="currentColor"
            className="text-gray-200 dark:text-gray-700"
            strokeWidth="8"
          />
          <circle
            cx="48"
            cy="48"
            r="40"
            fill="none"
            stroke={color}
            strokeWidth="8"
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            strokeLinecap="round"
            className="transition-all duration-700"
          />
        </svg>
        <span className="absolute inset-0 flex items-center justify-center text-lg font-bold text-gray-900 dark:text-white">
          {value}%
        </span>
      </div>
      <span className="text-xs text-gray-500 dark:text-gray-400 mt-2">
        {label}
      </span>
    </div>
  );
}

// ── Main Page ──────────────────────────────────────────────

export default function Analytics() {
  const { tasks, fetchTasks, isLoading } = useTaskStore();
  const user = useAuthStore((s) => s.user);

  useEffect(() => {
    fetchTasks();
  }, [fetchTasks]);

  const metrics = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const todo = tasks.filter((t) => t.status === 'todo');
    const inProgress = tasks.filter((t) => t.status === 'in_progress');
    const done = tasks.filter((t) => t.status === 'done');
    const total = tasks.length;

    const work = tasks.filter((t) => t.category === 'work');
    const personal = tasks.filter((t) => t.category === 'personal');
    const urgent = tasks.filter((t) => t.category === 'urgent');
    const other = tasks.filter((t) => t.category === 'other');

    // Overdue: has a due date in the past and is NOT done
    const overdueTasks = tasks.filter((t) => {
      if (!t.dueDate || t.status === 'done') return false;
      const due = new Date(t.dueDate + 'T00:00:00');
      return due < today;
    });

    // Due soon: due within the next 3 days and NOT done
    const dueSoonTasks = tasks.filter((t) => {
      if (!t.dueDate || t.status === 'done') return false;
      const due = new Date(t.dueDate + 'T00:00:00');
      const diff = (due.getTime() - today.getTime()) / (1000 * 60 * 60 * 24);
      return diff >= 0 && diff <= 3;
    });

    // Assignee breakdown
    const assigneeMap = new Map<string, { name: string; count: number; done: number; overdue: number }>();
    tasks.forEach((t) => {
      const key = t.assigneeId;
      const name = t.assignee
        ? `${t.assignee.firstName} ${t.assignee.lastName}`
        : key.slice(0, 8);
      const existing = assigneeMap.get(key) || { name, count: 0, done: 0, overdue: 0 };
      existing.count++;
      if (t.status === 'done') existing.done++;
      if (overdueTasks.some((o) => o.id === t.id)) existing.overdue++;
      assigneeMap.set(key, existing);
    });

    const assigneeData = Array.from(assigneeMap.values())
      .sort((a, b) => b.count - a.count)
      .slice(0, 8);

    return {
      total,
      todo: todo.length,
      inProgress: inProgress.length,
      done: done.length,
      completionRate: pct(done.length, total),
      inProgressRate: pct(inProgress.length, total),
      urgentOpen: urgent.filter((t) => t.status !== 'done').length,
      overdueTasks,
      overdueCount: overdueTasks.length,
      dueSoonCount: dueSoonTasks.length,
      statusData: [
        { name: 'To Do', value: todo.length, color: '#9ca3af' },
        { name: 'In Progress', value: inProgress.length, color: '#f59e0b' },
        { name: 'Done', value: done.length, color: '#10b981' },
      ],
      categoryData: [
        { name: 'Work', value: work.length, color: '#3b82f6' },
        { name: 'Personal', value: personal.length, color: '#10b981' },
        { name: 'Urgent', value: urgent.length, color: '#ef4444' },
        { name: 'Other', value: other.length, color: '#6b7280' },
      ],
      pieData: [
        { name: 'To Do', value: todo.length, fill: '#9ca3af' },
        { name: 'In Progress', value: inProgress.length, fill: '#f59e0b' },
        { name: 'Done', value: done.length, fill: '#10b981' },
      ].filter((d) => d.value > 0),
      assigneeData,
    };
  }, [tasks]);

  if (isLoading && tasks.length === 0) {
    return (
      <div className="flex items-center justify-center py-24">
        <div className="w-8 h-8 border-[3px] border-primary-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <div className="flex items-center gap-3 mb-1">
          <BarChart3 className="w-6 h-6 text-primary-600 dark:text-primary-400" />
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            Analytics
          </h1>
        </div>
        <p className="text-sm text-gray-500 dark:text-gray-400">
          Insights across {plural(metrics.total, 'task')} in your workspace
        </p>
      </div>

      {/* ── KPI Row ──────────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        <KpiCard
          icon={Target}
          label="Total Tasks"
          value={metrics.total}
          sub={`${metrics.done} completed`}
          color="text-primary-600 bg-primary-50 dark:bg-primary-900/20 dark:text-primary-400"
        />
        <KpiCard
          icon={Clock}
          label="In Progress"
          value={metrics.inProgress}
          sub={`${metrics.inProgressRate}% of total`}
          color="text-amber-600 bg-amber-50 dark:bg-amber-900/20 dark:text-amber-400"
        />
        <KpiCard
          icon={CheckCircle2}
          label="Completion Rate"
          value={`${metrics.completionRate}%`}
          sub={plural(metrics.done, 'task') + ' done'}
          color="text-emerald-600 bg-emerald-50 dark:bg-emerald-900/20 dark:text-emerald-400"
        />
        <KpiCard
          icon={AlertOctagon}
          label="Overdue"
          value={metrics.overdueCount}
          sub={metrics.dueSoonCount > 0 ? `${metrics.dueSoonCount} due soon` : 'None upcoming'}
          color={
            metrics.overdueCount > 0
              ? 'text-red-600 bg-red-50 dark:bg-red-900/20 dark:text-red-400'
              : 'text-emerald-600 bg-emerald-50 dark:bg-emerald-900/20 dark:text-emerald-400'
          }
        />
        <KpiCard
          icon={AlertTriangle}
          label="Urgent & Open"
          value={metrics.urgentOpen}
          sub={metrics.urgentOpen > 0 ? 'Need attention' : 'All clear'}
          color={
            metrics.urgentOpen > 0
              ? 'text-red-600 bg-red-50 dark:bg-red-900/20 dark:text-red-400'
              : 'text-emerald-600 bg-emerald-50 dark:bg-emerald-900/20 dark:text-emerald-400'
          }
        />
      </div>

      {/* ── Overdue Tasks ─────────────────────────────────── */}
      {metrics.overdueTasks.length > 0 && (
        <div className="card overflow-hidden">
          <div className="px-5 py-3 border-b border-gray-200 dark:border-gray-700 bg-red-50/50 dark:bg-red-950/20">
            <h2 className="text-sm font-semibold text-red-700 dark:text-red-400 flex items-center gap-2">
              <AlertOctagon className="w-4 h-4" />
              Overdue Tasks ({metrics.overdueTasks.length})
            </h2>
          </div>
          <div className="divide-y divide-gray-100 dark:divide-gray-700/50">
            {metrics.overdueTasks.map((task) => {
              const dueDate = new Date(task.dueDate! + 'T00:00:00');
              const today = new Date();
              today.setHours(0, 0, 0, 0);
              const daysOver = Math.floor((today.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24));
              return (
                <div key={task.id} className="flex items-center gap-4 px-5 py-2.5 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-800 dark:text-gray-200 truncate">
                      {task.title}
                    </p>
                    <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">
                      {task.assignee
                        ? `${task.assignee.firstName} ${task.assignee.lastName}`
                        : 'Unassigned'
                      }
                      {' · '}
                      <span className="capitalize">{task.category}</span>
                    </p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-xs font-medium text-red-600 dark:text-red-400 flex items-center gap-1 justify-end">
                      <CalendarDays className="w-3 h-3" />
                      {dueDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                    </p>
                    <p className="text-[10px] text-red-500 dark:text-red-400 mt-0.5">
                      {daysOver} {daysOver === 1 ? 'day' : 'days'} overdue
                    </p>
                  </div>
                  <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded ${
                    task.status === 'todo'
                      ? 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400'
                      : 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400'
                  }`}>
                    {task.status === 'todo' ? 'To Do' : 'In Progress'}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── Progress Rings ───────────────────────────────── */}
      <div className="card p-6">
        <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-5 flex items-center gap-2">
          <TrendingUp className="w-4 h-4" />
          Overall Progress
        </h2>
        <div className="flex flex-wrap items-center justify-center gap-10">
          <ProgressRing
            value={metrics.completionRate}
            label="Completed"
            color="#10b981"
          />
          <ProgressRing
            value={metrics.inProgressRate}
            label="In Progress"
            color="#f59e0b"
          />
          <ProgressRing
            value={pct(metrics.todo, metrics.total)}
            label="To Do"
            color="#9ca3af"
          />
        </div>
      </div>

      {/* ── Charts Row ───────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Status Bar Chart */}
        <div className="card p-5">
          <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-4 flex items-center gap-2">
            <Layers className="w-4 h-4" />
            Tasks by Status
          </h2>
          <ResponsiveContainer width="100%" height={240}>
            <BarChart
              data={metrics.statusData}
              margin={{ top: 0, right: 0, bottom: 0, left: -20 }}
            >
              <XAxis
                dataKey="name"
                tick={{ fontSize: 12 }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                allowDecimals={false}
                tick={{ fontSize: 12 }}
                axisLine={false}
                tickLine={false}
              />
              <Tooltip
                contentStyle={{
                  borderRadius: '8px',
                  border: 'none',
                  boxShadow: '0 4px 12px rgba(0,0,0,0.12)',
                  fontSize: 13,
                }}
              />
              <Bar dataKey="value" radius={[6, 6, 0, 0]} barSize={48}>
                {metrics.statusData.map((entry, i) => (
                  <Cell key={i} fill={entry.color} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Status Pie Chart */}
        <div className="card p-5">
          <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-4 flex items-center gap-2">
            <Circle className="w-4 h-4" />
            Status Distribution
          </h2>
          {metrics.pieData.length > 0 ? (
            <ResponsiveContainer width="100%" height={240}>
              <PieChart>
                <Pie
                  data={metrics.pieData}
                  cx="50%"
                  cy="50%"
                  innerRadius={55}
                  outerRadius={85}
                  paddingAngle={4}
                  dataKey="value"
                  stroke="none"
                />
                <Legend
                  verticalAlign="bottom"
                  height={36}
                  iconType="circle"
                  iconSize={8}
                  formatter={(value: string) => (
                    <span className="text-xs text-gray-600 dark:text-gray-400">
                      {value}
                    </span>
                  )}
                />
                <Tooltip
                  contentStyle={{
                    borderRadius: '8px',
                    border: 'none',
                    boxShadow: '0 4px 12px rgba(0,0,0,0.12)',
                    fontSize: 13,
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center h-[240px] text-gray-400 dark:text-gray-500 text-sm">
              No data yet
            </div>
          )}
        </div>
      </div>

      {/* ── Category Breakdown ───────────────────────────── */}
      <div className="card p-5">
        <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-4 flex items-center gap-2">
          <Layers className="w-4 h-4" />
          Tasks by Category
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Bar chart */}
          <ResponsiveContainer width="100%" height={220}>
            <BarChart
              data={metrics.categoryData}
              layout="vertical"
              margin={{ top: 0, right: 0, bottom: 0, left: 0 }}
            >
              <XAxis type="number" allowDecimals={false} axisLine={false} tickLine={false} tick={{ fontSize: 12 }} />
              <YAxis
                type="category"
                dataKey="name"
                axisLine={false}
                tickLine={false}
                tick={{ fontSize: 12 }}
                width={70}
              />
              <Tooltip
                contentStyle={{
                  borderRadius: '8px',
                  border: 'none',
                  boxShadow: '0 4px 12px rgba(0,0,0,0.12)',
                  fontSize: 13,
                }}
              />
              <Bar dataKey="value" radius={[0, 6, 6, 0]} barSize={24}>
                {metrics.categoryData.map((entry, i) => (
                  <Cell key={i} fill={entry.color} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>

          {/* Category detail cards */}
          <div className="grid grid-cols-2 gap-3 content-start">
            {metrics.categoryData.map((cat) => (
              <div
                key={cat.name}
                className="p-3 rounded-lg border border-gray-100 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-800/50"
              >
                <div className="flex items-center gap-2 mb-1">
                  <div
                    className="w-2.5 h-2.5 rounded-full"
                    style={{ backgroundColor: cat.color }}
                  />
                  <span className="text-xs font-medium text-gray-600 dark:text-gray-400">
                    {cat.name}
                  </span>
                </div>
                <p className="text-xl font-bold text-gray-900 dark:text-white">
                  {cat.value}
                </p>
                <p className="text-xs text-gray-400 dark:text-gray-500">
                  {pct(cat.value, metrics.total)}% of total
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Assignee Workload ────────────────────────────── */}
      {metrics.assigneeData.length > 0 && (
        <div className="card p-5">
          <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-4 flex items-center gap-2">
            <Users className="w-4 h-4" />
            Workload by Assignee
          </h2>
          <div className="space-y-3">
            {metrics.assigneeData.map((a) => {
              const doneRate = pct(a.done, a.count);
              return (
                <div key={a.name} className="flex items-center gap-4">
                  <div className="w-32 sm:w-40 text-sm font-medium text-gray-700 dark:text-gray-300 truncate">
                    {a.name}
                  </div>
                  <div className="flex-1">
                    <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2.5 overflow-hidden">
                      <div
                        className="bg-emerald-500 h-2.5 rounded-full transition-all duration-500"
                        style={{ width: `${doneRate}%` }}
                      />
                    </div>
                  </div>
                  <div className="w-36 text-right text-xs text-gray-500 dark:text-gray-400 whitespace-nowrap flex items-center justify-end gap-2">
                    <span>{a.done}/{a.count} done ({doneRate}%)</span>
                    {a.overdue > 0 && (
                      <span className="text-[10px] text-red-500 dark:text-red-400 bg-red-50 dark:bg-red-900/20 px-1.5 py-0.5 rounded">
                        {a.overdue} overdue
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
