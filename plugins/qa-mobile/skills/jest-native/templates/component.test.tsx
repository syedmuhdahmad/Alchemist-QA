// Component tests for <work item id>: <component>. Cases from qa/cases/<file>.md.
import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react-native';
import { <Component> } from '<relative path to the component>';

describe('<Component>', () => {
  it('TC-<item>-<nn> <the condition, in words>', () => {
    render(<<Component> <props from the case> />);
    // Find controls the way a screen reader user does: by role and accessible name.
    fireEvent.press(screen.getByRole('button', { name: '<accessible name from the case>' }));
    expect(screen.getByText('<exact text from the expected result>')).toBeTruthy();
  });
});
