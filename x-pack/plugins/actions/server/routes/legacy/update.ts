/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';
import { UsageCounter } from '@kbn/usage-collection-plugin/server';
import { IRouter } from '@kbn/core/server';
import { ILicenseState, verifyApiAccess, isErrorThatHandlesItsOwnResponse } from '../../lib';
import { BASE_ACTION_API_PATH } from '../../../common';
import { ActionsRequestHandlerContext } from '../../types';
import { trackLegacyRouteUsage } from '../../lib/track_legacy_route_usage';
import { connectorResponseSchemaV1 } from '../../../common/routes/connector/response';

const paramSchema = schema.object({
  id: schema.string({
    meta: { description: 'An identifier for the connector.' },
  }),
});

const bodySchema = schema.object({
  name: schema.string(),
  config: schema.recordOf(schema.string(), schema.any(), { defaultValue: {} }),
  secrets: schema.recordOf(schema.string(), schema.any(), { defaultValue: {} }),
});

export const updateActionRoute = (
  router: IRouter<ActionsRequestHandlerContext>,
  licenseState: ILicenseState,
  usageCounter?: UsageCounter
) => {
  router.put(
    {
      path: `${BASE_ACTION_API_PATH}/action/{id}`,
      options: {
        access: 'public',
        summary: `Update a connector`,
        // @ts-expect-error TODO(https://github.com/elastic/kibana/issues/196095): Replace {RouteDeprecationInfo}
        deprecated: true,
        tags: ['oas-tag:connectors'],
      },
      validate: {
        request: {
          body: bodySchema,
          params: paramSchema,
        },
        response: {
          200: {
            description: 'Indicates a successful call.',
            body: () => connectorResponseSchemaV1,
          },
        },
      },
    },
    router.handleLegacyErrors(async function (context, req, res) {
      verifyApiAccess(licenseState);
      if (!context.actions) {
        return res.badRequest({ body: 'RouteHandlerContext is not registered for actions' });
      }
      const actionsClient = (await context.actions).getActionsClient();
      const { id } = req.params;
      const { name, config, secrets } = req.body;
      trackLegacyRouteUsage('update', usageCounter);

      try {
        return res.ok({
          body: await actionsClient.update({
            id,
            action: { name, config, secrets },
          }),
        });
      } catch (e) {
        if (isErrorThatHandlesItsOwnResponse(e)) {
          return e.sendResponse(res);
        }
        throw e;
      }
    })
  );
};
