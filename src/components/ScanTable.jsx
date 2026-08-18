import { useMemo, useState } from "react";
import { Trash2, Camera, Keyboard, Pencil, Search } from "lucide-react";
import { sourceLabel } from "../lib/csv.js";

const SOURCE_ICON = { camera: Camera, gadget: Keyboard, manual: Pencil };

export default function ScanTable({ scans, onRemove }) {
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const list = q ? scans.filter((s) => s.code.toLowerCase().includes(q)) : scans;
    return [...list].sort((a, b) => b.lastSeenAt - a.lastSeenAt);
  }, [scans, query]);

  return (
    <div className="scan-table-wrap">
      <div className="scan-search">
        <Search size={16} />
        <input type="text" placeholder="Kod ara…" value={query} onChange={(e) => setQuery(e.target.value)} />
      </div>

      {filtered.length === 0 ? (
        <p className="empty-state">
          {scans.length === 0
            ? "Henüz kod okunmadı. Kamerayı doğrultun ya da el terminaliyle okutun."
            : "Aramayla eşleşen kod yok."}
        </p>
      ) : (
        <div className="scan-table-scroll">
          <table className="scan-table">
            <thead>
              <tr>
                <th>Kod</th>
                <th>Format</th>
                <th>Kaynak</th>
                <th>Adet</th>
                <th>Son Okunma</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {filtered.map((s) => {
                const Icon = SOURCE_ICON[s.source] || Pencil;
                return (
                  <tr key={s.id}>
                    <td className="code-cell">{s.code}</td>
                    <td className="muted">{s.format || "-"}</td>
                    <td>
                      <span className={`source-badge source-${s.source}`}>
                        <Icon size={13} />
                        {sourceLabel(s.source)}
                      </span>
                    </td>
                    <td className="count-cell">{s.count}</td>
                    <td className="muted">{new Date(s.lastSeenAt).toLocaleTimeString("tr-TR")}</td>
                    <td>
                      <button className="icon-btn danger" onClick={() => onRemove(s.id)} aria-label="Sil" title="Sil">
                        <Trash2 size={15} />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
