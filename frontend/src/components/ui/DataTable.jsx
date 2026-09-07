import React from 'react';

export function DataTable({
  columns,
  data,
  keyExtractor = (row, index) => row.id || index,
  onRowClick,
  emptyMessage = 'No data available',
  className = '',
}) {
  return (
    <div className={`overflow-x-auto border border-[#1b253b] rounded-md ${className}`}>
      <table className="w-full text-left border-collapse text-xs">
        <thead>
          <tr className="bg-[#0b101a] border-b border-[#1b253b] text-slate-400 font-mono text-[11px] uppercase tracking-wider">
            {columns.map((col, idx) => (
              <th
                key={idx}
                className={`py-2.5 px-3 font-semibold ${col.align === 'right' ? 'text-right' : col.align === 'center' ? 'text-center' : 'text-left'} ${col.className || ''}`}
              >
                {col.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-[#151f33] bg-[#0d131f]">
          {data && data.length > 0 ? (
            data.map((row, rowIdx) => (
              <tr
                key={keyExtractor(row, rowIdx)}
                onClick={() => onRowClick && onRowClick(row)}
                className={`transition-colors duration-100 ${
                  onRowClick ? 'cursor-pointer hover:bg-[#151f33]' : 'hover:bg-[#111929]'
                }`}
              >
                {columns.map((col, colIdx) => (
                  <td
                    key={colIdx}
                    className={`py-2 px-3 text-slate-200 font-mono tabular-nums ${
                      col.align === 'right' ? 'text-right' : col.align === 'center' ? 'text-center' : 'text-left'
                    } ${col.cellClassName || ''}`}
                  >
                    {col.render ? col.render(row, rowIdx) : row[col.accessor]}
                  </td>
                ))}
              </tr>
            ))
          ) : (
            <tr>
              <td colSpan={columns.length} className="text-center py-8 text-slate-500 font-mono text-xs">
                {emptyMessage}
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
