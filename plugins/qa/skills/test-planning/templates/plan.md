---
work_item: "<work item id, or release-<version>>"
estimate_hours: <total hours, a number>
---

# Test plan: <title>

## Scope

In scope: <work items, features, platforms>.

Out of scope: <each exclusion, with its reason>.

## Approach

| Risk level | Risks | Techniques | Test levels | Review | Runs |
| --- | --- | --- | --- | --- | --- |
| <high, medium, or low> | <R-<item>-<n>, ...> | <techniques> | <component, integration, system> | <none, sampled, every case> | <smoke, regression, full> |

Platforms: <from the profile, such as web, Android phone, Android tablet>.

## Entry criteria

- <a condition that must hold before execution starts>

## Exit criteria

- <a condition checkable from qa/trace.json or qa/defects/>
- No result rests on an assumption the owner has not confirmed.

## Estimate

| Work | Count | Hours each | Hours |
| --- | --- | --- | --- |
| <cases at one level, review, defect reports, reruns> | <n> | <h> | <n x h> |
| **Total** | | | **<sum>** |

## Priority order

1. <R-<item>-<n> (high): what is tested, and why it comes first>
