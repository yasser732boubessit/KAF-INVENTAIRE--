export enum UserRole {
  TEAM_1 = 'TEAM_1', // Desktop Offline / Creation
  TEAM_2 = 'TEAM_2', // Web Portal / Physical Verification
  TEAM_3 = 'TEAM_3', // Mobile PWA / Loading & Registry
  ADMIN = 'ADMIN',   // Super Admin / All permissions + ETL
}

export enum WorkflowState {
  AJOUTE = 'AJOUTE',
  SYNCHRONISE = 'SYNCHRONISE',
  VERIFIE = 'VERIFIE',
  CHARGE = 'CHARGE',
  REJETE = 'REJETE',
}

export enum PhysicalState {
  ACTIF = 'ACTIF',
  EN_PANNE = 'EN_PANNE',
  EN_MAINTENANCE = 'EN_MAINTENANCE',
  EN_STOCK = 'EN_STOCK',
  HORS_SERVICE = 'HORS_SERVICE',
  REFORME = 'REFORME',
}

export enum InventoryStatus {
  CONFORME = 'CONFORME',
  ECART_LOCALISATION = 'ECART_LOCALISATION',
  MANQUANT = 'MANQUANT',
  NON_VERIFIE = 'NON_VERIFIE',
  NON_ENREGISTRE = 'NON_ENREGISTRE',
}
