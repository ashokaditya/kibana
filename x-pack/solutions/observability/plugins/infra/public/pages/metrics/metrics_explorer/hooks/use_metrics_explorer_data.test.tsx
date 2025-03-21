/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FC, PropsWithChildren } from 'react';
import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useMetricsExplorerData } from './use_metrics_explorer_data';
import type { DataView } from '@kbn/data-views-plugin/common';
import { waitFor, act, renderHook } from '@testing-library/react';
import { KibanaContextProvider } from '@kbn/kibana-react-plugin/public';

import {
  options,
  source,
  derivedIndexPattern,
  timestamps,
  resp,
  createSeries,
} from '../../../../utils/fixtures/metrics_explorer';
import type {
  MetricsExplorerOptions,
  MetricsExplorerTimestamp,
} from './use_metrics_explorer_options';
import type { DataViewBase } from '@kbn/es-query';
import type { MetricsSourceConfigurationProperties } from '../../../../../common/metrics_sources';
import { TIMESTAMP_FIELD } from '../../../../../common/constants';
import type { ResolvedDataView } from '../../../../utils/data_view';

const mockedFetch = jest.fn();

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: false,
      cacheTime: 0,
    },
  },
});

const mockDataView = {
  id: 'mock-id',
  title: 'mock-title',
  timeFieldName: TIMESTAMP_FIELD,
  isPersisted: () => false,
  getName: () => 'mock-data-view',
  toSpec: () => ({}),
} as jest.Mocked<DataView>;

jest.mock('../../../../containers/metrics_source', () => ({
  useMetricsDataViewContext: () => ({
    metricsView: {
      indices: 'metricbeat-*',
      timeFieldName: mockDataView.timeFieldName,
      fields: mockDataView.fields,
      dataViewReference: mockDataView,
    } as ResolvedDataView,
    loading: false,
    error: undefined,
  }),
}));

const renderUseMetricsExplorerDataHook = () => {
  const wrapper: FC<PropsWithChildren<any>> = ({ children }) => {
    const services = {
      http: {
        post: mockedFetch,
      },
    };
    return (
      <QueryClientProvider client={queryClient}>
        <KibanaContextProvider services={services}>{children}</KibanaContextProvider>
      </QueryClientProvider>
    );
  };
  return renderHook(
    (props: {
      options: MetricsExplorerOptions;
      source: MetricsSourceConfigurationProperties | undefined;
      derivedIndexPattern: DataViewBase;
      timestamps: MetricsExplorerTimestamp;
    }) =>
      useMetricsExplorerData({
        options: props.options,
        timestamps: props.timestamps,
      }),
    {
      initialProps: {
        options,
        source,
        derivedIndexPattern,
        timestamps,
      },
      wrapper,
    }
  );
};

jest.mock('../../../../utils/kuery', () => {
  return {
    convertKueryToElasticSearchQuery: (query: string) => query,
  };
});

describe('useMetricsExplorerData Hook', () => {
  afterEach(() => {
    queryClient.clear();
  });

  it('should just work', async () => {
    mockedFetch.mockResolvedValue(resp);
    const { result } = renderUseMetricsExplorerDataHook();

    expect(result.current.data).toBeUndefined();
    expect(result.current.isLoading).toBe(true);

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.data!.pages[0]).toEqual(resp);
    const { series } = result.current.data!.pages[0];
    expect(series).toBeDefined();
    expect(series.length).toBe(3);
  });

  it('should paginate', async () => {
    mockedFetch.mockResolvedValue(resp);
    const { result } = renderUseMetricsExplorerDataHook();
    expect(result.current.data).toBeUndefined();
    expect(result.current.isLoading).toBe(true);
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.data!.pages[0]).toEqual(resp);
    const { series } = result.current.data!.pages[0];
    expect(series).toBeDefined();
    expect(series.length).toBe(3);
    mockedFetch.mockResolvedValue({
      pageInfo: { total: 10, afterKey: 'host-06' },
      series: [createSeries('host-04'), createSeries('host-05'), createSeries('host-06')],
    } as any);
    await act(async () => {
      await result.current.fetchNextPage();
    });
    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
      const { series: nextSeries } = result.current.data!.pages[1];
      expect(nextSeries).toBeDefined();
      expect(nextSeries.length).toBe(3);
    });
  });

  it('should reset error upon recovery', async () => {
    const error = new Error('Network Error');
    mockedFetch.mockRejectedValue(error);
    const { result } = renderUseMetricsExplorerDataHook();
    expect(result.current.data).toBeUndefined();
    expect(result.current.error).toEqual(null);
    expect(result.current.isLoading).toBe(true);
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.data).toBeUndefined();
    expect(result.current.error).toEqual(error);
    mockedFetch.mockResolvedValue(resp as any);
    await act(async () => {
      await result.current.refetch();
    });
    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
      expect(result.current.data!.pages[0]).toEqual(resp);
      expect(result.current.error).toBe(null);
    });
  });

  it('should not paginate on option change', async () => {
    mockedFetch.mockResolvedValue(resp as any);
    const { result, rerender } = renderUseMetricsExplorerDataHook();
    expect(result.current.data).toBeUndefined();
    expect(result.current.isLoading).toBe(true);
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.data!.pages[0]).toEqual(resp);
    const { series } = result.current.data!.pages[0];
    expect(series).toBeDefined();
    expect(series.length).toBe(3);
    mockedFetch.mockResolvedValue(resp as any);
    rerender({
      options: {
        ...options,
        aggregation: 'count',
        metrics: [{ aggregation: 'count' }],
      },
      source,
      derivedIndexPattern,
      timestamps,
    });
    expect(result.current.isLoading).toBe(true);
    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
      expect(result.current.data!.pages[0]).toEqual(resp);
    });
  });

  it('should not paginate on time change', async () => {
    mockedFetch.mockResolvedValue(resp as any);
    const { result, rerender } = renderUseMetricsExplorerDataHook();
    expect(result.current.data).toBeUndefined();
    expect(result.current.isLoading).toBe(true);
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.data!.pages[0]).toEqual(resp);
    const { series } = result.current.data!.pages[0];
    expect(series).toBeDefined();
    expect(series.length).toBe(3);
    mockedFetch.mockResolvedValue(resp as any);
    rerender({
      options,
      source,
      derivedIndexPattern,
      timestamps: { fromTimestamp: 1678378092225, toTimestamp: 1678381693477, interval: '>=10s' },
    });
    expect(result.current.isLoading).toBe(true);
    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
      expect(result.current.data!.pages[0]).toEqual(resp);
    });
  });
});
