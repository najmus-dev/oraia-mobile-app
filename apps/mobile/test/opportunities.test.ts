import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  defaultStageIdForPipeline,
  extractOpportunityId,
  formatOpportunityMoney,
  formValuesToOpportunityPayload,
  validateOpportunityForm,
} from '../src/lib/opportunities';

describe('validateOpportunityForm', () => {
  it('requires core fields', () => {
    assert.match(
      validateOpportunityForm({
        name: '',
        contactId: '',
        monetaryValue: '',
        pipelineId: '',
        pipelineStageId: '',
        status: 'open',
        source: '',
        businessName: '',
        assignedTo: '',
      }) ?? '',
      /deal name/i,
    );
  });

  it('accepts valid values', () => {
    assert.equal(
      validateOpportunityForm({
        name: 'New deal',
        contactId: 'con_1',
        monetaryValue: '5000',
        pipelineId: 'pipe_1',
        pipelineStageId: 'stage_1',
        status: 'open',
        source: '',
        businessName: '',
        assignedTo: '',
      }),
      null,
    );
  });

  it('rejects invalid monetary value', () => {
    assert.match(
      validateOpportunityForm({
        name: 'Deal',
        contactId: 'con_1',
        monetaryValue: 'not-a-number',
        pipelineId: 'pipe_1',
        pipelineStageId: 'stage_1',
        status: 'open',
        source: '',
        businessName: '',
        assignedTo: '',
      }) ?? '',
      /valid deal value/i,
    );
  });

  it('rejects phone number as contact id', () => {
    assert.match(
      validateOpportunityForm({
        name: 'Deal',
        contactId: '+16722308793',
        monetaryValue: '',
        pipelineId: 'pipe_1',
        pipelineStageId: 'stage_1',
        status: 'open',
        source: '',
        businessName: '',
        assignedTo: '',
      }) ?? '',
      /phone number/i,
    );
  });
});

describe('formValuesToOpportunityPayload', () => {
  it('includes optional GHL fields when set', () => {
    const payload = formValuesToOpportunityPayload({
      name: 'Acme',
      contactId: 'con_1',
      monetaryValue: '1200',
      pipelineId: 'pipe_1',
      pipelineStageId: 'stage_1',
      status: 'won',
      source: 'Referral',
      businessName: 'Acme LLC',
      assignedTo: 'user_1',
    });
    assert.equal(payload.status, 'won');
    assert.equal(payload.source, 'Referral');
    assert.equal(payload.companyName, 'Acme LLC');
    assert.equal(payload.assignedTo, 'user_1');
    assert.equal(payload.monetaryValue, 1200);
  });

  it('omits empty optional fields', () => {
    const payload = formValuesToOpportunityPayload({
      name: 'Acme',
      contactId: 'con_1',
      monetaryValue: '',
      pipelineId: 'pipe_1',
      pipelineStageId: 'stage_1',
      status: 'open',
      source: '',
      businessName: '',
      assignedTo: '',
    });
    assert.equal(payload.source, undefined);
    assert.equal(payload.companyName, undefined);
    assert.equal(payload.assignedTo, undefined);
    assert.equal(payload.monetaryValue, undefined);
  });
});

describe('formatOpportunityMoney', () => {
  it('formats USD amounts', () => {
    assert.match(formatOpportunityMoney(1000), /\$1,000|\$1000/);
  });
});

describe('extractOpportunityId', () => {
  it('reads nested opportunity id', () => {
    assert.equal(extractOpportunityId({ opportunity: { id: 'opp_1' } }), 'opp_1');
  });

  it('reads root id', () => {
    assert.equal(extractOpportunityId({ id: 'opp_2' }), 'opp_2');
  });
});

describe('defaultStageIdForPipeline', () => {
  it('returns first stage id', () => {
    assert.equal(
      defaultStageIdForPipeline(
        [{ id: 'p1', name: 'Sales', stages: [{ id: 's1', name: 'New' }] }],
        'p1',
      ),
      's1',
    );
  });
});
