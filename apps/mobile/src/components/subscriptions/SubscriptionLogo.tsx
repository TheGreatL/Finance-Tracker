import React from 'react';
import { View, StyleProp, ViewStyle } from 'react-native';
import Svg, { Circle, Path, Polygon, Rect, Text as SvgText } from 'react-native-svg';
import { SvgCss } from 'react-native-svg/css';
import { getSubscriptionPreset } from '../../constants/subscriptions';
import { SUBSCRIPTION_LOGO_SVGS } from './subscriptionLogoSvgs';

const LOGO_ASSET_BY_CODE: Record<string, string> = {
  chatgpt: 'openai',
  disney: 'disney_plus',
  google_one: 'google',
  prime: 'prime_video',
};

interface SubscriptionLogoProps {
  code?: string;
  serviceName?: string;
  size?: number;
  className?: string;
  style?: StyleProp<ViewStyle>;
}

export function SubscriptionLogo({
  code,
  serviceName,
  size = 32,
  className,
  style,
}: SubscriptionLogoProps) {
  const preset = getSubscriptionPreset(code || serviceName);
  const normalized = preset.code;
  const backgroundColor = preset.color;
  const logoAsset = LOGO_ASSET_BY_CODE[normalized] || normalized;
  const logoXml = SUBSCRIPTION_LOGO_SVGS[logoAsset];

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
          backgroundColor: logoXml ? '#FFFFFF' : backgroundColor,
        },
        style,
      ]}>
      {logoXml ? (
        <SvgCss xml={logoXml} width={size * 0.82} height={size * 0.82} />
      ) : (
      <Svg viewBox="0 0 100 100" width={size} height={size}>
        <Rect width="100" height="100" rx="24" fill={backgroundColor} />

        {normalized === 'netflix' ? (
          <>
            <Rect x="28" y="20" width="13" height="60" fill="#B20710" />
            <Rect x="59" y="20" width="13" height="60" fill="#B20710" />
            <Polygon points="28,20 41,20 72,80 59,80" fill="#FFFFFF" />
          </>
        ) : normalized === 'spotify' ? (
          <>
            <Path
              d="M24 38c18-5 36-3 52 5"
              stroke="#FFFFFF"
              strokeWidth="8"
              strokeLinecap="round"
              fill="none"
            />
            <Path
              d="M28 52c15-4 30-2 43 4"
              stroke="#FFFFFF"
              strokeWidth="7"
              strokeLinecap="round"
              fill="none"
            />
            <Path
              d="M32 65c12-3 24-2 34 3"
              stroke="#FFFFFF"
              strokeWidth="6"
              strokeLinecap="round"
              fill="none"
            />
          </>
        ) : normalized === 'youtube' ? (
          <>
            <Rect x="18" y="27" width="64" height="46" rx="12" fill="#FFFFFF" />
            <Polygon points="44,39 44,61 63,50" fill="#FF0000" />
          </>
        ) : normalized === 'disney' ? (
          <>
            <Path
              d="M25 65 C28 32, 72 32, 75 65"
              stroke="#67E8F9"
              strokeWidth="4"
              fill="none"
              strokeLinecap="round"
            />
            <SvgText
              x="50"
              y="62"
              fontSize="34"
              fontWeight="800"
              fill="#FFFFFF"
              textAnchor="middle">
              D+
            </SvgText>
          </>
        ) : normalized === 'apple' ? (
          <>
            {/* iCloud cloud vector */}
            <Path
              d="M32 66h38a14 14 0 0 0 2-27.8A18 18 0 0 0 37 34a15 15 0 0 0-5 32z"
              fill="#FFFFFF"
            />
          </>
        ) : normalized === 'google_one' ? (
          <>
            <Rect x="45" y="24" width="12" height="16" rx="4" fill="#EA4335" />
            <Rect x="45" y="38" width="12" height="18" fill="#FBBC04" />
            <Rect x="45" y="54" width="12" height="22" rx="4" fill="#34A853" />
            <Path d="M34 36 L47 24 L47 36 Z" fill="#4285F4" />
          </>
        ) : normalized === 'chatgpt' ? (
          <>
            <Circle
              cx="50"
              cy="50"
              r="22"
              stroke="#FFFFFF"
              strokeWidth="6"
              fill="none"
            />
            <Circle cx="50" cy="36" r="10" stroke="#FFFFFF" strokeWidth="4" fill="none" />
            <Circle cx="62" cy="56" r="10" stroke="#FFFFFF" strokeWidth="4" fill="none" />
            <Circle cx="38" cy="56" r="10" stroke="#FFFFFF" strokeWidth="4" fill="none" />
          </>
        ) : normalized === 'canva' ? (
          <SvgText
            x="50"
            y="58"
            fontSize="44"
            fontWeight="800"
            fill="#FFFFFF"
            textAnchor="middle">
            C
          </SvgText>
        ) : normalized === 'microsoft_365' ? (
          <>
            <Rect x="24" y="24" width="23" height="23" rx="3" fill="#FFFFFF" />
            <Rect x="53" y="24" width="23" height="23" rx="3" fill="#FDBA74" />
            <Rect x="24" y="53" width="23" height="23" rx="3" fill="#FED7AA" />
            <Rect x="53" y="53" width="23" height="23" rx="3" fill="#FFFFFF" />
          </>
        ) : normalized === 'prime' ? (
          <>
            <SvgText
              x="50"
              y="50"
              fontSize="24"
              fontWeight="800"
              fill="#FFFFFF"
              textAnchor="middle">
              prime
            </SvgText>
            <Path
              d="M28 63 Q50 76 72 62"
              stroke="#FBBF24"
              strokeWidth="5"
              fill="none"
              strokeLinecap="round"
            />
            <Polygon points="72,62 65,60 70,68" fill="#FBBF24" />
          </>
        ) : normalized === 'gym' ? (
          <>
            <Rect x="20" y="38" width="8" height="24" rx="3" fill="#FFFFFF" />
            <Rect x="30" y="32" width="8" height="36" rx="3" fill="#FFFFFF" />
            <Rect x="38" y="46" width="24" height="8" fill="#FFFFFF" />
            <Rect x="62" y="32" width="8" height="36" rx="3" fill="#FFFFFF" />
            <Rect x="72" y="38" width="8" height="24" rx="3" fill="#FFFFFF" />
          </>
        ) : normalized === 'internet' ? (
          <>
            <Path
              d="M24 42 A36 36 0 0 1 76 42"
              stroke="#FFFFFF"
              strokeWidth="7"
              strokeLinecap="round"
              fill="none"
            />
            <Path
              d="M33 54 A24 24 0 0 1 67 54"
              stroke="#FFFFFF"
              strokeWidth="7"
              strokeLinecap="round"
              fill="none"
            />
            <Circle cx="50" cy="68" r="6" fill="#FFFFFF" />
          </>
        ) : (
          <>
            {/* Recurring cycle arrows + initial */}
            <Path
              d="M50 22 A28 28 0 1 1 24 58"
              stroke="#BBD583"
              strokeWidth="6"
              strokeLinecap="round"
              fill="none"
            />
            <Polygon points="50,15 50,29 60,22" fill="#BBD583" />
            <SvgText
              x="50"
              y="57"
              fontSize="28"
              fontWeight="800"
              fill="#FFFFFF"
              textAnchor="middle">
              {(serviceName || 'S').trim().charAt(0).toUpperCase()}
            </SvgText>
          </>
        )}
      </Svg>
      )}
    </View>
  );
}

