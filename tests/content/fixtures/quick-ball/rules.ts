// Minimal quick-ball fixture so capture composition checks never depend on a shipped item unit.
NativeCapture.rules.define({ id: "world_combat_checks:quick_ball", after: ["world_combat:capture_encounter"],
    applies: context => context.event.kind() === "capture" && String(context.event.ball()) === "cobblemon:quick_ball",
    apply: context => { context.multiplier = context.data.age <= 200 ? 5 : 1; } });
