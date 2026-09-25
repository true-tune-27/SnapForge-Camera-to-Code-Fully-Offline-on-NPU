
import React, { ReactNode } from 'react';
import { SpaceToken, RadiusToken } from '@/theme/tokens';
export interface ButtonProps {
  children?: ReactNode;
  pad?: SpaceToken;
  radius?: RadiusToken;
  variant?: 'primary' | 'secondary' | 'ghost' | 'destructive';
  label?: string;
}
export const Button = (props: ButtonProps) => <div>{props.children}</div>;
