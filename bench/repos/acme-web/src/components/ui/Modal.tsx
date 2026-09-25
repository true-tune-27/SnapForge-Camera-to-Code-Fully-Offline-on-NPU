
import React, { ReactNode } from 'react';
export interface ModalProps {
  children?: ReactNode;
  open?: boolean;
  onClose?: () => void;
  title?: string;
}
export const Modal = (props: ModalProps) => <div>{props.children}</div>;
