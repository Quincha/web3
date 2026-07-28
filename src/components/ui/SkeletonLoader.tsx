import React from 'react';

interface SkeletonProps {
  type?: 'text' | 'title' | 'circle' | 'card' | 'chart';
  width?: string;
  height?: string;
  className?: string;
}

export const SkeletonLoader: React.FC<SkeletonProps> = ({ 
  type = 'text', 
  width, 
  height, 
  className = '' 
}) => {
  const getStyles = () => {
    const styles: React.CSSProperties = {};
    if (width) styles.width = width;
    if (height) styles.height = height;
    return styles;
  };

  return (
    <div 
      className={`skeleton-base skeleton-${type} ${className}`} 
      style={getStyles()}
    />
  );
};

export const DashboardSkeleton: React.FC = () => {
  return (
    <div className="skeleton-dashboard-grid">
      {/* 4 Stats Cards */}
      <div className="skeleton-stats-row">
        {[1, 2, 3, 4].map(n => (
          <div key={n} className="skeleton-card-container stat-skeleton-card">
            <SkeletonLoader type="circle" width="40px" height="40px" />
            <SkeletonLoader type="title" width="60%" height="16px" className="mt-12" />
            <SkeletonLoader type="text" width="40%" height="24px" className="mt-8" />
            <SkeletonLoader type="text" width="80%" height="12px" className="mt-8" />
          </div>
        ))}
      </div>

      {/* Main Grid Skeletons */}
      <div className="skeleton-main-layout">
        <div className="skeleton-col-left">
          <div className="skeleton-card-container medium-skeleton-card">
            <SkeletonLoader type="title" width="150px" height="20px" />
            <div className="mt-16 space-y-12">
              {[1, 2, 3, 4].map(n => (
                <div key={n} style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <SkeletonLoader type="circle" width="32px" height="32px" />
                  <div style={{ flex: 1 }}>
                    <SkeletonLoader type="text" width="70%" height="14px" />
                    <SkeletonLoader type="text" width="40%" height="10px" className="mt-4" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="skeleton-col-right">
          <div className="skeleton-card-container chart-skeleton-card">
            <SkeletonLoader type="title" width="200px" height="20px" />
            <SkeletonLoader type="chart" width="100%" height="180px" className="mt-16" />
          </div>
        </div>
      </div>
    </div>
  );
};
