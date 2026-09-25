
import React from 'react';
export interface AvatarProps {
  src?: string;
  alt?: string;
  size?: 'sm' | 'md' | 'lg';
}
export default function Avatar(props: AvatarProps) {
  return <img src={props.src} alt={props.alt} />;
}
