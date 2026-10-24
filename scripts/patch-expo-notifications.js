const fs = require('fs');
const path = require('path');

const targetPath = path.resolve(
  __dirname,
  '../node_modules/expo-notifications/build/TopicSubscriptionModule.android.js'
);

if (fs.existsSync(targetPath)) {
  const content = fs.readFileSync(targetPath, 'utf8');
  if (content.includes("requireNativeModule('ExpoTopicSubscriptionModule')")) {
    const patchedContent = `import { requireOptionalNativeModule } from 'expo';

const nativeModule = requireOptionalNativeModule('ExpoTopicSubscriptionModule');

const fallbackModule = {
  addListener: () => {},
  removeListeners: () => {},
  subscribeToTopicAsync: () => Promise.resolve(null),
  unsubscribeFromTopicAsync: () => Promise.resolve(null),
};

export default nativeModule ?? fallbackModule;
`;
    fs.writeFileSync(targetPath, patchedContent, 'utf8');
    console.log('[patch-expo-notifications] Patched TopicSubscriptionModule.android.js for Expo Go compatibility.');
  }
}
