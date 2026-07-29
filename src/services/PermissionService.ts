export type Role = 'super-admin' | 'admin' | 'supervisor' | 'user' | 'guest';

export type Action = 'view' | 'create' | 'edit' | 'delete' | 'share' | 'export' | 'admin';

export type Module = 
  | 'dashboard' 
  | 'proyectos' 
  | 'tareas' 
  | 'calendario' 
  | 'estadisticas' 
  | 'mensajes' 
  | 'documentos' 
  | 'clientes' 
  | 'ajustes'
  | 'pomodoro'
  | 'bujo'
  | 'health'
  | 'habitos'
  | 'finanzas';

// Permissions matrix: module -> role -> set of allowed actions
const PERMISSIONS: Record<Module, Record<Role, Action[]>> = {
  dashboard: {
    'super-admin': ['view', 'create', 'edit', 'delete', 'share', 'export', 'admin'],
    'admin': ['view', 'create', 'edit', 'delete', 'share', 'export', 'admin'],
    'supervisor': ['view', 'edit', 'share', 'export'],
    'user': ['view'],
    'guest': ['view'],
  },
  proyectos: {
    'super-admin': ['view', 'create', 'edit', 'delete', 'share', 'export', 'admin'],
    'admin': ['view', 'create', 'edit', 'delete', 'share', 'export'],
    'supervisor': ['view', 'create', 'edit', 'share'],
    'user': ['view'],
    'guest': ['view'],
  },
  tareas: {
    'super-admin': ['view', 'create', 'edit', 'delete', 'share', 'export', 'admin'],
    'admin': ['view', 'create', 'edit', 'delete', 'share', 'export'],
    'supervisor': ['view', 'create', 'edit', 'delete', 'share'],
    'user': ['view', 'create', 'edit'],
    'guest': ['view'],
  },
  calendario: {
    'super-admin': ['view', 'create', 'edit', 'delete', 'share', 'export', 'admin'],
    'admin': ['view', 'create', 'edit', 'delete', 'share', 'export'],
    'supervisor': ['view', 'create', 'edit', 'share'],
    'user': ['view', 'create', 'edit'],
    'guest': ['view'],
  },
  estadisticas: {
    'super-admin': ['view', 'create', 'edit', 'delete', 'share', 'export', 'admin'],
    'admin': ['view', 'export'],
    'supervisor': ['view'],
    'user': [],
    'guest': [],
  },
  mensajes: {
    'super-admin': ['view', 'create', 'edit', 'delete', 'share', 'export', 'admin'],
    'admin': ['view', 'create', 'edit', 'delete'],
    'supervisor': ['view', 'create', 'edit'],
    'user': ['view', 'create'],
    'guest': [],
  },
  documentos: {
    'super-admin': ['view', 'create', 'edit', 'delete', 'share', 'export', 'admin'],
    'admin': ['view', 'create', 'edit', 'delete', 'share', 'export'],
    'supervisor': ['view', 'create', 'edit', 'share'],
    'user': ['view', 'create', 'edit'],
    'guest': ['view'],
  },
  clientes: {
    'super-admin': ['view', 'create', 'edit', 'delete', 'share', 'export', 'admin'],
    'admin': ['view', 'create', 'edit', 'delete', 'share', 'admin'],
    'supervisor': ['view', 'create', 'edit'],
    'user': ['view', 'create'],
    'guest': [],
  },
  ajustes: {
    'super-admin': ['view', 'edit', 'admin'],
    'admin': ['view', 'edit'],
    'supervisor': ['view'],
    'user': ['view'],
    'guest': ['view'],
  },
  pomodoro: {
    'super-admin': ['view', 'create', 'edit', 'delete', 'share', 'export', 'admin'],
    'admin': ['view', 'create', 'edit', 'delete', 'share', 'export'],
    'supervisor': ['view', 'create', 'edit', 'share'],
    'user': ['view', 'create', 'edit'],
    'guest': ['view'],
  },
  bujo: {
    'super-admin': ['view', 'create', 'edit', 'delete', 'admin'],
    'admin': ['view', 'create', 'edit', 'delete'],
    'supervisor': ['view', 'create', 'edit'],
    'user': ['view', 'create', 'edit'],
    'guest': ['view'],
  },
  health: {
    'super-admin': ['view', 'create', 'edit', 'delete', 'share', 'export', 'admin'],
    'admin': ['view', 'create', 'edit', 'delete', 'share', 'export'],
    'supervisor': ['view', 'create', 'edit'],
    'user': ['view', 'create', 'edit'],
    'guest': ['view'],
  },
  habitos: {
    'super-admin': ['view', 'create', 'edit', 'delete', 'admin'],
    'admin': ['view', 'create', 'edit', 'delete'],
    'supervisor': ['view', 'create', 'edit'],
    'user': ['view', 'create', 'edit'],
    'guest': ['view'],
  },
  finanzas: {
    'super-admin': ['view', 'create', 'edit', 'delete', 'share', 'export', 'admin'],
    'admin': ['view', 'create', 'edit', 'delete', 'share', 'export'],
    'supervisor': ['view', 'create', 'edit'],
    'user': ['view', 'create'],
    'guest': [],
  }
};

export class PermissionService {
  static hasPermission(role: Role, module: Module, action: Action): boolean {
    const modulePermissions = PERMISSIONS[module];
    if (!modulePermissions) return false;
    
    const roleActions = modulePermissions[role];
    if (!roleActions) return false;
    
    return roleActions.includes(action);
  }

  static getRoles(): { id: Role; label: string }[] {
    return [
      { id: 'super-admin', label: 'Super Administrador' },
      { id: 'admin', label: 'Administrador' },
      { id: 'supervisor', label: 'Supervisor' },
      { id: 'user', label: 'Usuario' },
      { id: 'guest', label: 'Invitado' }
    ];
  }
}
