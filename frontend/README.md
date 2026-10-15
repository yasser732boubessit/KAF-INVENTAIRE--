# KAF INVENTAIRE — Frontend Web & Cockpit Industriel
# الواجهة الأمامية المستقلة لمنصة كوتاما أغري فود (React 19 + Vite + Tailwind CSS 4)

---

## 🇫🇷 Présentation Générale

Ce dossier contient l'intégralité du **Frontend autonome** de l'application **KAF INVENTAIRE**, développé pour les équipes industrielles du Complexe Kotama Agri-Food (KAF) :
- **Framework** : React 19 + TypeScript + Vite 8
- **Design & UI** : Tailwind CSS 4, Lucide Icons, Motion (Framer Motion)
- **Architecture** : Offline-First (fonctionnement 100% hors-ligne avec cache local et file d'attente des mutations)
- **Internationalisation** : Bilingue Français / العربية (RTL & LTR natif)
- **Conteneurisation** : Dockerfile multi-stage avec serveur haute performance Nginx

---

## 🇸🇦 نظرة عامة على الواجهة الأمامية

يحتوي هذا المجلد على **الكود المصدري الكامل والمستقل للواجهة الأمامية** لمنصة **KAF INVENTAIRE** الصناعية. تم تصميم هذه الواجهة لتعمل كبوابة ويب (Web Portal) وتطبيق PWA متقدم مع إمكانية العمل بدون اتصال بالإنترنت (Offline-First).

### 🖥️ الوحدات والشاشات المتوفرة:
1. **قمرة القيادة والتسوية (Reconciliation Cockpit)**: لوحة تحكم فورية مع مؤشرات الأداء (KPIs)، حالة الجرد (مطابق، انحراف موقع، مفقود، غير مدقق)، والبحث المتقدم.
2. **محطة الماسح الميداني (Field Scanner Terminal)**: محاكاة ومطابقة فورية لقراءة الباركود، RFID، والكاميرا مع إنذارات صوتية.
3. **الأصول المكتشفة غير المسجلة (Unregistered Discoveries)**: تسجيل الأصول الجديدة في الميدان وتوليد وطباعة بطاقات تعريف صناعية مشفرة.
4. **خريطة المستودع التفاعلية (Warehouse Map)**: استعراض ثلاثي الأبعاد وثنائي الأبعاد لمناطق المستودع (Zone A, B, C) والرفوف والأروقة.
5. **إدارة الحملات (Campaigns)**: فتح وإغلاق حملات الجرد الدورية وحساب نسب الإنجاز.
6. **محرك المزامنة وقائمة الانتظار (Offline Queue Engine)**: تخزين محلي لجميع العمليات في حالة انقطاع الاتصال ومزامنتها تلقائياً مع الباك إند المركزي.
7. **سجل المراجعة والتتبع (Audit Trail & Reports)**: تتبع زمني دقيق لكل حركة أو تعديل وتوليد محاضر جرد رسمية قابلة للطباعة.
8. **إدارة المستخدمين والأدوار (RBAC Users)**: شاشات مخصصة لفرق العمل (Équipe 1, Équipe 2, Équipe 3, Admin).
9. **مركز اختبار ومزامنة الباك إند (Backend Sync Center)**: شاشة مخصصة لاختبار جميع نقاط الـ API الخاصة بالباك إند (NestJS).

---

## 📁 Arborescence des Fichiers / بنية الملفات

```text
frontend/
├── Dockerfile                  # Image Docker multi-stage (Node.js build + Nginx)
├── nginx.conf                  # Configuration Nginx pour le routage SPA & Reverse Proxy
├── package.json                # Dépendances React 19, Tailwind 4, Lucide
├── tsconfig.json               # Configuration TypeScript stricte
├── vite.config.ts              # Configuration Vite avec reverse-proxy vers le Backend
├── index.html                  # Point d'entrée HTML avec polices Cairo, Inter, JetBrains Mono
├── .env.example                # Modèle des variables d'environnement
├── .env                        # Configuration active
├── README.md                   # Ce guide
├── public/
│   ├── favicon.svg             # Favicon officiel KAF
│   └── kaf-logo.svg            # Logo haute résolution Kotama Agri-Food
└── src/
    ├── App.tsx                 # Composant racine avec gestion des onglets et état global
    ├── main.tsx                # Point de montage React
    ├── index.css               # Styles globaux Tailwind 4
    ├── types.ts                # Modèles TypeScript complets (Actifs, Mutations, Rôles, API)
    ├── translations.ts         # Dictionnaire complet bilingue Français / العربية
    ├── mockData.ts             # Données de démonstration du parc industriel
    ├── components/             # 23 composants modulaires (Cockpit, Scanner, Carte, etc.)
    ├── services/
    │   ├── centralSyncService.ts   # Client HTTP & WebSocket de synchronisation avec le Backend
    │   └── databaseService.ts      # Gestionnaire du stockage local SQLite / IndexedDB
    ├── security/               # Hachage, permissions et cryptographie locale
    └── utils/                  # Moteur de code-barres, scanner clavier et synthèse vocale
```

---

## 🚀 Démarrage & Installation / التثبيت والتشغيل

### 1. Mode Développement Local / وضع التطوير

#### المتطلبات المسبقة:
- Node.js >= 20.x
- npm >= 10.x

#### خطوات التشغيل:
```bash
# 1. الدخول إلى مجلد الواجهة
cd frontend

# 2. تثبيت الحزم
npm install

# 3. تشغيل خادم التطوير
npm run dev
```

ستكون الواجهة متاحة على الرابط: **`http://localhost:3000`**

---

### 2. البناء للإنتاج / Production Build

```bash
npm run build
```
سيتم إنشاء ملفات الإنتاج المحسنة داخل مجلد `frontend/dist/`.

---

### 3. التشغيل عبر Docker / التشغيل في حاوية مستقلة

```bash
cd frontend

# بناء صورة الدوكر
docker build -t kaf-inventaire-frontend .

# تشغيل الحاوية
docker run -d -p 3000:80 --name kaf_frontend kaf-inventaire-frontend
```

---

## 🔗 الربط مع الباك إند المركزي (`/backend`)

تتصل الواجهة الأمامية بالباك إند المركزي المبني بـ NestJS من خلال الإعدادات في ملف `.env`:

```env
# رابط الباك إند المركزي
VITE_CENTRAL_API_URL="http://localhost:5000/api/v1"

# معرف الجهاز المفعل
VITE_DEVICE_ID="TERM-WH-01"
VITE_DEVICE_API_KEY="dev_key_alpha_9921"
```

- يتم توجيه طلبات `/api` تلقائياً عبر البروكسي الداخلي في `vite.config.ts` أو عبر Nginx في الإنتاج.
- في حالة انقطاع الاتصال بالسيرفر، تواصل الواجهة العمل بنسبة 100% وتضع العمليات في الـ `Offline Queue` حتى عودة الاتصال.
