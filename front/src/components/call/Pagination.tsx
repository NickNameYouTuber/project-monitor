import React from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '../ui/button';

interface PaginationProps {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  size?: 'small' | 'large';
  className?: string;
}

export function Pagination({ 
  currentPage, 
  totalPages, 
  onPageChange, 
  size = 'large',
  className = '' 
}: PaginationProps) {
  if (totalPages <= 1) return null;

  const nextPage = () => {
    if (currentPage < totalPages) {
      onPageChange(currentPage + 1);
    }
  };

  const prevPage = () => {
    if (currentPage > 1) {
      onPageChange(currentPage - 1);
    }
  };

  const buttonSize = size === 'small' ? 'w-8 h-8' : 'w-12 h-12';
  const iconSize = size === 'small' ? 'w-4 h-4' : 'w-6 h-6';

  return (
    <div className={`flex items-center justify-center space-x-4 ${className}`}>
      {/* Previous Button */}
      <Button
        variant="ghost"
        size="sm"
        className={`${buttonSize} p-0 bg-black/30 hover:bg-[#39A0FF]/20 text-white disabled:opacity-30 disabled:cursor-not-allowed transition-all duration-200`}
        onClick={prevPage}
        disabled={currentPage === 1}
        title="Previous page (←)"
      >
        <ChevronLeft className={iconSize} />
      </Button>

      {/* Page Indicator */}
      {size === 'large' ? (
        <div className="text-[#E6E7E9] text-sm font-medium min-w-[80px] text-center">
          Page {currentPage} / {totalPages}
        </div>
      ) : (
        <div className="flex space-x-1">
          {Array.from({ length: totalPages }, (_, i) => (
            <button
              key={i + 1}
              onClick={() => onPageChange(i + 1)}
              className={`w-2 h-2 rounded-full transition-all duration-200 ${
                currentPage === i + 1 
                  ? 'bg-[#39A0FF]' 
                  : 'bg-[#AAB0B6]/30 hover:bg-[#AAB0B6]/50'
              }`}
            />
          ))}
        </div>
      )}

      {/* Next Button */}
      <Button
        variant="ghost"
        size="sm"
        className={`${buttonSize} p-0 bg-black/30 hover:bg-[#39A0FF]/20 text-white disabled:opacity-30 disabled:cursor-not-allowed transition-all duration-200`}
        onClick={nextPage}
        disabled={currentPage === totalPages}
        title="Next page (→)"
      >
        <ChevronRight className={iconSize} />
      </Button>
    </div>
  );
}