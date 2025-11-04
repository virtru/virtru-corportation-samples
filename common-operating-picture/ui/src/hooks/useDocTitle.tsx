import { DocumentTitle } from '@/constants';
import { useEffect } from 'react';

// todo: WIP
export function useDocTitle(title: string) {
  useEffect(() => {
    document.title = `${DocumentTitle} - ${title}`;
  }, [title]);
}
