import React from 'react';
// import { EyeOff, ArrowLeft, ArrowRight, Maximize2, Minimize2 } from 'lucide-react';
import type { WidgetConfig } from '../../services/ConfigService';
import { Card } from '../ui/Card';

interface WidgetContainerProps {
  config: WidgetConfig;
  name: string;
  children: React.ReactNode;
}

export const WidgetContainer: React.FC<WidgetContainerProps> = ({
  children
}) => {

  /*
  const handleHide = () => {
    const updatedWidgets = userConfig.widgets.map(w => 
      w.id === config.id ? { ...w, visible: false } : w
    );
    updateConfig({ widgets: updatedWidgets });
  };
  */

  /*
  const handleMove = (direction: 'left' | 'right') => {
    const currentIndex = userConfig.widgets.findIndex(w => w.id === config.id);
    if (
      (direction === 'left' && currentIndex > 0) ||
      (direction === 'right' && currentIndex < userConfig.widgets.length - 1)
    ) {
      const newWidgets = [...userConfig.widgets];
      const swapIndex = direction === 'left' ? currentIndex - 1 : currentIndex + 1;
      
      const temp = newWidgets[currentIndex];
      newWidgets[currentIndex] = newWidgets[swapIndex];
      newWidgets[swapIndex] = temp;
      
      updateConfig({ widgets: newWidgets });
    }
  };
  */

  /*
  const handleToggleSize = () => {
    const nextSize: Record<string, 'small' | 'medium' | 'large'> = {
      'small': 'medium',
      'medium': 'large',
      'large': 'small'
    };
    
    const updatedWidgets = userConfig.widgets.map(w => 
      w.id === config.id ? { ...w, size: nextSize[w.size || 'medium'] as any } : w
    );
    updateConfig({ widgets: updatedWidgets });
  };
  */

  return (
    <Card padding="lg" style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {children}
    </Card>
  );
};
