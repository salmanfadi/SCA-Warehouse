// jest-dom adds custom jest matchers for asserting on DOM nodes.
// allows you to do things like:
// expect(element).toBeInTheDocument();
// learn more: https://github.com/testing-library/jest-dom
import '@testing-library/jest-dom';

// Mock the QueryClient to avoid issues with React Query in tests
jest.mock('@tanstack/react-query', () => {
  const originalModule = jest.requireActual('@tanstack/react-query');
  return {
    ...originalModule,
    QueryClient: jest.fn().mockImplementation(() => ({
      invalidateQueries: jest.fn(),
      getQueryCache: jest.fn(),
      getQueryData: jest.fn(),
      setQueryData: jest.fn(),
      getDefaultOptions: jest.fn(),
      setDefaultOptions: jest.fn(),
      mount: jest.fn(),
      unmount: jest.fn(),
    })),
  };
});

// Mock the Supabase client
jest.mock('@/lib/supabase', () => ({
  executeQuery: jest.fn(),
}));

// Mock the toast notifications
jest.mock('@/components/ui/use-toast', () => ({
  useToast: jest.fn().mockReturnValue({
    toast: jest.fn(),
  }),
}));
