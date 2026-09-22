/**
 * 死缠烂打 / infestation 的出手方式。
 *
 * 核心念头：甩出一团虫子扑到目标身上缠住它；虫子持续啃咬，而且只要缠着，目标就无法逃走——用时间换空间。
 *
 * 三幕：
 *   起：虫群在身前聚拢（windup）。
 *   击：提交后虫群飞向目标；命中（或撞到东西）即附着：先结算一次初击（bite），再把共享身份
 *       `world_combat:status/partiallytrapped`（本单元 startup 效果，自带速度归零定身）挂到目标身上。
 *   收：绑定效果 `world_combat:infestation_bond` 按 `interval` 每隔一段时间咬一口（按目标最大生命比例），
 *       直到时间走完或被外力（牛奶、/effect clear、别的招式）清掉，虫群散去。
 *
 * 宝可梦那一层：本状态只带身份、不自动同步成原生异常，符合原生 partiallytrapped 本就是 volatile、不进队伍 UI 的语义。
 */
namespace PokemonSkills {
    const infestationScene = "world_combat:move_infestation";
    const infestationSwarmEffect = "world_combat:infestation_swarm";
    const infestationBond = "world_combat:infestation_bond";
    const infestationClingText = "world_combat.move.infestation.text.cling";
    const infestationFizzleText = "world_combat.move.infestation.text.fizzle";
    const infestationReleaseText = "world_combat.move.infestation.text.release";

    function infestationBondData(json: string): string {
        const value = JSON.parse(json);
        ["interval", "share", "pulses"].forEach(function (key) {
            if (typeof value[key] !== "number" || !isFinite(value[key])) throw new Error("Invalid infestation bond");
        });
        if (value.share <= 0 || value.interval < 1) throw new Error("Invalid infestation bond");
        return JSON.stringify(value);
    }

    WorldCombat.effect(infestationBond, 1, 1200, "actor", infestationBondData, EffectProtocols.unchanged);
    WorldCombat.effectHandler(infestationBond, "start", function (effect) {
        const data = JSON.parse(effect.state());
        effect.schedule("pulse", "pulse", Math.max(1, Math.round(data.interval)), "{}");
    });
    WorldCombat.effectHandler(infestationBond, "pulse", function (effect) {
        const world = effect.world(), victim = effect.target(), data = JSON.parse(effect.state());
        if (!world.valid(victim) || MobEffects.read(world, victim, infestationSwarmEffect) === null) { effect.end(); return; }
        const body = world.observe(victim);
        if (body === null) { effect.end(); return; }
        const amount = Math.max(1, Math.floor(body.maxHealth() * data.share));
        world.health(victim, -amount, "world_combat:infestation");
        data.pulses = (data.pulses || 0) + 1;
        effect.state(JSON.stringify(data));
        WorldFeedback.emit(world, infestationScene, 1, body.position(), { moment: "bite", target: String(victim.ref()),
            count: Math.round(8 + data.share * 900), intensity: Math.max(0.6, Math.min(2.2, data.share / 0.018)), pulses: data.pulses }, 20);
        world.sound("cobblemon:move.infestation.residual", body.position(), 16, "{}");
        effect.schedule("pulse", "pulse", Math.max(1, Math.round(data.interval)), "{}");
    });
    WorldCombat.effectHandler(infestationBond, "operation:world_combat:dispel", function (effect) { effect.end(); });
    WorldCombat.effectHandler(infestationBond, "end", function (effect) {
        const world = effect.world(), victim = effect.target();
        if (!world.valid(victim)) return;
        const state = MobEffects.read(world, victim, infestationSwarmEffect);
        if (state !== null) world.removeMobEffect(victim, infestationSwarmEffect, state.key());
        const body = world.observe(victim);
        if (body !== null) {
            WorldFeedback.emit(world, infestationScene, 1, body.position(), { moment: "release", target: String(victim.ref()) }, 22);
            WorldFeedback.text(world, body.position(), infestationReleaseText, [], 24);
        }
    });
    // 外力提前清掉虫群（牛奶、/effect clear、别的招式）时，绑定随之结束。
    WorldCombat.on("world_combat:move_infestation/release", "world_combat:mob_effect_removed", "", function (event) {
        const data = JSON.parse(String(event.data()));
        if (String(data.id) !== infestationSwarmEffect) return;
        const world = event.world(), victim = event.actor();
        if (!world.valid(victim) || MobEffects.read(world, victim, infestationSwarmEffect) !== null) return;
        const bonds = world.effects(victim, infestationBond);
        for (let i = 0; i < bonds.length; i++) world.operation(bonds[i].id(), "world_combat:dispel", "{}");
    });

    define({
        id: "infestation",
        name: "Infestation",
        description: "The target is infested and attacked for four to five turns. The target can't flee during this time.",
        uses: ["给难缠的目标挂持续啃咬", "把目标定在原地", "逼对手先来清状态或反打"],
        kind: "enemy",
        range: 12,
        maxRange: 18,
        prepare: 8,
        active: 40,
        recover: 8,
        cooldown: 46,
        style: "swarm",
        defaults: { ai: { maxChase: 14, leaveStation: true } },
        fields: [],
        indicator: function (config, pokemon) {
            return { radius: p("infestation", "collisionRadius", pokemon) * 1.4, geometry: "line", style: "swarm", label: "死缠烂打" };
        },
        resolve: function (pokemon, config, world, actor, attributes) {
            var context: NumberContext = { pokemon: pokemon, skill: skills["infestation"], detail: { values: config }, world: world, actor: actor, attributes: attributes };
            return {
                prepare: Math.round(p("infestation", "charge", context)),
                recover: 8,
                cooldown: Math.round(p("infestation", "duration", context) * 0.3) + 18,
                range: p("infestation", "reach", context)
            };
        },
        windup: function (action, config, prepare) {
            action.present("world_combat:move_infestation:windup", infestationScene, 1, action.origin(), JSON.stringify({ moment: "windup" }));
            return prepare;
        },
        execute: function (action, move, config, done) {
            const world = action.world();
            const speed = p("infestation", "speed", action);
            const radius = p("infestation", "collisionRadius", action);
            const bite = p("infestation", "bite", action);
            const share = p("infestation", "swarmShare", action);
            const ticks = Math.max(1, Math.round(p("infestation", "duration", action)));
            const interval = Math.max(1, Math.round(p("infestation", "interval", action)));
            const scale = radius / 0.35;
            sound(action, "cobblemon:move.infestation.actor");
            const flight = LivingActions.projectile(action, {
                speed: speed,
                range: action.range(),
                radius: radius,
                appearance: { sprite: "cobblemon:particle/generic/ground_bugs", glow: true, scale: 1.2 },
                impact: function (current, hit, age) {
                    const body = current.world();
                    const target = hit.target();
                    if (target === null || !body.valid(target)) {
                        WorldFeedback.emit(body, infestationScene, 1, hit.position(), { moment: "fizzle" }, 18);
                        WorldFeedback.text(body, hit.position(), infestationFizzleText, [], 24);
                        sound(current, "minecraft:entity.generic.splash");
                        return;
                    }
                    impact(current, hit, "infestation", bite, { damage: damageSpec("infestation", "bite"), contact: true });
                    if (!CombatStatus.apply(body, target, "partiallytrapped", infestationSwarmEffect, ticks, 0, { unique: true })) {
                        WorldFeedback.emit(body, infestationScene, 1, hit.position(), { moment: "immune", target: String(target.ref()) }, 22);
                        return;
                    }
                    WorldEffects.apply(body, target, "rooted", {}, ticks);
                    body.effect(infestationBond, target, JSON.stringify({ interval: interval, share: share, pulses: 0 }), ticks);
                    const ref = String(target.ref());
                    WorldFeedback.emit(body, infestationScene, 1, hit.position(), { moment: "cling", target: ref, scale: scale, share: share }, 28);
                    WorldFeedback.text(body, hit.position(), infestationClingText, [Math.round(ticks / 20 * 10) / 10], 30);
                    sound(current, "cobblemon:move.infestation.target");
                }
            }, function complete(current: CombatAction) { done(current); });
            WorldFeedback.emit(world, infestationScene, 1, action.origin(), { moment: "cast", projectile: flight,
                target: action.target() ? String(action.target()!.ref()) : "" }, 70);
        }
    });

    WorldCombat.on("world_combat:move_infestation/halt", "world_combat:mob_effect_added", "", function (event) {
        const data = JSON.parse(String(event.data()));
        if (String(data.id) !== infestationSwarmEffect) return;
        event.world().stopMovement(event.actor());
    });

    // 「无法逃走」：虫群缠着期间把导航速度归零，对所有活体（含宝可梦的脚本导航）一致。
    WorldCombat.on("world_combat:move_infestation/roots", "world_combat:navigate", "", function (event) {
        if (event.world().mobEffect(event.actor(), infestationSwarmEffect) === null) return;
        const data = JSON.parse(String(event.data()));
        data.speed = 0;
        event.data(JSON.stringify(data));
    });

    // 虫群缠着期间维持一段低密度的爬行画面：少而稳，贴在身体周围，不遮挡目标。
    WorldCombat.on("world_combat:move_infestation/linger", "world_combat:mob_effect_tick", "", function (event) {
        const data = JSON.parse(String(event.data()));
        if (String(data.id) !== infestationSwarmEffect || event.world().tick() % 10 !== 0) return;
        const world = event.world(), actor = event.actor();
        if (!world.valid(actor)) return;
        const body = world.observe(actor);
        if (body === null) return;
        WorldFeedback.keep(world, "world_combat:move_infestation/swarm/" + String(actor.ref()), infestationScene, 1,
            body.position(), { moment: "swarm", target: String(actor.ref()) }, 24);
    });
}
