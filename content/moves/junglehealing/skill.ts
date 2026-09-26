/** 丛林治疗：治疗并净化身边友方，原有自然地面提供加成；藤蔓与嫩芽由粒子表现。 */
namespace PokemonSkills {
    const junglehealingScene = "world_combat:move_junglehealing";
    const junglehealingText = "world_combat.move.junglehealing.text.embrace";
    /** 表现里的参考半径：`data.scale = 实际藤蔓半径 / 这个数`。 */
    export const junglehealingReferenceRadius = 3.0;

    /** 回复走共享治疗入口：宝可梦经过 NativeEffects.heal（含受治疗加成），其他战斗者直接写 MC 生命；返回世界单位回复量。 */
    function junglehealingHeal(world: CombatWorld, target: CombatActor, fraction: number, cause: string): number {
        const before = world.observe(target);
        if (before === null) return 0;
        const amount = Math.min(before.maxHealth() - before.health(), before.maxHealth() * Math.max(0, Math.min(1, fraction)));
        if (amount <= 0) return 0;
        if (String(target.domain()) === "cobblemon" && world.valid(target)) {
            const pokemon = CobblemonCombat.pokemon(target), scale = Math.max(0.001, pokemon.healthScale());
            NativeEffects.heal(world, target, pokemon, amount / scale, cause);
        } else {
            world.health(target, amount, "world_combat:" + cause);
        }
        const after = world.observe(target);
        const gained = after === null ? 0 : Math.max(0, after.health() - before.health());
        if (gained > 0) feedback(world, target, after!.position(), "heal", { amount: Math.round(gained * 10) / 10 });
        return gained;
    }

    define({
        id: junglehealingId,
        cooldownParameter: "wait", name: "丛林治疗",
        description: "藤蔓与嫩芽围住自己和身边伙伴，回复生命并清除有害状态效果。脚下的自然地面提高回复与范围；深根进一步加强这两项，起手与冷却也更长。",
        uses: ["给身边的一队伙伴回血并一起解状态", "在自然地面上一次净化整组人"],
        kind: "self", range: 2.6, maxRange: 6, prepare: 9, active: 1, recover: 5, cooldown: 140, style: "verdant",
        maximumTicks: 240,
        defaults: { deeproot: false, helpFriends: true, ai: { healBelow: 0.82, maxChase: 12, rescueCount: 2 } },
        fields: [flag("deeproot", "深根")],
        indicator: function (config, pokemon) {
            const context: NumberContext = { pokemon: pokemon!, skill: skills[junglehealingId], detail: { values: config } };
            return { radius: p(junglehealingId, "radius", context), geometry: "area", style: "verdant", color: 0x6FC24E,
                label: config && config.deeproot === true ? "丛林治疗 · 深根" : "丛林治疗" };
        },
        resolve: function (pokemon, config, world, actor, attributes) {
            const context: NumberContext = { pokemon, skill: skills[junglehealingId], detail: { values: config },
                world: world || null, actor: actor || null, attributes };
            return {
                prepare: Math.max(3, Math.round(p(junglehealingId, "tempo", context))),
                recover: Math.max(3, Math.round(p(junglehealingId, "aftercast", context))),
                cooldown: Math.round(p(junglehealingId, "wait", context)),
                active: 1,
                range: p(junglehealingId, "radius", context)
            };
        },
        /** 圈里有伤者或带有害状态效果的人（含自己）才值得唤丛林。 */
        ready: function (action) {
            const world = action.sense(), self = action.actor(), body = world.observe(self);
            if (body === null) return "no-body";
            const radius = Math.max(1.2, p(junglehealingId, "radius", action));
            const actors = world.query(body.position(), radius + 0.6, false);
            for (let i = 0; i < actors.length; i++) {
                const other = actors[i];
                if (!world.friendly(other)) continue;
                const view = world.observe(other);
                if (view !== null && view.health() < view.maxHealth() - 0.01) return "";
                if (CombatStatus.hasHarmful(world, other)) return "";
            }
            return "no-wounded";
        },
        windup: function (action, config, prepare) {
            action.present("world_combat:move_junglehealing:call", junglehealingScene, 1, action.origin(),
                JSON.stringify({ moment: "call", motes: Math.round(p(junglehealingId, "motes", action)),
                    deeproot: config && config.deeproot === true ? 1 : 0 }));
            return prepare;
        },
        execute: function (action, _move, config, done) {
            const world = action.world(), self = action.actor(), body = world.observe(self);
            if (body === null) { done(action); return; }
            const origin = body.position();
            const ground = WorldCombat.point(origin.x(), origin.y() - body.height() / 2 + 0.03, origin.z());
            const fraction = Math.max(0, Math.min(1, p(junglehealingId, "heal", action)));
            const radius = Math.max(1.2, p(junglehealingId, "radius", action));
            const sprouts = Math.max(0, Math.round(p(junglehealingId, "sprouts", action)));
            const baseMotes = Math.max(14, Math.round(p(junglehealingId, "motes", action)));
            const scale = radius / junglehealingReferenceRadius;

            // 自然地面只在这里采一遍：样本数决定这次长得多旺，也决定藤蔓从哪几个真实地面点抽芽。
            const samples = junglehealingNaturalSamples(world, ground, radius);
            const coverage = Math.min(1, samples.length / 6);
            const budget = Math.max(1, Math.round(sprouts * (0.5 + 0.5 * coverage)));
            const motes = Math.max(12, Math.round(baseMotes * (0.75 + 0.25 * coverage)));
            const path = samples.map(function (sample) { return [sample.x(), sample.y(), sample.z()]; });

            world.sound("cobblemon:move.leafstorm.actor", ground, 14, "{}");
            WorldFeedback.emit(world, junglehealingScene, 1, ground,
                { moment: "erupt", radius: radius, motes: motes, scale: scale, vines: budget, ground: samples.length, path: path }, 26);

            const actors = world.query(ground, radius, false);
            for (let i = 0; i < actors.length; i++) {
                const other = actors[i], ref = String(other.ref());
                if (!world.valid(other) || !world.friendly(other)) continue;
                const before = world.observe(other);
                if (before === null) continue;
                const gained = junglehealingHeal(world, other, fraction, "junglehealing");
                const cleaned = CombatStatus.cureHarmful(world, other);
                if (gained <= 0 && cleaned <= 0) continue;
                const after = world.observe(other);
                const point = after === null ? before.position() : after.position();
                // 补血与治病各自按真实结果触发一次短闪：回复量决定绿色光点，实际清除的项数决定金色光点。
                WorldFeedback.emit(world, junglehealingScene, 1, point,
                    { moment: "embrace", target: ref, gained: Math.round(gained * 10) / 10, cured: cleaned,
                        healSpark: Math.max(0, Math.round(gained * 2)), scale: scale }, 24);
                WorldFeedback.text(world, point.plus(WorldCombat.point(0, 1.2, 0)), junglehealingText,
                    [Math.round(gained * 10) / 10, cleaned], 30);
                if (cleaned > 0) world.sound("minecraft:block.sweet_berry_bush.pick_berries", point, 10, "{}");
            }

            if (budget > 0) {
                WorldFeedback.emit(world, junglehealingScene, 1, ground,
                    { moment: "residue", radius: radius, motes: Math.max(8, Math.round(motes * 0.4)), scale: scale, vines: budget }, 26);
                world.sound("minecraft:block.moss.place", ground, 12, "{}");
            }
            done(action);
        }
    });
}
