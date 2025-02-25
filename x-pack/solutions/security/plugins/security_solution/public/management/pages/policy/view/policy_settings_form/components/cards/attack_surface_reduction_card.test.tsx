/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { expectIsViewOnly, getPolicySettingsFormTestSubjects } from '../../mocks';
import type { AppContextTestRender } from '../../../../../../../common/mock/endpoint';
import { createAppRootMockRenderer } from '../../../../../../../common/mock/endpoint';
import { FleetPackagePolicyGenerator } from '../../../../../../../../common/endpoint/data_generators/fleet_package_policy_generator';
import React from 'react';
import type { AttackSurfaceReductionCardProps } from './attack_surface_reduction_card';
import {
  AttackSurfaceReductionCard,
  LOCKED_CARD_ATTACK_SURFACE_REDUCTION,
  SWITCH_LABEL,
} from './attack_surface_reduction_card';
import { useLicense as _useLicense } from '../../../../../../../common/hooks/use_license';
import { cloneDeep } from 'lodash';
import { set } from '@kbn/safer-lodash-set';
import userEvent from '@testing-library/user-event';
import { createLicenseServiceMock } from '../../../../../../../../common/license/mocks';
import { licenseService as licenseServiceMocked } from '../../../../../../../common/hooks/__mocks__/use_license';

jest.mock('../../../../../../../common/hooks/use_license');

const useLicenseMock = _useLicense as jest.Mock;

describe('Policy Attack Surface Reduction Card', () => {
  const testSubj = getPolicySettingsFormTestSubjects('test').attackSurface;

  let formProps: AttackSurfaceReductionCardProps;
  let render: () => ReturnType<AppContextTestRender['render']>;
  let renderResult: ReturnType<typeof render>;

  beforeEach(() => {
    const mockedContext = createAppRootMockRenderer();

    formProps = {
      policy: new FleetPackagePolicyGenerator('seed').generateEndpointPackagePolicy().inputs[0]
        .config.policy.value,
      onChange: jest.fn(),
      mode: 'edit',
      'data-test-subj': testSubj.card,
    };

    render = () =>
      (renderResult = mockedContext.render(<AttackSurfaceReductionCard {...formProps} />));
  });

  it('should show card in edit mode', () => {
    render();

    expect(renderResult.getByTestId(testSubj.enableDisableSwitch));
  });

  it('should show correct OS support', () => {
    render();

    expect(renderResult.getByTestId(testSubj.osValues)).toHaveTextContent('Windows');
  });

  it('should show option enabled', () => {
    render();

    expect(renderResult.getByTestId(testSubj.enableDisableSwitch)).toHaveAttribute(
      'aria-checked',
      'true'
    );
  });

  it('should show option disabled', () => {
    set(formProps.policy, 'windows.attack_surface_reduction.credential_hardening.enabled', false);
    render();

    expect(renderResult.getByTestId(testSubj.enableDisableSwitch)).toHaveAttribute(
      'aria-checked',
      'false'
    );
  });

  it('should be able to toggle to disabled', async () => {
    const expectedUpdate = cloneDeep(formProps.policy);
    set(expectedUpdate, 'windows.attack_surface_reduction.credential_hardening.enabled', false);
    render();

    expect(renderResult.getByTestId(testSubj.enableDisableSwitch)).toHaveAttribute(
      'aria-checked',
      'true'
    );

    await userEvent.click(renderResult.getByTestId(testSubj.enableDisableSwitch));

    expect(formProps.onChange).toHaveBeenCalledWith({
      isValid: true,
      updatedPolicy: expectedUpdate,
    });
  });

  it('should should be able to toggle to enabled', async () => {
    set(formProps.policy, 'windows.attack_surface_reduction.credential_hardening.enabled', false);

    const expectedUpdate = cloneDeep(formProps.policy);
    set(expectedUpdate, 'windows.attack_surface_reduction.credential_hardening.enabled', true);
    render();

    expect(renderResult.getByTestId(testSubj.enableDisableSwitch)).toHaveAttribute(
      'aria-checked',
      'false'
    );

    await userEvent.click(renderResult.getByTestId(testSubj.enableDisableSwitch));

    expect(formProps.onChange).toHaveBeenCalledWith({
      isValid: true,
      updatedPolicy: expectedUpdate,
    });
  });

  describe('and license is lower than Platinum', () => {
    beforeEach(() => {
      const licenseServiceMock = createLicenseServiceMock();
      licenseServiceMock.isPlatinumPlus.mockReturnValue(false);

      useLicenseMock.mockReturnValue(licenseServiceMock);
    });

    afterEach(() => {
      useLicenseMock.mockReturnValue(licenseServiceMocked);
    });

    it('should show locked card if license not platinum+', () => {
      render();

      expect(renderResult.getByTestId(testSubj.lockedCardTitle)).toHaveTextContent(
        LOCKED_CARD_ATTACK_SURFACE_REDUCTION
      );
    });
  });

  describe('and displayed in View Mode', () => {
    beforeEach(() => {
      formProps.mode = 'view';
    });

    it('should render in view mode', () => {
      render();

      expectIsViewOnly(renderResult.getByTestId(testSubj.card));
    });

    it('should show correct value when checked', () => {
      render();

      expect(renderResult.getByTestId(testSubj.switchLabel)).toHaveTextContent(SWITCH_LABEL);
      expect(
        renderResult.getByTestId(testSubj.enableDisableSwitch).getAttribute('aria-checked')
      ).toBe('true');
    });

    it('should show correct value when unchecked', () => {
      set(formProps.policy, 'windows.attack_surface_reduction.credential_hardening.enabled', false);
      render();

      expect(renderResult.getByTestId(testSubj.switchLabel)).toHaveTextContent(SWITCH_LABEL);
      expect(
        renderResult.getByTestId(testSubj.enableDisableSwitch).getAttribute('aria-checked')
      ).toBe('false');
    });
  });
});
