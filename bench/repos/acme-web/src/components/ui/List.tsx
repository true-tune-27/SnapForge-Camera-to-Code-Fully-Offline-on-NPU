
import React, { ReactNode } from 'react';
export interface ListProps {
  children?: ReactNode;
  ordered?: boolean;
}
export const List = (props: ListProps) => <ul>{props.children}</ul>;
