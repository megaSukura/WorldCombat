/** 花疗：立即治疗选定友方；青草场地加成读取目标状态，撒花与绽放承载反馈。 */
namespace PokemonSkills {
    const floralhealingScene = "world_combat:move_floralhealing";
    const floralhealingTextBloom = "world_combat.move.floralhealing.text.bloom";
    const floralhealingTextGrass = "world_combat.move.floralhealing.text.grass";

    function floralhealingAbove(point: CombatPoint): CombatPoint { return point.plus(WorldCombat.point(0, 1.0, 0)); }

    /** 回复走共享健康写入；宝可梦经过 NativeEffects.heal（含受治疗加成），其他战斗者直接写 MC 生命。 */
    function floralhealingHeal(world: CombatWorld, target: CombatActor, fraction: number, cause: string): number {
        var body = world.observe(target);
        if (!body) return 0;
        var missing = body.maxHealth() - body.health();
        if (missing <= 0) return 0;
        var amount = Math.min(missing, body.maxHealth() * Math.max(0, Math.min(1, fraction)));
        if (amount <= 0) return 0;
        var healed = 0;
        if (String(target.domain()) === "cobblemon" && world.valid(target)) {
            var pokemon = CobblemonCombat.pokemon(target), scale = Math.max(0.001, pokemon.healthScale());
            healed = NativeEffects.heal(world, target, pokemon, amount / scale, cause);
        } else {
            healed = world.health(target, amount, "world_combat:" + cause);
        }
        var after = world.observe(target);
        if (healed > 0 && after) feedback(world, target, after.position(), "heal", { amount: Math.round(healed * 10) / 10 });
        return healed;
    }

    define({
        id: floralhealingId, name: "花疗",
        description: "撒一路花瓣到选定友方身上，绽开时回复其最大生命的一半左右；青草场地上提高到约三分之二。只救别人，不救自己。",
        uses: ["远远地给伙伴补一口", "在青草场地上把回复抬到三分之二"],
        kind: "friend", range: 5, maxRange: 9, prepare: 9, active: 0, recover: 8, cooldown: 130, style: "floral",
        maximumTicks: 220,
        defaults: { bouquet: false },
        fields: [flag("bouquet", "繁花")],
        indicator: function (config, pokemon) {
            const context: NumberContext = { pokemon: pokemon!, skill: skills[floralhealingId], detail: { values: config } };
            return { radius: p(floralhealingId, "bloomRadius", context), geometry: "point", style: "floral", color: 0xE89AC0,
                label: config && config.bouquet === true ? "繁花疗" : "花疗" };
        },
        resolve: function (pokemon, config, world, actor, attributes) {
            const context: NumberContext = { pokemon, skill: skills[floralhealingId], detail: { values: config }, world: world || null, actor: actor || null, attributes };
            const bouquet = !!(config && config.bouquet);
            return {
                prepare: Math.max(4, Math.round(p(floralhealingId, "tempo", context))),
                recover: Math.max(3, Math.round(p(floralhealingId, "settle", context))),
                cooldown: Math.round(p(floralhealingId, "cooldown", context) * (bouquet ? 1.1 : 0.95)),
                active: 0,
                range: p(floralhealingId, "reach", context)
            };
        },
        ready: function (action) {
            const target = action.target();
            if (target === null) return "invalid-target";
            if (String(target.ref()) === String(action.actor().ref())) return "invalid-target";
            if (!action.sense().friendly(target)) return "invalid-target";
            return "";
        },
        windup: function (action, _config, prepare) {
            action.present("floralhealing:windup", floralhealingScene, 1, action.origin(),
                JSON.stringify({ moment: "windup", petals: p(floralhealingId, "petals", action),
                    target: action.target() === null ? "" : String(action.target()!.ref()) }));
            return prepare;
        },
        execute: function (action, _move, config, done) {
            const world = action.world(), self = action.actor(), target = action.target();
            const body = world.observe(self);
            if (!body || target === null || !world.valid(target) || String(target.ref()) === String(self.ref())) { done(action); return; }
            const mate = world.observe(target);
            if (mate === null) { done(action); return; }
            const bouquet = !!(config && config.bouquet);
            const fraction = Math.max(0, Math.min(1, p(floralhealingId, "heal", action)));
            const radius = Math.max(0.4, p(floralhealingId, "bloomRadius", action));
            const petals = Math.max(8, Math.round(p(floralhealingId, "petals", action)));
            const budget = Math.max(0, Math.round(p(floralhealingId, "flowers", action)));
            const grass = CombatStatus.has(world, target, "grassyterrain");
            const scale = Math.max(0.6, Math.min(2.0, radius / 0.8));
            const ref = String(target.ref());
            const before = mate.health();

            floralhealingHeal(world, target, fraction, "floralhealing");
            const after = world.observe(target);
            const gained = after ? Math.max(0, after.health() - before) : 0;
            const share = mate.maxHealth() > 0 ? Math.max(0, Math.min(1, gained / mate.maxHealth())) : 0;
            const path: (string | number[])[] = [String(self.ref()), ref];

            sound(action, "minecraft:block.flowering_azalea.place");
            WorldFeedback.emit(world, floralhealingScene, 1, body.position(),
                { moment: "scatter", target: ref, path: path, petals: petals, scale: scale, grass: grass ? 1 : 0, radius: radius }, 30);
            WorldFeedback.emit(world, floralhealingScene, 1, mate.position(),
                { moment: "bloom", target: ref, petals: petals, scale: scale, grass: grass ? 1 : 0, radius: radius,
                    gold: grass ? Math.max(8, Math.round(petals * 0.5)) : 0, share: share,
                    healDust: Math.max(10, Math.round(petals * (0.4 + share))), gained: Math.round(gained * 10) / 10 }, 34);
            if (budget > 0) {
                WorldFeedback.emit(world, floralhealingScene, 1, mate.position(),
                    { moment: "residue", target: ref, flowers: budget, scale: scale }, 30);
                world.sound("minecraft:block.grass.place", mate.position(), 12, "{}");
            }
            WorldFeedback.text(world, floralhealingAbove(mate.position()), grass ? floralhealingTextGrass : floralhealingTextBloom, [Math.round(gained * 10) / 10], 30);
            done(action);
        }
    });
}
