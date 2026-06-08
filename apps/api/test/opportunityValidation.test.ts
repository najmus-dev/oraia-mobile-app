import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  parseMonetaryValue,
  validateOpportunityCreateBody,
} from '../src/lib/opportunityValidation';

describe('validateOpportunityCreateBody', () => {
  it('accepts a valid create payload', () => {
    const body = validateOpportunityCreateBody({
      name: 'Jane — HVAC',
      pipelineId: 'pipe_1',
      pipelineStageId: 'stage_1',
      contactId: 'con_1',
      monetaryValue: 4500,
    });
    assert.deepEqual(body, {
      name: 'Jane — HVAC',
      pipelineId: 'pipe_1',
      pipelineStageId: 'stage_1',
      contactId: 'con_1',
      status: 'open',
      monetaryValue: 4500,
    });
  });

  it('defaults status to open', () => {
    const body = validateOpportunityCreateBody({
      name: 'Deal',
      pipelineId: 'p',
      pipelineStageId: 's',
      contactId: 'c',
    });
    assert.equal(body.status, 'open');
  });

  it('rejects missing name', () => {
    assert.throws(
      () =>
        validateOpportunityCreateBody({
          pipelineId: 'p',
          pipelineStageId: 's',
          contactId: 'c',
        }),
      /name is required/,
    );
  });

  it('rejects missing contactId', () => {
    assert.throws(
      () =>
        validateOpportunityCreateBody({
          name: 'Deal',
          pipelineId: 'p',
          pipelineStageId: 's',
        }),
      /contactId is required/,
    );
  });

  it('rejects invalid monetaryValue', () => {
    assert.throws(
      () =>
        validateOpportunityCreateBody({
          name: 'Deal',
          pipelineId: 'p',
          pipelineStageId: 's',
          contactId: 'c',
          monetaryValue: 'abc',
        }),
      /monetaryValue/,
    );
  });

  it('accepts optional source, companyName, and assignedTo', () => {
    const body = validateOpportunityCreateBody({
      name: 'Deal',
      pipelineId: 'p',
      pipelineStageId: 's',
      contactId: 'c',
      status: 'won',
      source: 'Web',
      companyName: 'Acme',
      assignedTo: 'user_9',
    });
    assert.equal(body.source, 'Web');
    assert.equal(body.companyName, 'Acme');
    assert.equal(body.assignedTo, 'user_9');
    assert.equal(body.status, 'won');
  });
});

describe('parseMonetaryValue', () => {
  it('parses currency strings', () => {
    assert.equal(parseMonetaryValue('$1,250.50'), 1250.5);
  });
});
