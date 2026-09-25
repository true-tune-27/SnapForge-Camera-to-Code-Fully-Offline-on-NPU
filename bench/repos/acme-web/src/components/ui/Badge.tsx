
import React, { ReactNode } from 'react';
import { SpaceToken, RadiusToken } from '@/theme/tokens';
export interface BadgeProps {
  children?: ReactNode;
  pad?: SpaceToken;
  radius?: RadiusToken;
  variant?: 'primary' | 'secondary' | 'ghost' | 'destructive';
  label?: string;
}
export const Badge = (props: BadgeProps) => <div>{props.children}</div>;
