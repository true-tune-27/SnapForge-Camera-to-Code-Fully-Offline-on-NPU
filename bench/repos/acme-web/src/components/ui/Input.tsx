
import React, { ReactNode } from 'react';
import { SpaceToken } from '@/theme/tokens';
export interface InputProps {
  value?: string;
  onChange?: (value: string) => void;
  placeholder?: string;
  label?: string;
  type?: 'text' | 'password' | 'email' | 'number';
  disabled?: boolean;
}
export const Input = (props: InputProps) => <input placeholder={props.placeholder} />;
