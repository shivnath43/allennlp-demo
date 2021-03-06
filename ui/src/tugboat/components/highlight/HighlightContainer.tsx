import React from 'react';
import styled, { css } from 'styled-components';

interface Props {
    children: JSX.Element | React.ReactNode;
    centerLabels?: boolean;
    isClicking?: boolean;
    className?: string;
}
export const HighlightContainer = ({ centerLabels, className, isClicking, children }: Props) => {
    return (
        <Wrapper className={className} centerLabels={centerLabels} isClicking={isClicking}>
            {children}
        </Wrapper>
    );
};

const Wrapper = styled.div<{ centerLabels?: boolean; isClicking?: boolean }>`
    /* TODO: lets remove line-height and use flex with align-items */
    line-height: 42px;
    align-items: center;
    display: flex;
    flex-wrap: wrap;
    white-space: pre;
    cursor: default;
    align-items: center;

    ${({ centerLabels }) =>
        !centerLabels &&
        css`
            align-items: initial;
        `}

    ${({ isClicking }) =>
        isClicking &&
        css`
            opacity: 0.66;
            transition-duration: 0s;
            span,
            &:before,
            &:after {
                transition-duration: 0s;
            }
        `}
`;
