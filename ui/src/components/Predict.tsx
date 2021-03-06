import React from 'react';

import { Form, FormOutputView } from '../tugboat/components';
import { Models } from '../tugboat/context';
import { NoSelectedModelError } from '../tugboat/error';

interface Props<I, O> {
    fields: React.ReactNode | JSX.Element;
    children: FormOutputView<I, O>;
    version?: string;
}

/**
 * Top level container for a demo that showcases a Model's predictor.
 */
export const Predict = <I, O>({ fields, children, version }: Props<I, O>) => {
    const { selectedModel } = React.useContext(Models);
    if (!selectedModel) {
        throw new NoSelectedModelError();
    }
    return (
        <Form<I, O> fields={fields} action={`/api/${selectedModel.id}/predict`} version={version}>
            {children}
        </Form>
    );
};
