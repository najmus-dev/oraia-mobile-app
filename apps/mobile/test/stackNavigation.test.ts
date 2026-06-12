import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

type StackRoute = { name: string; params?: object };

const WIZARD_FLOW_SCREENS = new Set([
  'PickContact',
  'PickContactForMessage',
  'OpportunityForm',
  'SelectAssignees',
  'TaskForm',
  'TaskFilters',
  'ContactForm',
  'ScanBusinessCard',
  'ScheduleAppointment',
  'AppointmentForm',
]);

function trailingWizardStart(routes: StackRoute[]): number {
  let start = routes.length;
  for (let i = routes.length - 1; i >= 0; i -= 1) {
    if (WIZARD_FLOW_SCREENS.has(routes[i].name)) {
      start = i;
    } else {
      break;
    }
  }
  return start;
}

function buildFinishRoutes(routes: StackRoute[], target: StackRoute): StackRoute[] {
  const wizardStart = trailingWizardStart(routes);
  const beforeWizard = routes.slice(0, wizardStart);
  if (!beforeWizard.length) return [target];
  const anchor = beforeWizard[beforeWizard.length - 1];
  if (anchor.name === target.name) {
    return [...beforeWizard.slice(0, -1), target];
  }
  return [...beforeWizard, target];
}

describe('returnToScreen routing', () => {
  it('collapses picker screens above the target form', () => {
    const routes: StackRoute[] = [
      { name: 'PipelineHome' },
      { name: 'OpportunityForm', params: { pipelineId: 'p1' } },
      { name: 'SelectAssignees' },
    ];
    const index = routes.findIndex((r) => r.name === 'OpportunityForm');
    const next = routes.slice(0, index + 1).map((route, i) =>
      i === index
        ? { name: route.name, params: { ...(route.params ?? {}), pickedAssignee: { id: 'u1', name: 'Sam' } } }
        : route,
    );
    assert.equal(next.length, 2);
    assert.equal(next[1].name, 'OpportunityForm');
    assert.deepEqual((next[1].params as { pickedAssignee: { id: string } }).pickedAssignee.id, 'u1');
  });
});

describe('finishWizardFlow routing', () => {
  it('drops pick contact and form after opportunity create', () => {
    const next = buildFinishRoutes(
      [
        { name: 'PipelineHome' },
        { name: 'PickContact' },
        { name: 'OpportunityForm' },
      ],
      { name: 'OpportunityDetail', params: { opportunityId: 'opp_1' } },
    );
    assert.deepEqual(next, [
      { name: 'PipelineHome' },
      { name: 'OpportunityDetail', params: { opportunityId: 'opp_1' } },
    ]);
  });

  it('refreshes opportunity detail after edit from detail screen', () => {
    const next = buildFinishRoutes(
      [
        { name: 'PipelineHome' },
        { name: 'OpportunityDetail', params: { opportunityId: 'opp_1' } },
        { name: 'OpportunityForm' },
      ],
      { name: 'OpportunityDetail', params: { opportunityId: 'opp_1', title: 'Deal' } },
    );
    assert.deepEqual(next, [
      { name: 'PipelineHome' },
      { name: 'OpportunityDetail', params: { opportunityId: 'opp_1', title: 'Deal' } },
    ]);
  });

  it('keeps contact detail when saving task from contact context', () => {
    const next = buildFinishRoutes(
      [
        { name: 'ContactDetail', params: { contactId: 'con_1' } },
        { name: 'TaskForm' },
        { name: 'PickContact' },
        { name: 'TaskForm' },
      ],
      { name: 'TasksHome' },
    );
    assert.deepEqual(next, [
      { name: 'ContactDetail', params: { contactId: 'con_1' } },
      { name: 'TasksHome' },
    ]);
  });
});
