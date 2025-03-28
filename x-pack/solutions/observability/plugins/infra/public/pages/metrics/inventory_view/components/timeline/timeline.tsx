/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo, useCallback } from 'react';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import moment from 'moment';
import { first, last } from 'lodash';
import { EuiLoadingChart, EuiText, EuiEmptyPrompt, EuiButton, useEuiTheme } from '@elastic/eui';
import type {
  ElementClickListener,
  RectAnnotationDatum,
  XYChartElementEvent,
  TooltipProps,
} from '@elastic/charts';
import {
  Axis,
  Chart,
  Settings,
  Position,
  niceTimeFormatter,
  RectAnnotation,
  Tooltip,
} from '@elastic/charts';
import { EuiFlexItem } from '@elastic/eui';
import { EuiFlexGroup } from '@elastic/eui';
import { EuiIcon } from '@elastic/eui';
import styled from '@emotion/styled';
import type { Metric } from '../../../../../../common/http_api/infra_ml';
import { useTimelineChartTheme } from '../../../../../hooks/use_timeline_chart_theme';
import { toMetricOpt } from '../../../../../../common/snapshot_metric_i18n';
import type { MetricsExplorerAggregation } from '../../../../../../common/http_api';
import { colorTransformer, Color } from '../../../../../../common/color_palette';
import { useSourceContext } from '../../../../../containers/metrics_source';
import { useTimeline } from '../../hooks/use_timeline';
import { useWaffleOptionsContext } from '../../hooks/use_waffle_options';
import { useWaffleTimeContext } from '../../hooks/use_waffle_time';
import { useWaffleFiltersContext } from '../../hooks/use_waffle_filters';
import { MetricExplorerSeriesChart } from '../../../metrics_explorer/components/series_chart';
import { MetricsExplorerChartType } from '../../../metrics_explorer/hooks/use_metrics_explorer_options';
import { calculateDomain } from '../../../metrics_explorer/components/helpers/calculate_domain';
import type { InfraFormatter } from '../../../../../common/inventory/types';
import { useMetricsHostsAnomaliesResults } from '../../hooks/use_metrics_hosts_anomalies';
import { useMetricsK8sAnomaliesResults } from '../../hooks/use_metrics_k8s_anomalies';

interface Props {
  interval: string;
  yAxisFormatter: InfraFormatter;
  isVisible: boolean;
}

export const Timeline: React.FC<Props> = ({ interval, yAxisFormatter, isVisible }) => {
  const { sourceId, source } = useSourceContext();
  const { metric, nodeType, accountId, region } = useWaffleOptionsContext();
  const { currentTime, jumpToTime, stopAutoReload } = useWaffleTimeContext();
  const { filterQueryAsJson } = useWaffleFiltersContext();
  const { euiTheme } = useEuiTheme();
  const chartTheme = useTimelineChartTheme();

  const { loading, error, startTime, endTime, timeseries, reload } = useTimeline(
    filterQueryAsJson,
    [metric],
    nodeType,
    sourceId,
    currentTime,
    accountId,
    region,
    interval,
    isVisible
  );

  const anomalyMetricName = useMemo((): Metric | undefined => {
    const metricType = metric.type;
    switch (metricType) {
      case 'memory':
        return 'memory_usage';
      case 'rx':
        return 'network_in';
      case 'tx':
        return 'network_out';
      default:
        return;
    }
  }, [metric]);

  const anomalyParams = {
    sourceId: 'default',
    anomalyThreshold: source?.configuration.anomalyThreshold || 0,
    startTime,
    endTime,
    defaultSortOptions: {
      direction: 'desc' as const,
      field: 'anomalyScore' as const,
    },
    defaultPaginationOptions: { pageSize: 100 },
    metric: anomalyMetricName,
  };

  const { metricsHostsAnomalies } = useMetricsHostsAnomaliesResults(anomalyParams, {
    active: nodeType === 'host',
  });
  const { metricsK8sAnomalies } = useMetricsK8sAnomaliesResults(anomalyParams, {
    active: nodeType === 'pod',
  });

  const anomalies = useMemo(() => {
    if (nodeType === 'host') {
      return metricsHostsAnomalies;
    } else if (nodeType === 'pod') {
      return metricsK8sAnomalies;
    }
  }, [nodeType, metricsHostsAnomalies, metricsK8sAnomalies]);

  const metricLabel = toMetricOpt(metric.type, nodeType)?.textLC;
  const metricPopoverLabel = toMetricOpt(metric.type, nodeType)?.text;

  const chartMetric = {
    color: Color.color0,
    aggregation: 'avg' as MetricsExplorerAggregation,
    label: metricPopoverLabel,
  };

  const dateFormatter = useMemo(() => {
    if (!timeseries) return () => '';
    const firstTimestamp = first(timeseries.rows)?.timestamp;
    const lastTimestamp = last(timeseries.rows)?.timestamp;

    if (firstTimestamp == null || lastTimestamp == null) {
      return (value: number) => `${value}`;
    }

    return niceTimeFormatter([firstTimestamp, lastTimestamp]);
  }, [timeseries]);

  const tooltipProps: TooltipProps = {
    headerFormatter: ({ value }) => moment(value).format('Y-MM-DD HH:mm:ss.SSS'),
  };

  const dataDomain = timeseries ? calculateDomain(timeseries, [chartMetric], false) : null;
  const domain = dataDomain
    ? {
        max: dataDomain.max * 1.1, // add 10% headroom.
        min: dataDomain.min,
      }
    : { max: 0, min: 0 };

  const onClickPoint: ElementClickListener = useCallback(
    ([elementEvent]) => {
      // casting to GeometryValue as we are using cartesian charts
      const [geometryValue] = elementEvent as XYChartElementEvent;
      if (geometryValue && !Array.isArray(geometryValue)) {
        const { x: timestamp } = geometryValue;
        jumpToTime(timestamp);
        stopAutoReload();
      }
    },
    [jumpToTime, stopAutoReload]
  );

  if (loading) {
    return (
      <TimelineContainer>
        <TimelineLoadingContainer>
          <EuiLoadingChart size="xl" />
        </TimelineLoadingContainer>
      </TimelineContainer>
    );
  }

  if (!loading && (error || !timeseries)) {
    return (
      <TimelineContainer>
        <EuiEmptyPrompt
          iconType="visArea"
          title={<h4>{error ? errorTitle : noHistoryDataTitle}</h4>}
          actions={
            <EuiButton data-test-subj="infraTimelineButton" color="primary" fill onClick={reload}>
              {error ? retryButtonLabel : checkNewDataButtonLabel}
            </EuiButton>
          }
        />
      </TimelineContainer>
    );
  }

  function generateAnnotationData(results: Array<[number, string[]]>): RectAnnotationDatum[] {
    return results.map((anomaly) => {
      const [val, influencers] = anomaly;
      return {
        coordinates: {
          x0: val,
          x1: moment(val).add(15, 'minutes').valueOf(),
          y0: dataDomain?.min,
          y1: dataDomain?.max,
        },
        details: influencers.join(','),
      };
    });
  }

  return (
    <TimelineContainer
      data-test-subj={isVisible ? 'timelineContainerOpen' : 'timelineContainerClosed'}
    >
      <TimelineHeader>
        <EuiFlexItem grow={true}>
          <EuiText>
            <strong>
              <FormattedMessage
                id="xpack.infra.inventoryTimeline.header"
                defaultMessage="Average {metricLabel}"
                values={{ metricLabel }}
              />
            </strong>
          </EuiText>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiFlexGroup alignItems={'center'} responsive={false}>
            <EuiFlexItem grow={false}>
              <EuiFlexGroup gutterSize={'s'} alignItems={'center'} responsive={false}>
                <EuiFlexItem grow={false}>
                  <EuiIcon color={colorTransformer(chartMetric.color)} type={'dot'} />
                </EuiFlexItem>
                <EuiFlexItem grow={false}>
                  <EuiText size={'xs'}>
                    <FormattedMessage
                      id="xpack.infra.inventoryTimeline.header"
                      defaultMessage="Average {metricLabel}"
                      values={{ metricLabel }}
                    />
                  </EuiText>
                </EuiFlexItem>
              </EuiFlexGroup>
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <EuiFlexGroup gutterSize={'s'} alignItems={'center'} responsive={false}>
                <EuiFlexItem
                  grow={false}
                  style={{
                    backgroundColor: euiTheme.colors.backgroundFilledAccent,
                    height: 5,
                    width: 10,
                  }}
                />
                <EuiFlexItem>
                  <EuiText size={'xs'}>
                    <FormattedMessage
                      id="xpack.infra.inventoryTimeline.legend.anomalyLabel"
                      defaultMessage="Anomaly detected"
                    />
                  </EuiText>
                </EuiFlexItem>
              </EuiFlexGroup>
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiFlexItem>
      </TimelineHeader>
      <TimelineChartContainer>
        <Chart>
          {anomalies && (
            <RectAnnotation
              id={'anomalies'}
              dataValues={generateAnnotationData(
                anomalies.map((a) => [a.startTime, a.influencers])
              )}
              style={{ fill: euiTheme.colors.backgroundFilledAccent }}
            />
          )}
          <MetricExplorerSeriesChart
            type={MetricsExplorerChartType.area}
            metric={chartMetric}
            id="0"
            series={timeseries!}
            stack={false}
          />
          <Axis
            id={'timestamp'}
            position={Position.Bottom}
            showOverlappingTicks={true}
            tickFormat={dateFormatter}
          />
          <Axis
            id={'values'}
            position={Position.Left}
            tickFormat={yAxisFormatter}
            domain={domain}
            ticks={6}
            gridLine={{ visible: true }}
          />
          <Tooltip {...tooltipProps} />
          <Settings
            onElementClick={onClickPoint}
            baseTheme={chartTheme.baseTheme}
            theme={chartTheme.theme}
            locale={i18n.getLocale()}
          />
        </Chart>
      </TimelineChartContainer>
    </TimelineContainer>
  );
};

const TimelineContainer = styled.div`
  background-color: ${(props) => props.theme.euiTheme.colors.body};
  border-top: 1px solid ${(props) => props.theme.euiTheme.colors.lightShade};
  height: 220px;
  width: 100%;
  padding: ${(props) => props.theme.euiTheme.size.s} ${(props) => props.theme.euiTheme.size.m};
  display: flex;
  flex-direction: column;
`;

const TimelineHeader = styled.div`
  display: flex;
  width: 100%;
  padding: ${(props) => props.theme.euiTheme.size.s} ${(props) => props.theme.euiTheme.size.m};
  @media only screen and (max-width: 767px) {
    margin-top: 30px;
  }
`;

const TimelineChartContainer = styled.div`
  padding-left: ${(props) => props.theme.euiTheme.size.xs};
  width: 100%;
  height: 100%;
`;

const TimelineLoadingContainer = styled.div`
  display: flex;
  justify-content: center;
  align-items: center;
  height: 100%;
`;

const noHistoryDataTitle = i18n.translate('xpack.infra.inventoryTimeline.noHistoryDataTitle', {
  defaultMessage: 'There is no historical data to display.',
});

const errorTitle = i18n.translate('xpack.infra.inventoryTimeline.errorTitle', {
  defaultMessage: 'Unable to show historical data.',
});

const checkNewDataButtonLabel = i18n.translate(
  'xpack.infra.inventoryTimeline.checkNewDataButtonLabel',
  {
    defaultMessage: 'Check for new data',
  }
);

const retryButtonLabel = i18n.translate('xpack.infra.inventoryTimeline.retryButtonLabel', {
  defaultMessage: 'Try again',
});
