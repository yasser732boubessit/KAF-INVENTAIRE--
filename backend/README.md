# KAF INVENTAIRE — Backend Central (NestJS + PostgreSQL 16 + Redis)
# الخادم المركزي المستقل لإدارة وجرد الأصول الصناعية

---

## 🇫🇷 Description Générale

Ce dossier contient l'intégralité du **Backend Central autonome** de la plateforme **KAF INVENTAIRE**, développé selon les spécifications techniques industrielles :
- **Framework** : NestJS 10 (TypeScript, Architecture Modulaire & Injection de Dépendances)
- **Base de données** : PostgreSQL 16 relationnel géré via **Prisma ORM 5**
- **Cache & Queues** : Redis 7 (Gestion des sessions et limitation de débit)
- **Sécurité & RBAC** : Helmet, Guards JWT, Argon2/bcrypt, Matrice à 4 rôles (`TEAM_1`, `TEAM_2`, `TEAM_3`, `ADMIN`)
- **Conteneurisation** : Docker & Docker Compose (`docker-compose.yml`)

---

## 🇸🇦 نظرة عامة على الباك إند

يحتوي هذا المجلد على **الكود المصدري المستقل للباك إند المركزي** لمنصة **KAF INVENTAIRE** المخصص للعمل مع قواعد بيانات PostgreSQL وRedis وتطبيقات سطح المكتب (Desktop SQLite) والبوابة المركزية (Web Portal) وتطبيق الهاتف (PWA).

### الوظائف الرئيسية الـ 8 المطبقة:
1. **المصادقة وإدارة الجلسات (Auth & Sessions)**: توكنات JWT مع Refresh Tokens وتشفير Argon2/bcrypt.
2. **التحكم بالوصول المبني على الأدوار (RBAC)**: 4 أدوار أساسية مع حماية دقيقة عبر NestJS Guards.
3. **إدارة الأصول (CRUD Assets)**: إنشاء وجرد وتعديل الأصول مع كود رسمي ومعرفات UUID.
4. **محرك تدفق العمل (Workflow State Machine)**: `AJOUTE` ➔ `SYNCHRONISE` ➔ `VERIFIE` ➔ `CHARGE` (أو `REJETE`).
5. **محرك المزامنة غير المتصلة (Offline Sync Engine)**: استقبال دفعات (Batches) أجهزة سطح المكتب ومنع التكرار.
6. **إدارة النزاعات (Conflict Resolution)**: حماية الأصول الموثقة ومنع التعديل العشوائي إذا كانت في حالة `VERIFIE` أو `CHARGE`.
7. **سجل التتبع والمراجعة (Audit Trail)**: توثيق شامل لعمليات التحقق الميداني والتحميل.
8. **الاستيراد الشامل ومؤشرات الأداء (ETL & KPIs)**: معالجة واستيراد ملفات Excel ضخمة (+1500 سطر).

---

## 📁 Arborescence des Fichiers / بنية الملفات

```text
backend/
├── Dockerfile                  # Image Docker multi-stage pour NestJS
├── docker-compose.yml          # Déploiement complet PostgreSQL 16 + Redis 7 + API
├── package.json                # Dépendances NestJS, Prisma, JWT, Helmet
├── tsconfig.json               # Configuration TypeScript & Décorateurs
├── .env.example                # Modèle des variables d'environnement
├── .env                        # Configuration active
├── README.md                   # Guide technique et commandes de démarrage
├── prisma/
│   ├── schema.prisma           # Schéma relationnel complet PostgreSQL
│   └── seed.ts                 # Données initiales (utilisateurs, rôles, actifs)
└── src/
    ├── main.ts                 # Point d'entrée de l'application NestJS
    ├── app.module.ts           # Module racine
    ├── app.controller.ts       # Endpoint de santé (/api/v1/health)
    ├── prisma/
    │   └── prisma.service.ts   # Client Prisma et gestion de connexion
    ├── common/
    │   ├── enums.ts            # UserRole, WorkflowState, PhysicalState
    │   ├── decorators/         # @Roles()
    │   └── guards/             # JwtAuthGuard, RolesGuard
    ├── auth/                   # Module d'authentification & JWT
    ├── assets/                 # Module de gestion des actifs (CRUD)
    ├── sync/                   # Moteur de synchronisation par lots
    ├── verification/           # Vérification terrain (Équipe 2)
    ├── loading/                # Chargement & Quai (Équipe 3)
    ├── etl/                    # Import Excel massif & statistiques
    └── audit/                  # Traçabilité & journalisation
```

---

## 🚀 Démarrage Rapide / التشغيل السريع

### 1. Avec Docker Compose (Recommandé / الطريقة الموصى بها)

Pour lancer l'ensemble des services (PostgreSQL 16, Redis 7, et l'API NestJS) en une seule commande :

```bash
cd backend
docker-compose up -d
```

Vérifier l'état des conteneurs :
```bash
docker-compose ps
```

Afficher les logs en temps réel :
```bash
docker-compose logs -f backend
```

---

### 2. Démarrage Manuel (Sans Docker / التشغيل اليدوي)

#### Prérequis :
- Node.js >= 20.x
- PostgreSQL 16 fonctionnel sur le port 5432
- Redis fonctionnel sur le port 6379

#### Installation des dépendances :
```bash
cd backend
npm install
```

#### Initialisation et migration de la base de données :
```bash
# Générer le client Prisma
npm run prisma:generate

# Appliquer les migrations PostgreSQL
npm run prisma:migrate

# Injecter les comptes et données initiales
npm run prisma:seed
```

#### Lancement en mode développement :
```bash
npm run start:dev
```
L'API sera disponible sur : **`http://localhost:5000/api/v1`**

---

## 👥 Comptes Utilisateurs Pré-configurés / الحسابات الجاهزة

| Rôle | Nom d'utilisateur | Mot de passe | Description & Permissions |
| :--- | :--- | :--- | :--- |
| **ADMIN** | `admin` | `Kaf2026!Secure` | Super Administrateur (Toutes permissions + Import ETL) |
| **TEAM_1** | `desktop_tech1` | `Kaf2026!Secure` | Équipe 1 : Saisie Desktop SQLite & Synchronisation |
| **TEAM_2** | `verifier_tech2` | `Kaf2026!Secure` | Équipe 2 : Portail Web & Vérification Physique |
| **TEAM_3** | `loader_tech3` | `Kaf2026!Secure` | Équipe 3 : Application Mobile PWA & Chargement |

---

## 📡 Matrice des Endpoints REST Principaux

| Méthode | Endpoint | Rôles Autorisés | Description |
| :--- | :--- | :--- | :--- |
| `POST` | `/api/v1/auth/login` | Tous (Public) | Authentification et obtention du Bearer Token JWT |
| `GET` | `/api/v1/auth/me` | Tous | Vérification du profil et des claims JWT |
| `GET` | `/api/v1/assets` | Tous | Liste filtrable des immobilisations |
| `POST` | `/api/v1/assets` | `TEAM_1`, `ADMIN` | Création d'un nouvel actif |
| `POST` | `/api/v1/sync` | `TEAM_1`, `ADMIN` | Moteur de synchronisation du batch offline |
| `GET` | `/api/v1/sync/status` | Tous | État du moteur de synchronisation et des terminaux |
| `POST` | `/api/v1/verification/:id` | `TEAM_2`, `ADMIN` | Validation de la vérification physique terrain |
| `POST` | `/api/v1/loading/:id` | `TEAM_3`, `ADMIN` | Enregistrement du chargement et quai |
| `POST` | `/api/v1/etl/import` | `ADMIN` | Importation massive Excel (+1500 lignes) |
| `GET` | `/api/v1/etl/stats` | Tous | KPIs et métriques du parc d'immobilisations |
| `GET` | `/api/v1/audit` | Tous | Journal complet de traçabilité et historique |
| `GET` | `/api/v1/health` | Tous | Bilan de santé du serveur, PostgreSQL et Redis |

---

## 🔒 Règle de Résolution des Conflits (Conflict Protection)

Le backend applique une règle stricte d'intégrité industrielle :
1. Si un terminal de l'**Équipe 1** envoie un actif dont l'état dans la base centrale est déjà **`VERIFIE`** ou **`CHARGE`**, la modification est **bloquée** avec le statut `BLOCAGE_CONFLIT_WORKFLOW`.
2. Un actif ne peut être **`CHARGE`** par l'**Équipe 3** que s'il a préalablement été validé à l'état **`VERIFIE`** par l'**Équipe 2**.
3. Toute tentative non autorisée déclenche une exception HTTP 403 Forbidden ou 400 Bad Request, inscrite dans l'Audit Trail.
