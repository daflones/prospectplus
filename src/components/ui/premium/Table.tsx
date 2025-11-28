import { motion, AnimatePresence } from 'framer-motion';
import type { ReactNode } from 'react';

interface Column<T> {
  key: string;
  header: string;
  render?: (item: T, index: number) => ReactNode;
  className?: string;
  align?: 'left' | 'center' | 'right';
}

interface TableProps<T> {
  data: T[];
  columns: Column<T>[];
  keyExtractor: (item: T) => string;
  loading?: boolean;
  emptyMessage?: string;
  emptyIcon?: ReactNode;
  onRowClick?: (item: T) => void;
  className?: string;
}

export function Table<T extends Record<string, unknown>>({
  data,
  columns,
  keyExtractor,
  loading = false,
  emptyMessage = 'Nenhum item encontrado',
  emptyIcon,
  onRowClick,
  className = '',
}: TableProps<T>) {
  const alignClasses = {
    left: 'text-left',
    center: 'text-center',
    right: 'text-right',
  };

  if (loading) {
    return (
      <div className={`bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 overflow-hidden ${className}`}>
        <div className="p-8">
          <div className="space-y-4">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="flex items-center gap-4">
                <div className="h-10 w-10 rounded-xl bg-gray-200 dark:bg-gray-700 animate-pulse" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded-lg animate-pulse w-3/4" />
                  <div className="h-3 bg-gray-100 dark:bg-gray-800 rounded-lg animate-pulse w-1/2" />
                </div>
                <div className="h-8 w-20 bg-gray-200 dark:bg-gray-700 rounded-lg animate-pulse" />
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (data.length === 0) {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className={`bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 p-12 text-center ${className}`}
      >
        {emptyIcon && (
          <div className="mx-auto w-16 h-16 rounded-2xl bg-gray-100 dark:bg-gray-800 flex items-center justify-center mb-4">
            <div className="text-gray-400">{emptyIcon}</div>
          </div>
        )}
        <p className="text-gray-500 dark:text-gray-400">{emptyMessage}</p>
      </motion.div>
    );
  }

  return (
    <div className={`bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 overflow-hidden ${className}`}>
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-gray-100 dark:border-gray-800">
              {columns.map((column) => (
                <th
                  key={column.key}
                  className={`
                    px-6 py-4 text-xs font-semibold uppercase tracking-wider
                    text-gray-500 dark:text-gray-400 bg-gray-50/50 dark:bg-gray-800/50
                    ${alignClasses[column.align || 'left']}
                    ${column.className || ''}
                  `}
                >
                  {column.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
            <AnimatePresence>
              {data.map((item, index) => (
                <motion.tr
                  key={keyExtractor(item)}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.2, delay: index * 0.03 }}
                  onClick={() => onRowClick?.(item)}
                  className={`
                    group transition-colors duration-150
                    ${onRowClick ? 'cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800/50' : ''}
                  `}
                >
                  {columns.map((column) => (
                    <td
                      key={column.key}
                      className={`
                        px-6 py-4 text-sm text-gray-900 dark:text-gray-100
                        ${alignClasses[column.align || 'left']}
                        ${column.className || ''}
                      `}
                    >
                      {column.render
                        ? column.render(item, index)
                        : String(item[column.key] ?? '')}
                    </td>
                  ))}
                </motion.tr>
              ))}
            </AnimatePresence>
          </tbody>
        </table>
      </div>
    </div>
  );
}
