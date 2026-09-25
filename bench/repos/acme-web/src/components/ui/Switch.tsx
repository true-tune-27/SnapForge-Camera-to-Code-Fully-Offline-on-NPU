
import React from 'react';
export interface SwitchProps {
  checked?: boolean;
  onChange?: (checked: boolean) => void;
  disabled?: boolean;
  label?: string;
}
export const Switch = (props: SwitchProps) => <div>{props.label}</div>;
