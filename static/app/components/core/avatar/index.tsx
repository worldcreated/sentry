import * as Sentry from '@sentry/react';

import {
  ActorAvatar,
  type ActorAvatarProps,
} from 'sentry/components/core/avatar/actorAvatar';
import {
  DocIntegrationAvatar,
  type DocIntegrationAvatarProps,
} from 'sentry/components/core/avatar/docIntegrationAvatar';
import {
  OrganizationAvatar,
  type OrganizationAvatarProps,
} from 'sentry/components/core/avatar/organizationAvatar';
import {
  ProjectAvatar,
  type ProjectAvatarProps,
} from 'sentry/components/core/avatar/projectAvatar';
import {
  SentryAppAvatar,
  type SentryAppAvatarProps,
} from 'sentry/components/core/avatar/sentryAppAvatar';
import {TeamAvatar, type TeamAvatarProps} from 'sentry/components/core/avatar/teamAvatar';
import {UserAvatar, type UserAvatarProps} from 'sentry/components/core/avatar/userAvatar';

type AvatarProps =
  | ActorAvatarProps
  | UserAvatarProps
  | TeamAvatarProps
  | ProjectAvatarProps
  | OrganizationAvatarProps
  | DocIntegrationAvatarProps
  | SentryAppAvatarProps;

function Avatar({hasTooltip = false, ref, ...props}: AvatarProps) {
  const commonProps = {hasTooltip, ...props};

  // @TODO(jonas): the old code included the falsy check, I attempted to remove it, but
  // learned the hard way that it breaks tests, meaning there some type unsafety in the
  // old code and this should be kept around.
  if ('actor' in props && props.actor) {
    return <ActorAvatar actor={props.actor} {...commonProps} ref={ref} />;
  }

  if ('user' in props && props.user) {
    return <UserAvatar user={props.user} {...commonProps} ref={ref} />;
  }

  if ('team' in props && props.team) {
    return <TeamAvatar team={props.team} {...commonProps} ref={ref} />;
  }

  if ('project' in props && props.project) {
    return (
      <ProjectAvatar
        project={props.project}
        {...commonProps}
        ref={ref as React.Ref<HTMLDivElement>}
      />
    );
  }

  if ('sentryApp' in props && props.sentryApp) {
    return (
      <SentryAppAvatar
        sentryApp={props.sentryApp}
        {...commonProps}
        ref={ref as React.Ref<HTMLSpanElement>}
      />
    );
  }

  if ('docIntegration' in props && props.docIntegration) {
    return (
      <DocIntegrationAvatar
        docIntegration={props.docIntegration}
        {...commonProps}
        ref={ref as React.Ref<HTMLSpanElement>}
      />
    );
  }

  if ('organization' in props && props.organization) {
    return (
      <OrganizationAvatar
        organization={props.organization}
        {...commonProps}
        ref={ref as React.Ref<HTMLSpanElement>}
      />
    );
  }

  Sentry.captureMessage(
    'Avatar component did not receive any non nullable entity, at least one of actor, user, team, project, organization, docIntegration, or sentryApp is required'
  );

  return null;
}

export default Avatar;
