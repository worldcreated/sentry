import {useState} from 'react';
import styled from '@emotion/styled';

import NegativeSpaceContainer from 'sentry/components/container/negativeSpaceContainer';
import * as Storybook from 'sentry/stories';
import {space} from 'sentry/styles/space';
import {NavContextProvider} from 'sentry/views/nav/context';
import {SecondaryNav} from 'sentry/views/nav/secondary/secondary';
import {SecondarySidebar} from 'sentry/views/nav/secondary/secondarySidebar';

export default Storybook.story('SecondaryNav', story => {
  story('Basics (WIP)', () => {
    const [activeItem, setActiveItem] = useState<string | null>('product-area-1');

    return (
      <Container>
        <NavContextProvider>
          <SecondarySidebar />
          <SecondaryNav>
            <SecondaryNav.Body>
              <SecondaryNav.Section id="stories-product-areas">
                <SecondaryNav.Item
                  to="/product-area-1"
                  isActive={activeItem === 'product-area-1'}
                  onClick={e => {
                    e.preventDefault();
                    setActiveItem('product-area-1');
                  }}
                >
                  Product Area 1
                </SecondaryNav.Item>
                <SecondaryNav.Item
                  to="/product-area-2"
                  isActive={activeItem === 'product-area-2'}
                  onClick={e => {
                    e.preventDefault();
                    setActiveItem('product-area-2');
                  }}
                >
                  Product Area 2
                </SecondaryNav.Item>
                <SecondaryNav.Item
                  to="/product-area-3"
                  isActive={activeItem === 'product-area-3'}
                  onClick={e => {
                    e.preventDefault();
                    setActiveItem('product-area-3');
                  }}
                >
                  Product Area 3
                </SecondaryNav.Item>
              </SecondaryNav.Section>
              <SecondaryNav.Section id="stories-starred" title="Starred">
                <SecondaryNav.Item
                  to="/starred-item"
                  isActive={activeItem === 'starred-item'}
                  onClick={e => {
                    e.preventDefault();
                    setActiveItem('starred-item');
                  }}
                >
                  Starred Item
                </SecondaryNav.Item>
              </SecondaryNav.Section>
            </SecondaryNav.Body>
            <SecondaryNav.Footer>
              <SecondaryNav.Item
                to="/footer-item"
                onClick={e => {
                  e.preventDefault();
                  setActiveItem('footer-item');
                }}
                isActive={activeItem === 'footer-item'}
              >
                Footer Item
              </SecondaryNav.Item>
            </SecondaryNav.Footer>
          </SecondaryNav>
        </NavContextProvider>
      </Container>
    );
  });
});

const Container = styled(NegativeSpaceContainer)`
  padding: ${space(2)};
  height: 400px;
  width: min-content;
`;
