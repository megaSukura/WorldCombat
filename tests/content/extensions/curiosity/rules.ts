NativeAbilities.define("checks:curiosity", {}, { behavior: (_context, data) => { data.frame.facts.surveyCuriosity = true; } });
CheckObservations.modifiers.define({ id: "checks:curiosity", after: ["checks:survey_lens"], applies: context => context.frame.facts.surveyCuriosity === true,
    apply: context => { context.radius *= 2; } });
