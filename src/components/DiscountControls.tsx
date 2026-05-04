import { Percent } from 'lucide-react';

interface DiscountControlsProps {
  globalDiscount: number;
  onGlobalDiscountChange: (discount: number) => void;
}

export function DiscountControls({
  globalDiscount,
  onGlobalDiscountChange,
}: DiscountControlsProps) {
  return (
    <div className="relative">
      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
        <Percent className="h-4 w-4 text-gray-400" />
      </div>
      <input
        type="number"
        min="0"
        max="100"
        value={globalDiscount}
        onChange={(e) =>
          onGlobalDiscountChange(Math.min(100, Math.max(0, parseInt(e.target.value) || 0)))
        }
        className="block w-full pl-9 pr-8 py-1.5 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-blue-500 focus:border-blue-500 sm:text-sm transition duration-150 ease-in-out"
      />
      <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
        <span className="text-gray-500 sm:text-sm">%</span>
      </div>
    </div>
  );
}
