/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/*
 * NOTICE: Do not edit this file manually.
 * This file is automatically generated by the OpenAPI Generator, @kbn/openapi-generator.
 *
 * info:
 *   title: Shared Alert Primitives Schema
 *   version: not applicable
 */

import { z } from '@kbn/zod';

import { NonEmptyString } from './primitives.gen';

/**
 * A list of alerts ids.
 */
export type AlertIds = z.infer<typeof AlertIds>;
export const AlertIds = z.array(NonEmptyString).min(1);

export type AlertTag = z.infer<typeof AlertTag>;
export const AlertTag = NonEmptyString;

export type AlertTags = z.infer<typeof AlertTags>;
export const AlertTags = z.array(AlertTag);

export type AlertStatus = z.infer<typeof AlertStatus>;
export const AlertStatus = z.enum(['open', 'closed', 'acknowledged', 'in-progress']);
export type AlertStatusEnum = typeof AlertStatus.enum;
export const AlertStatusEnum = AlertStatus.enum;
