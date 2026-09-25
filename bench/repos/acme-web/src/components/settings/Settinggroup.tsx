
import React, { ReactNode } from 'react';
export interface SettingGroupProps {
  title?: string;
  children?: ReactNode;
}
export default function SettingGroup(props: SettingGroupProps) {
  return <div>{props.children}</div>;
}
