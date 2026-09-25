
import React from 'react';
export interface CheckboxProps {
  checked?: boolean;
  onChange?: (checked: boolean) => void;
  label?: string;
  disabled?: boolean;
}
export const Checkbox = (props: CheckboxProps) => <input type="checkbox" />;
