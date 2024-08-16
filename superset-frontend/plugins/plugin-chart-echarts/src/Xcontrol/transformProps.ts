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
/* eslint-disable camelcase */
import { invert } from 'lodash';
import {
  AnnotationLayer,
  AxisType,
  buildCustomFormatters,
  CategoricalColorNamespace,
  CurrencyFormatter,
  ensureIsArray,
  GenericDataType,
  getCustomFormatter,
  getMetricLabel,
  getNumberFormatter,
  getXAxisLabel,
  isDefined,
  isEventAnnotationLayer,
  isFormulaAnnotationLayer,
  isIntervalAnnotationLayer,
  isPhysicalColumn,
  isTimeseriesAnnotationLayer,
  NumberFormats,
  QueryFormData,
  QueryFormMetric,
  TimeseriesChartDataResponseResult,
  TimeseriesDataRecord,
  tooltipHtml,
  ValueFormatter,
} from '@superset-ui/core';
import {
  extractExtraMetrics,
  getOriginalSeries
} from '@superset-ui/chart-controls';
import { EChartsCoreOption, SeriesOption } from 'echarts';
import {
  DEFAULT_FORM_DATA,
  EchartsXcontrolChartTransformedProps,
  EchartsXcontrolFormData,
  EchartsXcontrolProps,
} from './types';
import {
  EchartsTimeseriesSeriesType,
  ForecastSeriesEnum,
  Refs,
  xcontorlDebug,
} from '../types';
import { parseAxisBound } from '../utils/controls';
import {
  dedupSeries,
  extractDataTotalValues,
  extractSeries,
  extractShowValueIndexes,
  getAxisType,
  getColtypesMapping,
  getLegendProps,
  getMinAndMaxFromBounds,
  getOverMaxHiddenFormatter,
} from '../utils/series';
import {
  extractAnnotationLabels,
  getAnnotationData,
} from '../utils/annotation';
import {
  extractForecastSeriesContext,
  extractForecastValuesFromTooltipParams,
  formatForecastTooltipSeries,
  rebaseForecastDatum,
} from '../utils/forecast';
import { convertInteger } from '../utils/convertInteger';
import { defaultGrid, defaultYAxis } from '../defaults';
import {
  getPadding,
  transformEventAnnotation,
  transformFormulaAnnotation,
  transformIntervalAnnotation,
  transformSeries,
  transformTimeseriesAnnotation,
} from '../Timeseries/transformers';
import { TIMEGRAIN_TO_TIMESTAMP, TIMESERIES_CONSTANTS } from '../constants';
import { getDefaultTooltip } from '../utils/tooltip';
import {
  getPercentFormatter,
  getTooltipTimeFormatter,
  getXAxisFormatter,
  getYAxisFormatter,
} from '../utils/formatters';

const getFormatter = (
  customFormatters: Record<string, ValueFormatter>,
  defaultFormatter: ValueFormatter,
  metrics: QueryFormMetric[],
  formatterKey: string,
  forcePercentFormat: boolean,
) => {
  if (forcePercentFormat) {
    return getNumberFormatter(',.0%');
  }
  return (
    getCustomFormatter(customFormatters, metrics, formatterKey) ??
    defaultFormatter
  );
};

export default function transformProps(
  chartProps: EchartsXcontrolProps,
): EchartsXcontrolChartTransformedProps {
  const {
    width,
    height,
    formData,
    queriesData,
    hooks,
    filterState,
    datasource,
    theme,
    inContextMenu,
    emitCrossFilters,
  } = chartProps;
  xcontorlDebug("queriesData", queriesData);

  let focusedSeries: string | null = null;

  const {
    verboseMap = {},
    currencyFormats = {},
    columnFormats = {},
  } = datasource;
  const { label_map: labelMap } =
    queriesData[0] as TimeseriesChartDataResponseResult;
  const data1 = (queriesData[0].data || []) as TimeseriesDataRecord[];
  const annotationData = getAnnotationData(chartProps);
  const coltypeMapping = {
    ...getColtypesMapping(queriesData[0]),
  };
  const {
    area,
    annotationLayers,
    colorScheme,
    contributionMode,
    legendOrientation,
    legendType,
    logAxis,
    markerEnabled,
    markerSize,
    opacity,
    minorSplitLine,
    minorTicks,
    seriesType,
    showLegend,
    showValue,
    stack,
    truncateXAxis,
    truncateYAxis,
    tooltipTimeFormat,
    yAxisFormat,
    currencyFormat,
    xAxisTimeFormat,
    yAxisBounds,
    yAxisIndex,
    xcontrolShowCustom,
    zoomable,
    richTooltip,
    tooltipSortByMetric,
    xAxisBounds,
    xAxisLabelRotation,
    groupby,
    xAxis: xAxisOrig,
    xAxisForceCategorical,
    xAxisTitle,
    yAxisTitle,
    xAxisTitleMargin,
    yAxisTitleMargin,
    yAxisTitlePosition,
    sliceId,
    timeGrainSqla,
    percentageThreshold,
    metrics = [],
  }: EchartsXcontrolFormData = { ...DEFAULT_FORM_DATA, ...formData };

  const refs: Refs = {};
  const colorScale = CategoricalColorNamespace.getScale(colorScheme as string);

  let xAxisLabel = getXAxisLabel(
    chartProps.rawFormData as QueryFormData,
  ) as string;
  if (
    isPhysicalColumn(chartProps.rawFormData?.x_axis) &&
    isDefined(verboseMap[xAxisLabel])
  ) {
    xAxisLabel = verboseMap[xAxisLabel];
  }

  xcontorlDebug("data1", data1);
  const rebasedDataA = rebaseForecastDatum(data1, verboseMap);
  xcontorlDebug("rebasedDataA", rebasedDataA);

  const extraMetricLabels = extractExtraMetrics(chartProps.rawFormData).map(
    getMetricLabel,
  );

  const [rawSeriesA] = extractSeries(
    rebasedDataA,
    {
      fillNeighborValue: stack ? 0 : undefined,
      xAxis: xAxisLabel,
      extraMetricLabels,
    }
  );

  const dataTypes = getColtypesMapping(queriesData[0]);
  const xAxisDataType = dataTypes?.[xAxisLabel] ?? dataTypes?.[xAxisOrig];
  const xAxisType = getAxisType(stack, xAxisForceCategorical, xAxisDataType);
  const series: SeriesOption[] = [];
  const percentFormatter = getPercentFormatter(NumberFormats.PERCENT_2_POINT);
  const formatter = contributionMode
    ? getNumberFormatter(',.0%')
    : currencyFormat?.symbol
      ? new CurrencyFormatter({
          d3Format: yAxisFormat,
          currency: currencyFormat,
        })
      : getNumberFormatter(yAxisFormat);
  const customFormatters = buildCustomFormatters(
    [...ensureIsArray(metrics)],
    currencyFormats,
    columnFormats,
    yAxisFormat,
    currencyFormat,
  );

  const primarySeries = new Set<string>();
  const mapSeriesIdToAxis = (
    seriesOption: SeriesOption,
    index?: number,
  ): void => {
    primarySeries.add(seriesOption.id as string);
  };
  rawSeriesA.forEach(seriesOption =>
    mapSeriesIdToAxis(seriesOption, yAxisIndex),
  );
  const showValueIndexesA = extractShowValueIndexes(rawSeriesA, {
    stack,
  });
  const { totalStackedValues, thresholdValues } = extractDataTotalValues(
    rebasedDataA,
    {
      stack,
      percentageThreshold,
      xAxisCol: xAxisLabel,
    },
  );

  annotationLayers
    .filter((layer: AnnotationLayer) => layer.show)
    .forEach((layer: AnnotationLayer) => {
      if (isFormulaAnnotationLayer(layer))
        series.push(
          transformFormulaAnnotation(
            layer,
            data1,
            xAxisLabel,
            xAxisType,
            colorScale,
            sliceId,
          ),
        );
      else if (isIntervalAnnotationLayer(layer)) {
        series.push(
          ...transformIntervalAnnotation(
            layer,
            data1,
            annotationData,
            colorScale,
            theme,
            sliceId,
          ),
        );
      } else if (isEventAnnotationLayer(layer)) {
        series.push(
          ...transformEventAnnotation(
            layer,
            data1,
            annotationData,
            colorScale,
            theme,
            sliceId,
          ),
        );
      } else if (isTimeseriesAnnotationLayer(layer)) {
        series.push(
          ...transformTimeseriesAnnotation(
            layer,
            markerSize,
            data1,
            annotationData,
            colorScale,
            sliceId,
          ),
        );
      }
    });

  // yAxisBounds need to be parsed to replace incompatible values with undefined
  const [xAxisMin, xAxisMax] = (xAxisBounds || []).map(parseAxisBound);
  let [yAxisMin, yAxisMax] = (yAxisBounds || []).map(parseAxisBound);

  const array = ensureIsArray(chartProps.rawFormData?.time_compare);
  const inverted = invert(verboseMap);

  xcontorlDebug("rawSeriesA", rawSeriesA);
  rawSeriesA.forEach(entry => {
    const entryName = String(entry.name || '');
    const seriesName = inverted[entryName] || entryName;
    const colorScaleKey = getOriginalSeries(seriesName, array);

    const seriesFormatter = getFormatter(
      customFormatters,
      formatter,
      metrics,
      labelMap?.[seriesName]?.[0],
      !!contributionMode,
    );

    const transformedSeries = transformSeries(
      entry,
      colorScale,
      colorScaleKey,
      {
        area,
        markerEnabled,
        markerSize,
        areaOpacity: opacity,
        seriesType,
        showValue,
        stack: Boolean(stack),
        stackIdSuffix: '\na',
        yAxisIndex,
        xcontrolShowCustom,
        filterState,
        seriesKey: entry.name,
        sliceId,
        queryIndex: 0,
        formatter:
          seriesType === EchartsTimeseriesSeriesType.Bar
            ? getOverMaxHiddenFormatter({
                max: yAxisMax,
                formatter: seriesFormatter,
              })
            : seriesFormatter,
        showValueIndexes: showValueIndexesA,
        totalStackedValues,
        thresholdValues,
      },
      data1,
    );
    if (transformedSeries) series.push(transformedSeries);
  });

  // default to 0-100% range when doing row-level contribution chart
  if (contributionMode === 'row' && stack) {
    if (yAxisMin === undefined) yAxisMin = 0;
    if (yAxisMax === undefined) yAxisMax = 1;
  }

  const tooltipFormatter =
    xAxisDataType === GenericDataType.Temporal
      ? getTooltipTimeFormatter(tooltipTimeFormat)
      : String;
  const xAxisFormatter =
    xAxisDataType === GenericDataType.Temporal
      ? getXAxisFormatter(xAxisTimeFormat)
      : String;

  const addYAxisTitleOffset = !!(yAxisTitle);
  const addXAxisTitleOffset = !!xAxisTitle;

  const chartPadding = getPadding(
    showLegend,
    legendOrientation,
    addYAxisTitleOffset,
    zoomable,
    null,
    addXAxisTitleOffset,
    yAxisTitlePosition,
    convertInteger(yAxisTitleMargin),
    convertInteger(xAxisTitleMargin),
  );

  const { setDataMask = () => {}, onContextMenu } = hooks;
  const alignTicks = true;

  const echartOptions: EChartsCoreOption = {
    useUTC: true,
    grid: {
      ...defaultGrid,
      ...chartPadding,
    },
    xAxis: {
      type: xAxisType,
      name: xAxisTitle,
      nameGap: convertInteger(xAxisTitleMargin),
      nameLocation: 'middle',
      axisLabel: {
        formatter: xAxisFormatter,
        rotate: xAxisLabelRotation,
      },
      minorTick: { show: minorTicks },
      minInterval:
        xAxisType === AxisType.Time && timeGrainSqla
          ? TIMEGRAIN_TO_TIMESTAMP[timeGrainSqla]
          : 0,
      ...getMinAndMaxFromBounds(
        xAxisType,
        truncateXAxis,
        xAxisMin,
        xAxisMax,
        seriesType === EchartsTimeseriesSeriesType.Bar
          ? EchartsTimeseriesSeriesType.Bar
          : undefined,
      ),
    },
    yAxis: [
      {
        ...defaultYAxis,
        type: logAxis ? 'log' : 'value',
        min: yAxisMin,
        max: yAxisMax,
        minorTick: { show: minorTicks },
        minorSplitLine: { show: minorSplitLine },
        axisLabel: {
          formatter: getYAxisFormatter(
            metrics,
            !!contributionMode,
            customFormatters,
            formatter,
            yAxisFormat,
          ),
        },
        scale: truncateYAxis,
        name: yAxisTitle,
        nameGap: convertInteger(yAxisTitleMargin),
        nameLocation: yAxisTitlePosition === 'Left' ? 'middle' : 'end',
        alignTicks,
      },
    ],
    tooltip: {
      ...getDefaultTooltip(refs),
      show: !inContextMenu,
      trigger: richTooltip ? 'axis' : 'item',
      formatter: (params: any) => {
        const xValue: number = richTooltip
          ? params[0].value[0]
          : params.value[0];
        const forecastValue: any[] = richTooltip ? params : [params];

        if (richTooltip && tooltipSortByMetric) {
          forecastValue.sort((a, b) => b.data[1] - a.data[1]);
        }

        const rows: string[][] = [];
        const forecastValues =
          extractForecastValuesFromTooltipParams(forecastValue);

        const isForecast = Object.values(forecastValues).some(
          value =>
            value.forecastTrend || value.forecastLower || value.forecastUpper,
        );

        const total = Object.values(forecastValues).reduce(
          (acc, value) =>
            value.observation !== undefined ? acc + value.observation : acc,
          0,
        );
        const showTotal = richTooltip && !isForecast;
        const keys = Object.keys(forecastValues);
        keys.forEach(key => {
          const value = forecastValues[key];
          // if there are no dimensions, key is a verbose name of a metric,
          // otherwise it is a comma separated string where the first part is metric name
          let formatterKey = groupby.length === 0 ? inverted[key] : labelMap[key]?.[0];
          const tooltipFormatter = getFormatter(
            customFormatters,
            formatter,
            metrics,
            formatterKey,
            !!contributionMode,
          );
          const row = formatForecastTooltipSeries({
            ...value,
            seriesName: key,
            formatter: tooltipFormatter,
          });
          if (showTotal && value.observation !== undefined) {
            row.push(percentFormatter.format(value.observation / (total || 1)));
          }
          rows.push(row);
        });
        if (showTotal) {
          rows.push([
            'Total',
            formatter.format(total),
            percentFormatter.format(1),
          ]);
        }
        return tooltipHtml(
          rows,
          tooltipFormatter(xValue),
          keys.findIndex(key => key === focusedSeries),
        );
      },
    },
    legend: {
      ...getLegendProps(
        legendType,
        legendOrientation,
        showLegend,
        theme,
        zoomable,
      ),
      // @ts-ignore
      data: rawSeriesA
        .filter(
          entry =>
            extractForecastSeriesContext((entry.name || '') as string).type ===
            ForecastSeriesEnum.Observation,
        )
        .map(entry => entry.name || '')
        .concat(extractAnnotationLabels(annotationLayers, annotationData)),
    },
    series: dedupSeries(series),
    toolbox: {
      show: zoomable,
      top: TIMESERIES_CONSTANTS.toolboxTop,
      right: TIMESERIES_CONSTANTS.toolboxRight,
      feature: {
        dataZoom: {
          yAxisIndex: false,
          title: {
            zoom: 'zoom area',
            back: 'restore zoom',
          },
        },
      },
    },
    dataZoom: zoomable
      ? [
          {
            type: 'slider',
            start: TIMESERIES_CONSTANTS.dataZoomStart,
            end: TIMESERIES_CONSTANTS.dataZoomEnd,
            bottom: TIMESERIES_CONSTANTS.zoomBottom,
          },
        ]
      : [],
  };

  const onFocusedSeries = (seriesName: string | null) => {
    focusedSeries = seriesName;
  };

  return {
    formData,
    width,
    height,
    echartOptions,
    setDataMask,
    emitCrossFilters,
    labelMap,
    groupby,
    seriesBreakdown: rawSeriesA.length,
    selectedValues: filterState.selectedValues || [],
    onContextMenu,
    onFocusedSeries,
    xValueFormatter: tooltipFormatter,
    xAxis: {
      label: xAxisLabel,
      type: xAxisType,
    },
    refs,
    coltypeMapping,
  };
}
