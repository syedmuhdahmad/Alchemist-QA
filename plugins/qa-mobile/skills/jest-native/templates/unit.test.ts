// Unit tests for <work item id>: <source module>. Cases from qa/cases/<file>.md.
import { <function under test> } from '<relative path to the module>';

describe('<module name>', () => {
  // One `it` per case. The title starts with the case id, so the trace links it.
  it('TC-<item>-<nn> <the condition, in words>', () => {
    // Input from the case's "Input and steps" column.
    const result = <function under test>(<input>);
    // Expected value copied from the case's "Expected result" column, never worked out from the code.
    expect(result).toBe(<expected>);
  });
});
