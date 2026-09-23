/**
 * 磁铁炸弹 / magnetbomb 的出手方式。
 *
 * 核心念头：发射几枚会被磁力吸向对手的钢弹，一碰到就吸在它身上，引信走完再一起炸——
 *   因为粘住了，躲不掉，所以必中。
 *
 * 两幕 + 收：
 *   起（load，提交前）：弹仓张开、磁光在身前聚起（可读的预告）。
 *   发（launch → stick）：提交后按 `bombs` 发射钢弹，各自用原生追踪吸向目标；
 *       命中即吸住：给对手盖上物品栏可见的共享身份 world_combat:status/magnetbomb，
 *       并在它身上挂一枚机读引信标记（world_combat:magnet_bomb_mark），旁边生成一枚钢弹外观的中间体跟随它。
 *   炸（blast）：引信到点，钢弹在对手身上起爆，按 `blast/bombs` 结算一份物理伤害，
 *       爆炸半径内的其他敌人吃一份溅射；中间体与标记一起收掉。
 * 反制：引信期间对手读得到炸弹，可以抢先治疗、加防或把战斗拖开；拆掉炸弹标记会提前引爆。
 *
 * 与同族分开：高速星星/魔法叶是命中即结算的追踪弹；磁铁炸弹是**吸附后延迟起爆**，
 *   中间那截引信和粘在身上的样子是它的身份，也是对手唯一能反应的窗口。
 */
namespace PokemonSkills {
    const magnetbombId = "magnetbomb";
    const magnetbombScene = "world_combat:move_magnetbomb";
    const magnetbombStatus = "world_combat:magnet_bomb";
    const magnetbombMark = "world_combat:magnet_bomb_mark";
    const magnetbombDetonation = "world_combat:magnet_bomb_detonation";
    const magnetbombStickText = "world_combat.move.magnetbomb.text.stick";
    const magnetbombBlastText = "world_combat.move.magnetbomb.text.blast";
    const magnetbombFadeText = "world_combat.move.magnetbomb.text.fade";
    /** 溅射给附近其他人吃到的份额。 */
    const magnetbombSplash = 0.45;

    // The blast owns a captured world point; its primary victim can die before the nearby victims settle.
    WorldCombat.effect(magnetbombDetonation, 1, 2, "actor", function (json) {
        const data = JSON.parse(json);
        if (typeof data.target !== "string" || !Array.isArray(data.point) || data.point.length !== 3 ||
            !data.point.every(function (value: number) { return typeof value === "number" && isFinite(value); }) ||
            typeof data.mark !== "number" || !(data.mark > 0) || !isFinite(data.radius) || !(data.radius > 0) ||
            !isFinite(data.power) || !(data.power > 0)) throw new Error("Invalid magnet bomb detonation");
        return JSON.stringify(data);
    }, EffectProtocols.unchanged);
    WorldCombat.effectHandler(magnetbombDetonation, "start", function (effect: CombatEffect) {
        const world = effect.world(), data = JSON.parse(effect.state());
        const at = WorldCombat.point(data.point[0], data.point[1], data.point[2]), radius = data.radius, power = data.power;
        world.operation(data.mark, "world_combat:dispel", "{}");
        const victim = world.actor(data.target);
        if (victim !== null) hurt(world, victim, magnetbombId, power, { damage: damageSpec(magnetbombId, "blast") });
        WorldGeometry.selectEnemies(world, WorldGeometry.ring(at, 0, radius, { below: 1.2, above: 2.4 }),
            function (other: CombatActor, facts: CombatObservation) {
                if (String(other.ref()) === data.target) return;
                hurt(world, other, magnetbombId, power * magnetbombSplash, { damage: damageSpec(magnetbombId, "blast") });
                WorldFeedback.emit(world, magnetbombScene, 1, facts.position(),
                    { moment: "splash", target: String(other.ref()), scale: radius / 1.2 }, 18);
            });
        WorldFeedback.emit(world, magnetbombScene, 1, at,
            { moment: "blast", target: data.target, radius: radius, scale: radius / 1.2,
                power: Math.round(power * 10) / 10, notes: Math.max(10, Math.round(power * 0.6)) }, 28);
        WorldFeedback.text(world, at.plus(WorldCombat.point(0, 1.1, 0)), magnetbombBlastText, [Math.round(power)], 24);
        world.sound("cobblemon:impact.steel", at, 16, "{}");
        world.sound("minecraft:entity.generic.explode", at, 12, "{}");
        effect.end();
    });

    WorldCombat.effect(magnetbombMark, 1, 1200, "actor", function (json) {
        const value = JSON.parse(json || "{}");
        if (typeof value.caster !== "string" || !value.caster) throw new Error("Invalid magnet bomb source");
        ["power", "radius", "fuse", "end", "bombs"].forEach(function (key: string) {
            if (typeof value[key] !== "number" || !isFinite(value[key])) throw new Error("Invalid magnet bomb value: " + key);
        });
        if (typeof value.helper !== "string") value.helper = "";
        return JSON.stringify(value);
    }, EffectProtocols.unchanged);
    WorldCombat.effectHandler(magnetbombMark, "start", function (effect: CombatEffect) {
        const world = effect.world(), state = JSON.parse(effect.state());
        const victim = effect.target();
        if (!world.valid(victim)) { effect.end(); return; }
        const body = world.observe(victim);
        if (body === null) { effect.end(); return; }
        const life = Math.max(20, Math.round(state.end - world.tick()) + 60);
        let helper: CombatActor | null = null;
        try {
            helper = world.helper(body.position().plus(WorldCombat.point(0, 0.5, 0)), 6,
                JSON.stringify({ item: "minecraft:iron_nugget", scale: 1.2 }), life);
        } catch (error) { helper = null; }
        state.helper = helper === null ? "" : String(helper.ref());
        effect.state(JSON.stringify(state));
        effect.schedule("track", "track", 1, "{}");
        effect.schedule("blast", "blast", Math.max(1, Math.round(state.end - world.tick())), "{}");
    });
    WorldCombat.effectHandler(magnetbombMark, "track", function (effect: CombatEffect) {
        const world = effect.world(), state = JSON.parse(effect.state());
        const victim = effect.target();
        if (!world.valid(victim)) { effect.end(); return; }
        const body = world.observe(victim);
        if (body === null) { effect.end(); return; }
        const helper = state.helper === "" ? null : world.actor(String(state.helper));
        if (helper !== null && world.valid(helper)) world.teleport(helper, body.position().plus(WorldCombat.point(0, 0.5, 0)));
        if (world.tick() % 4 === 0) WorldFeedback.keep(world, "magnetbomb:stick:" + effect.id(), magnetbombScene, 1, body.position(),
            { moment: "stick", target: String(victim.ref()) }, 16);
        if (world.tick() < state.end) effect.schedule("track", "track", 1, "{}");
    });
    WorldCombat.effectHandler(magnetbombMark, "blast", function (effect: CombatEffect) {
        const world = effect.world(), state = JSON.parse(effect.state());
        const victim = effect.target();
        if (!world.valid(victim)) { effect.end(); return; }
        const body = world.observe(victim);
        if (body === null) { effect.end(); return; }
        const at = body.position(), radius = Math.max(0.5, state.radius), power = Math.max(1, state.power);
        world.effect(magnetbombDetonation, world.source(), JSON.stringify({ mark: effect.id(), target: String(victim.ref()),
            point: [at.x(), at.y(), at.z()], radius: radius, power: power }), 1);
    });
    WorldCombat.effectHandler(magnetbombMark, "end", function (effect: CombatEffect) {
        const world = effect.world(), state = JSON.parse(effect.state());
        const helper = state.helper === "" ? null : world.actor(String(state.helper));
        if (helper !== null && world.valid(helper)) world.removeHelper(helper);
    });
    WorldCombat.effectHandler(magnetbombMark, "operation:world_combat:dispel", function (effect: CombatEffect) { effect.end(); });

    define({
        id: magnetbombId,
        cooldownParameter: "recharge",
        name: "Magnet Bomb",
        description: "The user launches steel bombs that stick to the target. This attack never misses.",
        uses: ["把钢弹吸在对手身上再起爆", "分散吸住一圈敌人一起炸", "用引信逼对手在起爆前做出反应"],
        kind: "enemy",
        range: 8,
        maxRange: 13,
        prepare: 9,
        active: 0,
        recover: 8,
        cooldown: 90,
        style: "steel",
        defaults: { cluster: false, ai: { maxChase: 13, focused: true } },
        fields: [],
        indicator: function (config, pokemon) {
            return { radius: p(magnetbombId, "reach", pokemon), geometry: "point", style: "steel", color: 0x9AA4AE,
                label: config && config.cluster === true ? "磁铁炸弹·集火" : "磁铁炸弹" };
        },
        resolve: function (pokemon, config, world, actor, attributes) {
            const context: NumberContext = { pokemon, skill: skills[magnetbombId], detail: { values: config },
                world: world || null, actor: actor || null, attributes };
            const cluster = !!(config && config.cluster);
            return {
                prepare: Math.round(p(magnetbombId, "tempo", context)) + (cluster ? 2 : 0),
                recover: Math.round(p(magnetbombId, "settle", context)),
                cooldown: Math.round(p(magnetbombId, "recharge", context)),
                active: 0,
                range: p(magnetbombId, "reach", context)
            };
        },
        windup: function (action, config, prepare) {
            action.present("magnetbomb:load", magnetbombScene, 1, action.origin(),
                JSON.stringify({ moment: "load", windup: prepare, target: action.target() === null ? "" : String(action.target()!.ref()),
                    cluster: !!(config && config.cluster), bombs: p(magnetbombId, "bombs", action) }));
            return prepare;
        },
        execute: function (action, move, config, done) {
            const world = action.world();
            const actor = action.actor();
            const self = world.observe(actor);
            const cluster = !!(config && config.cluster);
            const bombs = Math.max(1, Math.round(p(magnetbombId, "bombs", action)));
            const blast = p(magnetbombId, "blast", action);
            const perBomb = blast / bombs;
            const speed = p(magnetbombId, "bombSpeed", action);
            const pull = p(magnetbombId, "pull", action);
            const fuse = Math.max(10, Math.round(p(magnetbombId, "fuse", action)));
            const radius = p(magnetbombId, "radius", action);
            const range = p(magnetbombId, "reach", action);
            const scale = radius / 1.2;
            const intensity = Math.max(0.5, Math.min(2, perBomb / 18));
            const trail = Math.max(16, Math.round(perBomb * 1.6));
            const selected = action.target();

            const roster: CombatActor[] = [];
            if (selected !== null && world.valid(selected)) roster.push(selected);
            if (!cluster && self !== null) {
                const nearby = world.query(self.position(), range, false);
                for (let i = 0; i < nearby.length; i++) {
                    const other = nearby[i];
                    if (String(other.ref()) === String(actor.ref()) || world.friendly(other) || !world.valid(other)) continue;
                    let known = false;
                    for (let slot = 0; slot < roster.length; slot++) if (String(roster[slot].ref()) === String(other.ref())) { known = true; break; }
                    if (!known) roster.push(other);
                }
            }

            sound(action, "minecraft:entity.firework_rocket.launch");
            WorldFeedback.emit(world, magnetbombScene, 1, action.origin(),
                { moment: "launch", count: bombs, targets: roster.length, intensity: intensity, scale: scale, cluster: cluster }, 22);

            if (roster.length === 0) {
                WorldFeedback.emit(world, magnetbombScene, 1, action.origin(), { moment: "fade", intensity: intensity }, 20);
                WorldFeedback.text(world, action.origin().plus(WorldCombat.point(0, 1.2, 0)), magnetbombFadeText, [], 24);
                done(action);
                return;
            }

            let remaining = bombs;
            let settled = false;
            function completeOne(current: CombatAction): void {
                remaining--;
                if (remaining > 0 || settled) return;
                settled = true;
                done(current);
            }
            for (let shot = 0; shot < bombs; shot++) {
                const target = roster[shot % roster.length];
                const ref = String(target.ref());
                const homing = { target: ref, turn: pull, delay: 1, range: range + 6 };
                const flight = LivingActions.projectile(action, {
                    speed: speed, range: range + 8, radius: 0.25,
                    appearance: { sprite: "cobblemon:particle/generic/orb/orb", glow: true, tint: 0xB8C2CC, homing: homing },
                    impact: function (current: CombatAction, hit: CombatImpact) {
                        const scope = current.world();
                        const victim = hit.target();
                        if (victim === null || !scope.valid(victim) || scope.friendly(victim)) {
                            WorldFeedback.emit(scope, magnetbombScene, 1, hit.position(), { moment: "fade", intensity: intensity }, 16);
                            return;
                        }
                        CombatStatus.apply(scope, victim, "magnetbomb", magnetbombStatus, fuse + 40, 0, { unique: true });
                        scope.effect(magnetbombMark, victim,
                            JSON.stringify({ caster: String(current.actor().ref()), power: perBomb, radius: radius,
                                fuse: fuse, end: scope.tick() + fuse, helper: "", bombs: bombs }), fuse + 60);
                        WorldFeedback.emit(scope, magnetbombScene, 1, hit.position(),
                            { moment: "stick", target: String(victim.ref()), fuse: fuse, scale: scale, intensity: intensity }, 24);
                        WorldFeedback.text(scope, hit.position().plus(WorldCombat.point(0, 1.05, 0)), magnetbombStickText,
                            [Math.round(fuse / 20)], 26);
                        scope.sound("minecraft:block.iron_trapdoor.close", hit.position(), 12, "{}");
                    }
                }, function (current: CombatAction) { completeOne(current); });
                WorldFeedback.emit(world, magnetbombScene, 1, action.origin(),
                    { moment: "seek", projectile: flight, target: ref, intensity: intensity, trail: trail, scale: scale }, 40);
            }
        }
    });
}
