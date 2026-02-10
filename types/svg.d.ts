// Declaration pour importer des SVG comme composants React Native.
declare module '*.svg' {
  import * as React from 'react';
  import type { SvgProps } from 'react-native-svg';
  const content: React.FC<SvgProps>;
  export default content;
}
