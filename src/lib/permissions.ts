import { supabase } from './supabase';

export interface ModulePermissionRule {
  module: string;                  // e.g. 'VISA', 'EOID', 'Residence ID', 'ETD', 'Yellow Card', 'AIRPORT', 'CABINETS'
  view_roles: string[];           // roles allowed to view/read
  create_roles: string[];         // roles allowed to add/create
  update_roles: string[];         // roles allowed to edit/update
}

// Default permissions state representing the visual mockup
export const DEFAULT_PERMISSION_RULES: ModulePermissionRule[] = [
  {
    module: 'VISA',
    view_roles: ['admin', 'staff'],
    create_roles: ['admin'],
    update_roles: []
  },
  {
    module: 'EOID',
    view_roles: ['admin', 'staff'],
    create_roles: ['admin'],
    update_roles: []
  },
  {
    module: 'EOID Under_Age',
    view_roles: ['admin', 'staff'],
    create_roles: ['admin'],
    update_roles: []
  },
  {
    module: 'Residence ID',
    view_roles: ['admin', 'staff'],
    create_roles: ['admin', 'staff'],
    update_roles: ['admin']
  },
  {
    module: 'ETD',
    view_roles: ['admin'],
    create_roles: [],
    update_roles: []
  },
  {
    module: 'Yellow Card',
    view_roles: ['admin', 'staff', 'airport_staff'],
    create_roles: [],
    update_roles: []
  },
  {
    module: 'CABINETS',
    view_roles: ['admin', 'staff'],
    create_roles: ['admin', 'staff'],
    update_roles: []
  },
  {
    module: 'AIRPORT',
    view_roles: ['admin', 'staff', 'airport_staff', 'airport_viewer'],
    create_roles: ['admin', 'staff', 'airport_staff'],
    update_roles: []
  }
];

const LOCAL_STORAGE_KEY = 'ics_custom_permission_matrix';

// Load permission rules
export async function getPermissionRules(): Promise<ModulePermissionRule[]> {
  try {
    // 1. Attempt to select from Supabase
    const { data, error } = await supabase
      .from('permission_rules')
      .select('*');

    if (error) {
      console.warn("Could not load from permission_rules DB table, using LocalStorage/Defaults:", error.message);
      // Fallback 1: LocalStorage
      const stored = localStorage.getItem(LOCAL_STORAGE_KEY);
      if (stored) {
        return JSON.parse(stored);
      }
      return DEFAULT_PERMISSION_RULES;
    }

    if (data && data.length > 0) {
      return data as ModulePermissionRule[];
    }
  } catch (e) {
    console.warn("Permission DB query exception, using LocalStorage/Defaults:", e);
  }

  // Fallback 2: LocalStorage / Defaults
  const stored = localStorage.getItem(LOCAL_STORAGE_KEY);
  if (stored) {
    try {
      return JSON.parse(stored);
    } catch {
      return DEFAULT_PERMISSION_RULES;
    }
  }
  return DEFAULT_PERMISSION_RULES;
}

// Save permission rules
export async function savePermissionRules(rules: ModulePermissionRule[]): Promise<boolean> {
  // Save to LocalStorage immediately to guarantee availability
  localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(rules));

  try {
    // Attempt database upsert
    // First clear and batch insert or do direct upserts
    for (const rule of rules) {
      const { error } = await supabase
        .from('permission_rules')
        .upsert(rule, { onConflict: 'module' });
      if (error) throw error;
    }
    return true;
  } catch (e) {
    console.warn("Failed to persist permission_rules in Supabase, persisted in LocalStorage only:", e);
    return false;
  }
}

// Standard Role checks
export function hasViewAccess(role: string, moduleName: string, rules: ModulePermissionRule[] = DEFAULT_PERMISSION_RULES): boolean {
  if (role === 'admin' || role === 'super_admin') return true; // Super admins bypass checks for viewing modules they configured
  const rule = rules.find(r => r.module === moduleName);
  if (!rule) return true; // default true if module configuration isn't declared
  return rule.view_roles.includes(role);
}

export function hasCreateAccess(role: string, moduleName: string, rules: ModulePermissionRule[] = DEFAULT_PERMISSION_RULES): boolean {
  if (role === 'admin' || role === 'super_admin') return true;
  const rule = rules.find(r => r.module === moduleName);
  if (!rule) return false;
  return rule.create_roles.includes(role);
}

export function hasUpdateAccess(role: string, moduleName: string, rules: ModulePermissionRule[] = DEFAULT_PERMISSION_RULES): boolean {
  if (role === 'admin' || role === 'super_admin') return true;
  const rule = rules.find(r => r.module === moduleName);
  if (!rule) return false;
  return rule.update_roles.includes(role);
}
