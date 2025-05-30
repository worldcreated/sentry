import {Component, Fragment} from 'react';
import styled from '@emotion/styled';

import {addErrorMessage, addSuccessMessage} from 'sentry/actionCreators/indicator';
import type {ModalRenderProps} from 'sentry/actionCreators/modal';
import {closeModal, openModal} from 'sentry/actionCreators/modal';
import type {Client} from 'sentry/api';
import IssueSyncListElement from 'sentry/components/issueSyncListElement';
import {TabList, Tabs} from 'sentry/components/tabs';
import {t, tct} from 'sentry/locale';
import plugins from 'sentry/plugins';
import {space} from 'sentry/styles/space';
import type {Group} from 'sentry/types/group';
import type {Plugin} from 'sentry/types/integrations';
import type {Organization} from 'sentry/types/organization';
import type {Project} from 'sentry/types/project';
import {trackAnalytics} from 'sentry/utils/analytics';
import {getAnalyticsDataForGroup} from 'sentry/utils/events';
import withApi from 'sentry/utils/withApi';
import withOrganization from 'sentry/utils/withOrganization';

type PluginIssue = {
  issue_id: string;
  label: string;
  url: string;
};

export type TitledPlugin = Plugin & {
  // issue serializer adds more fields
  // TODO: should be able to use name instead of title
  title: string;
};

type Props = {
  api: Client;
  group: Group;
  organization: Organization;
  plugin: TitledPlugin;
  project: Project;
};

type State = {
  issue: PluginIssue | null;
  pluginLoading: boolean;
};

export function openPluginActionModal({
  project,
  group,
  organization,
  plugin,
  onModalClose,
}: {
  group: Group;
  onModalClose: (data?: any) => void;
  organization: Organization;
  plugin: TitledPlugin;
  project: Project;
}) {
  trackAnalytics('issue_details.external_issue_modal_opened', {
    organization,
    ...getAnalyticsDataForGroup(group),
    external_issue_provider: plugin.slug,
    external_issue_type: 'plugin',
  });

  openModal(
    deps => (
      <PluginActionsModal
        {...deps}
        project={project}
        group={group}
        organization={organization}
        plugin={plugin}
        onSuccess={onModalClose}
      />
    ),
    {onClose: onModalClose}
  );
}

class PluginActions extends Component<Props, State> {
  state: State = {
    issue: null,
    pluginLoading: false,
  };

  componentDidMount() {
    this.loadPlugin(this.props.plugin);
  }

  componentDidUpdate(prevProps: Props) {
    if (this.props.plugin.id !== prevProps.plugin.id) {
      this.loadPlugin(this.props.plugin);
    }
  }

  deleteIssue = () => {
    const plugin = {
      ...this.props.plugin,
      issue: null,
    };
    // override plugin.issue so that 'create/link' Modal
    // doesn't think the plugin still has an issue linked
    const endpoint = `/issues/${this.props.group.id}/plugins/${plugin.slug}/unlink/`;
    this.props.api.request(endpoint, {
      success: () => {
        this.loadPlugin(plugin);
        addSuccessMessage(t('Successfully unlinked issue.'));
      },
      error: () => {
        addErrorMessage(t('Unable to unlink issue'));
      },
    });
  };

  loadPlugin = (data: any) => {
    this.setState(
      {
        pluginLoading: true,
      },
      () => {
        plugins.load(data, () => {
          const issue = data.issue || null;
          this.setState({pluginLoading: false, issue});
        });
      }
    );
  };

  handleModalClose = (data?: any) => {
    this.setState({
      issue:
        data?.id && data?.link
          ? {issue_id: data.id, url: data.link, label: data.label}
          : null,
    });
    closeModal();
  };

  openModal = () => {
    const {project, group, organization, plugin} = this.props;

    openPluginActionModal({
      project,
      group,
      organization,
      plugin,
      onModalClose: this.handleModalClose,
    });
  };

  render() {
    const {issue} = this.state;
    const plugin = {...this.props.plugin, issue};

    return (
      <IssueSyncListElement
        onOpen={this.openModal}
        externalIssueDisplayName={issue ? issue.label : null}
        externalIssueId={issue ? issue.issue_id : null}
        externalIssueLink={issue ? issue.url : null}
        onClose={this.deleteIssue}
        integrationType={plugin.id}
      />
    );
  }
}

type ModalProps = ModalRenderProps & {
  group: Group;
  onSuccess: (data: any) => void;
  organization: Organization;
  plugin: TitledPlugin;
  project: Project;
};

type ModalState = {
  actionType: 'create' | 'link' | null;
};

class PluginActionsModal extends Component<ModalProps, ModalState> {
  state: ModalState = {
    actionType: 'create',
  };

  render() {
    const {Header, Body, group, project, organization, plugin, onSuccess} = this.props;
    const {actionType} = this.state;

    return (
      <Fragment>
        <Header closeButton>
          <h4>{tct('[name] Issue', {name: plugin.name || plugin.title})}</h4>
        </Header>

        <TabsContainer>
          <Tabs
            value={this.state.actionType ?? 'create'}
            onChange={key => this.setState({actionType: key})}
          >
            <TabList>
              <TabList.Item key="create">{t('Create')}</TabList.Item>
              <TabList.Item key="link">{t('Link')}</TabList.Item>
            </TabList>
          </Tabs>
        </TabsContainer>

        {actionType && (
          // need the key here so React will re-render
          // with new action prop
          <Body key={actionType}>
            {plugins.get(plugin).renderGroupActions({
              plugin,
              group,
              project,
              organization,
              actionType,
              onSuccess: (...args) => {
                onSuccess(...args);
                this.props.closeModal();
              },
            })}
          </Body>
        )}
      </Fragment>
    );
  }
}

const TabsContainer = styled('div')`
  margin-bottom: ${space(2)};
`;

export default withApi(withOrganization(PluginActions));
