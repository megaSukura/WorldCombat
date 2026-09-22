NativeGrowth.rules.define({ id: "checks:rewards", after: ["world_combat:native_growth"],
    apply: context => { context.recipients.forEach(recipient => { if (recipient.experience > 0) { recipient.experience += 7; recipient.ev.spe = (recipient.ev.spe || 0) + 2; } }); } });
NativeCapture.rules.define({ id: "checks:capture", after: ["world_combat_checks:quick_ball"], applies: context => context.event.kind() === "capture" && context.multiplier !== null,
    apply: context => { context.multiplier! *= 1.2; } });
