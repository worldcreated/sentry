import type {Organization} from 'sentry/types/organization';
import {PrimaryNavGroup} from 'sentry/views/nav/types';
import getConfiguration from 'sentry/views/settings/account/navigationConfiguration';
import SettingsNavigation from 'sentry/views/settings/components/settingsNavigation';

type Props = {
  organization?: Organization;
};

function AccountSettingsNavigation({organization}: Props) {
  return (
    <SettingsNavigation
      organization={organization}
      navigationObjects={getConfiguration({organization})}
      features={new Set(organization?.features)}
      access={new Set(organization?.access)}
      primaryNavGroup={PrimaryNavGroup.SETTINGS}
    />
  );
}

export default AccountSettingsNavigation;
