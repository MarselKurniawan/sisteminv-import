import React from 'react';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from './Table';
import { SearchInput } from './SearchInput';
import { Select } from './Select';
import { Pagination } from './Pagination';
import { Button } from './Button';

interface Column {
  key: string;
  header: string;
  render?: (row: any) => React.ReactNode;
}

interface DataTableProps {
  data: any[];
  columns: Column[];
  searchTerm: string;
  onSearchChange: (value: string) => void;
  searchPlaceholder?: string;
  currentPage: number;
  itemsPerPage: number;
  onPageChange: (page: number) => void;
  onItemsPerPageChange: (value: number) => void;
  emptyMessage?: string;
  emptyIcon?: React.ReactNode;
  onResetFilters?: () => void;
  totalItems?: number;
  className?: string;
  renderActions?: (row: any) => React.ReactNode;
}

export const DataTable: React.FC<DataTableProps> = ({
  data,
  columns,
  searchTerm,
  onSearchChange,
  searchPlaceholder = 'Cari...',
  currentPage,
  itemsPerPage,
  onPageChange,
  onItemsPerPageChange,
  emptyMessage = 'Tidak ada data',
  emptyIcon,
  onResetFilters,
  totalItems,
  className = '',
  renderActions
}) => {
  const itemsPerPageOptions = [
    { value: 5, label: '5 per halaman' },
    { value: 10, label: '10 per halaman' },
    { value: 25, label: '25 per halaman' },
    { value: 50, label: '50 per halaman' }
  ];

  const totalPages = Math.ceil(data.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentData = data.slice(startIndex, endIndex);

  return (
    <div className={`space-y-4 ${className}`}>
      <div className="flex flex-col sm:flex-row gap-4 items-end">
        <SearchInput
          value={searchTerm}
          onChange={onSearchChange}
          placeholder={searchPlaceholder}
          label="Cari"
          className="flex-1"
        />
        
        <Select
          label="Items per Halaman"
          value={itemsPerPage}
          onChange={(value) => onItemsPerPageChange(parseInt(value.toString()))}
          options={itemsPerPageOptions}
          className="w-48"
        />
        
        {onResetFilters && (
          <Button
            variant="secondary"
            onClick={onResetFilters}
          >
            Reset Filter
          </Button>
        )}
      </div>
      
      <div className="text-sm text-gray-600">
        Menampilkan {startIndex + 1}-{Math.min(endIndex, data.length)} dari {data.length} item
        {totalItems && data.length !== totalItems && ` (difilter dari ${totalItems} total)`}
      </div>
      
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              {columns.map((column) => (
                <TableHead key={column.key}>{column.header}</TableHead>
              ))}
              {renderActions && <TableHead>Aksi</TableHead>}
            </TableRow>
          </TableHeader>
          <TableBody>
            {currentData.length === 0 ? (
              <TableRow>
                <TableCell colSpan={columns.length + (renderActions ? 1 : 0)} className="text-center py-8">
                  {emptyIcon && <div className="mx-auto mb-4">{emptyIcon}</div>}
                  <p className="text-gray-500">{emptyMessage}</p>
                </TableCell>
              </TableRow>
            ) : (
              currentData.map((row, rowIndex) => (
                <TableRow key={rowIndex}>
                  {columns.map((column) => (
                    <TableCell key={`${rowIndex}-${column.key}`}>
                      {column.render ? column.render(row) : row[column.key]}
                    </TableCell>
                  ))}
                  {renderActions && (
                    <TableCell>
                      {renderActions(row)}
                    </TableCell>
                  )}
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
      
      <Pagination
        currentPage={currentPage}
        totalPages={totalPages}
        onPageChange={onPageChange}
      />
    </div>
  );
};