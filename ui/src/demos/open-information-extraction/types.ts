import { emory } from '../../tugboat/lib';
import { TokenExtractionPrediction } from '../../components';

export const Version = emory.getVersion('oie-v1');

export interface Input {
    sentence: string;
}

export interface Prediction extends TokenExtractionPrediction {}
