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
  buildQueryContext,
  ensureIsArray,
  normalizeOrderBy,
  PostProcessingPivot,
  QueryFormData,
  QueryObject,
  isXAxisSet,
  getXAxisColumn,
} from '@superset-ui/core';
import {
  extractExtraMetrics,
  pivotOperator,
  renameOperator,
  flattenOperator,
  isTimeComparison,
  timeComparePivotOperator,
  rollingWindowOperator,
  sortOperator,
  timeCompareOperator,
  resampleOperator,
} from '@superset-ui/chart-controls';
import { xcontorlDebug } from '../types';

export default function buildQuery(formData: QueryFormData) {
  const fd = {
    ...formData,
  };

  const queryContexts = buildQueryContext(fd, baseQueryObject => {

      // only add series limit metric if it's explicitly needed e.g. for sorting
      const extra_metrics = extractExtraMetrics(formData);

      // also add metrics for goal lines of Xcontrol chart
      extra_metrics.push({
          expressionType: "SQL",
          sqlExpression: "MIN(\"CL\"+\"STDDEV\"*3)",
          hasCustomLabel: true,
          label: "UCL",
      });
      extra_metrics.push({
          expressionType: "SQL",
          sqlExpression: "MIN(\"CL\"+\"STDDEV\"*2)",
          hasCustomLabel: true,
          label: "UCLA",
      });
      extra_metrics.push({
          expressionType: "SQL",
          sqlExpression: "MIN(\"CL\"+\"STDDEV\")",
          hasCustomLabel: true,
          label: "UCLB",
      });
      extra_metrics.push({
          expressionType: "SQL",
          sqlExpression: "MIN(case when (\"CL\"-\"STDDEV\"*3)>0 then (\"CL\"-\"STDDEV\"*3) else (0) end)",
          hasCustomLabel: true,
          label: "LCL",
      });
      extra_metrics.push({
          expressionType: "SQL",
          sqlExpression: "MIN(case when (\"CL\"-\"STDDEV\"*3)>0 then (\"CL\"-\"STDDEV\"*2) else (\"CL\"/3) end)",
          hasCustomLabel: true,
          label: "LCLA",
      });
      extra_metrics.push({
          expressionType: "SQL",
          sqlExpression: "MIN(case when (\"CL\"-\"STDDEV\"*3)>0 then (\"CL\"-\"STDDEV\") else (\"CL\"*2/3) end)",
          hasCustomLabel: true,
          label: "LCLB",
      });
      extra_metrics.push({
          expressionType: "SIMPLE",
          column: {
              column_name: "CL"
          },
          aggregate: "MIN",
          hasCustomLabel: true,
          label: "CL",
      });

      const queryObject = {
        ...baseQueryObject,
        metrics: [...(baseQueryObject.metrics || []), ...extra_metrics],
        columns: [
          ...(isXAxisSet(formData)
            ? ensureIsArray(getXAxisColumn(formData))
            : []),
          ...ensureIsArray(fd.groupby),
        ],
        series_columns: fd.groupby,
        ...(isXAxisSet(formData) ? {} : { is_timeseries: true }),
      };
      xcontorlDebug("queryObject", queryObject);

      const pivotOperatorInRuntime: PostProcessingPivot = isTimeComparison(
        fd,
        queryObject,
      )
        ? timeComparePivotOperator(fd, queryObject)
        : pivotOperator(fd, queryObject);

      const tmpQueryObject = {
        ...queryObject,
        time_offsets: isTimeComparison(fd, queryObject) ? fd.time_compare : [],
        post_processing: [
          pivotOperatorInRuntime,
          rollingWindowOperator(fd, queryObject),
          timeCompareOperator(fd, queryObject),
          resampleOperator(fd, queryObject),
          renameOperator(fd, queryObject),
          sortOperator(fd, queryObject),
          flattenOperator(fd, queryObject),
        ],
      } as QueryObject;
      xcontorlDebug("tmpQueryObject", tmpQueryObject);
      const normalizeOrderByQueryObject = normalizeOrderBy(tmpQueryObject);
      xcontorlDebug("normalizeOrderByQueryObject", normalizeOrderByQueryObject);
      return [normalizeOrderByQueryObject];
  });
  
  return {
    ...queryContexts,
    queries: [...queryContexts.queries],
  };
}
