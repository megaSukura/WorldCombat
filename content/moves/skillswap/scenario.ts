/** Exercise one-sided native refusal, actual paired abilities, and exact cleanup. */
let skillswapCheckTarget = "", skillswapRefused = false, skillswapRolledBack = false;
let skillswapPaired = false, skillswapRestored = false, skillswapClearing = false;
WorldCombat.on("world_combat:checks/skillswap_refuse", "world_combat:mob_effect_incoming", "", event => {
    const data = JSON.parse(event.data()), target = event.target();
    if (!skillswapRefused && target && String(target.ref()).indexOf(skillswapCheckTarget) === 0 && data.id === "world_combat:skillswap_shift") {
        skillswapRefused = true; event.reject("fixture-second-side-refused");
    }
});
WorldCombat.on("world_combat:checks/skillswap_pair", "world_combat:committed", "", event => {
    const action = event.action(), target = event.target();
    if (!action || action.content() !== "world_combat:skillswap" || !target) return;
    action.after(2, current => {
        const world = current.sense(), own = current.actor();
        const a = PokemonSkills.skillswapAbility(world, own), b = PokemonSkills.skillswapAbility(world, target);
        if (skillswapRefused && a === "synchronize" && b === "intimidate")
            skillswapRolledBack = !MobEffects.read(world, own, "world_combat:skillswap_shift") && !MobEffects.read(world, target, "world_combat:skillswap_shift");
        if (a === "intimidate" && b === "synchronize") skillswapPaired = true;
    });
});
WorldCombat.on("world_combat:checks/skillswap_restore", "world_combat:mob_effect_removed", "", event => {
    if (!skillswapClearing || JSON.parse(event.data()).id !== "world_combat:skillswap_shift") return;
    const world = event.world(), actor = event.actor();
    if (String(actor.domain()) === "cobblemon" && PokemonSkills.skillswapAbility(world, actor) === String(CobblemonCombat.pokemon(actor).ability())) skillswapRestored = true;
});
Smoke.scenario("skillswap", stage => {
    skillswapRefused = false; skillswapRolledBack = false; skillswapPaired = false; skillswapRestored = false; skillswapClearing = false;
    stage.fill([-6, -1, -6], [6, -1, 6], "minecraft:stone");
    const caster = stage.pokemon({ species: "abra", level: 24, ability: "synchronize", moves: ["skillswap"], at: [-2, 0, 0] });
    const target = stage.pokemon({ species: "growlithe", level: 20, ability: "intimidate", moves: [], at: [1, 0, 0] });
    skillswapCheckTarget = target.ref; stage.hostile(caster, target);
    stage.until(1200, () => skillswapRolledBack && skillswapPaired, () => {
        stage.expect(skillswapRolledBack, "refusing the second carrier left both original abilities and no first carrier");
        stage.expect(skillswapPaired, "both effective abilities actually exchanged on the accepted attempt");
        stage.expect(stage.hasMobEffect(caster, "world_combat:status/skillswap") && stage.hasMobEffect(target, "world_combat:status/skillswap"), "the accepted pair owns two native carriers");
        skillswapClearing = true;
        stage.command("effect clear @e[type=cobblemon:pokemon,distance=..20] world_combat:skillswap_shift");
        stage.after(8, () => {
            stage.expect(!stage.hasMobEffect(caster, "world_combat:status/skillswap") && !stage.hasMobEffect(target, "world_combat:status/skillswap"), "clearing the pair releases both carriers");
            stage.expect(skillswapRestored, "owned ability layers restore the actual native identity");
            stage.note("paired exchange", { refused: skillswapRefused, rollback: skillswapRolledBack, paired: skillswapPaired, restored: skillswapRestored }); stage.done();
        });
    }, "refused attempt rolls back, then a valid pair exchanges");
});
