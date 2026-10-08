import React, { useState } from 'react';
import { X, Plus, Barcode, MapPin, Tag } from 'lucide-react';
import { Asset, AssetCategory, Language } from '../types';
import { sound } from '../utils/audio';

interface NewAssetModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAddAsset: (newAsset: Asset) => void;
  lang: Language;
}

export const NewAssetModal: React.FC<NewAssetModalProps> = ({
  isOpen,
  onClose,
  onAddAsset,
  lang
}) => {
  if (!isOpen) return null;

  const [name, setName] = useState('');
  const [nameAr, setNameAr] = useState('');
  const [category, setCategory] = useState<AssetCategory>('Mechanical');
  const [bayLocation, setBayLocation] = useState('BAY-01-RACK-01-L1');
  const [serialNumber, setSerialNumber] = useState(`SN-${Math.floor(100000 + Math.random() * 900000)}-SA`);
  const [barcode, setBarcode] = useState(`${Math.floor(890000000000 + Math.random() * 999999999)}`);
  const [weightKg, setWeightKg] = useState('12.5');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const newId = `AST-${Math.floor(10502 + Math.random() * 8999)}`;
    const newAsset: Asset = {
      id: newId,
      name: name.trim() || 'New Industrial Assembly',
      nameAr: nameAr.trim() || (name.trim() ? name.trim() : 'معدة صناعية ميدانية جديدة'),
      sku: `SKU-${category.substring(0, 3).toUpperCase()}-${Math.floor(100 + Math.random() * 899)}`,
      serialNumber,
      barcode,
      rfidTag: `E280-1160-${Math.floor(1000 + Math.random() * 8999)}-${Math.floor(1000 + Math.random() * 8999)}`,
      category,
      zone: 'WEST-DC-ZONE-C',
      bayLocation,
      status: 'reconciled',
      condition: 'nominal',
      tamperSealIntact: true,
      rfidVerified: true,
      serialVerified: true,
      lastScannedAt: new Date().toISOString().replace('T', ' ').substring(0, 19),
      scannedBy: 'TECH-941',
      notes: 'Manually commissioned and registered during audit sweep.',
      imageUrl: 'https://images.unsplash.com/photo-1581092160607-ee22621dd758?auto=format&fit=crop&w=600&q=80',
      weightKg: parseFloat(weightKg) || 10,
      calibrationDueDate: '2027-12-31'
    };

    sound.playScanSuccess();
    onAddAsset(newAsset);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-2xl max-w-lg w-full overflow-hidden border border-slate-300 text-slate-800">
        <div className="bg-[#0F172A] text-white p-3.5 flex items-center justify-between border-b border-slate-800">
          <div className="flex items-center gap-2">
            <Plus className="w-4 h-4 text-sky-400" />
            <h3 className="font-bold text-xs uppercase tracking-wider font-mono-numbers text-sky-200">
              تسجيل أصل صناعي جديد في المنظومة (Commission New Asset)
            </h3>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white">
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-4 space-y-3.5 text-xs">
          <div>
            <label className="block font-semibold text-slate-700 mb-1">اسم الأصل (بالعربية)</label>
            <input
              type="text"
              required
              value={nameAr}
              onChange={(e) => setNameAr(e.target.value)}
              placeholder="مثال: محبس بوابي من الصلب المصبوب 4 بوصة"
              className="w-full p-2 border border-slate-300 rounded focus:ring-2 focus:ring-[#0284C7] focus:outline-none"
            />
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">Asset Name (English)</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Cast Steel Gate Valve 4-Inch Flanged"
              className="w-full p-2 border border-slate-300 rounded focus:ring-2 focus:ring-[#0284C7] focus:outline-none font-mono-numbers"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">التصنيف الفني</label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value as AssetCategory)}
                className="w-full p-2 border border-slate-300 rounded focus:ring-2 focus:ring-[#0284C7] focus:outline-none bg-white"
              >
                <option value="Mechanical">Mechanical (ميكانيكي)</option>
                <option value="Electrical">Electrical (كهربائي)</option>
                <option value="Automation">Automation (تحكم آلي)</option>
                <option value="Instrumentation">Instrumentation (أجهزة دقيقة)</option>
                <option value="Safety">Safety (سلامة صناعية)</option>
              </select>
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">إحداثيات الخليج والرف</label>
              <input
                type="text"
                value={bayLocation}
                onChange={(e) => setBayLocation(e.target.value)}
                placeholder="BAY-01-RACK-01-L1"
                className="w-full p-2 border border-slate-300 rounded focus:ring-2 focus:ring-[#0284C7] focus:outline-none font-mono-numbers"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">الرقم التسلسلي</label>
              <input
                type="text"
                value={serialNumber}
                onChange={(e) => setSerialNumber(e.target.value)}
                className="w-full p-2 border border-slate-300 rounded focus:ring-2 focus:ring-[#0284C7] focus:outline-none font-mono-numbers text-slate-800"
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-700 mb-1">الباركود البصري</label>
              <input
                type="text"
                value={barcode}
                onChange={(e) => setBarcode(e.target.value)}
                className="w-full p-2 border border-slate-300 rounded focus:ring-2 focus:ring-[#0284C7] focus:outline-none font-mono-numbers text-slate-800"
              />
            </div>
          </div>

          <div className="pt-2 flex justify-end gap-2 border-t border-slate-200">
            <button
              type="button"
              onClick={onClose}
              className="px-3 py-1.5 border border-slate-300 rounded hover:bg-slate-100 font-medium"
            >
              إلغاء
            </button>
            <button
              type="submit"
              className="px-4 py-1.5 bg-[#0284C7] hover:bg-[#0369a1] text-white rounded font-medium shadow-sm flex items-center gap-1.5"
            >
              <Tag className="w-3.5 h-3.5" />
              <span>إدراج الأصل وتأكيد التدقيق</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
