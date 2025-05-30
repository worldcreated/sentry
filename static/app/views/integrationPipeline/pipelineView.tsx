import {useEffect, useState} from 'react';
import {createMemoryRouter, RouterProvider} from 'react-router-dom';

import Indicators from 'sentry/components/indicators';
import {ThemeAndStyleProvider} from 'sentry/components/themeAndStyleProvider';
import {DANGEROUS_SET_REACT_ROUTER_6_HISTORY} from 'sentry/utils/browserHistory';
import {
  DEFAULT_QUERY_CLIENT_CONFIG,
  QueryClient,
  QueryClientProvider,
} from 'sentry/utils/queryClient';
import {GithubInstallationSelect} from 'sentry/views/integrationPipeline/githubInstallationSelect';

import AwsLambdaCloudformation from './awsLambdaCloudformation';
import AwsLambdaFailureDetails from './awsLambdaFailureDetails';
import AwsLambdaFunctionSelect from './awsLambdaFunctionSelect';
import AwsLambdaProjectSelect from './awsLambdaProjectSelect';

const pipelineMapper: Record<string, [React.ComponentType<any>, string]> = {
  awsLambdaProjectSelect: [AwsLambdaProjectSelect, 'AWS Lambda Select Project'],
  awsLambdaFunctionSelect: [AwsLambdaFunctionSelect, 'AWS Lambda Select Lambdas'],
  awsLambdaCloudformation: [AwsLambdaCloudformation, 'AWS Lambda Create Cloudformation'],
  awsLambdaFailureDetails: [AwsLambdaFailureDetails, 'AWS Lambda View Failures'],
  githubInstallationSelect: [GithubInstallationSelect, 'Github Select Installation'],
};

type Props = {
  [key: string]: any;
  pipelineName: string;
};

function buildRouter(Component: React.ComponentType, props: any) {
  const router = createMemoryRouter([
    {
      path: '*',
      element: <Component {...props} props={props} />,
    },
  ]);

  DANGEROUS_SET_REACT_ROUTER_6_HISTORY(router);
  return router;
}

const queryClient = new QueryClient(DEFAULT_QUERY_CLIENT_CONFIG);

/**
 * This component is a wrapper for specific pipeline views for integrations
 */
function PipelineView({pipelineName, ...props}: Props) {
  const mapping = pipelineMapper[pipelineName];

  if (!mapping) {
    throw new Error(`Invalid pipeline name ${pipelineName}`);
  }

  const [Component, title] = mapping;

  // Set the page title
  useEffect(() => void (document.title = title), [title]);
  const [router] = useState(() => buildRouter(Component, props));

  return (
    <QueryClientProvider client={queryClient}>
      <ThemeAndStyleProvider>
        <Indicators className="indicators-container" />
        <RouterProvider router={router} />
      </ThemeAndStyleProvider>
    </QueryClientProvider>
  );
}

export default PipelineView;
