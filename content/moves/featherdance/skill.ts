/**
 * 羽毛舞 / Feather Dance — 执行组织。
 *
 * 核心念头：撒出一团会飘的羽绒，罩在对手身上，把它抡不动胳膊；羽绒还在落点铺开一小片久久不散的绒雾，
 *   谁走进那片雾也会被覆上一层。它不像目光那样直取——羽毛要飞，能被掩体与走位躲开。
 *
 * 出手：短起手（windup 在身周聚起白色绒羽）后提交，交给 LivingActions.projectile 负责飞行。
 * 命中：羽绒云在落点炸开（settle）——命中的活体立刻挂共享的 world_combat:downy_coat
 *       （身份 world_combat:status/downy）并 NativeEffects.boost 大幅下降攻击；落点用 WorldEffects.field
 *       租借一片绒雾，之后踏进来的非友方都会被覆羽（每人只生效一次）。
 * 反制：羽绒有飞行时间、会被掩体挡下；绒雾只在落点一小片、绕开即可；厚羽覆盖更小。
 */
namespace PokemonSkills {
    function featherdanceAbove(point: CombatPoint): CombatPoint { return point.plus(WorldCombat.point(0, 1, 0)); }

    /** 把羽绒覆到一个目标身上：挂身份、扣攻击、播命中表现与浮字。 */
    function featherdanceSmother(world: CombatWorld, target: CombatActor, drop: number, downTicks: number, tufts: number): void {
        MobEffects.apply(world, target, featherdanceEffect, downTicks, 0);
        NativeEffects.boost(world, target, "atk", -drop);
        const body = world.observe(target);
        if (body === null) return;
        WorldFeedback.emit(world, featherdanceScene, 1, body.position(),
            { moment: "smother", target: String(target.ref()), drop: drop, tufts: tufts }, 26);
        WorldFeedback.text(world, featherdanceAbove(body.position()), "world_combat.move.featherdance.text.smother", [drop], 34);
    }

    // 落点绒雾：踏进来的非友方各覆一次羽（每人只生效一次，反复进出不叠加）；scan 让绒雾一直看得见。
    WorldEffects.fieldRule(featherdanceField, {
        enter: function (world, actor, field) {
            if (world.friendly(actor)) return;
            const marked = field.data.marked || (field.data.marked = {});
            const ref = String(actor.ref());
            if (marked[ref]) return;
            marked[ref] = true;
            featherdanceSmother(world, actor, field.data.drop, field.data.ticks, field.data.tufts);
        },
        scan: function (effect, world, field) {
            WorldFeedback.keep(world, "featherdance:" + String(effect.id()), featherdanceScene, 1,
                WorldCombat.point(field.position[0], field.position[1], field.position[2]),
                { moment: "field", radius: field.radius, scale: field.radius / 3.0, feathers: field.data.tufts }, 12);
        }
    });

    define({
        id: featherdanceId,
        cooldownParameter: "recharge",
        name: "羽毛舞",
        description: "撒出一团会飘的羽绒罩住对手，大幅降低它的攻击；落地后那团绒雾还会留一阵，谁走进去谁被覆上一层。厚羽压得更实、覆盖更小；撒羽铺得更开、削得浅一档。",
        uses: ["削弱一个靠物攻输出的对手", "用一小片绒雾封住必经的门口", "在队友被追时替它压住近战威胁"],
        kind: "enemy",
        range: 6,
        maxRange: 9,
        prepare: 9,
        active: 1,
        recover: 6,
        cooldown: 120,
        style: "plume",
        defaults: { dense: false },
        fields: [
            flag("dense", "厚羽")
        ],
        resolve: function (pokemon, config, world, actor, attributes) {
            const context: NumberContext = { pokemon, skill: skills[featherdanceId], detail: { values: config }, world, actor, attributes };
            return {
                prepare: Math.round(p(featherdanceId, "tempo", context)),
                recover: p(featherdanceId, "recover", context),
                cooldown: Math.round(p(featherdanceId, "recharge", context)),
                active: 1,
                range: p(featherdanceId, "reach", context)
            };
        },
        windup: function (action, config, prepare) {
            action.present("featherdance-windup", featherdanceScene, 1, action.origin(),
                JSON.stringify({ moment: "windup", dense: config && config.dense ? 1 : 0,
                    target: action.target() === null ? "" : String(action.target()!.ref()) }));
            return prepare;
        },
        indicator: function (config) {
            const dense = !!(config && config.dense);
            return { radius: dense ? 5 : 6, geometry: "line", style: "plume", color: 0xF6F3EA, label: dense ? "羽毛舞·厚羽" : "羽毛舞" };
        },
        execute: function (action, move, config, done) {
            const world = action.world(), self = action.actor();
            const selfBody = world.observe(self);
            const origin = selfBody === null ? action.origin() : selfBody.position();
            const drop = Math.max(1, Math.min(3, Math.round(p(featherdanceId, "atkDrop", action))));
            const radius = Math.max(1.6, Math.min(4.2, p(featherdanceId, "cloudRadius", action)));
            const down = Math.max(60, Math.round(p(featherdanceId, "downTicks", action)));
            const fieldTicks = Math.max(80, Math.round(p(featherdanceId, "fieldTicks", action)));
            const speed = Math.max(0.5, p(featherdanceId, "flightSpeed", action));
            const strandRadius = Math.max(0.15, p(featherdanceId, "strandRadius", action));
            const tufts = Math.max(10, Math.round(p(featherdanceId, "feathers", action)));
            sound(action, "minecraft:entity.parrot.fly");
            let settled = false;
            function settle(current: CombatAction, point: CombatPoint, entity: CombatActor | null): void {
                if (settled) return;
                settled = true;
                const scope = current.world();
                const marked: any = {};
                if (entity !== null && !scope.friendly(entity)) {
                    marked[String(entity.ref())] = true;
                    featherdanceSmother(scope, entity, drop, down, tufts);
                }
                WorldEffects.field(scope, featherdanceField, point, radius,
                    { drop: drop, ticks: down, tufts: tufts, marked: marked }, fieldTicks);
                WorldFeedback.emit(scope, featherdanceScene, 1, point,
                    { moment: "settle", radius: radius, drop: drop, feathers: tufts, scale: radius / 3.0 }, 32);
                sound(current, "minecraft:block.wool.place");
            }
            const flight = LivingActions.projectile(action, {
                speed: speed, range: action.range(), radius: strandRadius, lifetime: 50,
                appearance: { sprite: "cobblemon:generic/grass/smallleaf_white", scale: 0.8, tint: 0xF6F3EA },
                impact: function (current, hit) {
                    const target = hit.target();
                    settle(current, hit.position(), target !== null && !current.world().friendly(target) ? target : null);
                }
            }, function (current) {
                settle(current, current.targetPosition(), null);
                done(current);
            });
            WorldFeedback.emit(world, featherdanceScene, 1, origin,
                { moment: "travel", projectile: flight, feathers: tufts,
                    target: action.target() === null ? "" : String(action.target()!.ref()) }, 60);
        }
    });

    // 覆羽存续期间，目标身上持续粘着未抖落的白色绒羽。
    WorldCombat.on("world_combat:move_featherdance/linger", "world_combat:mob_effect_tick", "", function (event) {
        const data = JSON.parse(String(event.data()));
        if (String(data.id) !== featherdanceEffect) return;
        const world = event.world(), actor = event.actor();
        if (!world.valid(actor) || world.tick() % 6 !== 0) return;
        const body = world.observe(actor);
        if (body === null) return;
        WorldFeedback.keep(world, "featherdance:" + String(actor.ref()), featherdanceScene, 1, body.position(),
            { moment: "linger", target: String(actor.ref()) }, 20);
    });
}
