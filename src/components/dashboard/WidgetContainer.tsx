import React from 'react';
// import { EyeOff, ArrowLeft, ArrowRight, Maximize2, Minimize2 } from 'lucide-react';
import { useUser } from '../../context/UserContext';
import type { WidgetConfig } from '../../services/ConfigService';
import { Card } from '../ui/Card';

interface WidgetContainerProps {
  config: WidgetConfig;
  name: string;
  children: React.ReactNode;
}

export const WidgetContainer: React.FC<WidgetContainerProps> = ({ 
  config, 
  // @ts-expect-error unused
  name, 
  children 
}) => {
  const { userConfig, updateConfig } = useUser();

  // @ts-expect-error unused
  const handleHide = () => {
    const updatedWidgets = userConfig.widgets.map(w => 
      w.id === config.id ? { ...w, visible: false } : w
    );
    updateConfig({ widgets: updatedWidgets });
  };

  // @ts-expect-error unused
  const handleMove = (direction: 'left' | 'right') => {
    const currentIndex = userConfig.widgets.findIndex(w => w.id === config.id);
    if (currentIndex === -1) return;

    const newIndex = direction === 'left' ? currentIndex - 1 : currentIndex + 1;
    if (newIndex < 0 || newIndex >= userConfig.widgets.length) return;

    const updatedWidgets = [...userConfig.widgets];
    // Swap
    const temp = updatedWidgets[currentIndex];
    updatedWidgets[currentIndex] = updatedWidgets[newIndex];
    updatedWidgets[newIndex] = temp;

    // Recalculate orders
    updatedWidgets.forEach((w, idx) => {
      w.order = idx;
    });

    updateConfig({ widgets: updatedWidgets });
  };

  // @ts-expect-error unused
  const handleToggleSize = () => {
    const nextSize: Record<string, 'small' | 'medium' | 'large'> = {
      'small': 'medium',
      'medium': 'large',
      'large': 'small'
    };

    const updatedWidgets = userConfig.widgets.map(w => 
      w.id === config.id ? { ...w, size: nextSize[w.size] || 'small' } : w
    );
    updateConfig({ widgets: updatedWidgets });
  };

  return (
    <Card padding="lg" style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {children}
    </Card>
  );
};
