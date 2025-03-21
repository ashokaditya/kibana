/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { waitFor, renderHook } from '@testing-library/react';
import * as api from './api';
import { noConnectorsCasePermission, TestProviders } from '../../common/mock';
import { useApplicationCapabilities, useToasts } from '../../common/lib/kibana';
import { useGetSupportedActionConnectors } from './use_get_supported_action_connectors';

const useApplicationCapabilitiesMock = useApplicationCapabilities as jest.Mocked<
  typeof useApplicationCapabilities
>;

jest.mock('../../common/lib/kibana');
jest.mock('./api');

describe('useConnectors', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('fetches connectors', async () => {
    const spy = jest.spyOn(api, 'getSupportedActionConnectors');
    renderHook(() => useGetSupportedActionConnectors(), {
      wrapper: TestProviders,
    });

    await waitFor(() => expect(spy).toHaveBeenCalledWith({ signal: expect.any(AbortSignal) }));
  });

  it('shows a toast error when the API returns error', async () => {
    const addError = jest.fn();
    (useToasts as jest.Mock).mockReturnValue({ addError });

    const spyOnfetchConnectors = jest.spyOn(api, 'getSupportedActionConnectors');
    spyOnfetchConnectors.mockImplementation(() => {
      throw new Error('Something went wrong');
    });

    renderHook(() => useGetSupportedActionConnectors(), {
      wrapper: TestProviders,
    });

    await waitFor(() => expect(addError).toHaveBeenCalled());
  });

  it('does not fetch connectors when the user does not has access to actions', async () => {
    const spyOnFetchConnectors = jest.spyOn(api, 'getSupportedActionConnectors');
    useApplicationCapabilitiesMock().actions = { crud: false, read: false };

    const { result } = renderHook(() => useGetSupportedActionConnectors(), {
      wrapper: TestProviders,
    });

    await waitFor(() => {
      expect(spyOnFetchConnectors).not.toHaveBeenCalled();
    });

    await waitFor(() => {
      expect(result.current.data).toEqual([]);
    });
  });

  it('does not fetch connectors when the user does not has access to connectors', async () => {
    const spyOnFetchConnectors = jest.spyOn(api, 'getSupportedActionConnectors');
    useApplicationCapabilitiesMock().actions = { crud: true, read: true };

    const { result } = renderHook(() => useGetSupportedActionConnectors(), {
      wrapper: (props) => <TestProviders {...props} permissions={noConnectorsCasePermission()} />,
    });

    await waitFor(() => {
      expect(spyOnFetchConnectors).not.toHaveBeenCalled();
    });

    await waitFor(() => {
      expect(result.current.data).toEqual([]);
    });
  });
});
