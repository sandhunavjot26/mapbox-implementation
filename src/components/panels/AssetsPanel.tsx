import Image from "next/image";
import { Asset } from "@/mock/assets";
import { flyToAsset, selectAsset } from "@/components/map/mapController";

import AssetsIcon from "@/assets/assets.svg";
import TowerIcon from "@/assets/tower.svg";

interface AssetsPanelProps {
  assets: Asset[];
  collapsed: boolean;
  onToggle: () => void;
}

export function AssetsPanel({ assets, collapsed, onToggle }: AssetsPanelProps) {
  return (
    <aside
      className={`shrink-0 border-r border-slate-800 bg-slate-950/50 flex flex-col transition-all duration-300 ease-in-out ${collapsed ? "w-12" : "w-72"
        }`}
    >
      {/* Panel header */}
      <div
        className={`px-3 py-3 border-b border-slate-800 ${collapsed ? "cursor-pointer" : ""}`}
        onClick={collapsed ? onToggle : undefined}
      >
        <div className="flex items-center justify-between">
          <div className={`flex items-center gap-2 overflow-hidden ${collapsed ? "justify-center w-full" : ""}`}>
            <Image src={AssetsIcon} alt="Assets" width={20} height={20} className="shrink-0" />
            <h2
              className={`text-sm font-mono font-semibold text-slate-200 tracking-wide whitespace-nowrap transition-all duration-300 ${collapsed ? "opacity-0 w-0" : "opacity-100"
                }`}
            >
              Assets
            </h2>
          </div>
          {!collapsed && (
            <button
              onClick={onToggle}
              className="text-slate-400 hover:text-slate-200 transition-colors p-1 shrink-0"
              aria-label="Collapse panel"
            >
              <svg
                className="w-4 h-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
          )}
        </div>
      </div>

      {/* Asset list */}
      <div
        className={`flex-1 overflow-y-auto p-3 space-y-3 transition-opacity duration-300 ${collapsed ? "opacity-0 pointer-events-none" : "opacity-100"
          }`}
      >
        {assets.map((asset) => (
          <div
            key={asset.id}
            onClick={() => {
              flyToAsset(asset);
              selectAsset(asset.id);
            }}
            className="bg-slate-900/50 border border-slate-800 p-3 cursor-pointer hover:border-slate-600 hover:bg-slate-900/70 transition-colors"
          >
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <Image src={TowerIcon} alt="Sensor" width={16} height={16} />
                <span className="text-slate-200 text-xs font-mono font-semibold">
                  {asset.name}
                </span>
              </div>
              <div className="flex items-center gap-1">
                <span className="text-[10px] font-mono text-slate-500 bg-slate-800 px-1.5 py-0.5 whitespace-nowrap">
                  ALT {asset.altitude} FT
                </span>
                <span
                  className={`text-[10px] font-mono px-1.5 py-0.5 ${asset.status === "ACTIVE"
                    ? "text-green-400 bg-green-950"
                    : "text-slate-500 bg-slate-800"
                    }`}
                >
                  {asset.status}
                </span>
              </div>
            </div>
            <div className="space-y-1 text-[10px] font-mono text-slate-500">
              <div className="flex">
                <span className="w-20">ID:</span>
                <span className="text-slate-400">{asset.id}</span>
              </div>
              <div className="flex">
                <span className="w-20">Area:</span>
                <span className="text-slate-400">{asset.area}</span>
              </div>
              <div className="flex">
                <span className="w-20">Coordinates:</span>
                <span className="text-slate-400">
                  {asset.coordinates[1].toFixed(5)}, {asset.coordinates[0].toFixed(5)}
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </aside>
  );
}
