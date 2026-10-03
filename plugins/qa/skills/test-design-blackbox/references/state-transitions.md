# State transition testing

CTFL v4.0.1, section 4.2.4. Use when the feature behaves differently depending on what happened before, such as an order, a session, or a form being sent.

1. Name the states, the events, and the transition each event causes in each state. Draw it as a table: state, event, next state, result.
2. Cover every valid transition at least once.
3. Add the invalid transitions that matter: an event in a state where it must do nothing, such as sending an order a second time while the first is still being sent.
4. For high risk, add sequences that return to a state, such as fail, retry, succeed.
5. Each case lists its sequence of events and the state and result expected after each one.
