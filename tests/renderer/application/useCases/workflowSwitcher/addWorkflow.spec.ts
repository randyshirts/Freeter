/*
 * Copyright: (c) 2024, Alex Kaul
 * GNU General Public License v3.0 or later (see COPYING or https://www.gnu.org/licenses/gpl-3.0.txt)
 */

import { createAddWorkflowUseCase } from '@/application/useCases/workflowSwitcher/addWorkflow';
import { AppState } from '@/base/state/app';
import { fixtureAppState } from '@tests/base/state/fixtures/appState';
import { fixtureAppStore } from '@tests/data/fixtures/appStore';
import { fixtureProjectA, fixtureProjectB } from '@tests/base/fixtures/project';
import { fixtureProjectAInColl } from '@tests/base/state/fixtures/entitiesState';
import { fixtureProjectSwitcher } from '@tests/base/state/fixtures/projectSwitcher';
import { fixtureWorkflowA, fixtureWorkflowB, fixtureWorkflowC, fixtureWorkflowSettingsA, fixtureWorkflowSettingsB, fixtureWorkflowSettingsC } from '@tests/base/fixtures/workflow';
import { createCreateWorkflowSubCase } from '@/application/useCases/workflow/subs/createWorkflow';
import { fixtureMemSaver } from '@tests/base/state/fixtures/memSaver';
import { createDeactivateWorkflowUseCase } from '@/application/useCases/memSaver/deactivateWorkflow';

const newItemId = 'NEW-ITEM-ID';

async function setup(initState: AppState) {
  const [appStore] = await fixtureAppStore(initState);
  const createWorkflowSubCase = createCreateWorkflowSubCase({
    idGenerator: () => newItemId,
  })
  const deactivateWorkflowUseCase = createDeactivateWorkflowUseCase({ appStore })
  const addWorkflowUseCase = createAddWorkflowUseCase({
    appStore,
    createWorkflowSubCase,
    deactivateWorkflowUseCase
  });
  return {
    appStore,
    addWorkflowUseCase
  }
}

beforeEach(() => {
  jest.clearAllMocks()
})

describe('addWorkflowUseCase()', () => {
  it('should do nothing, if no project is selected in the project switcher', async () => {
    const initState = fixtureAppState({
      ui: {
        projectSwitcher: fixtureProjectSwitcher({
          currentProjectId: ''
        })
      }
    })
    const {
      appStore,
      addWorkflowUseCase
    } = await setup(initState)

    const expectState = appStore.get();
    addWorkflowUseCase();

    expect(appStore.get()).toBe(expectState);
  })

  it('should do nothing, if the selected project does not exist', async () => {
    const initState = fixtureAppState({
      entities: {
        projects: fixtureProjectAInColl()
      },
      ui: {
        projectSwitcher: fixtureProjectSwitcher({
          currentProjectId: 'NO-SUCH-ITEM'
        })
      }
    })
    const {
      appStore,
      addWorkflowUseCase
    } = await setup(initState)

    const expectState = appStore.get();
    addWorkflowUseCase();

    expect(appStore.get()).toBe(expectState);
  })

  it('should add a new workflow with a right name as a last item, activate it in mem saver, and a current item in the current project state, and return the id of the new item, when the posByWorkflow is not specified', async () => {
    const workflowA = fixtureWorkflowA({ settings: fixtureWorkflowSettingsA({ name: 'Workflow 1' }) });
    const workflowB = fixtureWorkflowB({ settings: fixtureWorkflowSettingsB({ name: 'Workflow 2' }) });
    const workflowC = fixtureWorkflowC({ settings: fixtureWorkflowSettingsC({ name: 'Workflow 1' }) });
    const projectA = fixtureProjectA({ workflowIds: [workflowA.id, workflowB.id] });
    const projectB = fixtureProjectB({ workflowIds: [workflowC.id] });
    const initState = fixtureAppState({
      entities: {
        projects: {
          [projectA.id]: projectA,
          [projectB.id]: projectB,
        },
        workflows: {
          [workflowA.id]: workflowA,
          [workflowB.id]: workflowB,
          [workflowC.id]: workflowC,
        }
      },
      ui: {
        memSaver: fixtureMemSaver({
          activeWorkflows: [
            { prjId: projectB.id, wflId: workflowA.id },
          ]
        }),
        projectSwitcher: fixtureProjectSwitcher({
          currentProjectId: projectB.id,
          projectIds: [projectA.id, projectB.id]
        })
      }
    })
    const expectState: AppState = {
      ...initState,
      entities: {
        ...initState.entities,
        projects: {
          ...initState.entities.projects,
          [projectB.id]: {
            ...initState.entities.projects[projectB.id]!,
            currentWorkflowId: newItemId,
            workflowIds: [workflowC.id, newItemId]
          }
        },
        workflows: {
          ...initState.entities.workflows,
          [newItemId]: expect.objectContaining({ id: newItemId, settings: { memSaver: {}, name: 'Workflow 2' } })
        }
      },
      ui: {
        ...initState.ui,
        memSaver: {
          ...initState.ui.memSaver,
          activeWorkflows: [
            ...initState.ui.memSaver.activeWorkflows,
            { prjId: projectB.id, wflId: newItemId }
          ]
        }
      }
    }
    const {
      appStore,
      addWorkflowUseCase
    } = await setup(initState)

    const res = addWorkflowUseCase();

    const newState = appStore.get();
    expect(newState).toEqual(expectState);
    expect(res).toBe(newItemId);
  })

  it('should add a new workflow with a right name at the index of posByWorkflowId item as a current item in the current project state, activate it in mem saver, and return the id of the new item, when the posByWorkflow is specified', async () => {
    const workflowA = fixtureWorkflowA({ settings: fixtureWorkflowSettingsA({ name: 'Workflow 1' }) });
    const workflowB = fixtureWorkflowB({ settings: fixtureWorkflowSettingsB({ name: 'Workflow 1' }) });
    const workflowC = fixtureWorkflowC({ settings: fixtureWorkflowSettingsC({ name: 'Workflow 2' }) });
    const projectA = fixtureProjectA({ workflowIds: [workflowA.id] });
    const projectB = fixtureProjectB({ workflowIds: [workflowB.id, workflowC.id] });
    const initState = fixtureAppState({
      entities: {
        projects: {
          [projectA.id]: projectA,
          [projectB.id]: projectB,
        },
        workflows: {
          [workflowA.id]: workflowA,
          [workflowB.id]: workflowB,
          [workflowC.id]: workflowC,
        }
      },
      ui: {
        memSaver: fixtureMemSaver({
          activeWorkflows: [
            { prjId: projectB.id, wflId: workflowB.id },
          ]
        }),
        projectSwitcher: fixtureProjectSwitcher({
          currentProjectId: projectB.id,
          projectIds: [projectA.id, projectB.id]
        })
      }
    })
    const expectState: AppState = {
      ...initState,
      entities: {
        ...initState.entities,
        projects: {
          ...initState.entities.projects,
          [projectB.id]: {
            ...initState.entities.projects[projectB.id]!,
            currentWorkflowId: newItemId,
            workflowIds: [workflowB.id, newItemId, workflowC.id]
          }
        },
        workflows: {
          ...initState.entities.workflows,
          [newItemId]: expect.objectContaining({ id: newItemId, settings: expect.objectContaining({ name: 'Workflow 3' }) })
        }
      },
      ui: {
        ...initState.ui,
        memSaver: {
          ...initState.ui.memSaver,
          activeWorkflows: [
            ...initState.ui.memSaver.activeWorkflows,
            { prjId: projectB.id, wflId: newItemId }
          ]
        }
      }
    }
    const {
      appStore,
      addWorkflowUseCase
    } = await setup(initState)

    const res = addWorkflowUseCase(workflowC.id);

    const newState = appStore.get();
    expect(newState).toEqual(expectState);
    expect(res).toBe(newItemId);
  })

})
