# Signal Garden language preview

Status: Non-executable design material

The executable architecture is
[`signal-garden.c4ml`](signal-garden.c4ml). This companion document preserves
three proposed authoring ideas that are intentionally outside the current
`draft-1` grammar. Keeping them here prevents a runnable demonstration from
showing misleading parser errors while the public syntax remains open.

## Element tags

Proposed intent: attach searchable classifications to a semantic element
without changing its C4 kind or identity.

```c4ml
tags = [core, cultivation]
```

## Visual Group

Proposed intent: organize already visible systems inside a view without
changing semantic ownership or view eligibility.

```c4ml
group cultivation-services {
  title = "Cultivation Services"
  description = "Systems participating in cultivation planning."
  members = [signal-garden, weather-beacon]
  keep-together = true
  padding = 32
}
```

## View presentation

Proposed intent: select a semantic diagram theme independently of architecture
and local workbench settings.

```c4ml
presentation {
  theme = c4ml-blue
}
```

These snippets are review material, not a compatibility commitment. Their
final spelling and structure may change when the corresponding language slices
are designed and accepted.
