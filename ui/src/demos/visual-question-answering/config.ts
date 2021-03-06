import { ModelId } from '../../lib';
import { DemoConfig } from '../../tugboat/lib';

export const config: DemoConfig = {
    group: 'Answer a question',
    title: 'Visual Question Answering',
    order: 2,
    modelIds: [ModelId.VilbertVQA],
    status: 'hidden',
    taskId: 'vqa',
};
