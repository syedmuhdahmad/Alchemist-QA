// @vitest-environment jsdom
// Component tests for <work item id>: <component>. Cases from qa/cases/<file>.md.
import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { <Component> } from '<relative path to the component>';

afterEach(cleanup);

describe('<Component>', () => {
  it('TC-<item>-<nn> <the condition, in words>', () => {
    render(<<Component> <props from the case> />);
    // Find controls the way a user does: by role and accessible name.
    fireEvent.click(screen.getByRole('button', { name: '<visible name>' }));
    expect(screen.getByText('<exact text from the expected result>')).toBeTruthy();
  });
});
