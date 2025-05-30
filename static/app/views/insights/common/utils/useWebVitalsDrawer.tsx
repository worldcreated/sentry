import {useCallback} from 'react';

import useDrawer from 'sentry/components/globalDrawer';
import {t} from 'sentry/locale';
import type {WebVitals} from 'sentry/views/insights/browser/webVitals/types';

interface UseWebVitalsDrawerProps {
  Component: React.ReactNode;
  onClose: () => void;
  webVital: WebVitals | null;
}

export function useWebVitalsDrawer({
  Component,
  webVital,
  onClose,
}: UseWebVitalsDrawerProps) {
  const {openDrawer, isDrawerOpen} = useDrawer();

  const openVitalsDrawer = useCallback(() => {
    if (!webVital || isDrawerOpen) {
      return;
    }

    openDrawer(() => Component, {
      ariaLabel: t('%s Details', webVital),
      onClose,
    });
  }, [openDrawer, isDrawerOpen, onClose, Component, webVital]);

  return {openVitalsDrawer};
}
