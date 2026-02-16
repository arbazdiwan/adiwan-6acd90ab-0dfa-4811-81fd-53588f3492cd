import { useState } from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { useTaskStore, Task } from '../store/taskStore';
import { useAuthStore } from '../store/authStore';
import {
  GripVertical,
  Pencil,
  Trash2,
  Check,
  X,
  Clock,
  CheckCircle2,
  Circle,
  AlertTriangle,
  CalendarDays,
} from 'lucide-react';
import clsx from 'clsx';

const statusConfig = {
  todo: { icon: Circle, color: 'text-gray-400 dark:text-gray-500', label: 'To Do' },
  in_progress: { icon: Clock, color: 'text-amber-500', label: 'In Progress' },
  done: { icon: CheckCircle2, color: 'text-emerald-500', label: 'Done' },
};

const categoryBadge: Record<string, string> = {
  work: 'bg-blue-50 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400 ring-blue-200/60 dark:ring-blue-800/40',
  personal: 'bg-violet-50 text-violet-600 dark:bg-violet-900/30 dark:text-violet-400 ring-violet-200/60 dark:ring-violet-800/40',
  urgent: 'bg-red-50 text-red-600 dark:bg-red-900/30 dark:text-red-400 ring-red-200/60 dark:ring-red-800/40',
  other: 'bg-gray-50 text-gray-600 dark:bg-gray-700 dark:text-gray-400 ring-gray-200/60 dark:ring-gray-700/40',
};

function isOverdue(task: Task): boolean {
  if (!task.dueDate || task.status === 'done') return false;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const due = new Date(task.dueDate + 'T00:00:00');
  return due < today;
}

function isDueSoon(task: Task): boolean {
  if (!task.dueDate || task.status === 'done') return false;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const due = new Date(task.dueDate + 'T00:00:00');
  const diff = (due.getTime() - today.getTime()) / (1000 * 60 * 60 * 24);
  return diff >= 0 && diff <= 2;
}

function formatDate(dateStr: string): string {
  const d = new Date(dateStr + 'T00:00:00');
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function daysUntil(dateStr: string): string {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const target = new Date(dateStr + 'T00:00:00');
  const diff = Math.ceil((target.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
  if (diff < 0) return `${Math.abs(diff)}d overdue`;
  if (diff === 0) return 'Due today';
  if (diff === 1) return 'Due tomorrow';
  return `${diff}d left`;
}

interface TaskCardProps {
  task: Task;
}

export default function TaskCard({ task }: TaskCardProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editTitle, setEditTitle] = useState(task.title);
  const [editDesc, setEditDesc] = useState(task.description);
  const [editStartDate, setEditStartDate] = useState(task.startDate || '');
  const [editDueDate, setEditDueDate] = useState(task.dueDate || '');
  const { updateTask, deleteTask } = useTaskStore();
  const user = useAuthStore((s) => s.user);
  const canModify = user?.role === 'admin' || user?.role === 'owner';

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: task.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const cfg = statusConfig[task.status] || statusConfig.todo;
  const StatusIcon = cfg.icon;

  const overdue = isOverdue(task);
  const dueSoon = isDueSoon(task);

  const handleSave = async () => {
    if (!editTitle.trim()) return;
    try {
      await updateTask(task.id, {
        title: editTitle,
        description: editDesc,
        startDate: editStartDate || null,
        dueDate: editDueDate || null,
      });
      setIsEditing(false);
    } catch {
      /* store handles error */
    }
  };

  const handleStatusCycle = () => {
    if (!canModify) return;
    const next =
      task.status === 'todo'
        ? 'in_progress'
        : task.status === 'in_progress'
        ? 'done'
        : 'todo';
    updateTask(task.id, { status: next });
  };

  const handleDelete = () => {
    if (window.confirm('Delete this task?')) deleteTask(task.id);
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={clsx(
        'bg-white dark:bg-gray-800 rounded-lg border',
        overdue
          ? 'border-red-300 dark:border-red-700/60'
          : 'border-gray-200/80 dark:border-gray-700/60',
        'shadow-sm hover:shadow-md transition-shadow duration-150 group',
        isDragging && 'shadow-xl ring-2 ring-primary-400/50 opacity-95 rotate-[0.5deg] z-50',
      )}
    >
      {/* Overdue top accent bar */}
      {overdue && (
        <div className="h-0.5 bg-gradient-to-r from-red-500 to-red-400 rounded-t-lg" />
      )}

      <div className="flex items-start gap-2.5 p-3">
        {/* Drag handle */}
        {canModify && (
          <button
            {...attributes}
            {...listeners}
            className="mt-0.5 p-0.5 rounded text-gray-300 dark:text-gray-600 hover:text-gray-500 dark:hover:text-gray-400 cursor-grab active:cursor-grabbing opacity-0 group-hover:opacity-100 transition-opacity shrink-0"
          >
            <GripVertical className="w-3.5 h-3.5" />
          </button>
        )}

        {/* Status toggle */}
        <button
          onClick={handleStatusCycle}
          className={clsx('mt-0.5 shrink-0 transition-colors', cfg.color)}
          title={cfg.label}
          disabled={!canModify}
        >
          <StatusIcon className="w-[18px] h-[18px]" />
        </button>

        {/* Content */}
        <div className="flex-1 min-w-0">
          {isEditing ? (
            <div className="space-y-2">
              <input
                value={editTitle}
                onChange={(e) => setEditTitle(e.target.value)}
                className="input-field text-sm py-1.5"
                autoFocus
                onKeyDown={(e) => e.key === 'Enter' && handleSave()}
              />
              <textarea
                value={editDesc}
                onChange={(e) => setEditDesc(e.target.value)}
                className="input-field text-sm py-1.5 resize-none"
                rows={2}
                placeholder="Add description..."
              />
              <div className="grid grid-cols-2 gap-2">
                <input
                  type="date"
                  value={editStartDate}
                  onChange={(e) => setEditStartDate(e.target.value)}
                  className="input-field text-xs py-1"
                  title="Start date"
                />
                <input
                  type="date"
                  value={editDueDate}
                  onChange={(e) => setEditDueDate(e.target.value)}
                  className="input-field text-xs py-1"
                  title="Due date"
                />
              </div>
              <div className="flex gap-1.5">
                <button onClick={handleSave} className="btn-primary text-xs py-1 px-2.5">
                  <Check className="w-3 h-3 inline mr-1" />
                  Save
                </button>
                <button
                  onClick={() => {
                    setIsEditing(false);
                    setEditTitle(task.title);
                    setEditDesc(task.description);
                    setEditStartDate(task.startDate || '');
                    setEditDueDate(task.dueDate || '');
                  }}
                  className="btn-secondary text-xs py-1 px-2.5"
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <>
              <p
                className={clsx(
                  'text-sm font-medium leading-snug',
                  task.status === 'done'
                    ? 'line-through text-gray-400 dark:text-gray-500'
                    : 'text-gray-800 dark:text-gray-200',
                )}
              >
                {task.title}
              </p>

              {task.description && (
                <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5 line-clamp-2 leading-relaxed">
                  {task.description}
                </p>
              )}

              <div className="flex items-center gap-2 mt-2 flex-wrap">
                <span
                  className={clsx(
                    'text-[10px] font-semibold uppercase tracking-wider px-1.5 py-0.5 rounded ring-1',
                    categoryBadge[task.category] || categoryBadge.other,
                  )}
                >
                  {task.category}
                </span>

                {/* Due date indicator */}
                {task.dueDate && task.status !== 'done' && (
                  <span
                    className={clsx(
                      'inline-flex items-center gap-1 text-[10px] font-medium px-1.5 py-0.5 rounded',
                      overdue
                        ? 'bg-red-50 text-red-600 dark:bg-red-900/30 dark:text-red-400'
                        : dueSoon
                        ? 'bg-amber-50 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400'
                        : 'bg-gray-50 text-gray-500 dark:bg-gray-700 dark:text-gray-400',
                    )}
                    title={`Due: ${task.dueDate}`}
                  >
                    {overdue ? (
                      <AlertTriangle className="w-2.5 h-2.5" />
                    ) : (
                      <CalendarDays className="w-2.5 h-2.5" />
                    )}
                    {daysUntil(task.dueDate)}
                  </span>
                )}

                {/* Completed due date — show as muted */}
                {task.dueDate && task.status === 'done' && (
                  <span className="inline-flex items-center gap-1 text-[10px] text-gray-400 dark:text-gray-500">
                    <CalendarDays className="w-2.5 h-2.5" />
                    {formatDate(task.dueDate)}
                  </span>
                )}

                {task.assignee && (
                  <span className="text-[11px] text-gray-400 dark:text-gray-500">
                    {task.assignee.firstName} {task.assignee.lastName}
                  </span>
                )}
              </div>
            </>
          )}
        </div>

        {/* Actions */}
        {canModify && !isEditing && (
          <div className="flex flex-col gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
            <button
              onClick={() => setIsEditing(true)}
              className="p-1 rounded text-gray-400 hover:text-primary-600 hover:bg-primary-50 dark:hover:bg-primary-900/20 transition-colors"
              title="Edit"
            >
              <Pencil className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={handleDelete}
              className="p-1 rounded text-gray-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
              title="Delete"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
