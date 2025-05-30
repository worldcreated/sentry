import {AnnotatedText} from 'sentry/components/events/meta/annotatedText';
import type {getMeta} from 'sentry/components/events/meta/metaProxy';
import {t} from 'sentry/locale';
import type {Frame} from 'sentry/types/event';

type Props = {
  frame: Frame;
  className?: string;
  hasHiddenDetails?: boolean;
  meta?: Record<any, any>;
  showCompleteFunctionName?: boolean;
};

export function FunctionName({
  frame,
  showCompleteFunctionName,
  hasHiddenDetails,
  className,
  meta,
  ...props
}: Props) {
  const getValueOutput = ():
    | {meta: ReturnType<typeof getMeta>; value: Frame['function']}
    | undefined => {
    if (hasHiddenDetails && showCompleteFunctionName && frame.rawFunction) {
      return {
        value: frame.rawFunction,
        meta: meta?.rawFunction?.[''],
      };
    }

    if (frame.function) {
      return {
        value: frame.function,
        meta: meta?.function?.[''],
      };
    }

    if (frame.rawFunction) {
      return {
        value: frame.rawFunction,
        meta: meta?.rawFunction?.[''],
      };
    }

    return undefined;
  };

  const valueOutput = getValueOutput();

  return (
    <code className={className} {...props}>
      {valueOutput ? (
        <AnnotatedText value={valueOutput.value} meta={valueOutput.meta} />
      ) : (
        t('<unknown>')
      )}
    </code>
  );
}
