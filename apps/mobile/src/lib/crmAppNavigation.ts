import type { NavigationProp, ParamListBase } from '@react-navigation/native';
import { navigateToTabScreen } from '../navigation/tabNavigation';
import type { CrmAppId } from './crmApps';

export function openCrmApp(
  appId: CrmAppId,
  navigation: NavigationProp<ParamListBase> | undefined,
): void {
  if (!navigation) return;
  switch (appId) {
    case 'contacts':
      navigateToTabScreen(navigation, 'AppsTab', 'ContactsList');
      break;
    case 'conversations':
      navigateToTabScreen(navigation, 'InboxTab', 'InboxList');
      break;
    case 'calendar':
      navigateToTabScreen(navigation, 'CalendarTab', 'CalendarList');
      break;
    case 'tasks':
      navigateToTabScreen(navigation, 'AppsTab', 'TasksHome');
      break;
    case 'opportunities':
      navigateToTabScreen(navigation, 'AppsTab', 'PipelineHome');
      break;
    default:
      break;
  }
}
