import { useTaskStore } from '../store/taskStore';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from 'recharts';
import { CheckCircle2, Clock, Circle, Target } from 'lucide-react';

export default function TaskStats() {
  const tasks = useTaskStore((s) => s.tasks);

  const todo = tasks.filter((t) => t.status === 'todo').length;
  const inProgress = tasks.filter((t) => t.status === 'in_progress').length;
  const done = tasks.filter((t) => t.status === 'done').length;
  const total = tasks.length;
  const completionRate = total > 0 ? Math.round((done / total) * 100) : 0;

  const statusData = [
    { name: 'To Do', value: todo, color: '#9ca3af' },
    { name: 'In Progress', value: inProgress, color: '#f59e0b' },
    { name: 'Done', value: done, color: '#10b981' },
  ];

  const categoryData = [
    {
      name: 'Work',
      value: tasks.filter((t) => t.category === 'work').length,
      color: '#3b82f6',
    },
    {
      name: 'Personal',
      value: tasks.filter((t) => t.category === 'personal').length,
      color: '#10b981',
    },
    {
      name: 'Urgent',
      value: tasks.filter((t) => t.category === 'urgent').length,
      color: '#ef4444',
    },
    {
      name: 'Other',
      value: tasks.filter((t) => t.category === 'other').length,
      color: '#6b7280',
    },
  ];

  const stats = [
    {
      label: 'Total',
      value: total,
      icon: Target,
      color: 'text-primary-600 bg-primary-50 dark:bg-primary-900/20 dark:text-primary-400',
    },
    {
      label: 'To Do',
      value: todo,
      icon: Circle,
      color: 'text-gray-500 bg-gray-100 dark:bg-gray-700 dark:text-gray-400',
    },
    {
      label: 'In Progress',
      value: inProgress,
      icon: Clock,
      color: 'text-amber-600 bg-amber-50 dark:bg-amber-900/20 dark:text-amber-400',
    },
    {
      label: 'Done',
      value: done,
      icon: CheckCircle2,
      color: 'text-emerald-600 bg-emerald-50 dark:bg-emerald-900/20 dark:text-emerald-400',
    },
  ];

  return (
    <div className="space-y-4">
      {/* Summary cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {stats.map((stat) => {
          const Icon = stat.icon;
          return (
            <div key={stat.label} className="card p-4">
              <div className="flex items-center gap-3">
                <div className={`p-2 rounded-lg ${stat.color}`}>
                  <Icon className="w-4 h-4" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white">
                    {stat.value}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    {stat.label}
                  </p>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Completion bar */}
      <div className="card p-4">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
            Completion Rate
          </span>
          <span className="text-sm font-bold text-emerald-600 dark:text-emerald-400">
            {completionRate}%
          </span>
        </div>
        <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2.5">
          <div
            className="bg-emerald-500 h-2.5 rounded-full transition-all duration-500"
            style={{ width: `${completionRate}%` }}
          />
        </div>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="card p-4">
          <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">
            Tasks by Status
          </h3>
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={statusData}>
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
                  boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
                }}
              />
              <Bar dataKey="value" radius={[6, 6, 0, 0]}>
                {statusData.map((entry, index) => (
                  <Cell key={index} fill={entry.color} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="card p-4">
          <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">
            Tasks by Category
          </h3>
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={categoryData}>
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
                  boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
                }}
              />
              <Bar dataKey="value" radius={[6, 6, 0, 0]}>
                {categoryData.map((entry, index) => (
                  <Cell key={index} fill={entry.color} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
