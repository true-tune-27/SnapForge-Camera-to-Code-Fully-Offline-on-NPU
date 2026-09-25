
import React from 'react';
export interface SliderProps {
  value?: number;
  onChange?: (value: number) => void;
  min?: number;
  max?: number;
  step?: number;
  label?: string;
}
export const Slider = (props: SliderProps) => <div>{props.label}</div>;
