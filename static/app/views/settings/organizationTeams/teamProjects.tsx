import {Fragment, useMemo, useState} from 'react';
import styled from '@emotion/styled';

import {addErrorMessage, addSuccessMessage} from 'sentry/actionCreators/indicator';
import {hasEveryAccess} from 'sentry/components/acl/access';
import {ProjectAvatar} from 'sentry/components/core/avatar/projectAvatar';
import {Button} from 'sentry/components/core/button';
import {Tooltip} from 'sentry/components/core/tooltip';
import DropdownAutoComplete from 'sentry/components/dropdownAutoComplete';
import DropdownButton from 'sentry/components/dropdownButton';
import EmptyMessage from 'sentry/components/emptyMessage';
import LoadingError from 'sentry/components/loadingError';
import LoadingIndicator from 'sentry/components/loadingIndicator';
import Pagination from 'sentry/components/pagination';
import Panel from 'sentry/components/panels/panel';
import PanelBody from 'sentry/components/panels/panelBody';
import PanelHeader from 'sentry/components/panels/panelHeader';
import PanelItem from 'sentry/components/panels/panelItem';
import TextOverflow from 'sentry/components/textOverflow';
import {IconFlag, IconSubtract} from 'sentry/icons';
import {t} from 'sentry/locale';
import ProjectsStore from 'sentry/stores/projectsStore';
import {space} from 'sentry/styles/space';
import type {RouteComponentProps} from 'sentry/types/legacyReactRouter';
import type {Team} from 'sentry/types/organization';
import type {Project} from 'sentry/types/project';
import {sortProjects} from 'sentry/utils/project/sortProjects';
import {useApiQuery} from 'sentry/utils/queryClient';
import useApi from 'sentry/utils/useApi';
import useOrganization from 'sentry/utils/useOrganization';
import ProjectListItem from 'sentry/views/settings/components/settingsProjectItem';
import TextBlock from 'sentry/views/settings/components/text/textBlock';

interface TeamProjectsProps extends RouteComponentProps<{teamId: string}> {
  team: Team;
}

function TeamProjects({team, location, params}: TeamProjectsProps) {
  const organization = useOrganization();
  const api = useApi({persistInFlight: true});
  const [query, setQuery] = useState<string>('');
  const teamId = params.teamId;
  const {
    data: linkedProjects,
    isError: linkedProjectsError,
    isPending: linkedProjectsLoading,
    getResponseHeader: linkedProjectsHeaders,
    refetch: refetchLinkedProjects,
  } = useApiQuery<Project[]>(
    [
      `/organizations/${organization.slug}/projects/`,
      {
        query: {
          query: `team:${teamId}`,
          cursor: location.query.cursor,
        },
      },
    ],
    {staleTime: 0}
  );
  const {
    data: unlinkedProjects = [],
    isPending: loadingUnlinkedProjects,
    refetch: refetchUnlinkedProjects,
  } = useApiQuery<Project[]>(
    [
      `/organizations/${organization.slug}/projects/`,
      {
        query: {query: query ? `!team:${teamId} ${query}` : `!team:${teamId}`},
      },
    ],
    {staleTime: 0}
  );

  const handleLinkProject = (project: Project, action: string) => {
    api.request(`/projects/${organization.slug}/${project.slug}/teams/${teamId}/`, {
      method: action === 'add' ? 'POST' : 'DELETE',
      success: resp => {
        refetchLinkedProjects();
        refetchUnlinkedProjects();
        ProjectsStore.onUpdateSuccess(resp);
        addSuccessMessage(
          action === 'add'
            ? t('Successfully added project to team.')
            : t('Successfully removed project from team')
        );
      },
      error: () => {
        addErrorMessage(t("Wasn't able to change project association."));
      },
    });
  };

  const linkedProjectsPageLinks = linkedProjectsHeaders?.('Link');
  const hasWriteAccess = hasEveryAccess(['team:write'], {organization, team});
  const otherProjects = useMemo(() => {
    return unlinkedProjects
      .filter(p => p.access.includes('project:write'))
      .map(p => ({
        value: p.id,
        searchKey: p.slug,
        label: (
          <ProjectListElement>
            <ProjectAvatar project={p} size={16} />
            <TextOverflow>{p.slug}</TextOverflow>
          </ProjectListElement>
        ),
      }));
  }, [unlinkedProjects]);

  return (
    <Fragment>
      <TextBlock>
        {t(
          'If you have Team Admin permissions for other projects, you can associate them with this team.'
        )}
      </TextBlock>
      <Panel>
        <PanelHeader hasButtons>
          <div>{t('Projects')}</div>
          <div style={{textTransform: 'none', fontWeight: 'normal'}}>
            <DropdownAutoComplete
              items={otherProjects}
              minWidth={300}
              onChange={evt => setQuery(evt.target.value)}
              onSelect={selection => {
                const project = unlinkedProjects.find(p => p.id === selection.value);
                if (project) {
                  handleLinkProject(project, 'add');
                }
              }}
              onClose={() => setQuery('')}
              busy={loadingUnlinkedProjects}
              emptyMessage={t('You are not an admin for any other projects')}
              alignMenu="right"
            >
              {({isOpen}) => (
                <DropdownButton isOpen={isOpen} size="xs">
                  {t('Add Project')}
                </DropdownButton>
              )}
            </DropdownAutoComplete>
          </div>
        </PanelHeader>

        <PanelBody>
          {linkedProjectsError && (
            <LoadingError onRetry={() => refetchLinkedProjects()} />
          )}
          {linkedProjectsLoading && <LoadingIndicator />}
          {linkedProjects?.length ? (
            sortProjects(linkedProjects).map(project => (
              <StyledPanelItem key={project.id}>
                <ProjectListItem project={project} organization={organization} />
                <Tooltip
                  disabled={hasWriteAccess}
                  title={t(
                    'You do not have enough permission to change project association.'
                  )}
                >
                  <Button
                    size="sm"
                    disabled={!hasWriteAccess}
                    icon={<IconSubtract isCircled />}
                    aria-label={t('Remove')}
                    onClick={() => {
                      handleLinkProject(project, 'remove');
                    }}
                  >
                    {t('Remove')}
                  </Button>
                </Tooltip>
              </StyledPanelItem>
            ))
          ) : linkedProjectsLoading ? null : (
            <EmptyMessage size="large" icon={<IconFlag size="xl" />}>
              {t("This team doesn't have access to any projects.")}
            </EmptyMessage>
          )}
        </PanelBody>
      </Panel>
      <Pagination pageLinks={linkedProjectsPageLinks} />
    </Fragment>
  );
}

const StyledPanelItem = styled(PanelItem)`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: ${space(2)};
  max-width: 100%;
`;

const ProjectListElement = styled('div')`
  display: flex;
  align-items: center;
  gap: ${space(0.5)};
  padding: ${space(0.25)} 0;
`;

export default TeamProjects;
