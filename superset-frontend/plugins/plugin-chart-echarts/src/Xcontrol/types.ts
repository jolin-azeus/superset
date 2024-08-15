/**
 * Licensed to the Apache Software Foundation (ASF) under one
 * or more contributor license agreements.  See the NOTICE file
 * distributed with this work for additional information
 * regarding copyright ownership.  The ASF licenses this file
 * to you under the Apache License, Version 2.0 (the
 * "License"); you may not use this file except in compliance
 * with the License.  You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */
import {
  AnnotationLayer,
  TimeGranularity,
  QueryFormData,
  QueryFormColumn,
  ContributionType,
  TimeFormatter,
  AxisType,
} from '@superset-ui/core';
import {
  BaseChartProps,
  BaseTransformedProps,
  ContextMenuTransformedProps,
  CrossFilterTransformedProps,
  EchartsTimeseriesSeriesType,
  LegendFormData,
  StackType,
  TitleFormData,
} from '../types';
import {
  DEFAULT_LEGEND_FORM_DATA,
  DEFAULT_TITLE_FORM_DATA,
  DEFAULT_FORM_DATA as TIMESERIES_DEFAULTS,
} from '../constants';

export type EchartsXcontrolFormData = QueryFormData & {
  annotationLayers: AnnotationLayer[];
  // shared properties
  minorSplitLine: boolean;
  minorTicks: boolean;
  logAxis: boolean;
  yAxisFormat?: string;
  yAxisBounds: [number | undefined | null, number | undefined | null];
  xAxisTimeFormat?: string;
  truncateYAxis: boolean;
  timeGrainSqla?: TimeGranularity;
  tooltipTimeFormat?: string;
  zoomable: boolean;
  richTooltip: boolean;
  xAxisLabelRotation: number;
  colorScheme?: string;
  // types specific to Query
  area: boolean;
  contributionMode?: ContributionType;
  markerEnabled: boolean;
  markerSize: number;
  opacity: number;
  orderDesc: boolean;
  rowLimit: number;
  seriesType: EchartsTimeseriesSeriesType;
  showValue: boolean;
  stack: StackType;
  yAxisIndex?: number;
  xcontrolShowCustom?: boolean;
  groupby: QueryFormColumn[];
} & LegendFormData &
  TitleFormData;

// @ts-ignore
export const DEFAULT_FORM_DATA: EchartsXcontrolFormData = {
  ...DEFAULT_LEGEND_FORM_DATA,
  annotationLayers: [],
  minorSplitLine: TIMESERIES_DEFAULTS.minorSplitLine,
  truncateYAxis: TIMESERIES_DEFAULTS.truncateYAxis,
  logAxis: TIMESERIES_DEFAULTS.logAxis,
  yAxisBounds: TIMESERIES_DEFAULTS.yAxisBounds,
  yAxisFormat: TIMESERIES_DEFAULTS.yAxisFormat,
  tooltipTimeFormat: TIMESERIES_DEFAULTS.tooltipTimeFormat,
  xAxisBounds: TIMESERIES_DEFAULTS.xAxisBounds,
  xAxisForceCategorical: TIMESERIES_DEFAULTS.xAxisForceCategorical,
  xAxisTimeFormat: TIMESERIES_DEFAULTS.xAxisTimeFormat,
  area: TIMESERIES_DEFAULTS.area,
  markerEnabled: TIMESERIES_DEFAULTS.markerEnabled,
  markerSize: TIMESERIES_DEFAULTS.markerSize,
  opacity: TIMESERIES_DEFAULTS.opacity,
  orderDesc: TIMESERIES_DEFAULTS.orderDesc,
  rowLimit: TIMESERIES_DEFAULTS.rowLimit,
  seriesType: TIMESERIES_DEFAULTS.seriesType,
  showValue: TIMESERIES_DEFAULTS.showValue,
  stack: TIMESERIES_DEFAULTS.stack,
  yAxisIndex: 0,
  xcontrolShowCustom: true,
  groupby: [],
  zoomable: TIMESERIES_DEFAULTS.zoomable,
  richTooltip: TIMESERIES_DEFAULTS.richTooltip,
  xAxisLabelRotation: TIMESERIES_DEFAULTS.xAxisLabelRotation,
  ...DEFAULT_TITLE_FORM_DATA,
};

export interface EchartsXcontrolProps
  extends BaseChartProps<EchartsXcontrolFormData> {
  formData: EchartsXcontrolFormData;
}

export type EchartsXcontrolChartTransformedProps =
  BaseTransformedProps<EchartsXcontrolFormData> &
    ContextMenuTransformedProps &
    CrossFilterTransformedProps & {
      seriesBreakdown: number;
      xValueFormatter: TimeFormatter | StringConstructor;
      xAxis: {
        label: string;
        type: AxisType;
      };
      onFocusedSeries: (series: string | null) => void;
    };
