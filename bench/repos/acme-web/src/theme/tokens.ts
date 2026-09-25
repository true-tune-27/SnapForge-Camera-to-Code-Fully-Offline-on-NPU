
export const tokens = {
  space: { '4': 4, '8': 8, '12': 12, '16': 16, '24': 24, '32': 32 },
  radius: { sm: 4, md: 8, lg: 16, full: 9999 },
  colors: { primary: 'blue', secondary: 'gray', destructive: 'red' }
};
export type SpaceToken = keyof typeof tokens.space;
export type RadiusToken = keyof typeof tokens.radius;
