import React from 'react';
import { PitchLocation } from '../../../types';
import { StrikeZoneGrid } from './StrikeZoneGrid';

export interface PitchLocationPickerProps {
  location: PitchLocation | null;
  onChange: (loc: PitchLocation | null) => void;
  size?: number;
  isMobile?: boolean;
}

export const PitchLocationPicker: React.FC<PitchLocationPickerProps> = ({
  location,
  onChange,
  size,
  isMobile = false,
}) => {
  const calculatedSize = size ?? (isMobile ? 240 : 300);

  return (
    <div className="flex flex-col items-center shrink-0">
      <StrikeZoneGrid
        location={location}
        onChange={onChange}
        size={calculatedSize}
      />
    </div>
  );
};
