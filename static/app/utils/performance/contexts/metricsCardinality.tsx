import type {ComponentProps, ReactNode} from 'react';
import {Fragment, useEffect} from 'react';
import type {Location} from 'history';

import type {Organization} from 'sentry/types/organization';
import {trackAnalytics} from 'sentry/utils/analytics';
import EventView from 'sentry/utils/discover/eventView';
import {DiscoverDatasets} from 'sentry/utils/discover/types';
import {parsePeriodToHours} from 'sentry/utils/duration/parsePeriodToHours';
import {canUseMetricsData} from 'sentry/utils/performance/contexts/metricsEnhancedSetting';
import type {MetricsCompatibilityData} from 'sentry/utils/performance/metricsEnhanced/metricsCompatibilityQuery';
import MetricsCompatibilityQuery from 'sentry/utils/performance/metricsEnhanced/metricsCompatibilityQuery';
import type {MetricsCompatibilitySumData} from 'sentry/utils/performance/metricsEnhanced/metricsCompatibilityQuerySums';
import MetricsCompatibilitySumsQuery from 'sentry/utils/performance/metricsEnhanced/metricsCompatibilityQuerySums';

import {createDefinedContext} from './utils';

const UNPARAM_THRESHOLD = 0.01;
const NULL_THRESHOLD = 0.01;

export interface MetricDataSwitcherOutcome {
  forceTransactionsOnly: boolean;
  compatibleProjects?: number[];
  shouldNotifyUnnamedTransactions?: boolean;
  shouldWarnIncompatibleSDK?: boolean;
}
export interface MetricsCardinalityContext {
  isLoading: boolean;
  outcome?: MetricDataSwitcherOutcome;
}

type MergedMetricsData = MetricsCompatibilityData & MetricsCompatibilitySumData;

const [_Provider, _useContext, _Context] =
  createDefinedContext<MetricsCardinalityContext>({
    name: 'MetricsCardinalityContext',
    strict: false,
  });

/**
 * This provider determines whether the metrics data is storing performance information correctly before we
 * make dozens of requests on pages such as performance landing and dashboards.
 */
export function MetricsCardinalityProvider(props: {
  children: ReactNode;
  location: Location;
  organization: Organization;
  sendOutcomeAnalytics?: boolean;
}) {
  const isUsingMetrics = canUseMetricsData(props.organization);

  if (!isUsingMetrics) {
    return (
      <_Provider
        value={{
          isLoading: false,
          outcome: {
            forceTransactionsOnly: true,
          },
        }}
      >
        {props.children}
      </_Provider>
    );
  }

  const baseDiscoverProps = {
    location: props.location,
    orgSlug: props.organization.slug,
    cursor: '0:0:0',
  };
  const eventView = EventView.fromLocation(props.location);
  eventView.fields = [{field: 'tpm()'}];
  eventView.dataset = DiscoverDatasets.TRANSACTIONS;
  const _eventView = adjustEventViewTime(eventView);

  if (
    props.organization.features.includes(
      'performance-remove-metrics-compatibility-fallback'
    )
  ) {
    return (
      <Provider
        sendOutcomeAnalytics={props.sendOutcomeAnalytics}
        organization={props.organization}
        value={{
          isLoading: false,
          outcome: {
            forceTransactionsOnly: false,
          },
        }}
      >
        {props.children}
      </Provider>
    );
  }

  return (
    <Fragment>
      <MetricsCompatibilityQuery eventView={_eventView} {...baseDiscoverProps}>
        {compatabilityResult => (
          <MetricsCompatibilitySumsQuery eventView={_eventView} {...baseDiscoverProps}>
            {sumsResult => {
              const isLoading = compatabilityResult.isLoading || sumsResult.isLoading;
              const outcome =
                compatabilityResult.isLoading || sumsResult.isLoading
                  ? undefined
                  : getMetricsOutcome(
                      compatabilityResult.tableData && sumsResult.tableData
                        ? {
                            ...compatabilityResult.tableData,
                            ...sumsResult.tableData,
                          }
                        : null,
                      !!compatabilityResult.error && !!sumsResult.error,
                      props.organization
                    );

              return (
                <Provider
                  sendOutcomeAnalytics={props.sendOutcomeAnalytics}
                  organization={props.organization}
                  value={{
                    isLoading,
                    outcome,
                  }}
                >
                  {props.children}
                </Provider>
              );
            }}
          </MetricsCompatibilitySumsQuery>
        )}
      </MetricsCompatibilityQuery>
    </Fragment>
  );
}

function Provider(
  props: ComponentProps<typeof _Provider> & {
    organization: Organization;
    sendOutcomeAnalytics?: boolean;
  }
) {
  const fallbackFromNull = props.value.outcome?.shouldWarnIncompatibleSDK ?? false;
  const fallbackFromUnparam =
    props.value.outcome?.shouldNotifyUnnamedTransactions ?? false;
  const isOnMetrics = !props.value.outcome?.forceTransactionsOnly;
  useEffect(() => {
    if (!props.value.isLoading && props.sendOutcomeAnalytics) {
      trackAnalytics('performance_views.mep.metrics_outcome', {
        organization: props.organization,
        is_on_metrics: isOnMetrics,
        fallback_from_null: fallbackFromNull,
        fallback_from_unparam: fallbackFromUnparam,
      });
    }
  }, [
    props.organization,
    props.value.isLoading,
    isOnMetrics,
    fallbackFromUnparam,
    fallbackFromNull,
    props.sendOutcomeAnalytics,
  ]);
  return <_Provider {...props}>{props.children}</_Provider>;
}

export const useMetricsCardinalityContext = _useContext;

/**
 * Logic for picking sides of metrics vs. transactions along with the associated warnings.
 */
function getMetricsOutcome(
  dataCounts: MergedMetricsData | null,
  hasOtherFallbackCondition: boolean,
  organization: Organization
) {
  const fallbackOutcome: MetricDataSwitcherOutcome = {
    forceTransactionsOnly: true,
  };
  const successOutcome: MetricDataSwitcherOutcome = {
    forceTransactionsOnly: false,
  };
  const isOnFallbackThresolds = organization.features.includes(
    'performance-mep-bannerless-ui'
  );

  if (!dataCounts) {
    return fallbackOutcome;
  }
  const compatibleProjects = dataCounts.compatible_projects;

  if (hasOtherFallbackCondition) {
    return fallbackOutcome;
  }

  if (!dataCounts) {
    return fallbackOutcome;
  }

  if (checkNoDataFallback(dataCounts)) {
    return fallbackOutcome;
  }

  if (checkIncompatibleData(dataCounts, isOnFallbackThresolds)) {
    return {
      shouldWarnIncompatibleSDK: true,
      forceTransactionsOnly: true,
      compatibleProjects,
    };
  }

  if (checkIfAllOtherData(dataCounts)) {
    return {
      shouldNotifyUnnamedTransactions: true,
      forceTransactionsOnly: true,
      compatibleProjects,
    };
  }

  if (checkIfPartialOtherData(dataCounts, isOnFallbackThresolds)) {
    return {
      shouldNotifyUnnamedTransactions: true,
      compatibleProjects,
      forceTransactionsOnly: false,
    };
  }

  return successOutcome;
}

/**
 * Fallback if no metrics found.
 */
function checkNoDataFallback(dataCounts: MergedMetricsData) {
  const counts = normalizeCounts(dataCounts);
  return !counts.metricsCount;
}

/**
 * Fallback and warn if incompatible data found (old specific SDKs).
 */
function checkIncompatibleData(
  dataCounts: MergedMetricsData,
  isOnFallbackThresolds: boolean
) {
  const counts = normalizeCounts(dataCounts);
  if (isOnFallbackThresolds) {
    const ratio = counts.nullCount / counts.metricsCount;
    return ratio > NULL_THRESHOLD;
  }
  return counts.nullCount > 0;
}

/**
 * Fallback and warn about unnamed transactions (specific SDKs).
 */
function checkIfAllOtherData(dataCounts: MergedMetricsData) {
  const counts = normalizeCounts(dataCounts);
  return counts.unparamCount >= counts.metricsCount;
}

/**
 * Show metrics but warn about unnamed transactions.
 */
function checkIfPartialOtherData(
  dataCounts: MergedMetricsData,
  isOnFallbackThresolds: boolean
) {
  const counts = normalizeCounts(dataCounts);
  if (isOnFallbackThresolds) {
    const ratio = counts.unparamCount / counts.metricsCount;
    return ratio > UNPARAM_THRESHOLD;
  }
  return counts.unparamCount > 0;
}

/**
 * Temporary function, can be removed after API changes.
 */
function normalizeCounts({sum}: MergedMetricsData) {
  try {
    const metricsCount = Number(sum.metrics);
    const unparamCount = Number(sum.metrics_unparam);
    const nullCount = Number(sum.metrics_null);
    return {
      metricsCount,
      unparamCount,
      nullCount,
    };
  } catch (_) {
    return {
      metricsCount: 0,
      unparamCount: 0,
      nullCount: 0,
    };
  }
}

/**
 * Performance optimization to limit the amount of rows scanned before showing the landing page.
 */
function adjustEventViewTime(eventView: EventView) {
  const _eventView = eventView.clone();

  if (!_eventView.start && !_eventView.end) {
    if (_eventView.statsPeriod) {
      const periodHours = parsePeriodToHours(_eventView.statsPeriod);
      if (periodHours > 1) {
        _eventView.statsPeriod = '1h';
        _eventView.start = undefined;
        _eventView.end = undefined;
      }
    } else {
      _eventView.statsPeriod = '1h';
      _eventView.start = undefined;
      _eventView.end = undefined;
    }
  }
  return _eventView;
}
