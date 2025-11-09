import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { CommunityWizard } from '@/components/features/wizard/CommunityWizard';

// Mock the UI components
jest.mock('@/components/ui/dialog', () => ({
  Dialog: ({ children, open }: any) => (open ? <div>{children}</div> : null),
  DialogContent: ({ children }: any) => <div>{children}</div>,
  DialogHeader: ({ children }: any) => <div>{children}</div>,
  DialogTitle: ({ children }: any) => <h2>{children}</h2>,
}));

jest.mock('@/components/ui/button', () => ({
  Button: ({ children, onClick, disabled, variant }: any) => (
    <button
      onClick={onClick}
      disabled={disabled}
      data-variant={variant}
    >
      {children}
    </button>
  ),
}));

jest.mock('@/components/ui/input', () => ({
  Input: (props: any) => <input {...props} />,
}));

jest.mock('@/components/ui/label', () => ({
  Label: ({ children, htmlFor }: any) => <label htmlFor={htmlFor}>{children}</label>,
}));

jest.mock('@/components/ui/select', () => ({
  Select: ({ children, value, onValueChange }: any) => (
    <div data-testid="select-container" data-value={value}>
      {React.Children.map(children, child =>
        React.cloneElement(child, { onValueChange })
      )}
    </div>
  ),
  SelectTrigger: ({ children }: any) => <div>{children}</div>,
  SelectValue: ({ placeholder }: any) => <span>{placeholder}</span>,
  SelectContent: ({ children, onValueChange }: any) => (
    <div>
      {React.Children.map(children, child =>
        React.cloneElement(child, { onValueChange })
      )}
    </div>
  ),
  SelectItem: ({ value, children, onValueChange }: any) => (
    <button
      data-testid={`select-item-${value}`}
      onClick={() => onValueChange?.(value)}
    >
      {children}
    </button>
  ),
}));

jest.mock('@/components/ui/checkbox', () => ({
  Checkbox: ({ id, checked, onCheckedChange }: any) => (
    <input
      type="checkbox"
      id={id}
      checked={checked}
      onChange={(e) => onCheckedChange(e.target.checked)}
      data-testid={`checkbox-${id}`}
    />
  ),
}));

jest.mock('@/components/ui/slider', () => ({
  Slider: ({ value, onValueChange, min, max, step }: any) => (
    <input
      type="range"
      data-testid="slider"
      value={value[0]}
      onChange={(e) => onValueChange([parseInt(e.target.value)])}
      min={min}
      max={max}
      step={step}
    />
  ),
}));

jest.mock('@/components/ui/card', () => ({
  Card: ({ children }: any) => <div>{children}</div>,
  CardContent: ({ children }: any) => <div>{children}</div>,
  CardDescription: ({ children }: any) => <p>{children}</p>,
  CardHeader: ({ children }: any) => <div>{children}</div>,
  CardTitle: ({ children }: any) => <h3>{children}</h3>,
}));

jest.mock('@/components/ui/badge', () => ({
  Badge: ({ children, onClick, variant }: any) => (
    <span
      onClick={onClick}
      data-variant={variant}
      data-testid={`badge-${children}`}
    >
      {children}
    </span>
  ),
}));

jest.mock('@/components/ui/progress', () => ({
  Progress: ({ value }: any) => (
    <div data-testid="progress" data-value={value}>{value}%</div>
  ),
}));

jest.mock('@/components/ui/tooltip', () => ({
  Tooltip: ({ children }: any) => <div>{children}</div>,
  TooltipContent: ({ children }: any) => <div>{children}</div>,
  TooltipProvider: ({ children }: any) => <div>{children}</div>,
  TooltipTrigger: ({ children }: any) => <div>{children}</div>,
}));

jest.mock('lucide-react', () => ({
  HelpCircle: () => <div>Help Icon</div>,
}));

describe('CommunityWizard', () => {
  let mockOnComplete: jest.Mock;
  let mockOnCancel: jest.Mock;

  beforeEach(() => {
    mockOnComplete = jest.fn();
    mockOnCancel = jest.fn();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Initial State', () => {
    it('renders initial state with Step 1 visible, progress at ~33%, and primary button disabled', () => {
      render(<CommunityWizard onComplete={mockOnComplete} onCancel={mockOnCancel} />);

      // Check Step 1 is visible
      expect(screen.getByText('Step 1 of 3')).toBeInTheDocument();

      // Check progress is at ~33% (1/3 * 100)
      const progressBar = screen.getByTestId('progress');
      expect(progressBar).toHaveAttribute('data-value', '33.33333333333333');

      // Check primary button (Continue) is disabled
      const continueButton = screen.getByRole('button', { name: /continue/i });
      expect(continueButton).toBeDisabled();

      // Check Step 1 content is visible
      expect(screen.getByText('Community Size')).toBeInTheDocument();
      expect(screen.getByText('Core Activities')).toBeInTheDocument();
      expect(screen.getByText('Moderation Capacity')).toBeInTheDocument();
    });
  });

  describe('handleActivityChange', () => {
    it('adds activity when checked', () => {
      render(<CommunityWizard onComplete={mockOnComplete} onCancel={mockOnCancel} />);

      const projectsCheckbox = screen.getByTestId('checkbox-Projects');

      // Initially unchecked
      expect(projectsCheckbox).not.toBeChecked();

      // Check Projects
      fireEvent.click(projectsCheckbox);

      // Verify it's now checked
      expect(projectsCheckbox).toBeChecked();
    });

    it('removes activity when unchecked', () => {
      render(<CommunityWizard onComplete={mockOnComplete} onCancel={mockOnCancel} />);

      const projectsCheckbox = screen.getByTestId('checkbox-Projects');

      // Check Projects first
      fireEvent.click(projectsCheckbox);
      expect(projectsCheckbox).toBeChecked();

      // Uncheck Projects
      fireEvent.click(projectsCheckbox);

      // Verify it's now unchecked
      expect(projectsCheckbox).not.toBeChecked();
    });
  });

  describe('canContinue', () => {
    it('blocks when required inputs are missing (no size, no moderation, no activities)', () => {
      render(<CommunityWizard onComplete={mockOnComplete} onCancel={mockOnCancel} />);

      const continueButton = screen.getByRole('button', { name: /continue/i });

      // Primary button should be disabled
      expect(continueButton).toBeDisabled();
    });

    it('allows when required inputs are set (size=25-100, moderation=medium, 1 activity)', () => {
      render(<CommunityWizard onComplete={mockOnComplete} onCancel={mockOnCancel} />);

      // Set community size
      const sizeButton = screen.getByTestId('select-item-25-100');
      fireEvent.click(sizeButton);

      // Set moderation capacity
      const moderationButton = screen.getByTestId('select-item-medium');
      fireEvent.click(moderationButton);

      // Check one activity
      const projectsCheckbox = screen.getByTestId('checkbox-Projects');
      fireEvent.click(projectsCheckbox);

      // Primary button should now be enabled
      const continueButton = screen.getByRole('button', { name: /continue/i });
      expect(continueButton).not.toBeDisabled();
    });
  });

  describe('handleContinue', () => {
    it('advances steps when Continue is clicked on valid Step 1', () => {
      render(<CommunityWizard onComplete={mockOnComplete} onCancel={mockOnCancel} />);

      // Fill required fields
      fireEvent.click(screen.getByTestId('select-item-25-100'));
      fireEvent.click(screen.getByTestId('select-item-medium'));
      fireEvent.click(screen.getByTestId('checkbox-Projects'));

      // Click Continue
      const continueButton = screen.getByRole('button', { name: /continue/i });
      fireEvent.click(continueButton);

      // Should now be on Step 2
      expect(screen.getByText('Step 2 of 3')).toBeInTheDocument();
      expect(screen.getByText('Import Current Workspace')).toBeInTheDocument();
    });
  });

  describe('communitySizeSelect_onValueChange', () => {
    it('updates size when "100-300" is selected', () => {
      render(<CommunityWizard onComplete={mockOnComplete} onCancel={mockOnCancel} />);

      const sizeButton = screen.getByTestId('select-item-100-300');
      fireEvent.click(sizeButton);

      // Navigate to step 3 to verify the value was stored
      // First, complete required fields
      fireEvent.click(screen.getByTestId('select-item-medium'));
      fireEvent.click(screen.getByTestId('checkbox-Projects'));
      fireEvent.click(screen.getByRole('button', { name: /continue/i }));

      // Move to step 3
      fireEvent.click(screen.getByRole('button', { name: /continue/i }));

      // Verify the size is displayed in the review
      expect(screen.getByText('100-300')).toBeInTheDocument();
    });
  });

  describe('moderationSelect_onValueChange', () => {
    it('updates moderation when "high" is selected', () => {
      render(<CommunityWizard onComplete={mockOnComplete} onCancel={mockOnCancel} />);

      const moderationButton = screen.getByTestId('select-item-high');
      fireEvent.click(moderationButton);

      // Complete required fields and navigate to step 3
      fireEvent.click(screen.getByTestId('select-item-25-100'));
      fireEvent.click(screen.getByTestId('checkbox-Projects'));
      fireEvent.click(screen.getByRole('button', { name: /continue/i }));
      fireEvent.click(screen.getByRole('button', { name: /continue/i }));

      // Verify the moderation level is displayed (text content is lowercase, but CSS capitalizes it)
      expect(screen.getByText('high')).toBeInTheDocument();
    });
  });

  describe('channelBudgetSlider_onValueChange', () => {
    it('updates budget when moved to 12 and label shows 12', () => {
      render(<CommunityWizard onComplete={mockOnComplete} onCancel={mockOnCancel} />);

      // Initially should show 10 (default value)
      expect(screen.getByText('Channel Budget: 10')).toBeInTheDocument();

      // Move slider to 12
      const slider = screen.getByTestId('slider');
      fireEvent.change(slider, { target: { value: '12' } });

      // Label should now show 12
      expect(screen.getByText('Channel Budget: 12')).toBeInTheDocument();

      // Verify on step 3
      fireEvent.click(screen.getByTestId('select-item-25-100'));
      fireEvent.click(screen.getByTestId('select-item-medium'));
      fireEvent.click(screen.getByTestId('checkbox-Projects'));
      fireEvent.click(screen.getByRole('button', { name: /continue/i }));
      fireEvent.click(screen.getByRole('button', { name: /continue/i }));

      expect(screen.getByText('12 channels')).toBeInTheDocument();
    });
  });

  describe('providerBadge_onClick', () => {
    it('sets import provider when importWorkspace is true and Slack badge is clicked', () => {
      render(<CommunityWizard onComplete={mockOnComplete} onCancel={mockOnCancel} />);

      // Navigate to Step 2
      fireEvent.click(screen.getByTestId('select-item-25-100'));
      fireEvent.click(screen.getByTestId('select-item-medium'));
      fireEvent.click(screen.getByTestId('checkbox-Projects'));
      fireEvent.click(screen.getByRole('button', { name: /continue/i }));

      // Enable import workspace
      const importCheckbox = screen.getByTestId('checkbox-import');
      fireEvent.click(importCheckbox);

      // Click Slack badge
      const slackBadge = screen.getByTestId('badge-Slack');
      fireEvent.click(slackBadge);

      // Navigate to step 3 to verify
      fireEvent.click(screen.getByRole('button', { name: /continue/i }));

      // Should show Slack in the review
      expect(screen.getByText('Import From')).toBeInTheDocument();
      expect(screen.getByText('Slack')).toBeInTheDocument();
    });
  });

  describe('cancelButton_onClick', () => {
    it('calls onCancel once when Cancel button is clicked', () => {
      render(<CommunityWizard onComplete={mockOnComplete} onCancel={mockOnCancel} />);

      const cancelButton = screen.getByRole('button', { name: /cancel/i });
      fireEvent.click(cancelButton);

      expect(mockOnCancel).toHaveBeenCalledTimes(1);
    });
  });

  describe('backButton_onClick', () => {
    it('decrements currentStep when Back button is clicked from Step 2', () => {
      render(<CommunityWizard onComplete={mockOnComplete} onCancel={mockOnCancel} />);

      // Navigate to Step 2
      fireEvent.click(screen.getByTestId('select-item-25-100'));
      fireEvent.click(screen.getByTestId('select-item-medium'));
      fireEvent.click(screen.getByTestId('checkbox-Projects'));
      fireEvent.click(screen.getByRole('button', { name: /continue/i }));

      // Verify we're on Step 2
      expect(screen.getByText('Step 2 of 3')).toBeInTheDocument();

      // Click Back
      const backButton = screen.getByRole('button', { name: /back/i });
      fireEvent.click(backButton);

      // Should be back on Step 1
      expect(screen.getByText('Step 1 of 3')).toBeInTheDocument();
      expect(screen.getByText('Community Size')).toBeInTheDocument();
    });
  });

  describe('primaryButton_onClick', () => {
    it('calls onComplete with current state snapshot when Generate is clicked on Step 3', () => {
      render(<CommunityWizard onComplete={mockOnComplete} onCancel={mockOnCancel} />);

      // Fill Step 1
      fireEvent.click(screen.getByTestId('select-item-100-300'));
      fireEvent.click(screen.getByTestId('select-item-high'));
      fireEvent.click(screen.getByTestId('checkbox-Projects'));
      fireEvent.click(screen.getByTestId('checkbox-Events'));

      // Move slider
      const slider = screen.getByTestId('slider');
      fireEvent.change(slider, { target: { value: '15' } });

      // Go to Step 2
      fireEvent.click(screen.getByRole('button', { name: /continue/i }));

      // Fill Step 2
      fireEvent.click(screen.getByTestId('checkbox-import'));
      fireEvent.click(screen.getByTestId('badge-Discord'));

      // Go to Step 3
      fireEvent.click(screen.getByRole('button', { name: /continue/i }));

      // Click Generate Recommendations
      const generateButton = screen.getByRole('button', { name: /generate recommendations/i });
      fireEvent.click(generateButton);

      // Verify onComplete was called with the correct data
      expect(mockOnComplete).toHaveBeenCalledTimes(1);
      expect(mockOnComplete).toHaveBeenCalledWith({
        communitySize: '100-300',
        coreActivities: ['Projects', 'Events'],
        moderationCapacity: 'high',
        channelBudget: [15],
        importWorkspace: true,
        importProvider: 'Discord',
      });
    });
  });

  describe('Edge Cases', () => {
    it('does not show Back button on Step 1', () => {
      render(<CommunityWizard onComplete={mockOnComplete} onCancel={mockOnCancel} />);

      expect(screen.queryByRole('button', { name: /back/i })).not.toBeInTheDocument();
    });

    it('shows provider badges only when importWorkspace is checked', () => {
      render(<CommunityWizard onComplete={mockOnComplete} onCancel={mockOnCancel} />);

      // Navigate to Step 2
      fireEvent.click(screen.getByTestId('select-item-25-100'));
      fireEvent.click(screen.getByTestId('select-item-medium'));
      fireEvent.click(screen.getByTestId('checkbox-Projects'));
      fireEvent.click(screen.getByRole('button', { name: /continue/i }));

      // Provider badges should not be visible initially
      expect(screen.queryByTestId('badge-Slack')).not.toBeInTheDocument();
      expect(screen.queryByTestId('badge-Discord')).not.toBeInTheDocument();

      // Enable import workspace
      fireEvent.click(screen.getByTestId('checkbox-import'));

      // Provider badges should now be visible
      expect(screen.getByTestId('badge-Slack')).toBeInTheDocument();
      expect(screen.getByTestId('badge-Discord')).toBeInTheDocument();
    });

    it('displays all selected activities on Step 3 review', () => {
      render(<CommunityWizard onComplete={mockOnComplete} onCancel={mockOnCancel} />);

      // Select multiple activities
      fireEvent.click(screen.getByTestId('checkbox-Projects'));
      fireEvent.click(screen.getByTestId('checkbox-Events'));
      fireEvent.click(screen.getByTestId('checkbox-Support'));

      // Complete required fields
      fireEvent.click(screen.getByTestId('select-item-25-100'));
      fireEvent.click(screen.getByTestId('select-item-medium'));

      // Navigate to Step 3
      fireEvent.click(screen.getByRole('button', { name: /continue/i }));
      fireEvent.click(screen.getByRole('button', { name: /continue/i }));

      // Verify all activities are shown
      expect(screen.getByText('Projects')).toBeInTheDocument();
      expect(screen.getByText('Events')).toBeInTheDocument();
      expect(screen.getByText('Support')).toBeInTheDocument();
    });

    it('renders in embedded mode when embedded prop is true', () => {
      const { container } = render(
        <CommunityWizard
          onComplete={mockOnComplete}
          onCancel={mockOnCancel}
          embedded={true}
        />
      );

      // In embedded mode, the component should not be wrapped in Dialog
      // The container should have the flex flex-col h-full classes
      expect(container.firstChild).toHaveClass('flex', 'flex-col', 'h-full');
    });
  });
});
