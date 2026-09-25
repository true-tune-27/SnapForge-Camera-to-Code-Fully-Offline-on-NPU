
import React, { ReactNode } from 'react';
export interface BoxProps {
  className?: string; // tailwind
  children?: ReactNode;
}
export const Box = (props: BoxProps) => <div className={props.className}>{props.children}</div>;
