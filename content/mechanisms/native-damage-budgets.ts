/** Native damage has already passed authored/native incoming policies. These contributions reserve only real hurt attempts. */
WorldCombat.on("world_combat:damage_budgets/incoming", "world_combat:damage_incoming", "cobblemon_world_combat:incoming", event => {
    const target = event.target();
    if (target === null) return;
    const context: DamageSemantics.Incoming = { world: event.world(), source: event.actor(), target, data: JSON.parse(String(event.data())) };
    DamageBudgets.modifiers.apply(context);
    DamageBudgets.allocations.apply(context);
    event.data(JSON.stringify(context.data));
});
