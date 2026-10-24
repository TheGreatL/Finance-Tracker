import React from 'react';
import { View, StyleProp, ViewStyle } from 'react-native';
import Svg, { Circle, Path, Polygon, Rect, Text as SvgText } from 'react-native-svg';

interface InstitutionLogoProps {
  code?: string;
  size?: number;
  className?: string;
  style?: StyleProp<ViewStyle>;
}

const LOGOS: Record<string, { label: string; color: string; fontSize: number }> = {
  gcash: { label: 'GCash', color: '#007DFE', fontSize: 28 },
  maya: { label: 'maya', color: '#00D665', fontSize: 36 },
  grabpay: { label: 'grab', color: '#00B14F', fontSize: 32 },
  shopeepay: { label: 'Shopee', color: '#EE4D2D', fontSize: 26 },
  gotyme: { label: 'GoTyme', color: '#00B4D8', fontSize: 25 },
  seabank: { label: 'SeaBank', color: '#FF5722', fontSize: 24 },
  cimb: { label: 'CIMB', color: '#ED1C24', fontSize: 32 },
  tonik: { label: 'tonik', color: '#6F2DBD', fontSize: 34 },
  bpi: { label: 'BPI', color: '#B11116', fontSize: 38 },
  bdo: { label: 'BDO', color: '#002B7F', fontSize: 38 },
  unionbank: { label: 'Union', color: '#F58220', fontSize: 32 },
  metrobank: { label: 'Metro', color: '#003882', fontSize: 31 },
  rcbc: { label: 'RCBC', color: '#0066B2', fontSize: 36 },
  security_bank: { label: 'SECURITY', color: '#005596', fontSize: 20 },
};

export function InstitutionLogo({
  code = 'custom',
  size = 24,
  className,
  style,
}: InstitutionLogoProps) {
  const normalized = (code || '').toLowerCase().trim();
  const logo = LOGOS[normalized];
  const backgroundColor =
    logo?.color ??
    (({ tiktok: '#010101', billease: '#0052FF', lazada: '#0F146D' } as Record<string, string>)[
      normalized
    ] ?? (normalized === 'cash' ? '#10B981' : '#5C6E63'));

  return (
    <View
      className={className}
      style={[
        {
          width: size,
          height: size,
          alignItems: 'center',
          justifyContent: 'center',
          borderRadius: size * 0.24,
          overflow: 'hidden',
        },
        style,
      ]}>
      <Svg viewBox="0 0 100 100" width={size} height={size}>
        <Rect
          width="100"
          height="100"
          rx="24"
          fill={backgroundColor}
        />
        {normalized === 'tiktok' ? (
          <>
            <Path
              d="M64 26c0 7 5 13 12 14v10c-6 0-12-3-16-7v20c0 11-9 19-20 19S20 73 20 62s9-20 20-20c3 0 5 1 8 2v10c-2-1-5-2-8-2-6 0-10 5-10 10 0 6 4 10 10 10s10-4 10-10V20h14z"
              fill="#25F4EE"
            />
            <Path
              d="M68 30c0 7 5 13 12 14v10c-6 0-12-3-16-7v20c0 11-9 19-20 19S24 77 24 66s9-20 20-20c3 0 5 1 8 2v10c-2-1-5-2-8-2-6 0-10 5-10 10 0 6 4 10 10 10s10-4 10-10V24h14z"
              fill="#FE2C55"
            />
            <Path
              d="M66 28c0 7 5 13 12 14v9c-6 0-12-3-16-7v20c0 11-9 19-20 19S22 74 22 63s9-20 20-20c3 0 5 1 8 2v10c-2-1-5-2-8-2-6 0-10 5-10 10 0 6 4 10 10 10s10-4 10-10V22h14z"
              fill="#FFFFFF"
            />
          </>
        ) : normalized === 'billease' ? (
          <>
            <Path
              d="M34 22h14v23c4-4 9-6 15-6 11 0 19 9 19 21s-8 21-19 21c-7 0-13-3-17-8v7H34V22zm14 38c0 7 5 11 11 11s11-4 11-11-5-11-11-11-11 4-11 11z"
              fill="#FFFFFF"
            />
            <Circle cx="68" cy="28" r="6" fill="#00E5FF" />
          </>
        ) : normalized === 'lazada' ? (
          <>
            <Path d="M50 38 32 24c-6 4-8 14-4 22l22 22z" fill="#F85959" />
            <Path d="M50 38 68 24c6 4 8 14 4 22L50 68z" fill="#FF8300" />
            <Path d="m50 42-14-11c-3 3-3 9 1 14l13 13 13-13c4-5 4-11 1-14z" fill="#00D2D3" />
            <Polygon points="50,56 42,48 50,42 58,48" fill="#FFFFFF" />
          </>
        ) : logo ? (
          <SvgText
            x="50"
            y="52"
            fontSize={logo.fontSize}
            fontWeight="700"
            fill="#FFFFFF"
            textAnchor="middle"
            alignmentBaseline="middle">
            {logo.label}
          </SvgText>
        ) : normalized === 'cash' ? (
          <>
            <Rect x="20" y="30" width="60" height="40" rx="6" fill="#FFFFFF" />
            <Rect x="25" y="35" width="50" height="30" rx="4" fill="#059669" />
            <Circle cx="50" cy="50" r="9" fill="#FFFFFF" />
            <Circle cx="50" cy="50" r="6" fill="#10B981" />
          </>
        ) : (
          <>
            <Polygon points="50,22 25,36 75,36" fill="#FFFFFF" />
            <Rect x="25" y="38" width="50" height="5" fill="#FFFFFF" />
            <Rect x="30" y="45" width="7" height="23" rx="1.5" fill="#FFFFFF" />
            <Rect x="42" y="45" width="7" height="23" rx="1.5" fill="#FFFFFF" />
            <Rect x="53" y="45" width="7" height="23" rx="1.5" fill="#FFFFFF" />
            <Rect x="64" y="45" width="7" height="23" rx="1.5" fill="#FFFFFF" />
            <Rect x="23" y="70" width="54" height="6" rx="2" fill="#FFFFFF" />
          </>
        )}
      </Svg>
    </View>
  );
}
