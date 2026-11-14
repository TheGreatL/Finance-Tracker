import React from 'react';
import { Composition } from 'remotion';
import { TikTokAVP } from './TikTokAVP';
import { AVP_CONFIG } from './constants/theme';

export const RemotionRoot: React.FC = () => {
    return (
        <Composition
            id="TikTokAVP"
            component={TikTokAVP}
            durationInFrames={AVP_CONFIG.durationInFrames}
            fps={AVP_CONFIG.fps}
            width={AVP_CONFIG.width}
            height={AVP_CONFIG.height}
        />
    );
};
