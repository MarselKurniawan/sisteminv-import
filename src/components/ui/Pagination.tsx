import React from 'react';
import { Button } from './Button';

interface PaginationProps {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  className?: string;
}

export const Pagination: React.FC<PaginationProps> = ({
  currentPage,
  totalPages,
  onPageChange,
  className = ''
}) => {
  if (totalPages <= 1) return null;

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <Button
        size="sm"
        variant="secondary"
        onClick={() => onPageChange(Math.max(1, currentPage - 1))}
        disabled={currentPage === 1}
      >
        Sebelumnya
      </Button>
      
      <div className="flex items-center gap-1">
        {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
          const page = i + 1;
          return (
            <Button
              key={page}
              size="sm"
              variant={currentPage === page ? "primary" : "secondary"}
              onClick={() => onPageChange(page)}
              className="w-8 h-8"
            >
              {page}
            </Button>
          );
        })}
        {totalPages > 5 && (
          <>
            <span className="text-gray-500">...</span>
            <Button
              size="sm"
              variant={currentPage === totalPages ? "primary" : "secondary"}
              onClick={() => onPageChange(totalPages)}
              className="w-8 h-8"
            >
              {totalPages}
            </Button>
          </>
        )}
      </div>
      
      <Button
        size="sm"
        variant="secondary"
        onClick={() => onPageChange(Math.min(totalPages, currentPage + 1))}
        disabled={currentPage === totalPages}
      >
        Selanjutnya
      </Button>
    </div>
  );
};