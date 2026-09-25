
import React, { ReactNode } from 'react';
/** @snapforge container.sheet */
export interface SheetProps {
  children?: ReactNode;
  open?: boolean;
  onClose?: () => void;
}
export const Sheet = (props: SheetProps) => <div>{props.children}</div>;
