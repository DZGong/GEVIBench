import { Download } from 'lucide-react';
import { exportSvg, type SvgLegendItem } from '../svgExport';

interface Props {
  /** Returns the on-page <svg> to export (read at click time). */
  getSvg: () => SVGSVGElement | null | undefined;
  filename: string;
  legend?: SvgLegendItem[];
  className?: string;
}

/** "Export SVG" button shared by the tool panels; see svgExport.ts for what the file contains. */
export function ExportSvgButton({ getSvg, filename, legend, className = '' }: Props) {
  return (
    <button
      onClick={() => { const svg = getSvg(); if (svg) exportSvg(svg, { filename, legend }); }}
      title="Download this plot as a vector SVG"
      className={`inline-flex items-center gap-1 px-2.5 py-1 rounded border border-ink/20 bg-surface-low text-ink text-xs font-medium hover:border-klein hover:text-klein flex-shrink-0 ${className}`}
    >
      <Download className="w-3 h-3" /> Export SVG
    </button>
  );
}
