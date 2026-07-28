import React from 'react';

export interface WidgetMeta {
  id: string;
  name: string;
  description: string;
  defaultSize: 'small' | 'medium' | 'large';
  component: React.ComponentType<any>;
}

// Registry singleton to hold all dashboard widgets
class Registry {
  private widgets = new Map<string, WidgetMeta>();

  register(meta: WidgetMeta) {
    this.widgets.set(meta.id, meta);
  }

  get(id: string): WidgetMeta | undefined {
    return this.widgets.get(id);
  }

  getAll(): WidgetMeta[] {
    return Array.from(this.widgets.values());
  }
}

export const WidgetRegistry = new Registry();
