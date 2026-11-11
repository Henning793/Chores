import { useId } from 'react';
import Svg, { Circle, Defs, Ellipse, LinearGradient, Path, Polygon, Stop } from 'react-native-svg';

const PUNKTER = '50,8 62.34,33.01 89.94,37.02 69.97,56.49 74.69,83.98 50,71 25.31,83.98 30.03,56.49 10.06,37.02 37.66,33.01';

/**
 * Den runde gullstjerna. `fjes` brukes bare på den store feiringsstjerna.
 * `tom` er den stiplede ledige plassen på stjernehylla.
 */
export function Stjerne({ storrelse, fjes, tom }: { storrelse: number; fjes?: boolean; tom?: boolean }) {
  const id = `gull${useId().replace(/:/g, '')}`;
  if (tom) {
    return (
      <Svg width={storrelse} height={storrelse} viewBox="0 0 100 100">
        <Polygon points={PUNKTER} fill="none" stroke="rgba(255,255,255,0.4)" strokeWidth={6} strokeLinejoin="round" strokeDasharray="10 9" />
      </Svg>
    );
  }
  return (
    <Svg width={storrelse} height={storrelse} viewBox="0 0 100 100">
      <Defs>
        <LinearGradient id={id} x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor="#FFE27A" />
          <Stop offset="0.55" stopColor="#FFC43D" />
          <Stop offset="1" stopColor="#FFA81F" />
        </LinearGradient>
      </Defs>
      <Polygon points={PUNKTER} fill={`url(#${id})`} stroke="#F2A200" strokeWidth={9} strokeLinejoin="round" />
      <Polygon points={PUNKTER} fill={`url(#${id})`} stroke={`url(#${id})`} strokeWidth={5} strokeLinejoin="round" />
      <Ellipse cx={38} cy={32} rx={7} ry={4} fill="#FFFFFF" opacity={0.7} transform="rotate(-35 38 32)" />
      {fjes ? (
        <>
          <Circle cx={42} cy={50} r={3.6} fill="#6B4A00" />
          <Circle cx={58} cy={50} r={3.6} fill="#6B4A00" />
          <Circle cx={43.2} cy={48.8} r={1.2} fill="#FFFFFF" />
          <Circle cx={59.2} cy={48.8} r={1.2} fill="#FFFFFF" />
          <Circle cx={35} cy={58} r={4} fill="#FF7A9A" opacity={0.45} />
          <Circle cx={65} cy={58} r={4} fill="#FF7A9A" opacity={0.45} />
          <Path d="M43 57 Q50 64 57 57" fill="none" stroke="#6B4A00" strokeWidth={3.2} strokeLinecap="round" />
        </>
      ) : null}
    </Svg>
  );
}

/** Lite firtagget glimt, brukt rundt stjerna. */
export function Glimt({ storrelse, farge = '#FFC43D' }: { storrelse: number; farge?: string }) {
  return (
    <Svg width={storrelse} height={storrelse} viewBox="0 0 20 20">
      <Path d="M10 0 L12.4 7.6 L20 10 L12.4 12.4 L10 20 L7.6 12.4 L0 10 L7.6 7.6 Z" fill={farge} />
    </Svg>
  );
}
