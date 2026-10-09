export interface Bus {
  no: string;
  vehicle?: string;
  make: 'TATA' | 'LEYLAND' | 'OTHER';
}

export interface Program {
  name: string;
  warning: number;
  makeWarnings?: {
    TATA?: number;
    LEYLAND?: number;
    OTHER?: number;
    [key: string]: number | undefined;
  };
}

export interface KmEntry {
  id: string;
  date: string;
  bus: string;
  vehicle?: string;
  km: number;
  make?: string;
  remark?: string;
}

export interface ServiceRecord {
  id: string;
  bus: string;
  program: string;
  date: string;
  serviceKm?: number;
  remark?: string;
}

export interface AppDatabase {
  buses: Bus[];
  programs: Program[];
  entries: KmEntry[];
  services: ServiceRecord[];
  bases: Record<string, number>;
}

export interface ProgramStatus {
  km: number;
  warningKm: number;
  isNear: boolean;
  isDue: boolean;
  percentage: number;
}

export interface GeneratedImageRecord {
  id: string;
  url: string;
  prompt: string;
  model: string;
  size?: string;
  aspectRatio?: string;
  createdAt: string;
  isEdit?: boolean;
}
