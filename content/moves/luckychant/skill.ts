/** One song grants independent native blessings; each recipient keeps its own clock. */
namespace PokemonSkills {
    function luckychantGuard(world: CombatWorld, holder: CombatActor): void {
        const body = world.observe(holder); if (!body) return;
        WorldFeedback.emit(world, luckychantScene, 1, body.position(),
            { moment: "guard", target: String(holder.ref()), motes: 8 }, 22);
        WorldFeedback.text(world, body.position().plus(WorldCombat.point(0, body.height() / 2 + 0.3, 0)), luckychantGuardText, [], 24);
        world.sound("minecraft:block.amethyst_block.chime", body.position(), 12, "{}");
    }
    // The settled script multiplier may come from an ability; it is not always 1.5.
    NativeEffects.incomingRules.define({ id: "world_combat:move_luckychant/ward", apply: hit => {
        const data = hit.data, multiplier = Number(data && data.criticalMultiplier);
        if (!data || !data.critical || !(data.amount > 0) || data.bypassesInvulnerability ||
            !(multiplier > 1) || !isFinite(multiplier) || !CombatStatus.has(hit.world, hit.target, luckychantStatus)) return;
        data.amount /= multiplier; data.critical = false; data.criticalMultiplier = 1; data.criticalChance = 0;
        luckychantGuard(hit.world, hit.target);
    } });
    // Player attacks retain native damage and enchantment arithmetic: prevent the critical before it is multiplied.
    WorldCombat.on("world_combat:move_luckychant/critical", "world_combat:critical_hit", "", event => {
        const target = event.target(), world = event.world(), data = JSON.parse(event.data());
        if (!target || !data.critical || !(data.multiplier > 1) || !CombatStatus.has(world, target, luckychantStatus)) return;
        data.critical = false; event.data(JSON.stringify(data)); luckychantGuard(world, target);
    });

    WorldCombat.effect(luckychantMark, 2, 1200000, "actor", json => {
        const data = JSON.parse(json);
        if (!MobEffects.validAnchor(data) || data.id !== luckychantEffect) throw new Error("Invalid blessing carrier");
        return JSON.stringify(data);
    }, EffectProtocols.unchanged);
    function presentBlessing(effect: CombatEffect): void {
        const world = effect.world(), target = effect.target();
        if (!world.valid(target) || !MobEffects.matches(world, target, JSON.parse(effect.state()))) { effect.end(); return; }
        const body = world.observe(target)!;
        world.present("star", luckychantScene, 1, body.position(), JSON.stringify({ moment: "warded", target: String(target.ref()) }));
        effect.schedule("watch", "watch", 4, "{}");
    }
    WorldCombat.effectHandler(luckychantMark, "start", presentBlessing);
    WorldCombat.effectHandler(luckychantMark, "watch", effect => {
        if (!MobEffects.matches(effect.world(), effect.target(), JSON.parse(effect.state()))) { effect.end(); return; }
        effect.schedule("watch", "watch", 4, "{}");
    });
    WorldCombat.effectHandler(luckychantMark, "operation:world_combat:dispel", effect => effect.end());
    function synchronizeBlessing(event: CombatWorldEvent): void {
        const world = event.world(), actor = event.actor(); if (!world.valid(actor)) return;
        const carrier = MobEffects.read(world, actor, luckychantEffect), views = world.effects(actor, luckychantMark);
        views.forEach(view => {
            if (!MobEffects.matches(world, actor, JSON.parse(view.data()))) world.operation(view.id(), "world_combat:dispel", "{}");
        });
        if (!carrier || views.some(view => MobEffects.matches(world, actor, JSON.parse(view.data())))) return;
        // An effect created by the recipient's native event survives the original singer leaving.
        world.effect(luckychantMark, actor, JSON.stringify(MobEffects.anchor(carrier)), carrier.duration() < 0 ? 1200000 : carrier.duration());
    }
    WorldCombat.on("world_combat:move_luckychant/bind", "world_combat:actor_bound", "", synchronizeBlessing);
    ["added", "removed"].forEach(edge => WorldCombat.on("world_combat:move_luckychant/" + edge, "world_combat:mob_effect_" + edge, "", event => {
        if (JSON.parse(event.data()).id === luckychantEffect) synchronizeBlessing(event);
    }));

    define({
        id: luckychantId,
        cooldownParameter: "recharge",
        name: "幸运咒语",
        description: "把幸运星分给自己与身边队友。各自携带防要害祝福，离开施法者后仍保有，直到各自到期或被清除。",
        uses: ["挡住依赖要害暴击的高输出", "护住队伍的软肋与残血成员", "在对方连击前先唱好"],
        kind: "self",
        range: 1,
        prepare: 13,
        active: 1,
        recover: 8,
        cooldown: 170,
        style: "chant",
        defaults: { wish: "deep" },
        fields: [
            choice("wish", "许愿方式", ["early", "deep"], ["早愿", "深愿"])
        ],
        resolve: function (pokemon, config, world, actor, attributes) {
            const context: NumberContext = { pokemon, skill: skills[luckychantId], detail: { values: config }, world: world || null, actor: actor || null, attributes };
            const early = config.wish === "early";
            return {
                prepare: Math.max(5, Math.round(p(luckychantId, "tempo", context)) + (early ? -3 : 3)),
                recover: Math.round(p(luckychantId, "aftercast", context)),
                cooldown: Math.max(70, Math.round(p(luckychantId, "recharge", context) * (early ? 0.85 : 1.15))),
                range: 1,
                active: 1
            };
        },
        windup: function (action, config, prepare) {
            action.present("world_combat:move_luckychant:windup", luckychantScene, 1, action.origin(),
                JSON.stringify({ moment: "windup", early: config.wish === "early" ? 1 : 0 }));
            return prepare;
        },
        indicator: function (config) { return { radius: 3.5, geometry: "circle", style: "chant", color: 0xFFD26E,
            label: config && config.wish === "early" ? "早愿" : "深愿" }; },
        execute: function (action, move, config, done) {
            const world = action.world(), actor = action.actor(), body = world.observe(actor);
            const duration = Math.round(p(luckychantId, "chantTicks", action));
            const radius = p(luckychantId, "chantRadius", action);
            const motes = Math.max(1, Math.round(p(luckychantId, "motes", action)));
            const centre = body === null ? action.origin() : body.position();
            const recipients = [actor].concat(world.query(centre, radius, false).filter(other =>
                String(other.ref()) !== String(actor.ref()) && world.friendly(other)));
            let reached = 0;
            recipients.forEach(other => {
                if (!world.valid(other)) return;
                const at = world.observe(other); if (!at) return;
                // Native stacking preserves a stronger/longer blessing already present.
                if (!MobEffects.apply(world, other, luckychantEffect, duration, 0)) return;
                reached++;
                WorldFeedback.emit(world, luckychantScene, 1, at.position(),
                    { moment: "receive", target: String(other.ref()) }, 20);
            });
            sound(action, "minecraft:block.note_block.chime");
            world.sound("minecraft:block.bell.use", body === null ? action.origin() : body.position(), 14, "{}");
            if (body !== null) {
                const scale = Math.max(0.6, Math.min(2, radius / 3.5));
                WorldFeedback.emit(world, luckychantScene, 1, body.position(),
                    { moment: "chant", target: String(actor.ref()), point: [centre.x(), centre.y() - body.height() / 2, centre.z()],
                        motes: motes, field: radius, scale: scale, intensity: scale }, 48);
                WorldFeedback.text(world, body.position().plus(WorldCombat.point(0, body.height() / 2 + 0.3, 0)), luckychantChantText, [Math.round(duration / 20), reached], 46);
            }
            done(action);
        }
    });
}
