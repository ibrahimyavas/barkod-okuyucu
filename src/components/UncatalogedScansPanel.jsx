import { ScanBarcode } from "lucide-react";
import { getUncatalogedScans } from "../lib/catalog.js";

// Tarayıcı'da taranmış ama Ürün Listesi kataloğunda henüz karşılığı olmayan
// kodları listeler - "hangi barkodların hâlâ kataloğa girilmesi gerektiği"
// sorusuna doğrudan cevap. Bir kod kataloğa eklenir eklenmez (ya da zaten
// eklenmişse) bu listeden kendiliğinden düşer. `onPick` tıklanan kodu
// çağıran formun barkod alanına yazar.
export default function UncatalogedScansPanel({ scans, catalog, onPick }) {
  const pending = getUncatalogedScans(scans, catalog);
  if (pending.length === 0) return null;

  return (
    <div className="uncataloged-panel">
      <div className="uncataloged-header">
        <ScanBarcode size={14} />
        Taranmış ama kataloğa eklenmemiş {pending.length} barkod var - yeni kayıt bekliyorlar
      </div>
      <ul className="uncataloged-list">
        {pending.map((s) => (
          <li key={s.id}>
            <button type="button" className="uncataloged-item" onClick={() => onPick(s.code)}>
              <span className="code-cell">{s.code}</span>
              <span className="muted">{s.count > 1 ? `${s.count}× tarandı` : "1× tarandı"}</span>
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
