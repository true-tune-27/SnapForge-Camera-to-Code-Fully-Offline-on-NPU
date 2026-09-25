
import React, { ReactNode } from 'react';
/** @snapforge heading */
export interface TitleProps {
  children?: ReactNode;
  level?: 1 | 2 | 3 | 4;
}
export const Title = (props: TitleProps) => <h1>{props.children}</h1>;
