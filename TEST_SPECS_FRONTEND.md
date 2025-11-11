## Test Specifications

### Frontend: hive-platform/components/features/wizard/CommunityWizard.tsx

- Functions under test:
  - CommunityWizard(props)
  - handleActivityChange(activity, checked)
  - canContinue()
  - handleContinue()
  - communitySizeSelect_onValueChange(value)
  - moderationSelect_onValueChange(value)
  - channelBudgetSlider_onValueChange(value[])
  - providerBadge_onClick(provider)
  - cancelButton_onClick()
  - backButton_onClick()
  - primaryButton_onClick()

| Function | Test Purpose | Test Inputs | Expected Output |
|---|---|---|---|
| CommunityWizard | Renders initial state | Mount with onComplete=fn, onCancel=fn | Step 1 visible, progress at ~33%, primary disabled |
| handleActivityChange | Adds activity | Check Projects | coreActivities contains "Projects" |
| handleActivityChange | Removes activity | Uncheck Projects | coreActivities does not contain "Projects" |
| canContinue | Blocks when required inputs missing | No size, no moderation, no activities | Returns false, primary disabled |
| canContinue | Allows when required inputs set | size=25-100, moderation=medium, 1 activity | Returns true, primary enabled |
| handleContinue | Advances steps | Click Continue on valid Step 1 | currentStep increments |
| communitySizeSelect_onValueChange | Updates size | Select "100-300" | communitySize is "100-300" |
| moderationSelect_onValueChange | Updates moderation | Select "high" | moderationCapacity is "high" |
| channelBudgetSlider_onValueChange | Updates budget | Move to 12 | channelBudget is [12] and label shows 12 |
| providerBadge_onClick | Sets import provider | Toggle importWorkspace true, click Slack | importProvider is "Slack" |
| cancelButton_onClick | Cancels wizard | Click Cancel | onCancel called once |
| backButton_onClick | Goes back | From Step 2 click Back | currentStep decremented |
| primaryButton_onClick | Completes flow | Reach Step 3, click Generate | onComplete called with current state snapshot |


### Frontend: hive-platform/components/features/file-hub/HubDashboard.tsx

- Functions under test:
  - getFileIcon(type)
  - getStatusIcon(status)
  - HubDashboard(props)
  - handleLinkSource(sourceId)
  - filteredFiles_predicate(file)
  - searchInput_onChange(e)
  - sourceSelect_onValueChange(value)
  - channelSelect_onValueChange(value)
  - fileCard_onClick(file)
  - closeDrawer_onClick()
  - backToChat_onClick()
  - hashDedupeSwitch_onCheckedChange(value)
  - similaritySwitch_onCheckedChange(value)
  - viewRulesButton_onClick()

| Function | Test Purpose | Test Inputs | Expected Output |
|---|---|---|---|
| getFileIcon | Returns pdf icon variant | type="pdf" | FileText icon variant rendered |
| getStatusIcon | Returns reauth icon | status="reauth" | AlertCircle icon rendered |
| HubDashboard | Renders overview tab by default | Mount with onBack=fn | Overview tab visible, tabs list present |
| handleLinkSource | Linking toasts sequence | Click Link on an unlinked source | Toast "Linking..." then "linked successfully" with fake timers |
| filteredFiles_predicate | Combined filters apply | q="design", source="Google Drive", channel="committees" | Only matching items remain |
| searchInput_onChange | Title filter | Type "design" | Only titles including "design" visible |
| sourceSelect_onValueChange | Source filter | Select Google Drive | Only Drive files visible |
| channelSelect_onValueChange | Channel filter | Select "committees" | Only files with committees tags visible |
| fileCard_onClick | Opens drawer | Click first file card | Drawer appears with details |
| closeDrawer_onClick | Closes drawer | Click × | Drawer unmounted |
| backToChat_onClick | Calls onBack | Click Back to Chat | onBack called once |
| hashDedupeSwitch_onCheckedChange | Toggles dedupe flag | Toggle switch | state.dedupeEnabled flips |
| similaritySwitch_onCheckedChange | Disabled control remains unchanged | Try toggle | Value unchanged, disabled attribute present |
| viewRulesButton_onClick | Safe no-op | Click | No error, optional handler invoked |

