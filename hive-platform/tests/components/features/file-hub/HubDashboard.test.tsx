import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { toast } from 'sonner';
import { HubDashboard } from '@/components/features/file-hub/HubDashboard';
import { FileText, AlertCircle } from 'lucide-react';

// Mock dependencies
jest.mock('sonner', () => ({
  toast: {
    success: jest.fn(),
  },
}));

// Mock lucide-react icons
jest.mock('lucide-react', () => {
  const actual = jest.requireActual('lucide-react');
  return {
    ...actual,
    FileText: jest.fn(({ className }) => <div data-testid="file-text-icon" className={className} />),
    AlertCircle: jest.fn(({ className }) => <div data-testid="alert-circle-icon" className={className} />),
  };
});

describe('HubDashboard', () => {
  let mockOnBack: jest.Mock;

  beforeEach(() => {
    mockOnBack = jest.fn();
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe('getFileIcon', () => {
    it('returns pdf icon variant', async () => {
      const user = userEvent.setup();
      render(<HubDashboard onBack={mockOnBack} />);

      // Navigate to files tab to see file cards
      const filesTab = screen.getByRole('tab', { name: /files/i });
      await user.click(filesTab);

      // Find a PDF file card (first file in mock data is "Mobile App Redesign Brief.pdf")
      const pdfCard = await screen.findByText(/Mobile App Redesign Brief\.pdf/i);
      expect(pdfCard).toBeInTheDocument();

      // Verify FileText icon is rendered for PDF type
      const fileTextIcons = screen.getAllByTestId('file-text-icon');
      expect(fileTextIcons.length).toBeGreaterThan(0);

      // Verify it has the destructive text color class
      const hasPdfIcon = fileTextIcons.some(icon =>
        icon.className.includes('text-destructive')
      );
      expect(hasPdfIcon).toBe(true);
    });
  });

  describe('getStatusIcon', () => {
    it('returns reauth icon', async () => {
      const user = userEvent.setup();
      render(<HubDashboard onBack={mockOnBack} />);

      // Navigate to sources tab
      const sourcesTab = screen.getByRole('tab', { name: /sources/i });
      await user.click(sourcesTab);

      // Find GitHub source which has "reauth" status
      const githubSource = await screen.findByText('GitHub');
      expect(githubSource).toBeInTheDocument();

      // Verify AlertCircle icon is rendered for reauth status
      const alertIcons = screen.getAllByTestId('alert-circle-icon');
      expect(alertIcons.length).toBeGreaterThan(0);

      // Verify it has the chart-4 color class
      const hasReauthIcon = alertIcons.some(icon =>
        icon.className.includes('text-chart-4')
      );
      expect(hasReauthIcon).toBe(true);
    });
  });

  describe('HubDashboard', () => {
    it('renders overview tab by default', () => {
      render(<HubDashboard onBack={mockOnBack} />);

      // Verify overview tab is selected
      const overviewTab = screen.getByRole('tab', { name: /overview/i });
      expect(overviewTab).toHaveAttribute('data-state', 'active');

      // Verify all tabs are present
      expect(screen.getByRole('tab', { name: /overview/i })).toBeInTheDocument();
      expect(screen.getByRole('tab', { name: /files/i })).toBeInTheDocument();
      expect(screen.getByRole('tab', { name: /sources/i })).toBeInTheDocument();
      expect(screen.getByRole('tab', { name: /rules/i })).toBeInTheDocument();
      expect(screen.getByRole('tab', { name: /audits/i })).toBeInTheDocument();

      // Verify tabs list is present
      const tabsList = screen.getByRole('tablist');
      expect(tabsList).toBeInTheDocument();
    });
  });

  describe('handleLinkSource', () => {
    it('linking toasts sequence', async () => {
      jest.useFakeTimers();
      const user = userEvent.setup({ delay: null });

      render(<HubDashboard onBack={mockOnBack} />);

      // Navigate to sources tab
      const sourcesTab = screen.getByRole('tab', { name: /sources/i });
      await user.click(sourcesTab);

      // Wait for sources tab content to load
      const oneDriveText = await screen.findByText('OneDrive');

      // Find the Link button for OneDrive (find the button within the same parent container)
      const oneDriveCard = oneDriveText.closest('[data-slot="card"]') || oneDriveText.closest('div').closest('div').closest('div');
      const oneDriveLinkButton = within(oneDriveCard as HTMLElement).getByRole('button', { name: /link/i });

      expect(oneDriveLinkButton).toBeDefined();
      fireEvent.click(oneDriveLinkButton!);

      // Verify first toast
      expect(toast.success).toHaveBeenCalledWith('Linking to OneDrive...');

      // Fast-forward time by 2 seconds
      jest.advanceTimersByTime(2000);

      // Wait for second toast
      await waitFor(() => {
        expect(toast.success).toHaveBeenCalledWith('OneDrive linked successfully! Full sync started.');
      });

      // Verify toast was called twice
      expect(toast.success).toHaveBeenCalledTimes(2);
    });
  });

  describe('filteredFiles_predicate', () => {
    it('combined filters apply', async () => {
      const user = userEvent.setup();
      render(<HubDashboard onBack={mockOnBack} />);

      // Navigate to files tab
      const filesTab = screen.getByRole('tab', { name: /files/i });
      await user.click(filesTab);

      // Wait for files tab content to load
      await screen.findByPlaceholderText(/search titles, text, tags/i);

      // Apply search filter for "design"
      const searchInput = screen.getByPlaceholderText(/search titles, text, tags/i);
      await user.type(searchInput, 'design');

      // Apply source filter for "Google Drive"
      const sourceSelect = screen.getByRole('combobox', { name: /source/i });
      fireEvent.pointerDown(sourceSelect);
      fireEvent.click(sourceSelect);
      const googleDriveOption = await screen.findByRole('option', { name: /^Google Drive$/i });
      fireEvent.click(googleDriveOption);

      // Apply channel filter for "committees"
      const channelSelect = screen.getByRole('combobox', { name: /channel\/subgroup/i });
      fireEvent.pointerDown(channelSelect);
      fireEvent.click(channelSelect);
      const committeesOption = await screen.findByRole('option', { name: /committees/i });
      fireEvent.click(committeesOption);

      // Verify only matching file is visible
      // "Design System Components.sketch" matches all criteria:
      // - title includes "design"
      // - source is "Google Drive"
      // - tags include "committees/design"
      await waitFor(() => {
        expect(screen.getByText(/Design System Components\.sketch/i)).toBeInTheDocument();
      });

      // Verify non-matching files are not visible
      expect(screen.queryByText(/Mobile App Redesign Brief\.pdf/i)).not.toBeInTheDocument();
      expect(screen.queryByText(/Homepage wireframes\.fig/i)).not.toBeInTheDocument();
      expect(screen.queryByText(/client-pitch\.md/i)).not.toBeInTheDocument();
    });
  });

  describe('searchInput_onChange', () => {
    it('title filter', async () => {
      const user = userEvent.setup();
      render(<HubDashboard onBack={mockOnBack} />);

      // Navigate to files tab
      const filesTab = screen.getByRole('tab', { name: /files/i });
      await user.click(filesTab);

      // Wait for files tab content to load
      await screen.findByPlaceholderText(/search titles, text, tags/i);

      // Type "design" in search input
      const searchInput = screen.getByPlaceholderText(/search titles, text, tags/i);
      await user.type(searchInput, 'design');

      // Verify only files with "design" in title are visible
      await waitFor(() => {
        expect(screen.getByText(/Mobile App Redesign Brief\.pdf/i)).toBeInTheDocument();
        expect(screen.getByText(/Design System Components\.sketch/i)).toBeInTheDocument();
      });

      // Verify files without "design" are not visible
      expect(screen.queryByText(/Homepage wireframes\.fig/i)).not.toBeInTheDocument();
      expect(screen.queryByText(/client-pitch\.md/i)).not.toBeInTheDocument();
      expect(screen.queryByText(/Meeting Notes/i)).not.toBeInTheDocument();
    });
  });

  describe('sourceSelect_onValueChange', () => {
    it('source filter', async () => {
      const user = userEvent.setup();
      render(<HubDashboard onBack={mockOnBack} />);

      // Navigate to files tab
      const filesTab = screen.getByRole('tab', { name: /files/i });
      await user.click(filesTab);

      // Wait for files tab content to load
      await screen.findByPlaceholderText(/search titles, text, tags/i);

      // Select Google Drive from source filter
      const sourceSelect = screen.getByRole('combobox', { name: /source/i });
      fireEvent.pointerDown(sourceSelect);
      fireEvent.click(sourceSelect);
      const googleDriveOption = await screen.findByRole('option', { name: /^Google Drive$/i });
      fireEvent.click(googleDriveOption);

      // Verify only Google Drive files are visible
      await waitFor(() => {
        expect(screen.getByText(/Mobile App Redesign Brief\.pdf/i)).toBeInTheDocument();
        expect(screen.getByText(/Design System Components\.sketch/i)).toBeInTheDocument();
      });

      // Verify non-Google Drive files are not visible
      expect(screen.queryByText(/Homepage wireframes\.fig/i)).not.toBeInTheDocument();
      expect(screen.queryByText(/client-pitch\.md/i)).not.toBeInTheDocument();
      expect(screen.queryByText(/Meeting Notes/i)).not.toBeInTheDocument();
      expect(screen.queryByText(/API Documentation\.pdf/i)).not.toBeInTheDocument();
    });
  });

  describe('channelSelect_onValueChange', () => {
    it('channel filter', async () => {
      const user = userEvent.setup();
      render(<HubDashboard onBack={mockOnBack} />);

      // Navigate to files tab
      const filesTab = screen.getByRole('tab', { name: /files/i });
      await user.click(filesTab);

      // Wait for files tab content to load
      await screen.findByPlaceholderText(/search titles, text, tags/i);

      // Select "committees" from channel filter
      const channelSelect = screen.getByRole('combobox', { name: /channel\/subgroup/i });
      fireEvent.pointerDown(channelSelect);
      fireEvent.click(channelSelect);
      const committeesOption = await screen.findByRole('option', { name: /committees/i });
      fireEvent.click(committeesOption);

      // Verify only files with "committees" tags are visible
      await waitFor(() => {
        expect(screen.getByText(/client-pitch\.md/i)).toBeInTheDocument();
        expect(screen.getByText(/Design System Components\.sketch/i)).toBeInTheDocument();
        expect(screen.getByText(/API Documentation\.pdf/i)).toBeInTheDocument();
      });

      // Verify files without "committees" tags are not visible
      expect(screen.queryByText(/Mobile App Redesign Brief\.pdf/i)).not.toBeInTheDocument();
      expect(screen.queryByText(/Homepage wireframes\.fig/i)).not.toBeInTheDocument();
      expect(screen.queryByText(/Meeting Notes/i)).not.toBeInTheDocument();
    });
  });

  describe('fileCard_onClick', () => {
    it('opens drawer', async () => {
      const user = userEvent.setup();
      render(<HubDashboard onBack={mockOnBack} />);

      // Navigate to files tab
      const filesTab = screen.getByRole('tab', { name: /files/i });
      await user.click(filesTab);

      // Wait for file to appear
      await screen.findByText(/Mobile App Redesign Brief\.pdf/i);

      // Click first file card
      const firstFileCard = screen.getByText(/Mobile App Redesign Brief\.pdf/i).closest('[data-slot="card"]');
      expect(firstFileCard).toBeInTheDocument();
      await user.click(firstFileCard!);

      // Verify drawer appears with file details
      await waitFor(() => {
        expect(screen.getByText('File Details')).toBeInTheDocument();
      });

      // Verify drawer sections are present
      expect(screen.getByText(/Recent Activity/i)).toBeInTheDocument();
    });
  });

  describe('closeDrawer_onClick', () => {
    it('closes drawer', async () => {
      const user = userEvent.setup();
      render(<HubDashboard onBack={mockOnBack} />);

      // Navigate to files tab
      const filesTab = screen.getByRole('tab', { name: /files/i });
      await user.click(filesTab);

      // Wait for file to appear
      await screen.findByText(/Mobile App Redesign Brief\.pdf/i);

      // Open drawer by clicking first file card
      const firstFileCard = screen.getByText(/Mobile App Redesign Brief\.pdf/i).closest('[data-slot="card"]');
      fireEvent.click(firstFileCard!);

      // Verify drawer is open
      await waitFor(() => {
        expect(screen.getByText('File Details')).toBeInTheDocument();
      });

      // Click × button to close drawer
      const closeButton = screen.getByRole('button', { name: /×/i });
      fireEvent.click(closeButton);

      // Verify drawer is closed
      await waitFor(() => {
        expect(screen.queryByText('File Details')).not.toBeInTheDocument();
      });
    });
  });

  describe('backToChat_onClick', () => {
    it('calls onBack', () => {
      render(<HubDashboard onBack={mockOnBack} />);

      // Click Back to Chat button
      const backButton = screen.getByRole('button', { name: /back to chat/i });
      fireEvent.click(backButton);

      // Verify onBack was called once
      expect(mockOnBack).toHaveBeenCalledTimes(1);
    });
  });

  describe('hashDedupeSwitch_onCheckedChange', () => {
    it('toggles dedupe flag', async () => {
      const user = userEvent.setup();
      render(<HubDashboard onBack={mockOnBack} />);

      // Navigate to rules tab
      const rulesTab = screen.getByRole('tab', { name: /rules/i });
      await user.click(rulesTab);

      // Wait for rules tab content to load
      const hashDedupeSwitch = await screen.findByRole('switch', { name: /hash-only deduplication/i });

      // Verify initial state is checked
      expect(hashDedupeSwitch).toBeChecked();

      // Toggle switch off
      fireEvent.click(hashDedupeSwitch);

      // Verify state changed
      await waitFor(() => {
        expect(hashDedupeSwitch).not.toBeChecked();
      });

      // Toggle switch back on
      fireEvent.click(hashDedupeSwitch);

      // Verify state changed again
      await waitFor(() => {
        expect(hashDedupeSwitch).toBeChecked();
      });
    });
  });

  describe('similaritySwitch_onCheckedChange', () => {
    it('disabled control remains unchanged', async () => {
      const user = userEvent.setup();
      render(<HubDashboard onBack={mockOnBack} />);

      // Navigate to rules tab
      const rulesTab = screen.getByRole('tab', { name: /rules/i });
      await user.click(rulesTab);

      // Wait for rules tab content to load and find similarity switch
      const similaritySwitch = await screen.findByRole('switch', { name: /similarity ≥ 90%/i });

      // Verify initial state is unchecked
      expect(similaritySwitch).not.toBeChecked();

      // Verify switch is disabled
      expect(similaritySwitch).toBeDisabled();

      // Try to toggle switch
      fireEvent.click(similaritySwitch);

      // Verify value remains unchanged
      expect(similaritySwitch).not.toBeChecked();

      // Verify disabled attribute is still present
      expect(similaritySwitch).toBeDisabled();
    });
  });

  describe('viewRulesButton_onClick', () => {
    it('safe no-op', async () => {
      const user = userEvent.setup();
      render(<HubDashboard onBack={mockOnBack} />);

      // Navigate to files tab
      const filesTab = screen.getByRole('tab', { name: /files/i });
      await user.click(filesTab);

      // Wait for files tab content to load and find "View rules →" button
      const viewRulesButton = await screen.findByRole('button', { name: /view rules/i });

      // Click should not throw error
      expect(() => {
        fireEvent.click(viewRulesButton);
      }).not.toThrow();

      // Verify no error occurred (component still renders)
      expect(screen.getByRole('tab', { name: /files/i })).toBeInTheDocument();
    });
  });
});
