
import React, { ReactNode } from 'react';
export interface IconProps {
  name: string;
  size?: 'sm' | 'md' | 'lg';
  color?: string;
}
export const Icon = (props: IconProps) => <span>{props.name}</span>;
