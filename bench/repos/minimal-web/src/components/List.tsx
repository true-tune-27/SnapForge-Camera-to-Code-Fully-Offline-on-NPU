
import React, { ReactNode } from 'react';
export interface ListProps {
  className?: string; // tailwind
  children?: ReactNode;
}
export const List = (props: ListProps) => <div className={props.className}>{props.children}</div>;
