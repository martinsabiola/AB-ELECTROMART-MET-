import React from 'react';

interface IconProps extends React.HTMLAttributes<HTMLSpanElement> {
  size?: number | string;
  className?: string;
}

const createIcon = (char: string) => {
  const Component = ({ size, className, ...props }: IconProps) => (
    <span
      className={`inline-flex items-center justify-center font-mono ${className || ''}`}
      style={{
        fontSize: size ? `${size}px` : '12px',
        display: 'inline-flex',
        lineHeight: 1,
        verticalAlign: 'middle',
      }}
      {...props}
    >
      {char}
    </span>
  );
  Component.displayName = `MockIcon_${char}`;
  return Component;
};

export const ChevronDown = createIcon('▼');
export const ChevronUp = createIcon('▲');
export const ChevronLeft = createIcon('◀');
export const ChevronRight = createIcon('▶');
export const Search = createIcon('🔍');
export const Plus = createIcon('+');
export const Trash2 = createIcon('✕');
export const Edit = createIcon('✎');
export const RotateCcw = createIcon('↺');
export const RotateCw = createIcon('↻');
export const Undo = createIcon('↩');
export const Redo = createIcon('↪');
export const Check = createIcon('✓');
export const X = createIcon('✕');
export const FileSpreadsheet = createIcon('📊');
export const Settings = createIcon('⚙');
export const Copy = createIcon('⎘');
export const RefreshCw = createIcon('↻');
export const Wind = createIcon('💨');
export const Zap = createIcon('⚡');
export const Cable = createIcon('🔌');
export const Thermometer = createIcon('🌡');
export const Layers = createIcon('▤');
export const Trophy = createIcon('🏆');
export const Shield = createIcon('🛡');
export const Award = createIcon('🏅');
export const Sparkles = createIcon('✦');
export const Lock = createIcon('🔒');
export const Key = createIcon('🔑');
export const Star = createIcon('★');
export const Package = createIcon('📦');
export const Power = createIcon('⏻');
export const GripHorizontal = createIcon('≣');
export const Eye = createIcon('👁');
export const EyeOff = createIcon('👁‍🗨');
export const Layout = createIcon('◫');
export const Cpu = createIcon('🎛');
export const Pin = createIcon('📌');
export const Sliders = createIcon('⚙');
export const Home = createIcon('🏠');
export const Droplets = createIcon('💧');
export const Flame = createIcon('🔥');
export const Sun = createIcon('☀️');
export const Tv = createIcon('📺');
const Lightbulb = createIcon('💡');
export const FileText = createIcon('📄');
export const Printer = createIcon('🖨️');
export const ShieldAlert = createIcon('⚠️');
export const Box = createIcon('📦');
export const ZoomIn = createIcon('🔍+');
export const ZoomOut = createIcon('🔍-');
export const Grid = createIcon('▦');
export const Link = createIcon('🔗');
export const Download = createIcon('⤓');
export const Upload = createIcon('⤒');
export const Move = createIcon('✥');
export const CheckCircle2 = createIcon('✓');
export const DollarSign = createIcon('$');
export const Camera = createIcon('📹');
export const Unlock = createIcon('🔓');
export const CheckSquare = createIcon('☑');
export const BarChart2 = createIcon('📊');
export const PieChart = createIcon('🥧');
export const Table = createIcon('▦');
export const Radio = createIcon('🔘');
export const Square = createIcon('▢');
export const List = createIcon('📋');
export const Calculator = createIcon('🧮');
export const Play = createIcon('▶');
export const Minus = createIcon('—');
export const Type = createIcon('T');
export const Divide = createIcon('÷');
export const Keyboard = createIcon('⌨️');
export const Command = createIcon('⌘');
export const GitCommit = createIcon('🔀');
export const Calendar = createIcon('📅');
export const ArrowRight = createIcon('➔');
export const Clock = createIcon('🕒');
export const Coins = createIcon('🪙');

export { Lightbulb };

