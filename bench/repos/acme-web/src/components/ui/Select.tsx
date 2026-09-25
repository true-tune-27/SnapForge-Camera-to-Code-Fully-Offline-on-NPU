
import React from 'react';
export interface SelectProps {
  value?: string;
  onChange?: (value: string) => void;
  options?: Array<{ label: string; value: string }>;
  label?: string;
  disabled?: boolean;
}
export const Select = (props: SelectProps) => <select />;
