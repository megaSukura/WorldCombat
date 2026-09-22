/**
 * 毒丝 / Toxic Thread — 执行组织。
 *
 * 核心念头：吐出一缕带毒的丝，丝头扎进对手身上，一边把毒灌进去，一边猛地一抽把它朝自己拽一段。
 *   媒介是会飞的丝，掩体与走位能躲开；命中后毒与减速分头落到共享载体上。
 *
 * 出手：短起手（windup 在口边蓄起紫色的毒丝）后提交，交给 LivingActions.projectile 负责飞行。
 * 命中：挂共享的 world_combat:toxic_thread_laced（身份 world_combat:status/laced），
 *       NativeEffects.boost 降低速度，CombatStatus.inflict 上共享的中毒；随后按配置沿丝线行动：
 *       「收丝」把目标朝施法者拽近 reel 格，「钉住」改为就地定住 anchorTicks 刻。
 * 落空：丝软软垂到地上，只留一小撮毒渍（表现），不改变世界。
 * 反制：毒丝有飞行时间、会被掩体挡下；对毒免疫的宝可梦只吃速度下降、不吃中毒。
 */
namespace PokemonSkills {
    function toxicthreadAbove(point: CombatPoint): CombatPoint { return point.plus(WorldCombat.point(0, 1, 0)); }

    define({
        id: toxicthreadId,
        name: "毒丝",
        description: "吐出一缕带毒的丝缠住对手，使其中毒并降低速度；命中后可以沿丝线把对手拽近，或就地把它钉住。",
        uses: ["先下手削弱高速目标", "把扑上来的近战拽乱站位", "给难缠的对手叠一层持续掉血的中毒"],
        kind: "enemy",
        range: 5,
        maxRange: 7,
        prepare: 8,
        active: 1,
        recover: 6,
        cooldown: 100,
        style: "venom",
        defaults: { reel: false },
        fields: [
            flag("reel", "收丝")
        ],
        resolve: function (pokemon, config, world, actor, attributes) {
            const context: NumberContext = { pokemon, skill: skills[toxicthreadId], detail: { values: config }, world, actor, attributes };
            return {
                prepare: Math.round(p(toxicthreadId, "tempo", context)),
                recover: p(toxicthreadId, "recover", context),
                cooldown: Math.round(p(toxicthreadId, "recharge", context)),
                active: 1,
                range: p(toxicthreadId, "reach", context)
            };
        },
        windup: function (action, config, prepare) {
            action.present("toxicthread-windup", toxicthreadScene, 1, action.origin(),
                JSON.stringify({ moment: "windup", reel: config && config.reel ? 1 : 0,
                    target: action.target() === null ? "" : String(action.target()!.ref()) }));
            return prepare;
        },
        indicator: function (config) {
            const reel = !!(config && config.reel);
            return { radius: 5, geometry: "line", style: "venom", color: 0x8E44AD, label: reel ? "毒丝·收丝" : "毒丝·钉住" };
        },
        execute: function (action, move, config, done) {
            const world = action.world(), self = action.actor();
            const selfBody = world.observe(self);
            const origin = selfBody === null ? action.origin() : selfBody.position().plus(WorldCombat.point(0, 0.6, 0));
            const reel = !!(config && config.reel);
            const drop = Math.max(1, Math.min(2, Math.round(p(toxicthreadId, "speedDrop", action))));
            const venom = Math.max(60, Math.round(p(toxicthreadId, "venomTicks", action)));
            const pull = Math.max(0.5, p(toxicthreadId, "reel", action));
            const anchor = Math.max(5, Math.round(p(toxicthreadId, "anchorTicks", action)));
            const speed = Math.max(0.5, p(toxicthreadId, "strandSpeed", action));
            const radius = Math.max(0.12, p(toxicthreadId, "strandRadius", action));
            const threads = Math.max(8, Math.round(p(toxicthreadId, "threads", action)));
            sound(action, "cobblemon:move.stringshot.actor");
            let resolved = false;
            function resolve(current: CombatAction, point: CombatPoint, entity: CombatActor | null): void {
                if (resolved) return;
                resolved = true;
                const scope = current.world();
                if (entity === null || !scope.valid(entity) || scope.friendly(entity)) {
                    WorldFeedback.emit(scope, toxicthreadScene, 1, point, { moment: "droop", threads: threads }, 20);
                    return;
                }
                MobEffects.apply(scope, entity, toxicthreadEffect, venom, 0);
                NativeEffects.boost(scope, entity, "spe", -drop);
                const poisoned = CombatStatus.inflict(scope, entity, "poison", venom);
                const at = scope.observe(entity);
                if (at === null) return;
                const selfAt = scope.observe(current.actor());
                if (selfAt !== null) {
                    const line = selfAt.position().minus(at.position());
                    if (reel && line.length() > 0.05) scope.displace(entity, line.unit().scale(pull));
                    else if (anchor > 0) WorldEffects.apply(scope, entity, "rooted", {}, anchor);
                }
                WorldFeedback.emit(scope, toxicthreadScene, 1, at.position(),
                    { moment: "latch", path: [String(current.actor().ref()), String(entity.ref())], target: String(entity.ref()),
                        drop: drop, threads: threads, reel: reel ? 1 : 0, poisoned: poisoned ? 1 : 0, scale: 1 }, 26);
                WorldFeedback.text(scope, toxicthreadAbove(at.position()), "world_combat.move.toxicthread.text.latch", [drop], 34);
                if (!poisoned)
                    WorldFeedback.text(scope, toxicthreadAbove(at.position()), "world_combat.move.toxicthread.text.immune", [], 30);
            }
            const strand = LivingActions.projectile(action, {
                speed: speed, range: action.range(), radius: radius, lifetime: 50,
                appearance: { sprite: "cobblemon:generic/wrap", scale: 0.9, tint: 0x9C6BB5 },
                impact: function (current, hit) {
                    const target = hit.target();
                    resolve(current, hit.position(), target !== null && !current.world().friendly(target) ? target : null);
                }
            }, function (current) {
                resolve(current, current.targetPosition(), null);
                done(current);
            });
            WorldFeedback.emit(world, toxicthreadScene, 1, origin,
                { moment: "spit", projectile: strand, threads: threads,
                    target: action.target() === null ? "" : String(action.target()!.ref()) }, 60);
        }
    });

    // 毒丝还缠着的时候，目标身上持续挂着未干的紫色丝光。
    WorldCombat.on("world_combat:move_toxicthread/linger", "world_combat:mob_effect_tick", "", function (event) {
        const data = JSON.parse(String(event.data()));
        if (String(data.id) !== toxicthreadEffect) return;
        const world = event.world(), actor = event.actor();
        if (!world.valid(actor) || world.tick() % 6 !== 0) return;
        const body = world.observe(actor);
        if (body === null) return;
        WorldFeedback.keep(world, "toxicthread:" + String(actor.ref()), toxicthreadScene, 1, body.position(),
            { moment: "linger", target: String(actor.ref()) }, 20);
    });
}
