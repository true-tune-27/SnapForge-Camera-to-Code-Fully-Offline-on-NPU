
import React, { ReactNode } from 'react';
import { SpaceToken, RadiusToken } from '@/theme/tokens';
export interface CardProps {
  children?: ReactNode;
  pad?: SpaceToken;
  radius?: RadiusToken;
  variant?: 'primary' | 'secondary' | 'ghost' | 'destructive';
  label?: string;
}
export const Card = (props: CardProps) => <div>{props.children}</div>;
