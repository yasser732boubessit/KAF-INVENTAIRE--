import React, { useState, useEffect } from 'react';
import { 
  Users, 
  ShieldCheck, 
  UserPlus, 
  Search, 
  KeyRound, 
  UserCheck, 
  UserX, 
  Lock, 
  Mail, 
  Calendar, 
  Clock, 
  AlertTriangle, 
  CheckCircle2, 
  ShieldAlert, 
  Edit3, 
  Trash2, 
  RotateCcw,
  Check,
  X,
  FileKey,
  Shield
} from 'lucide-react';
import { Language, UserRole } from '../types';
import { AppUser, AppPermission, ROLE_PERMISSIONS, ROLE_METADATA } from '../security/permissions';
import { CryptoSecurity } from '../security/crypto';
import { authService } from '../security/authService';
import { dbService } from '../services/databaseService';
import { translations } from '../translations';
import { sound } from '../utils/audio';
import { UserRoleIcon } from './UserRoleIcon';

interface UserManagementViewProps {
  lang: Language;
  currentUserRole: UserRole;
  onAuditLog?: (action: string, entityId: string, oldValue: string, newValue: string, reason: string) => void;
}

export const UserManagementView: React.FC<UserManagementViewProps> = ({
  lang,
  currentUserRole,
  onAuditLog
}) => {
  const t = translations[lang];
  const [users, setUsers] = useState<AppUser[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState<'ALL' | UserRole>('ALL');
  const [selectedUser, setSelectedUser] = useState<AppUser | null>(null);

  // Modals state
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);
  const [statusActionUser, setStatusActionUser] = useState<AppUser | null>(null);

  // Form states
  const [formUsername, setFormUsername] = useState('');
  const [formFullName, setFormFullName] = useState('');
  const [formEmail, setFormEmail] = useState('');
  const [formRole, setFormRole] = useState<UserRole>('AGENT_INVENTAIRE');
  const [formPassword, setFormPassword] = useState('');
  const [formConfirmPassword, setFormConfirmPassword] = useState('');

  // Password reset form
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');

  // Notification banners
  const [feedbackMsg, setFeedbackMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const canManageUsers = currentUserRole === 'RESPONSABLE_PATRIMOINE';

  const loadUsers = async () => {
    setIsLoading(true);
    try {
      const data = await dbService.getUsers();
      setUsers(data);
      if (data.length > 0 && !selectedUser) {
        setSelectedUser(data[0]);
      }
    } catch (e) {
      console.error('Failed to load users:', e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadUsers();
  }, []);

  const showFeedback = (type: 'success' | 'error', text: string) => {
    setFeedbackMsg({ type, text });
    if (type === 'success') {
      sound.playScanSuccess();
    } else {
      sound.playAlert();
    }
    setTimeout(() => setFeedbackMsg(null), 5000);
  };

  // Filtered users
  const filteredUsers = users.filter(user => {
    if (roleFilter !== 'ALL' && user.role !== roleFilter) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      return (
        user.username.toLowerCase().includes(q) ||
        user.fullName.toLowerCase().includes(q) ||
        user.email.toLowerCase().includes(q) ||
        user.id.toLowerCase().includes(q)
      );
    }
    return true;
  });

  // Handle Create User
  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canManageUsers) {
      showFeedback('error', 'Action non autorisée: Seul l\'Administrateur peut créer des utilisateurs.');
      return;
    }

    if (!formUsername.trim() || !formFullName.trim()) {
      showFeedback('error', 'Veuillez renseigner le nom d\'utilisateur et le nom complet.');
      return;
    }

    if (formPassword.length < 6) {
      showFeedback('error', 'Le mot de passe doit comporter au moins 6 caractères.');
      return;
    }

    if (formPassword !== formConfirmPassword) {
      showFeedback('error', 'Les deux mots de passe ne correspondent pas.');
      return;
    }

    // Check unique username
    if (users.some(u => u.username.toLowerCase() === formUsername.trim().toLowerCase())) {
      showFeedback('error', 'Ce nom d\'utilisateur est déjà utilisé.');
      return;
    }

    try {
      const passwordHash = await CryptoSecurity.hashPassword(formPassword);
      const newUser: AppUser = {
        id: `USR-${Math.floor(100 + Math.random() * 899)}`,
        username: formUsername.trim().toLowerCase(),
        fullName: formFullName.trim(),
        email: formEmail.trim(),
        role: formRole,
        isActive: true,
        passwordHash,
        lastLoginAt: null,
        createdAt: new Date().toISOString().replace('T', ' ').substring(0, 19),
        updatedAt: new Date().toISOString().replace('T', ' ').substring(0, 19)
      };

      await dbService.createUser(newUser);
      setUsers(prev => [...prev, newUser]);
      setSelectedUser(newUser);
      setIsCreateModalOpen(false);

      // Reset form
      setFormUsername('');
      setFormFullName('');
      setFormEmail('');
      setFormPassword('');
      setFormConfirmPassword('');

      showFeedback('success', `Compte utilisateur ${newUser.username} créé avec succès !`);

      if (onAuditLog) {
        onAuditLog(
          'CREATION_UTILISATEUR',
          newUser.id,
          'NULL',
          `Role: ${newUser.role}, User: ${newUser.username}`,
          'Création d\'un nouveau compte avec permissions RBAC'
        );
      }
    } catch (err: any) {
      showFeedback('error', `Erreur: ${err.message || 'Impossible de créer le compte'}`);
    }
  };

  // Handle Edit User
  const handleEditUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canManageUsers || !selectedUser) {
      showFeedback('error', 'Action non autorisée.');
      return;
    }

    try {
      const oldRole = selectedUser.role;
      const updated = await dbService.updateUser(selectedUser.id, {
        fullName: formFullName.trim(),
        email: formEmail.trim(),
        role: formRole
      });

      setUsers(prev => prev.map(u => u.id === selectedUser.id ? updated : u));
      setSelectedUser(updated);
      setIsEditModalOpen(false);

      showFeedback('success', `Compte ${updated.username} mis à jour avec succès.`);

      if (onAuditLog) {
        onAuditLog(
          'MODIFICATION_UTILISATEUR',
          selectedUser.id,
          `Role: ${oldRole}`,
          `Role: ${formRole}`,
          'Modification des informations et rôle utilisateur'
        );
      }
    } catch (err: any) {
      showFeedback('error', `Erreur: ${err.message || 'Échec de la mise à jour'}`);
    }
  };

  // Handle Toggle Active/Disabled
  const handleToggleActive = async (user: AppUser) => {
    if (!canManageUsers) {
      showFeedback('error', 'Action non autorisée: Seul l\'Administrateur peut modifier le statut des comptes.');
      return;
    }

    // Prevent disabling the currently connected super-admin if it's the last one
    if (user.role === 'RESPONSABLE_PATRIMOINE' && user.isActive) {
      const activeAdmins = users.filter(u => u.role === 'RESPONSABLE_PATRIMOINE' && u.isActive);
      if (activeAdmins.length <= 1) {
        showFeedback('error', 'Impossible de désactiver le seul compte Administrateur actif du système.');
        return;
      }
    }

    try {
      const nextStatus = !user.isActive;
      await dbService.setUserActiveStatus(user.id, nextStatus);

      const updated = { ...user, isActive: nextStatus };
      setUsers(prev => prev.map(u => u.id === user.id ? updated : u));
      if (selectedUser?.id === user.id) {
        setSelectedUser(updated);
      }
      setStatusActionUser(null);

      showFeedback(
        'success', 
        nextStatus 
          ? `Compte ${user.username} réactivé avec succès.` 
          : `Compte ${user.username} désactivé. L'accès est désormais bloqué.`
      );

      if (onAuditLog) {
        onAuditLog(
          nextStatus ? 'ACTIVATION_COMPTE' : 'DESACTIVATION_COMPTE',
          user.id,
          user.isActive ? 'ACTIF' : 'DESACTIVE',
          nextStatus ? 'ACTIF' : 'DESACTIVE',
          'Changement de statut d\'accès utilisateur'
        );
      }
    } catch (err: any) {
      showFeedback('error', `Erreur: ${err.message}`);
    }
  };

  // Handle Reset Password
  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canManageUsers || !selectedUser) {
      showFeedback('error', 'Action non autorisée.');
      return;
    }

    if (newPassword.length < 6) {
      showFeedback('error', 'Le nouveau mot de passe doit comporter au moins 6 caractères.');
      return;
    }

    if (newPassword !== confirmNewPassword) {
      showFeedback('error', 'Les mots de passe ne correspondent pas.');
      return;
    }

    try {
      const hash = await CryptoSecurity.hashPassword(newPassword);
      await dbService.resetUserPassword(selectedUser.id, hash);

      setIsPasswordModalOpen(false);
      setNewPassword('');
      setConfirmNewPassword('');

      showFeedback('success', `Mot de passe réinitialisé pour l'utilisateur ${selectedUser.username}.`);

      if (onAuditLog) {
        onAuditLog(
          'REINITIALISATION_MOT_DE_PASSE',
          selectedUser.id,
          'HASH_ANCIEN',
          'HASH_NOUVEAU',
          'Réinitialisation administrative du mot de passe'
        );
      }
    } catch (err: any) {
      showFeedback('error', `Erreur: ${err.message}`);
    }
  };

  // Fast Impersonation / Login Simulation
  const handleFastSwitchToUser = async (user: AppUser) => {
    if (!user.isActive) {
      showFeedback('error', 'Impossible de se connecter avec un compte désactivé.');
      return;
    }
    const success = await authService.switchActiveUser(user.id);
    if (success) {
      showFeedback('success', `Session basculée sur : ${user.fullName} (${user.role})`);
      window.location.reload(); // Refresh session state globally
    }
  };

  return (
    <div className="flex-1 bg-[#F8FAFC] overflow-y-auto p-4 lg:p-6 space-y-5">
      {/* Top Banner & Header */}
      <div className="bg-white border border-[#CBD5E1] rounded-lg p-5 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-200 pb-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="font-mono-numbers font-bold text-xs bg-slate-900 text-purple-300 px-2.5 py-0.5 rounded border border-purple-800 flex items-center gap-1.5">
                <ShieldCheck className="w-3.5 h-3.5 text-purple-400" />
                <span>CONTRÔLE D'ACCÈS RBAC ENTERPRISE</span>
              </span>
              <h1 className="font-bold text-lg text-slate-900">
                {lang === 'ar' ? 'إدارة المستخدمين والأدوار والصلاحيات' : 'Gestion des Utilisateurs & Matrice des Permissions'}
              </h1>
            </div>
            <p className="text-xs text-slate-500 mt-1 max-w-3xl">
              {lang === 'ar'
                ? 'نظام أمان صارم يعتمد على مبدأ أقل الصلاحيات (Least Privilege) للأدوار الثلاثة: المدير، وكيل التعريف، ومراقب الشحن.'
                : 'Sécurité granulaire et principe du moindre privilège appliqués aux 3 profils opérationnels de KAF-INVENTAIRE.'}
            </p>
          </div>

          <div className="flex items-center gap-2">
            {canManageUsers ? (
              <button
                onClick={() => {
                  setFormUsername('');
                  setFormFullName('');
                  setFormEmail('');
                  setFormRole('AGENT_INVENTAIRE');
                  setFormPassword('');
                  setFormConfirmPassword('');
                  setIsCreateModalOpen(true);
                  sound.playTap();
                }}
                className="bg-[#16A34A] hover:bg-[#15803D] text-white px-3.5 py-2 rounded text-xs font-bold flex items-center gap-2 shadow-sm transition-all"
              >
                <UserPlus className="w-4 h-4" />
                <span>{lang === 'ar' ? 'إضافة مستخدم جديد' : 'Créer un Utilisateur'}</span>
              </button>
            ) : (
              <span className="bg-amber-100 text-amber-900 border border-amber-300 px-3 py-1.5 rounded text-xs font-semibold flex items-center gap-1.5">
                <Lock className="w-3.5 h-3.5 text-amber-700" />
                <span>Mode Lecture Seule (Réservé à l'Admin)</span>
              </span>
            )}
          </div>
        </div>

        {/* Feedback Banner */}
        {feedbackMsg && (
          <div className={`mt-3 p-3 rounded text-xs flex items-center gap-2 animate-in fade-in ${
            feedbackMsg.type === 'success' 
              ? 'bg-emerald-50 border border-emerald-300 text-emerald-800' 
              : 'bg-rose-50 border border-rose-300 text-rose-800'
          }`}>
            {feedbackMsg.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            ) : (
              <ShieldAlert className="w-4 h-4 text-rose-600 shrink-0" />
            )}
            <span className="font-semibold">{feedbackMsg.text}</span>
          </div>
        )}

        {/* Search & Role Filters Strip */}
        <div className="flex flex-wrap items-center justify-between gap-3 mt-4 text-xs">
          <div className="flex-1 max-w-md relative">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Rechercher un utilisateur par nom, identifiant ou email..."
              className="w-full bg-slate-50 border border-slate-300 rounded py-1.5 pl-8 pr-3 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-purple-600"
            />
          </div>

          <div className="flex items-center gap-2">
            <span className="text-slate-500 font-medium text-[11px]">Filtrer par rôle :</span>
            {(['ALL', 'RESPONSABLE_PATRIMOINE', 'AGENT_INVENTAIRE', 'CONTROLEUR_ZONE'] as const).map(role => (
              <button
                key={role}
                onClick={() => { setRoleFilter(role); sound.playTap(); }}
                className={`px-2.5 py-1 rounded text-[11px] font-semibold border transition-colors ${
                  roleFilter === role
                    ? 'bg-slate-900 text-white border-slate-900'
                    : 'bg-white text-slate-600 border-slate-300 hover:bg-slate-50'
                }`}
              >
                {role === 'ALL' 
                  ? 'Tous les rôles' 
                  : role === 'RESPONSABLE_PATRIMOINE' 
                  ? 'Administrateur' 
                  : role === 'AGENT_INVENTAIRE' 
                  ? 'Agent d\'Ajout' 
                  : 'Agent Vérification'}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Main Grid: User List (Left) + Detailed Permissions Matrix (Right) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Left Column: Users Table & Cards */}
        <div className="lg:col-span-7 space-y-3">
          <div className="bg-white border border-slate-200 rounded-lg overflow-hidden shadow-xs">
            <div className="p-3 bg-slate-100/80 border-b border-slate-200 flex items-center justify-between text-xs">
              <span className="font-bold text-slate-800 flex items-center gap-1.5">
                <Users className="w-4 h-4 text-purple-700" />
                <span>Comptes Utilisateurs Enregistrés ({filteredUsers.length})</span>
              </span>
              <span className="text-[11px] text-slate-500 font-mono">
                Base SQLite & Session locale
              </span>
            </div>

            <div className="divide-y divide-slate-100">
              {filteredUsers.length === 0 ? (
                <div className="p-8 text-center text-slate-400 text-xs">
                  Aucun utilisateur ne correspond à vos critères de recherche.
                </div>
              ) : (
                filteredUsers.map(user => {
                  const meta = ROLE_METADATA[user.role];
                  const isSelected = selectedUser?.id === user.id;

                  return (
                    <div
                      key={user.id}
                      onClick={() => setSelectedUser(user)}
                      className={`p-3.5 flex flex-wrap items-center justify-between gap-3 cursor-pointer transition-colors ${
                        isSelected 
                          ? 'bg-purple-50/70 border-l-4 border-purple-600' 
                          : 'hover:bg-slate-50'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <UserRoleIcon role={user.role} size="md" variant="avatar" lang={lang} />

                        <div>
                          <div className="flex items-center gap-2">
                            <h3 className="font-bold text-slate-900 text-xs">
                              {user.fullName}
                            </h3>
                            <span className="font-mono text-[10px] text-slate-500">
                              @{user.username}
                            </span>
                            {user.isActive ? (
                              <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
                                ACTIF
                              </span>
                            ) : (
                              <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-rose-100 text-rose-800 border border-rose-300">
                                DÉSACTIVÉ
                              </span>
                            )}
                          </div>

                          <div className="flex items-center gap-3 mt-1 text-[11px] text-slate-500">
                            <span className={`px-2 py-0.5 rounded text-[10px] font-semibold border ${meta.badgeColor}`}>
                              {meta.labelFr}
                            </span>
                            {user.email && (
                              <span className="flex items-center gap-1 font-mono text-[10px]">
                                <Mail className="w-3 h-3 text-slate-400" />
                                <span>{user.email}</span>
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Action buttons on card */}
                      <div className="flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
                        {canManageUsers && (
                          <>
                            {/* Toggle Disable/Enable */}
                            <button
                              onClick={() => handleToggleActive(user)}
                              className={`p-1.5 rounded border text-xs font-medium transition-colors ${
                                user.isActive
                                  ? 'text-rose-600 hover:bg-rose-50 border-rose-200'
                                  : 'text-emerald-700 hover:bg-emerald-50 border-emerald-300'
                              }`}
                              title={user.isActive ? "Désactiver ce compte" : "Réactiver ce compte"}
                            >
                              {user.isActive ? <UserX className="w-3.5 h-3.5" /> : <UserCheck className="w-3.5 h-3.5" />}
                            </button>

                            {/* Reset Password */}
                            <button
                              onClick={() => {
                                setSelectedUser(user);
                                setNewPassword('');
                                setConfirmNewPassword('');
                                setIsPasswordModalOpen(true);
                              }}
                              className="p-1.5 rounded border border-slate-300 text-slate-600 hover:bg-slate-100 transition-colors"
                              title="Réinitialiser le mot de passe"
                            >
                              <KeyRound className="w-3.5 h-3.5" />
                            </button>

                            {/* Edit Info */}
                            <button
                              onClick={() => {
                                setSelectedUser(user);
                                setFormFullName(user.fullName);
                                setFormEmail(user.email || '');
                                setFormRole(user.role);
                                setIsEditModalOpen(true);
                              }}
                              className="p-1.5 rounded border border-slate-300 text-slate-600 hover:bg-slate-100 transition-colors"
                              title="Modifier les données du compte"
                            >
                              <Edit3 className="w-3.5 h-3.5" />
                            </button>
                          </>
                        )}

                        {/* Fast session login */}
                        <button
                          onClick={() => handleFastSwitchToUser(user)}
                          disabled={!user.isActive}
                          className="px-2 py-1 bg-slate-900 hover:bg-slate-800 disabled:opacity-40 text-white rounded text-[10px] font-bold flex items-center gap-1 shadow-xs transition-colors"
                          title="Bascule immédiate de session vers cet utilisateur"
                        >
                          <Check className="w-3 h-3 text-emerald-400" />
                          <span>Basculer</span>
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>

        {/* Right Column: Detailed Profile & Active Permissions Matrix */}
        <div className="lg:col-span-5 space-y-4">
          {selectedUser ? (
            <div className="bg-white border border-slate-200 rounded-lg p-5 shadow-xs space-y-4">
              <div className="flex items-center justify-between border-b border-slate-200 pb-3">
                <div className="flex items-center gap-2">
                  <Shield className="w-4 h-4 text-purple-700" />
                  <h2 className="font-bold text-sm text-slate-900">
                    Fiche Utilisateur & Privilèges Réels
                  </h2>
                </div>
                <span className="font-mono text-[10px] text-slate-500">
                  {selectedUser.id}
                </span>
              </div>

              {/* User Bio Card */}
              <div className="bg-slate-50 border border-slate-200 p-3.5 rounded-lg space-y-3">
                <div className="flex items-center gap-3">
                  <UserRoleIcon role={selectedUser.role} size="lg" variant="avatar" lang={lang} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-bold text-xs text-slate-900 truncate">
                        {selectedUser.fullName}
                      </span>
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold border shrink-0 ${ROLE_METADATA[selectedUser.role].badgeColor}`}>
                        {ROLE_METADATA[selectedUser.role].labelFr}
                      </span>
                    </div>
                    <span className="text-[11px] font-mono text-slate-500 block">
                      @{selectedUser.username} &bull; {selectedUser.email}
                    </span>
                  </div>
                </div>

                <p className="text-[11px] text-slate-600 leading-relaxed border-t border-slate-200/80 pt-2">
                  {ROLE_METADATA[selectedUser.role].descriptionFr}
                </p>

                <div className="grid grid-cols-2 gap-2 text-[10px] font-mono text-slate-500 pt-2 border-t border-slate-200">
                  <div>
                    <span className="text-slate-400 block font-sans">Dernière connexion:</span>
                    <span>{selectedUser.lastLoginAt || 'Jamais'}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block font-sans">Créé le:</span>
                    <span>{selectedUser.createdAt.substring(0, 10)}</span>
                  </div>
                </div>
              </div>

              {/* Permissions List for this User's Role */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <h3 className="font-bold text-xs text-slate-800 flex items-center gap-1.5">
                    <FileKey className="w-3.5 h-3.5 text-purple-700" />
                    <span>Matrice des Droits Accordés ({ROLE_PERMISSIONS[selectedUser.role].length})</span>
                  </h3>
                  <span className="text-[10px] text-emerald-700 font-mono font-bold">
                    ✓ 100% Appliqués
                  </span>
                </div>

                <div className="max-h-72 overflow-y-auto space-y-1.5 pr-1 border border-slate-200 rounded p-2.5 bg-slate-50/50">
                  {ROLE_PERMISSIONS[selectedUser.role].map((perm: AppPermission) => (
                    <div 
                      key={perm}
                      className="flex items-center justify-between p-1.5 bg-white rounded border border-slate-200 text-[11px]"
                    >
                      <div className="flex items-center gap-2">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                        <span className="font-mono text-[10px] text-slate-800 font-semibold">
                          {perm}
                        </span>
                      </div>
                      <span className="text-[9px] font-mono text-slate-400 uppercase">
                        Autorisé
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Security Audit Note */}
              <div className="p-3 bg-purple-50/80 border border-purple-200 rounded text-[11px] text-purple-900 leading-relaxed">
                <strong>Garantie Sécurité KAF-INVENTAIRE :</strong> Aucune élévation de privilège locale n'est possible. Même en cas de tentative d'appel IPC direct par un agent d'ajout vers des fonctions de clôture de campagne ou d'administration, le backend bloque l'opération et journalise la tentative dans le registre d'audit.
              </div>
            </div>
          ) : (
            <div className="bg-white border border-slate-200 rounded-lg p-8 text-center text-slate-400 text-xs">
              Sélectionnez un utilisateur pour afficher ses permissions détaillées.
            </div>
          )}
        </div>
      </div>

      {/* =========================================================================
          MODAL 1: CRÉER UN NOUVEL UTILISATEUR
          ========================================================================= */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg shadow-2xl max-w-md w-full overflow-hidden border border-slate-300 text-slate-800">
            <div className="bg-[#0F172A] text-white p-3.5 flex items-center justify-between border-b border-slate-800">
              <div className="flex items-center gap-2">
                <UserPlus className="w-4 h-4 text-emerald-400" />
                <h3 className="font-bold text-xs uppercase tracking-wider font-mono text-emerald-200">
                  Nouveau Compte Opérationnel KAF
                </h3>
              </div>
              <button onClick={() => setIsCreateModalOpen(false)} className="text-slate-400 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateUser} className="p-4 space-y-3.5 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Nom d'utilisateur (Identifiant de connexion) *
                </label>
                <input
                  type="text"
                  required
                  value={formUsername}
                  onChange={(e) => setFormUsername(e.target.value)}
                  placeholder="ex: amina.kacem"
                  className="w-full p-2 border border-slate-300 rounded focus:ring-2 focus:ring-purple-600 focus:outline-none font-mono"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Nom et Prénom (Collaborateur) *
                </label>
                <input
                  type="text"
                  required
                  value={formFullName}
                  onChange={(e) => setFormFullName(e.target.value)}
                  placeholder="ex: Amina Kacem (Ingénieur Maintenance)"
                  className="w-full p-2 border border-slate-300 rounded focus:ring-2 focus:ring-purple-600 focus:outline-none"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Adresse Email Professionnelle
                </label>
                <input
                  type="email"
                  value={formEmail}
                  onChange={(e) => setFormEmail(e.target.value)}
                  placeholder="ex: a.kacem@kotama-agrifood.dz"
                  className="w-full p-2 border border-slate-300 rounded focus:ring-2 focus:ring-purple-600 focus:outline-none"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1.5">
                  {lang === 'ar' ? 'الدور والصلاحية الممنوحة (Profil Opérationnel) *' : 'Rôle Attribué (Profil Opérationnel) *'}
                </label>
                
                {/* Visual Role Cards Selector */}
                <div className="grid grid-cols-1 gap-2">
                  {[
                    {
                      id: 'AGENT_INVENTAIRE' as UserRole,
                      titleFr: "Rôle 2 : Agent d'Ajout / Identification (Terrain)",
                      titleAr: "الدور 2: وكيل الإضافة والتعريف الميداني",
                      descFr: "إضافة أصول جديدة، مسح الباركود الأولي، طباعة تيكات الترقيم، تسجيل المكتشفات.",
                      badge: "bg-emerald-100 text-emerald-900 border-emerald-300",
                      icon: "🏷️"
                    },
                    {
                      id: 'CONTROLEUR_ZONE' as UserRole,
                      titleFr: "Rôle 3 : Agent de Vérification / Chargement",
                      titleAr: "الدور 3: وكيل الفحص والمطابقة والتحميل",
                      descFr: "الفحص الميداني الفيزيائي، مراقبة الشحن، رصد فروق الأماكن، تدقيق المطابقة.",
                      badge: "bg-sky-100 text-sky-900 border-sky-300",
                      icon: "🔍"
                    },
                    {
                      id: 'RESPONSABLE_PATRIMOINE' as UserRole,
                      titleFr: "Rôle 1 : Administrateur / Responsable du Patrimoine",
                      titleAr: "الدور 1: المدير العام / مسؤول إدارة الأصول",
                      descFr: "صلاحيات كلية: إنشاء الحسابات وتوزيع الأدوار، قفل الحملات، النسخ الاحتياطي، اعتماد المكتشفات.",
                      badge: "bg-purple-100 text-purple-900 border-purple-300",
                      icon: "👑"
                    }
                  ].map((roleOption) => {
                    const isSelected = formRole === roleOption.id;
                    return (
                      <div
                        key={roleOption.id}
                        onClick={() => { setFormRole(roleOption.id); sound.playTap(); }}
                        className={`p-2.5 rounded-lg border cursor-pointer transition-all ${
                          isSelected
                            ? 'bg-purple-50/80 border-purple-600 ring-2 ring-purple-600/30'
                            : 'bg-white border-slate-200 hover:bg-slate-50'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span className="text-base">{roleOption.icon}</span>
                            <span className="font-bold text-xs text-slate-900">
                              {lang === 'ar' ? roleOption.titleAr : roleOption.titleFr}
                            </span>
                          </div>
                          <input
                            type="radio"
                            name="assignedRole"
                            checked={isSelected}
                            onChange={() => setFormRole(roleOption.id)}
                            className="accent-purple-600"
                          />
                        </div>
                        <p className="text-[11px] text-slate-500 mt-1 leading-snug">
                          {roleOption.descFr}
                        </p>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 pt-1">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Mot de passe *
                  </label>
                  <input
                    type="password"
                    required
                    value={formPassword}
                    onChange={(e) => setFormPassword(e.target.value)}
                    placeholder="Min. 6 caractères"
                    className="w-full p-2 border border-slate-300 rounded focus:ring-2 focus:ring-purple-600 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Confirmer mot de passe *
                  </label>
                  <input
                    type="password"
                    required
                    value={formConfirmPassword}
                    onChange={(e) => setFormConfirmPassword(e.target.value)}
                    placeholder="Retapez le mot de passe"
                    className="w-full p-2 border border-slate-300 rounded focus:ring-2 focus:ring-purple-600 focus:outline-none"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(false)}
                  className="px-3.5 py-1.5 border border-slate-300 text-slate-700 rounded hover:bg-slate-100 font-semibold"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-[#16A34A] hover:bg-[#15803D] text-white rounded font-bold shadow-sm"
                >
                  Créer le Compte
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* =========================================================================
          MODAL 2: MODIFIER LES INFOS D'UN UTILISATEUR
          ========================================================================= */}
      {isEditModalOpen && selectedUser && (
        <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg shadow-2xl max-w-md w-full overflow-hidden border border-slate-300 text-slate-800">
            <div className="bg-[#0F172A] text-white p-3.5 flex items-center justify-between border-b border-slate-800">
              <div className="flex items-center gap-2">
                <Edit3 className="w-4 h-4 text-sky-400" />
                <h3 className="font-bold text-xs uppercase tracking-wider font-mono text-sky-200">
                  Modifier Compte : {selectedUser.username}
                </h3>
              </div>
              <button onClick={() => setIsEditModalOpen(false)} className="text-slate-400 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleEditUser} className="p-4 space-y-3.5 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Nom Complet
                </label>
                <input
                  type="text"
                  required
                  value={formFullName}
                  onChange={(e) => setFormFullName(e.target.value)}
                  className="w-full p-2 border border-slate-300 rounded focus:ring-2 focus:ring-purple-600 focus:outline-none"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Adresse Email
                </label>
                <input
                  type="email"
                  value={formEmail}
                  onChange={(e) => setFormEmail(e.target.value)}
                  className="w-full p-2 border border-slate-300 rounded focus:ring-2 focus:ring-purple-600 focus:outline-none"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1.5">
                  {lang === 'ar' ? 'تعديل الدور والصلاحية (Réaffecter le Rôle)' : 'Réaffecter le Rôle Opérationnel'}
                </label>
                <div className="grid grid-cols-1 gap-2">
                  {[
                    {
                      id: 'AGENT_INVENTAIRE' as UserRole,
                      titleFr: "Rôle 2 : Agent d'Ajout / Identification",
                      titleAr: "الدور 2: وكيل الإضافة والتعريف",
                      icon: "🏷️"
                    },
                    {
                      id: 'CONTROLEUR_ZONE' as UserRole,
                      titleFr: "Rôle 3 : Agent de Vérification / Chargement",
                      titleAr: "الدور 3: وكيل الفحص والشحن",
                      icon: "🔍"
                    },
                    {
                      id: 'RESPONSABLE_PATRIMOINE' as UserRole,
                      titleFr: "Rôle 1 : Administrateur / Responsable du Patrimoine",
                      titleAr: "الدور 1: المدير العام / مسؤول الأصول",
                      icon: "👑"
                    }
                  ].map((roleOption) => {
                    const isSelected = formRole === roleOption.id;
                    return (
                      <div
                        key={roleOption.id}
                        onClick={() => { setFormRole(roleOption.id); sound.playTap(); }}
                        className={`p-2 rounded border cursor-pointer flex items-center justify-between transition-all ${
                          isSelected
                            ? 'bg-sky-50 border-sky-600 ring-2 ring-sky-600/30 font-bold'
                            : 'bg-white border-slate-200 hover:bg-slate-50'
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <span>{roleOption.icon}</span>
                          <span className="text-xs text-slate-900">
                            {lang === 'ar' ? roleOption.titleAr : roleOption.titleFr}
                          </span>
                        </div>
                        <input
                          type="radio"
                          name="editRole"
                          checked={isSelected}
                          onChange={() => setFormRole(roleOption.id)}
                          className="accent-sky-600"
                        />
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setIsEditModalOpen(false)}
                  className="px-3.5 py-1.5 border border-slate-300 text-slate-700 rounded hover:bg-slate-100 font-semibold"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-sky-700 hover:bg-sky-800 text-white rounded font-bold shadow-sm"
                >
                  Enregistrer Modifications
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* =========================================================================
          MODAL 3: RÉINITIALISER LE MOT DE PASSE
          ========================================================================= */}
      {isPasswordModalOpen && selectedUser && (
        <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg shadow-2xl max-w-sm w-full overflow-hidden border border-slate-300 text-slate-800">
            <div className="bg-[#0F172A] text-white p-3.5 flex items-center justify-between border-b border-slate-800">
              <div className="flex items-center gap-2">
                <KeyRound className="w-4 h-4 text-amber-400" />
                <h3 className="font-bold text-xs uppercase tracking-wider font-mono text-amber-200">
                  Réinitialiser Mot de Passe
                </h3>
              </div>
              <button onClick={() => setIsPasswordModalOpen(false)} className="text-slate-400 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleResetPassword} className="p-4 space-y-3.5 text-xs">
              <p className="text-[11px] text-slate-600">
                Définition d'un nouveau mot de passe sécurisé pour <strong>{selectedUser.username}</strong> :
              </p>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Nouveau mot de passe *
                </label>
                <input
                  type="password"
                  required
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Min. 6 caractères"
                  className="w-full p-2 border border-slate-300 rounded focus:ring-2 focus:ring-purple-600 focus:outline-none"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Confirmer le mot de passe *
                </label>
                <input
                  type="password"
                  required
                  value={confirmNewPassword}
                  onChange={(e) => setConfirmNewPassword(e.target.value)}
                  placeholder="Retapez le nouveau mot de passe"
                  className="w-full p-2 border border-slate-300 rounded focus:ring-2 focus:ring-purple-600 focus:outline-none"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setIsPasswordModalOpen(false)}
                  className="px-3.5 py-1.5 border border-slate-300 text-slate-700 rounded hover:bg-slate-100 font-semibold"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded font-bold shadow-sm"
                >
                  Mettre à Jour
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
