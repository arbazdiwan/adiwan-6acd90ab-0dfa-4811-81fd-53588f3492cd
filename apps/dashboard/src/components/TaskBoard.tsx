import { useState } from 'react';
import {
  DndContext,
  DragOverlay,
  pointerWithin,
  PointerSensor,
  useSensor,
  useSensors,
  DragStartEvent,
  DragEndEvent,
  DragOverEvent,
  useDroppable,
} from '@dnd-kit/core';
import {
  SortableContext,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { useTaskStore, Task } from '../store/taskStore';
import TaskCard from './TaskCard';
import { Circle, Clock, CheckCircle2, Inbox } from 'lucide-react';
import clsx from 'clsx';

const columns = [
  {
    key: 'todo',
    label: 'To Do',
    icon: Circle,
    accent: 'bg-gray-400',
    headerColor: 'text-gray-700 dark:text-gray-300',
    bg: 'bg-gray-50/80 dark:bg-gray-800/40',
    dropHighlight: 'ring-2 ring-gray-400/40 bg-gray-100/80 dark:bg-gray-700/40',
  },
  {
    key: 'in_progress',
    label: 'In Progress',
    icon: Clock,
    accent: 'bg-amber-500',
    headerColor: 'text-gray-700 dark:text-gray-300',
    bg: 'bg-amber-50/40 dark:bg-amber-950/20',
    dropHighlight: 'ring-2 ring-amber-400/40 bg-amber-100/60 dark:bg-amber-900/30',
  },
  {
    key: 'done',
    label: 'Done',
    icon: CheckCircle2,
    accent: 'bg-emerald-500',
    headerColor: 'text-gray-700 dark:text-gray-300',
    bg: 'bg-emerald-50/40 dark:bg-emerald-950/20',
    dropHighlight: 'ring-2 ring-emerald-400/40 bg-emerald-100/60 dark:bg-emerald-900/30',
  },
];

// ── Droppable column wrapper ────────────────────────────────
function DroppableColumn({
  col,
  isOver,
  children,
}: {
  col: (typeof columns)[number];
  isOver: boolean;
  children: React.ReactNode;
}) {
  const { setNodeRef } = useDroppable({ id: col.key });

  return (
    <div
      ref={setNodeRef}
      className={clsx(
        'rounded-xl p-3 flex flex-col min-h-0 transition-all duration-150',
        isOver ? col.dropHighlight : col.bg,
      )}
    >
      {children}
    </div>
  );
}

// ── Main board ──────────────────────────────────────────────

interface TaskBoardProps {
  viewMode: 'board' | 'list';
}

export default function TaskBoard({ viewMode }: TaskBoardProps) {
  const { tasks, reorderTasks, updateTask } = useTaskStore();
  const [activeTask, setActiveTask] = useState<Task | null>(null);
  const [overColumnKey, setOverColumnKey] = useState<string | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 8 },
    }),
  );

  const handleDragStart = (event: DragStartEvent) => {
    const task = tasks.find((t) => t.id === String(event.active.id));
    setActiveTask(task || null);
  };

  const handleDragOver = (event: DragOverEvent) => {
    const { over } = event;
    if (!over) {
      setOverColumnKey(null);
      return;
    }

    const overId = String(over.id);

    // Hovering directly over a column droppable
    if (['todo', 'in_progress', 'done'].includes(overId)) {
      setOverColumnKey(overId);
      return;
    }

    // Hovering over a task card — find which column that task belongs to
    const overTask = tasks.find((t) => t.id === overId);
    if (overTask) {
      setOverColumnKey(overTask.status);
    }
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveTask(null);
    setOverColumnKey(null);

    if (!over || active.id === over.id) return;

    const activeId = String(active.id);
    const overId = String(over.id);
    const draggedTask = tasks.find((t) => t.id === activeId);
    if (!draggedTask) return;

    // Dropped onto a column droppable → change status
    if (['todo', 'in_progress', 'done'].includes(overId)) {
      if (draggedTask.status !== overId) {
        updateTask(activeId, { status: overId });
      }
      return;
    }

    // Dropped onto another task card
    const overTask = tasks.find((t) => t.id === overId);
    if (overTask) {
      // If different column → change status
      if (draggedTask.status !== overTask.status) {
        updateTask(activeId, { status: overTask.status });
      } else {
        // Same column → reorder
        reorderTasks(activeId, overId);
      }
    }
  };

  const handleDragCancel = () => {
    setActiveTask(null);
    setOverColumnKey(null);
  };

  if (viewMode === 'board') {
    return (
      <DndContext
        sensors={sensors}
        collisionDetection={pointerWithin}
        onDragStart={handleDragStart}
        onDragOver={handleDragOver}
        onDragEnd={handleDragEnd}
        onDragCancel={handleDragCancel}
      >
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 h-full">
          {columns.map((col) => {
            const colTasks = tasks.filter((t) => t.status === col.key);
            const Icon = col.icon;
            const isOver = overColumnKey === col.key && activeTask?.status !== col.key;

            return (
              <DroppableColumn key={col.key} col={col} isOver={isOver}>
                {/* Column header */}
                <div className="flex items-center gap-2.5 mb-3 px-1">
                  <div className={`w-2 h-2 rounded-full ${col.accent}`} />
                  <h3
                    className={`text-[13px] font-semibold ${col.headerColor} uppercase tracking-wide`}
                  >
                    {col.label}
                  </h3>
                  <span className="text-[11px] font-medium text-gray-400 dark:text-gray-500 bg-white/70 dark:bg-gray-700/70 px-1.5 py-0.5 rounded ml-auto">
                    {colTasks.length}
                  </span>
                </div>

                {/* Cards */}
                <SortableContext
                  items={colTasks.map((t) => t.id)}
                  strategy={verticalListSortingStrategy}
                >
                  <div className="space-y-2 flex-1 overflow-y-auto">
                    {colTasks.map((task) => (
                      <TaskCard key={task.id} task={task} />
                    ))}
                  </div>
                </SortableContext>

                {/* Empty state / drop hint */}
                {colTasks.length === 0 && (
                  <div
                    className={clsx(
                      'flex-1 flex flex-col items-center justify-center py-6 transition-opacity',
                      isOver ? 'opacity-70' : 'opacity-40',
                    )}
                  >
                    <Icon className="w-6 h-6 mb-1.5" />
                    <p className="text-xs">
                      {isOver ? 'Drop here' : 'No tasks'}
                    </p>
                  </div>
                )}
              </DroppableColumn>
            );
          })}
        </div>

        {/* Drag overlay — ghost card that follows the cursor */}
        <DragOverlay dropAnimation={null}>
          {activeTask ? (
            <div className="opacity-80 rotate-[2deg] scale-105 pointer-events-none">
              <TaskCard task={activeTask} />
            </div>
          ) : null}
        </DragOverlay>
      </DndContext>
    );
  }

  // List view — simple reorder only
  return (
    <DndContext
      sensors={sensors}
      collisionDetection={pointerWithin}
      onDragEnd={(event) => {
        const { active, over } = event;
        if (!over || active.id === over.id) return;
        reorderTasks(String(active.id), String(over.id));
      }}
    >
      <SortableContext
        items={tasks.map((t) => t.id)}
        strategy={verticalListSortingStrategy}
      >
        <div className="space-y-2">
          {tasks.map((task) => (
            <TaskCard key={task.id} task={task} />
          ))}
          {tasks.length === 0 && (
            <div className="text-center py-20">
              <Inbox className="w-10 h-10 mx-auto mb-3 text-gray-300 dark:text-gray-600" />
              <p className="text-sm font-medium text-gray-500 dark:text-gray-400">
                No tasks found
              </p>
              <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                Create a task or adjust your filters
              </p>
            </div>
          )}
        </div>
      </SortableContext>
    </DndContext>
  );
}
