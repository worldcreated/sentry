import ExternalLink from 'sentry/components/links/externalLink';
import List from 'sentry/components/list/';
import ListItem from 'sentry/components/list/listItem';
import {StepType} from 'sentry/components/onboarding/gettingStartedDoc/step';
import type {
  BasePlatformOptions,
  Docs,
  DocsParams,
  OnboardingConfig,
} from 'sentry/components/onboarding/gettingStartedDoc/types';
import {
  getReplayMobileConfigureDescription,
  getReplayVerifyStep,
} from 'sentry/components/onboarding/gettingStartedDoc/utils/replayOnboarding';
import {appleFeedbackOnboarding} from 'sentry/gettingStartedDocs/apple/macos';
import {t, tct} from 'sentry/locale';
import {appleProfilingOnboarding} from 'sentry/utils/gettingStartedDocs/apple';
import {getPackageVersion} from 'sentry/utils/gettingStartedDocs/getPackageVersion';
import {getWizardInstallSnippet} from 'sentry/utils/gettingStartedDocs/mobileWizard';

export enum InstallationMode {
  AUTO = 'auto',
  MANUAL = 'manual',
}

const platformOptions = {
  installationMode: {
    label: t('Installation Mode'),
    items: [
      {
        label: t('Auto'),
        value: InstallationMode.AUTO,
      },
      {
        label: t('Manual'),
        value: InstallationMode.MANUAL,
      },
    ],
    defaultValue: InstallationMode.AUTO,
  },
} satisfies BasePlatformOptions;

type PlatformOptions = typeof platformOptions;
type Params = DocsParams<PlatformOptions>;

const isAutoInstall = (params: Params) =>
  params.platformOptions.installationMode === InstallationMode.AUTO;

const getManualInstallSnippet = (params: Params) => `
.package(url: "https://github.com/getsentry/sentry-cocoa", from: "${getPackageVersion(
  params,
  'sentry.cocoa',
  '8.49.0'
)}"),`;

const getConfigurationSnippet = (params: Params) => `
import Sentry

// ....

func application(_ application: UIApplication,
    didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey: Any]?) -> Bool {

    SentrySDK.start { options in
        options.dsn = "${params.dsn.public}"
        options.debug = true // Enabling debug when first installing is always helpful

        // Adds IP for users.
        // For more information, visit: https://docs.sentry.io/platforms/apple/data-management/data-collected/
        options.sendDefaultPii = true${
          params.isPerformanceSelected
            ? `

        // Set tracesSampleRate to 1.0 to capture 100% of transactions for tracing.
        // We recommend adjusting this value in production.
        options.tracesSampleRate = 1.0`
            : ''
        }${
          params.isProfilingSelected &&
          params.profilingOptions?.defaultProfilingMode !== 'continuous'
            ? `

        // Sample rate for profiling, applied on top of TracesSampleRate.
        // We recommend adjusting this value in production.
        options.profilesSampleRate = 1.0`
            : params.isProfilingSelected &&
                params.profilingOptions?.defaultProfilingMode === 'continuous'
              ? `

        // Configure the profiler to start profiling when there is an active root span
        // For more information, visit: https://docs.sentry.io/platforms/apple/profiling/
        options.configureProfiling = {
            $0.lifecycle = .trace
            $0.sessionSampleRate = 1.0
        }`
              : ''
        }${
          params.isReplaySelected
            ? `

        // Record Session Replays for 100% of Errors and 10% of Sessions
        options.sessionReplay.onErrorSampleRate = 1.0
        options.sessionReplay.sessionSampleRate = 0.1`
            : ''
        }
    }

    return true
}`;

const getConfigurationSnippetSwiftUi = (params: Params) => `
import Sentry

@main
struct SwiftUIApp: App {
    init() {
        SentrySDK.start { options in
            options.dsn = "${params.dsn.public}"
            options.debug = true // Enabling debug when first installing is always helpful

            // Adds IP for users.
            // For more information, visit: https://docs.sentry.io/platforms/apple/data-management/data-collected/
            options.sendDefaultPii = true${
              params.isPerformanceSelected
                ? `

            // Set tracesSampleRate to 1.0 to capture 100% of transactions for tracing.
            // We recommend adjusting this value in production.
            options.tracesSampleRate = 1.0`
                : ''
            }${
              params.isProfilingSelected &&
              params.profilingOptions?.defaultProfilingMode !== 'continuous'
                ? `

            // Sample rate for profiling, applied on top of TracesSampleRate.
            // We recommend adjusting this value in production.
            options.profilesSampleRate = 1.0`
                : params.isProfilingSelected &&
                    params.profilingOptions?.defaultProfilingMode === 'continuous'
                  ? `

            // Configure the profiler to start profiling when there is an active root span
            // For more information, visit: https://docs.sentry.io/platforms/apple/profiling/
            options.configureProfiling = {
                $0.lifecycle = .trace
                $0.sessionSampleRate = 1.0
            }`
                  : ''
            }${
              params.isReplaySelected
                ? `

            // Record Session Replays for 100% of Errors and 10% of Sessions
            options.sessionReplay.onErrorSampleRate = 1.0
            options.sessionReplay.sessionSampleRate = 0.1`
                : ''
            }
        }
    }
}`;

const getVerifySnippet = () => `
let button = UIButton(type: .roundedRect)
button.frame = CGRect(x: 20, y: 50, width: 100, height: 30)
button.setTitle("Break the world", for: [])
button.addTarget(self, action: #selector(self.breakTheWorld(_:)), for: .touchUpInside)
view.addSubview(button)

@IBAction func breakTheWorld(_ sender: AnyObject) {
    fatalError("Break the world")
}`;

const getReplaySetupSnippet = (params: Params) => `
SentrySDK.start(configureOptions: { options in
  options.dsn = "${params.dsn.public}"
  options.debug = true

  options.sessionReplay.onErrorSampleRate = 1.0
  options.sessionReplay.sessionSampleRate = 0.1
})`;

const getReplayConfigurationSnippet = () => `
options.sessionReplay.maskAllText = true
options.sessionReplay.maskAllImages = true`;

const onboarding: OnboardingConfig<PlatformOptions> = {
  install: params =>
    isAutoInstall(params)
      ? [
          {
            type: StepType.INSTALL,
            description: (
              <p>
                {tct(
                  'Add Sentry automatically to your app with the [wizardLink:Sentry wizard] (call this inside your project directory).',
                  {
                    wizardLink: (
                      <ExternalLink href="https://docs.sentry.io/platforms/apple/guides/ios/#install" />
                    ),
                  }
                )}
              </p>
            ),
            configurations: [
              {
                code: getWizardInstallSnippet({
                  platform: 'ios',
                  params,
                }),
              },
            ],
          },
        ]
      : [
          {
            type: StepType.INSTALL,
            description: tct(
              'We recommend installing the SDK with Swift Package Manager (SPM), but we also support [alternateMethods: alternate installation methods]. To integrate Sentry into your Xcode project using SPM, open your App in Xcode and open [addPackage: File > Add Packages]. Then add the SDK by entering the Git repo url in the top right search field:',
              {
                alternateMethods: (
                  <ExternalLink href="https://docs.sentry.io/platforms/apple/install/" />
                ),
                addPackage: <strong />,
              }
            ),
            configurations: [
              {
                language: 'url',
                code: `https://github.com/getsentry/sentry-cocoa.git`,
              },
              {
                description: (
                  <p>
                    {tct(
                      'Alternatively, when your project uses a [packageSwift: Package.swift] file to manage dependencies, you can specify the target with:',
                      {
                        packageSwift: <code />,
                      }
                    )}
                  </p>
                ),
                language: 'swift',
                partialLoading: params.sourcePackageRegistries.isLoading,
                code: getManualInstallSnippet(params),
              },
            ],
          },
        ],
  configure: params =>
    isAutoInstall(params)
      ? [
          {
            type: StepType.CONFIGURE,
            description: (
              <p>{t('The Sentry wizard will automatically patch your application:')}</p>
            ),
            configurations: [
              {
                description: (
                  <List symbol="bullet">
                    <ListItem>
                      {t('Install the Sentry SDK via Swift Package Manager or Cocoapods')}
                    </ListItem>
                    <ListItem>
                      {tct(
                        'Update your [appDelegate: AppDelegate] or SwiftUI App Initializer with the default Sentry configuration and an example error',
                        {
                          appDelegate: <code />,
                        }
                      )}
                    </ListItem>
                    <ListItem>
                      {tct(
                        'Add a new [code: Upload Debug Symbols] phase to your [code: xcodebuild] build script',
                        {
                          code: <code />,
                        }
                      )}
                    </ListItem>
                    <ListItem>
                      {tct(
                        'Create [code: .sentryclirc] with an auth token to upload debug symbols (this file is automatically added to [code: .gitignore])',
                        {
                          code: <code />,
                        }
                      )}
                    </ListItem>
                    <ListItem>
                      {t(
                        "When you're using Fastlane, it will add a Sentry lane for uploading debug symbols"
                      )}
                    </ListItem>
                  </List>
                ),
              },
            ],
          },
        ]
      : [
          {
            type: StepType.CONFIGURE,
            description: (
              <p>
                {tct(
                  'Make sure you initialize the SDK as soon as possible in your application lifecycle e.g. in your [appDelegate:] method:',
                  {
                    appDelegate: (
                      <code>
                        - [UIAppDelegate application:didFinishLaunchingWithOptions:]
                      </code>
                    ),
                  }
                )}
              </p>
            ),
            configurations: [
              {
                language: 'swift',
                code: getConfigurationSnippet(params),
              },
              {
                description: (
                  <p>
                    {tct(
                      "When using SwiftUI and your app doesn't implement an app delegate, initialize the SDK within the [initializer: App conformer's initializer]:",
                      {
                        initializer: (
                          <ExternalLink href="https://developer.apple.com/documentation/swiftui/app/main()" />
                        ),
                      }
                    )}
                  </p>
                ),
                language: 'swift',
                code: getConfigurationSnippetSwiftUi(params),
              },
            ],
          },
        ],
  verify: params =>
    isAutoInstall(params)
      ? [
          {
            type: StepType.VERIFY,
            description: t(
              'The Sentry wizard automatically adds a code snippet that captures a message to your project. Simply run your app and you should see this message in your Sentry project.'
            ),
          },
        ]
      : [
          {
            type: StepType.VERIFY,
            description: (
              <p>
                {tct(
                  'This snippet contains an intentional error you can use to test that errors are uploaded to Sentry correctly. You can add it to your main [viewController: ViewController].',
                  {
                    viewController: <code />,
                  }
                )}
              </p>
            ),
            configurations: [
              {
                language: 'swift',
                code: getVerifySnippet(),
              },
            ],
          },
        ],
  nextSteps: () => [
    {
      id: 'cocoapods-carthage',
      name: t('CocoaPods/Carthage'),
      description: t(
        'Learn about integrating Sentry into your project using CocoaPods or Carthage.'
      ),
      link: 'https://docs.sentry.io/platforms/apple/install/',
    },
    {
      id: 'debug-symbols',
      name: t('Debug Symbols'),
      description: t('Symbolicate and get readable stacktraces in your Sentry errors.'),
      link: 'https://docs.sentry.io/platforms/apple/dsym/',
    },
    {
      id: 'swiftui',
      name: t('SwiftUI'),
      description: t('Learn about our first class integration with SwiftUI.'),
      link: 'https://docs.sentry.io/platforms/apple/tracing/instrumentation/swiftui-instrumentation/',
    },
  ],
};

const replayOnboarding: OnboardingConfig<PlatformOptions> = {
  install: (params: Params) => [
    {
      type: StepType.INSTALL,
      description: t(
        'Make sure your Sentry Cocoa SDK version is at least 8.43.0. If you already have the SDK installed, you can update it to the latest version with:'
      ),
      configurations: [
        {
          code: [
            {
              label: 'SPM',
              value: 'spm',
              language: 'swift',
              code: `.package(url: "https://github.com/getsentry/sentry-cocoa", from: "${getPackageVersion(
                params,
                'sentry.cocoa',
                '8.36.0'
              )}"),`,
            },
            {
              label: 'CocoaPods',
              value: 'cocoapods',
              language: 'ruby',
              code: `pod update`,
            },
            {
              label: 'Carthage',
              value: 'carthage',
              language: 'swift',
              code: `github "getsentry/sentry-cocoa" "${getPackageVersion(
                params,
                'sentry.cocoa',
                '8.36.0'
              )}"`,
            },
          ],
        },
        {
          description: t(
            'To set up the integration, add the following to your Sentry initialization:'
          ),
        },
        {
          code: [
            {
              label: 'Swift',
              value: 'swift',
              language: 'swift',
              code: getReplaySetupSnippet(params),
            },
          ],
        },
      ],
    },
  ],
  configure: () => [
    {
      type: StepType.CONFIGURE,
      description: getReplayMobileConfigureDescription({
        link: 'https://docs.sentry.io/platforms/apple/guides/ios/session-replay/#privacy',
      }),
      configurations: [
        {
          description: t(
            'The following code is the default configuration, which masks and blocks everything.'
          ),
          code: [
            {
              label: 'Swift',
              value: 'swift',
              language: 'swift',
              code: getReplayConfigurationSnippet(),
            },
          ],
        },
      ],
    },
  ],
  verify: getReplayVerifyStep({
    replayOnErrorSampleRateName: 'options\u200b.sessionReplay\u200b.onErrorSampleRate',
    replaySessionSampleRateName: 'options\u200b.sessionReplay\u200b.sessionSampleRate',
  }),
  nextSteps: () => [],
};

const docs: Docs<PlatformOptions> = {
  onboarding,
  feedbackOnboardingCrashApi: appleFeedbackOnboarding,
  crashReportOnboarding: appleFeedbackOnboarding,
  platformOptions,
  replayOnboarding,
  profilingOnboarding: appleProfilingOnboarding,
};

export default docs;
