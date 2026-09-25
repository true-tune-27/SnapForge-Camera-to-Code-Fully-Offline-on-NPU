
import React, { ReactNode } from 'react';
export interface BtnProps {
  className?: string; // tailwind
  children?: ReactNode;
}
export const Btn = (props: BtnProps) => <div className={props.className}>{props.children}</div>;
