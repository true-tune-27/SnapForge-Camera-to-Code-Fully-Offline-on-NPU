
import React from 'react';
export interface DividerProps {
  orientation?: 'horizontal' | 'vertical';
  color?: string;
}
export const Divider = (props: DividerProps) => <hr />;
