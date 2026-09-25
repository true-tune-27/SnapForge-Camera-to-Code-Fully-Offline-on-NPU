
import React, { ReactNode } from 'react';
export interface ImgProps {
  className?: string; // tailwind
  children?: ReactNode;
}
export const Img = (props: ImgProps) => <div className={props.className}>{props.children}</div>;
