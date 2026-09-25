
import React, { ReactNode } from 'react';
export interface SettingRowProps {
  title?: string;
  children?: ReactNode;
}
export default function SettingRow(props: SettingRowProps) {
  return <div>{props.children}</div>;
}
