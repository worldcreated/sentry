import type {EventId} from 'sentry/views/settings/components/dataScrubbing/types';
import {EventIdStatus} from 'sentry/views/settings/components/dataScrubbing/types';
import {valueSuggestions} from 'sentry/views/settings/components/dataScrubbing/utils';

import {fetchFromStorage, saveToStorage} from './localStorage';

function fetchSourceGroupData() {
  const fetchedSourceGroupData = fetchFromStorage();
  if (!fetchedSourceGroupData) {
    const sourceGroupData: Parameters<typeof saveToStorage>[0] = {
      eventId: '',
      sourceSuggestions: valueSuggestions,
    };
    saveToStorage(sourceGroupData);
    return sourceGroupData;
  }
  return fetchedSourceGroupData;
}

function saveToSourceGroupData(eventId: EventId, sourceSuggestions = valueSuggestions) {
  switch (eventId.status) {
    case EventIdStatus.LOADING:
      break;
    case EventIdStatus.LOADED:
      saveToStorage({eventId: eventId.value, sourceSuggestions});
      break;
    default:
      saveToStorage({eventId: '', sourceSuggestions});
  }
}

export {fetchSourceGroupData, saveToSourceGroupData};
