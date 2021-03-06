import React from 'react';
import styled from 'styled-components';
import * as Sentry from '@sentry/react';
import { BrowserRouter as Router, Route, Redirect, Switch } from 'react-router-dom';
import { Content, Footer, Header, Layout, VarnishApp } from '@allenai/varnish/components';
import { ScrollToTopOnPageChange } from '@allenai/varnish-react-router';

import { Demos } from './tugboat/lib';
import { ErrorBoundaryView, Promised } from './tugboat/components';

import allenNlpLogo from './components/allennlp_logo.svg';
import Menu from './components/Menu';
import ModelIntro from './components/ModelIntro';
import { modelComponents, modelRedirects } from './models';
import { PaneTop } from './components/Pane';
import WaitingForPermalink from './components/WaitingForPermalink';
import { groups } from './groups';
import { ModelCards, ModelInfoList, TaskCards } from './context';
import { fetchModelInfo, fetchTaskCards, fetchModelCards } from './lib';

import './css/App.css';
import './css/fonts.css';
import './css/icons.css';
import './css/visualization-types.css';
import '@allenai/varnish/dist/theme.css';

// Sentry is a tool that captures JavaScript errors at runtime and aggregates them.
// If you need access, ask someone on the AllenNLP team.
Sentry.init({
    dsn: 'https://59686a41b9664bf2a8bbc51a602428c2@o226626.ingest.sentry.io/5599301',
    autoSessionTracking: true,
    environment: process.env.SENTRY_ENVIRONMENT || 'dev',
    release: process.env.SENTRY_RELEASE || 'none',
});

/*******************************************************************************
  <App /> Container
*******************************************************************************/

const DEFAULT_PATH = '/reading-comprehension';

const demos = Demos.load();
const demosByGroup = groups.map((g) => ({
    ...g,
    demos: demos.forGroup(g.label),
}));

/*
The App is just a react-router wrapped around the Demo component.
The design is a bit convoluted so that the same code can run
the overall demo frontend or an individual model demo.
Here's how it accomplishes that:

If you request `/` (corresponding to https://demo.allennlp.org), you will get
redirected to the default model (here, /reading-comprehension).

The overall front-end service serves all routes that look like `/<model_name>`.
When you request `/<model_name>`, you will be served the <Demo> component,
which shows some chrome, a menu, and a <SingleTaskFrame>, which the k8s ingress controller will
direct to the machine serving that specific demo. That machine may be doing *anything*, as long
as it serves its demo front-end at `/task/<model_name>`.

In particular, that machine may be also running this code,
for which the route `/task/<model_name>` serves the <SingleTaskDemo> component,
which delegates to the particular ModelComponent specified in `demo/src/models.js`.
*/
const App = () => (
    <VarnishApp layout="left-aligned">
        <Router>
            <ScrollToTopOnPageChange />
            <DemoWrapper>
                <Sentry.ErrorBoundary fallback={({ error }) => <ErrorBoundaryView error={error} />}>
                    <Promised
                        promise={() =>
                            Promise.all([fetchModelInfo(), fetchTaskCards(), fetchModelCards()])
                        }
                        deps={[]}>
                        {([infos, tasks, cards]) => (
                            <ModelInfoList.Provider value={infos}>
                                <ModelCards.Provider value={cards}>
                                    <TaskCards.Provider value={tasks}>
                                        <Switch>
                                            <Route
                                                exact
                                                path="/"
                                                render={() => <Redirect to={DEFAULT_PATH} />}
                                            />
                                            {demos.all().map(({ config, Component }) => (
                                                <Route key={config.path} path={config.path}>
                                                    <Sentry.ErrorBoundary
                                                        fallback={({ error }) => (
                                                            <ErrorBoundaryView error={error} />
                                                        )}>
                                                        <Component />
                                                    </Sentry.ErrorBoundary>
                                                </Route>
                                            ))}
                                            <Route path="/:model/:slug?" component={Demo} />
                                        </Switch>
                                    </TaskCards.Provider>
                                </ModelCards.Provider>
                            </ModelInfoList.Provider>
                        )}
                    </Promised>
                </Sentry.ErrorBoundary>
            </DemoWrapper>
        </Router>
    </VarnishApp>
);

// This is the top-level demo component.
// It doesn't do much, but will be going away in the next ~3 months.
const Demo = (props) => {
    const { model, slug } = props.match.params;
    const redirectedModel = modelRedirects[model] || model;
    return <SingleTaskDemo model={redirectedModel} slug={slug} />;
};

// This is the top-level demo component.
// It handles the chrome for header and menus,
// and it renders the specific task.
const DemoWrapper = (props) => {
    return (
        <Layout bgcolor="white">
            <Header>
                <HeaderColumnsWithSpace columns="auto 1fr">
                    <Header.Logo href="http://www.allennlp.org/">
                        <Logo width="147px" height="26px" alt="AllenNLP" />
                    </Header.Logo>
                </HeaderColumnsWithSpace>
            </Header>
            <Layout>
                <Menu items={demosByGroup} />
                <Layout>
                    <Content main>{props.children}</Content>
                    <Footer />
                </Layout>
            </Layout>
        </Layout>
    );
};

const Logo = styled.img.attrs({
    src: allenNlpLogo,
})``;

const HeaderColumnsWithSpace = styled(Header.Columns)`
    padding: ${({ theme }) => theme.spacing.md} 0;
`;

class SingleTaskDemo extends React.Component {
    constructor(props) {
        super(props);

        // React router supplies us with a model name and (possibly) a slug.
        const { model, slug } = props;

        this.state = {
            slug,
            selectedModel: model,
            requestData: null,
            responseData: null,
        };
    }

    // We also need to update the state whenever we receive new props from React router.
    componentDidUpdate() {
        const { model, slug } = this.props;
        if (model !== this.state.selectedModel || slug !== this.state.slug) {
            const isModelChange = model !== this.state.selectedModel;
            const responseData = isModelChange ? null : this.state.responseData;
            const requestData = isModelChange ? null : this.state.requestData;
            this.setState({ selectedModel: model, slug, responseData, requestData });
        }
    }

    // After the component mounts, we check if we need to fetch the data
    // for a permalink.
    componentDidMount() {
        const { slug, responseData } = this.state;

        // If this is a permalink and we don't yet have the data for it...
        if (slug && !responseData) {
            // Make an ajax call to get the permadata,
            // and then use it to update the state.
            fetch(`/api/permalink/${slug}`)
                .then((response) => {
                    return response.json();
                })
                .then((json) => {
                    const { request_data } = json;
                    this.setState({ requestData: request_data });
                })
                .catch((error) => {
                    // If a permalink doesn't resolve, we don't want to fail. Instead remove the slug from
                    // the URL. This lets the user at least prepare a submission.
                    console.error('Error loading permalink:', error);
                    // Start over without the slug.
                    window.location.replace(window.location.pathname.replace(`/${slug}`, ''));
                });
        }
    }

    render() {
        const { slug, selectedModel, requestData, responseData } = this.state;
        const updateData = (requestData, responseData) =>
            this.setState({ requestData, responseData });

        if (slug && !requestData) {
            // We're still waiting for permalink data, so just return the placeholder component.
            return <WaitingForPermalink />;
        } else if (modelComponents[selectedModel]) {
            // This is a model we know the component for, so render it.
            return React.createElement(modelComponents[selectedModel], {
                requestData,
                responseData,
                selectedModel,
                updateData,
            });
        } else if (selectedModel === 'user-models') {
            const developLocallyHeader = 'Developing Locally';
            const developLocallyDescription = (
                <span>
                    <span>
                        It's possible to run the AllenNLP demo locally using your own model (e.g.,
                        to visualize or interpret its predictions). See
                    </span>
                    <a
                        href="https://github.com/allenai/allennlp-demo#contributing-a-new-model-to-the-demo"
                        target="_blank"
                        rel="noopener noreferrer">
                        {' '}
                        this tutorial{' '}
                    </a>
                    <span>for more information.</span>
                </span>
            );
            const modelRequest = 'User Contributed Models';
            const modelDescription = (
                <span>
                    <span>
                        We are always looking to add user-contributed AllenNLP models as either
                        components in the AllenNLP library or as part of this collection of demos.
                        If you have a published result or a novel model demonstrating strong
                        performance on an NLP dataset and you are interested in adding your model to
                        our list of publicly available implementations, as a service to this demo
                        collection, or as a component in the AllenNLP library itself, please open an
                        issue on our
                    </span>
                    <a
                        href="https://github.com/allenai/allennlp/issues"
                        target="_blank"
                        rel="noopener noreferrer">
                        {' '}
                        public GitHub repository{' '}
                    </a>
                    <span>or send us an email at allennlp-contact@allenai.org.</span>
                </span>
            );

            return (
                <div className="model model__content">
                    <div className="model__content">
                        <PullToTop>
                            <PaneTop>
                                <ModelIntro title={modelRequest} description={modelDescription} />
                                <br />
                                <ModelIntro
                                    title={developLocallyHeader}
                                    description={developLocallyDescription}
                                />
                            </PaneTop>
                        </PullToTop>
                    </div>
                </div>
            );
        }
    }
}

const PullToTop = styled.div`
    margin-bottom: 100%;
`;

export default App;
