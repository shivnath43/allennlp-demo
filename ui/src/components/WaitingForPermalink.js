import React from 'react';
import { Spin } from 'antd';
import styled from 'styled-components';

import LoadingOutlined from '@ant-design/icons/LoadingOutlined';

class WaitingForPermalink extends React.Component {
    render() {
        return (
            <LoadingContainer>
                <Spin indicator={<LoadingOutlined style={{ fontSize: '2rem' }} />} />
            </LoadingContainer>
        );
    }
}

const LoadingContainer = styled.div`
    ${({ theme }) => `
        padding: ${theme.spacing.xl};
        font-size: ${theme.typography.textStyles.jumbo.fontSize};
    `}
`;

export default WaitingForPermalink;
