
import React, { ReactNode } from 'react';
export interface TxtProps {
  className?: string; // tailwind
  children?: ReactNode;
}
export const Txt = (props: TxtProps) => <div className={props.className}>{props.children}</div>;
