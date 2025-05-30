import type {Theme} from '@emotion/react';
import {PlatformIcon} from 'platformicons';

import {t} from 'sentry/locale';
import {isEAPErrorNode} from 'sentry/views/performance/newTraceDetails/traceGuards';
import {TraceIcons} from 'sentry/views/performance/newTraceDetails/traceIcons';
import type {TraceTree} from 'sentry/views/performance/newTraceDetails/traceModels/traceTree';
import type {TraceTreeNode} from 'sentry/views/performance/newTraceDetails/traceModels/traceTreeNode';
import {InvisibleTraceBar} from 'sentry/views/performance/newTraceDetails/traceRow/traceBar';
import {
  maybeFocusTraceRow,
  TraceRowConnectors,
  type TraceRowProps,
} from 'sentry/views/performance/newTraceDetails/traceRow/traceRow';

const ERROR_LEVEL_LABELS: Record<keyof Theme['level'], string> = {
  sample: t('Sample'),
  info: t('Info'),
  warning: t('Warning'),
  // Hardcoded legacy color (orange400). We no longer use orange anywhere
  // else in the app (except for the chart palette). This needs to be harcoded
  // here because existing users may still associate orange with the "error" level.
  error: t('Error'),
  fatal: t('Fatal'),
  default: t('Default'),
  unknown: t('Unknown'),
};

export function TraceErrorRow(
  props: TraceRowProps<
    TraceTreeNode<TraceTree.TraceError> | TraceTreeNode<TraceTree.EAPError>
  >
) {
  const description = isEAPErrorNode(props.node)
    ? props.node.value.description
    : (props.node.value.title ?? props.node.value.message);
  const timestamp = isEAPErrorNode(props.node)
    ? props.node.value.start_timestamp
    : props.node.value.timestamp;
  return (
    <div
      key={props.index}
      ref={r =>
        props.tabIndex === 0
          ? maybeFocusTraceRow(r, props.node, props.previouslyFocusedNodeRef)
          : undefined
      }
      tabIndex={props.tabIndex}
      className={`TraceRow ${props.rowSearchClassName} ${props.node.maxIssueSeverity}`}
      onPointerDown={props.onRowClick}
      onKeyDown={props.onRowKeyDown}
      style={props.style}
    >
      <div
        className="TraceLeftColumn"
        ref={props.registerListColumnRef}
        onDoubleClick={props.onRowDoubleClick}
      >
        <div className="TraceLeftColumnInner" style={props.listColumnStyle}>
          <div className="TraceChildrenCountWrapper">
            <TraceRowConnectors node={props.node} manager={props.manager} />{' '}
          </div>
          <PlatformIcon
            platform={props.projects[props.node.value.project_slug] ?? 'default'}
          />
          <span className="TraceOperation">
            {ERROR_LEVEL_LABELS[props.node.value.level ?? 'error']}
          </span>
          <strong className="TraceEmDash"> — </strong>
          <span className="TraceDescription">{description}</span>
        </div>
      </div>
      <div
        ref={props.registerSpanColumnRef}
        className={props.spanColumnClassName}
        onDoubleClick={props.onRowDoubleClick}
      >
        <InvisibleTraceBar
          node_space={props.node.space}
          manager={props.manager}
          virtualizedIndex={props.virtualized_index}
        >
          {typeof timestamp === 'number' ? (
            <div className={`TraceIcon ${props.node.value.level}`}>
              <TraceIcons.Icon event={props.node.value} />
            </div>
          ) : null}
        </InvisibleTraceBar>
      </div>
    </div>
  );
}
