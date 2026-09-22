EquipmentBehavior.define("checks:survey_lens", item => String(item.item()) === "checks:survey_lens",
    context => { context.frame.facts.surveyLens = true; });
CheckObservations.modifiers.define({ id: "checks:survey_lens", applies: context => context.frame.facts.surveyLens === true,
    apply: context => { context.radius += 4; } });
