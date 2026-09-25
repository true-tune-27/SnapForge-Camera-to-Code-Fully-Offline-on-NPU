
import React from 'react';
export interface RadioProps {
  value?: string;
  checked?: boolean;
  onChange?: (value: string) => void;
  label?: string;
  name?: string;
}
export const Radio = (props: RadioProps) => <input type="radio" />;
