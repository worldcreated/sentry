import {render, waitFor} from 'sentry-test/reactTestingLibrary';

import EventView from 'sentry/utils/discover/eventView';
import SuspectSpansQuery from 'sentry/utils/performance/suspectSpans/suspectSpansQuery';
import {
  SpanSortOthers,
  SpanSortPercentiles,
} from 'sentry/views/performance/transactionSummary/transactionSpans/types';

describe('SuspectSpansQuery', function () {
  let eventView: any, location: any;
  beforeEach(function () {
    eventView = EventView.fromSavedQuery({
      id: '',
      name: '',
      version: 2,
      fields: [...Object.values(SpanSortOthers), ...Object.values(SpanSortPercentiles)],
      projects: [],
      environment: [],
    });
    location = {
      pathname: '/',
      query: {},
    };
  });

  it('fetches data on mount', async function () {
    const getMock = MockApiClient.addMockResponse({
      url: '/organizations/test-org/events-spans-performance/',
      // just asserting that the data is being fetched, no need for actual data here
      body: [],
    });

    render(
      <SuspectSpansQuery
        location={location}
        orgSlug="test-org"
        eventView={eventView}
        spanOps={[]}
      >
        {() => null}
      </SuspectSpansQuery>
    );

    await waitFor(() => expect(getMock).toHaveBeenCalledTimes(1));
  });

  it('fetches data with the right op filter', async function () {
    const getMock = MockApiClient.addMockResponse({
      url: '/organizations/test-org/events-spans-performance/',
      // just asserting that the data is being fetched, no need for actual data here
      body: [],
      match: [MockApiClient.matchQuery({spanOp: ['op1']})],
    });

    render(
      <SuspectSpansQuery
        location={location}
        orgSlug="test-org"
        eventView={eventView}
        spanOps={['op1']}
      >
        {() => null}
      </SuspectSpansQuery>
    );

    await waitFor(() => expect(getMock).toHaveBeenCalledTimes(1));
  });

  it('fetches data with the right group filter', async function () {
    const getMock = MockApiClient.addMockResponse({
      url: '/organizations/test-org/events-spans-performance/',
      // just asserting that the data is being fetched, no need for actual data here
      body: [],
      match: [MockApiClient.matchQuery({spanGroup: ['aaaaaaaaaaaaaaaa']})],
    });

    render(
      <SuspectSpansQuery
        location={location}
        orgSlug="test-org"
        eventView={eventView}
        spanGroups={['aaaaaaaaaaaaaaaa']}
      >
        {() => null}
      </SuspectSpansQuery>
    );

    await waitFor(() => expect(getMock).toHaveBeenCalledTimes(1));
  });

  it('fetches data with the right per suspect param', async function () {
    const getMock = MockApiClient.addMockResponse({
      url: '/organizations/test-org/events-spans-performance/',
      // just asserting that the data is being fetched, no need for actual data here
      body: [],
      match: [MockApiClient.matchQuery({perSuspect: 1})],
    });

    render(
      <SuspectSpansQuery
        location={location}
        orgSlug="test-org"
        eventView={eventView}
        perSuspect={1}
      >
        {() => null}
      </SuspectSpansQuery>
    );

    await waitFor(() => expect(getMock).toHaveBeenCalledTimes(1));
  });
});
