import React from 'react';
import { Link } from 'react-router-dom';
import { ChevronRight } from 'lucide-react';

interface BreadcrumbItem {
  label: string;
  path?: string;
}

interface BreadcrumbProps {
  items: BreadcrumbItem[];
}

const Breadcrumb: React.FC<BreadcrumbProps> = ({ items }) => {
  return (
    <div className="flex items-center flex-wrap text-sm text-gray-600 mb-4">
      {items.map((item, index) => (
        <React.Fragment key={index}>
          {index > 0 && (
            <ChevronRight size={14} className="mx-2 text-gray-400" />
          )}
          
          {item.path ? (
            <Link 
              to={item.path} 
              className="hover:text-purple-700 hover:underline transition-colors"
            >
              {item.label}
            </Link>
          ) : (
            <span className="font-medium text-purple-700">{item.label}</span>
          )}
        </React.Fragment>
      ))}
    </div>
  );
};

export default Breadcrumb; 