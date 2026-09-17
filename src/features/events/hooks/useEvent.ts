import { useContext } from 'react';
import { EventContext, EventContextType } from '../context/EventContext';

export const useEvent = (): EventContextType => {
  const context = useContext(EventContext);
  if (!context) {
    throw new Error('useEvent must be used within an EventProvider');
  }
  return context;
};
