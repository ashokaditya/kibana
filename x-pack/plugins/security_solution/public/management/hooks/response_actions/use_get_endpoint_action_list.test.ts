/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AppContextTestRender, ReactQueryHookRenderer } from '../../../common/mock/endpoint';
import { createAppRootMockRenderer } from '../../../common/mock/endpoint';
import { useGetEndpointActionList, formatExpandValues } from './use_get_endpoint_action_list';
import { BASE_ENDPOINT_ACTION_ROUTE } from '../../../../common/endpoint/constants';
import { useQuery as _useQuery } from '@tanstack/react-query';
import { responseActionsHttpMocks } from '../../mocks/response_actions_http_mocks';

const useQueryMock = _useQuery as jest.Mock;

jest.mock('@tanstack/react-query', () => {
  const actualReactQueryModule = jest.requireActual('@tanstack/react-query');

  return {
    ...actualReactQueryModule,
    useQuery: jest.fn((...args) => actualReactQueryModule.useQuery(...args)),
  };
});

describe('useGetEndpointActionList hook', () => {
  let renderReactQueryHook: ReactQueryHookRenderer<
    Parameters<typeof useGetEndpointActionList>,
    ReturnType<typeof useGetEndpointActionList>
  >;
  let http: AppContextTestRender['coreStart']['http'];
  let apiMocks: ReturnType<typeof responseActionsHttpMocks>;

  beforeEach(() => {
    const testContext = createAppRootMockRenderer();

    renderReactQueryHook = testContext.renderReactQueryHook as typeof renderReactQueryHook;
    http = testContext.coreStart.http;

    apiMocks = responseActionsHttpMocks(http);
  });

  it('should call the proper API', async () => {
    await renderReactQueryHook(() =>
      useGetEndpointActionList({
        agentIds: ['123', '456'],
        userIds: ['elastic', 'citsale'],
        commands: ['isolate', 'unisolate'],
        statuses: ['pending', 'successful'],
        page: 2,
        pageSize: 20,
        startDate: 'now-5d',
        endDate: 'now',
      })
    );

    expect(apiMocks.responseProvider.actionList).toHaveBeenCalledWith({
      path: BASE_ENDPOINT_ACTION_ROUTE,
      query: {
        agentIds: ['123', '456'],
        commands: ['isolate', 'unisolate'],
        statuses: ['pending', 'successful'],
        endDate: 'now',
        page: 2,
        pageSize: 20,
        startDate: 'now-5d',
        userIds: ['*elastic*', '*citsale*'],
      },
    });
  });

  it('should call the proper API with `expand` and a single action id', async () => {
    await renderReactQueryHook(() =>
      useGetEndpointActionList({
        agentIds: ['123', '456'],
        userIds: ['elastic', 'citsale'],
        commands: ['isolate', 'unisolate'],
        statuses: ['pending', 'successful'],
        page: 2,
        pageSize: 20,
        startDate: 'now-5d',
        endDate: 'now',
        expand: {
          actions: 'action-id-0',
        },
      })
    );

    expect(apiMocks.responseProvider.actionList).toHaveBeenCalledWith({
      path: BASE_ENDPOINT_ACTION_ROUTE,
      query: {
        agentIds: ['123', '456'],
        commands: ['isolate', 'unisolate'],
        statuses: ['pending', 'successful'],
        endDate: 'now',
        page: 2,
        pageSize: 20,
        startDate: 'now-5d',
        userIds: ['*elastic*', '*citsale*'],
        expand: '{"actions":["action-id-0"]}',
      },
    });
  });

  it('should call the proper API with `expand` and a multiple action ids', async () => {
    await renderReactQueryHook(() =>
      useGetEndpointActionList({
        agentIds: ['123', '456'],
        userIds: ['elastic', 'citsale'],
        commands: ['isolate', 'unisolate'],
        statuses: ['pending', 'successful'],
        page: 2,
        pageSize: 20,
        startDate: 'now-5d',
        endDate: 'now',
        expand: {
          actions: ['action-id-1', 'action-id-2'],
        },
      })
    );

    expect(apiMocks.responseProvider.actionList).toHaveBeenCalledWith({
      path: BASE_ENDPOINT_ACTION_ROUTE,
      query: {
        agentIds: ['123', '456'],
        commands: ['isolate', 'unisolate'],
        statuses: ['pending', 'successful'],
        endDate: 'now',
        page: 2,
        pageSize: 20,
        startDate: 'now-5d',
        userIds: ['*elastic*', '*citsale*'],
        expand: '{"actions":["action-id-1","action-id-2"]}',
      },
    });
  });

  it('should allow custom options to be used', async () => {
    await renderReactQueryHook(
      () =>
        useGetEndpointActionList(
          {},
          {
            queryKey: ['1', '2'],
            enabled: false,
          }
        ),
      false
    );

    expect(useQueryMock).toHaveBeenCalledWith(
      expect.objectContaining({
        queryKey: ['1', '2'],
        enabled: false,
      })
    );
  });
});

describe('#formatExpandValues', () => {
  it('should format a single string to string array', () => {
    expect(formatExpandValues({ list: '123' })).toEqual({ list: ['123'] });
  });

  it('should not format a string array', () => {
    expect(formatExpandValues({ list: ['123', '456'] })).toEqual({ list: ['123', '456'] });
  });

  it('should not format `undefined`', () => {
    expect(formatExpandValues({ list: undefined })).toEqual({ list: undefined });
  });
});
