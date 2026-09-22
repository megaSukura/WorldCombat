PokemonIndividuals.registry.define({ id: "checks:surveyor", autonomous: true,
    matches: pokemon => String(pokemon.species()) === "cobblemon:porygon", apply: context => {
        context.frame.facts.surveyor = true;
        context.frame.capabilities.push({ id: "checks:survey", protocols: ["checks:observation"], data: {} });
    }
});
CompanionBehavior.registry.goal({ id: "checks:survey", propose: context => context.facts.surveyor ? [{ id: "survey", kind: "checks:observation", data: {} }] : [] });
CompanionBehavior.registry.method({ id: "checks:observe", propose: (_context, goal) => goal.kind === "checks:observation" ? [{ id: "inspect", data: {} }] : [],
    create: () => WorldBehavior.step(context => { CheckObservations.observe(context); context.memory.visits = (context.memory.visits || 0) + 1; return WorldBehavior.success(); }) });
