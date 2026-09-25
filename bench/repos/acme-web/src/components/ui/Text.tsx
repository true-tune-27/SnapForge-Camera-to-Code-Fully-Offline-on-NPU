
import React, { ReactNode } from 'react';
export interface TextProps {
  children?: ReactNode;
  size?: 'sm' | 'md' | 'lg';
  weight?: 'normal' | 'bold';
}
export const Text = (props: TextProps) => <span>{props.children}</span>;
