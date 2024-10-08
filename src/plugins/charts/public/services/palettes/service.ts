/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { PaletteRegistry, PaletteDefinition } from '@kbn/coloring';
import { getActivePaletteName } from '@kbn/coloring';
import type { ExpressionsSetup } from '@kbn/expressions-plugin/public';
import type { ChartsPluginSetup } from '../..';
import type { LegacyColorsService } from '../legacy_colors';

export interface PaletteSetupPlugins {
  expressions: ExpressionsSetup;
  charts: ChartsPluginSetup;
}

export class PaletteService {
  private palettes: Record<string, PaletteDefinition<unknown>> | undefined = undefined;
  constructor() {}

  public setup(colorsService: LegacyColorsService) {
    return {
      getPalettes: async (): Promise<PaletteRegistry> => {
        if (!this.palettes) {
          const { buildPalettes } = await import('./palettes');
          this.palettes = buildPalettes(colorsService);
        }
        return {
          get: (name: string) => {
            const paletteName = getActivePaletteName(name);
            return this.palettes![paletteName];
          },
          getAll: () => {
            return Object.values(this.palettes!);
          },
        };
      },
    };
  }
}
