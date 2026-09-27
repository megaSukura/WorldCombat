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

    /** 羽绒耗尽落点的真实着地面：向下投射一次真实方块碰撞，取实际接触面；探不到支撑面则返回 null（不硬造地云）。 */
    function featherdanceGround(world: CombatWorld, point: CombatPoint): CombatPoint | null {
        const hit = WorldGeometry.blockHit(world, point.plus(WorldCombat.point(0, 1.0, 0)), point.minus(WorldCombat.point(0, 4.0, 0)));
        if (hit === null) return null;
        const at = hit.position();
        return WorldCombat.point(at.x(), at.y(), at.z());
    }

    /** 把羽绒覆到一个目标身上：挂身份、扣攻击、播命中表现与浮字；只有真正扣到等级才报出数值。 */
    function featherdanceSmother(world: CombatWorld, target: CombatActor, drop: number, downTicks: number, tufts: number): boolean {
        const applied = MobEffects.apply(world, target, featherdanceEffect, downTicks, 0);
        const dropped = NativeEffects.boost(world, target, "atk", -drop);
        const body = world.observe(target);
        if (body === null) return false;
        WorldFeedback.emit(world, featherdanceScene, 1, body.position(),
            { moment: "smother", target: String(target.ref()), drop: drop, tufts: tufts }, 26);
        // 降攻被原生拒绝、或已到下限时，不报出一次没发生的成功。
        if (dropped !== 0)
            WorldFeedback.text(world, featherdanceAbove(body.position()), "world_combat.move.featherdance.text.smother", [Math.abs(dropped)], 34);
        return applied !== null || dropped !== 0;
    }

    // 落点绒雾：踏进来的非友方各覆一次羽（每人只生效一次，反复进出不叠加）。
    // 表现用 presentOn 绑在这片场地效果本身：场地到期、被驱散或施法者离场时画面一起收，不靠固定时长续期。
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
            const at = WorldCombat.point(field.position[0], field.position[1], field.position[2]);
            WorldFeedback.onEffect(world, effect.id(), "featherdance:field:" + String(effect.id()),
                featherdanceScene, 1, at, { moment: "field", radius: field.radius, feathers: field.data.tufts });
        }
    });

    define({
        id: featherdanceId,
        cooldownParameter: "recharge",
        name: "羽毛舞",
        description: "撒出一团会飘的羽绒罩住对手，大幅降低它的攻击；落地后那团绒雾还会留一阵，谁走进去谁被覆上一层。可以直接点敌人，也可以点空地提前把绒雾铺在对手要经过的位置。厚羽压得更实、覆盖更小；撒羽铺得更开、削得浅一档。",
        uses: ["削弱一个靠物攻输出的对手", "用一小片绒雾封住必经的门口", "在队友被追时替它压住近战威胁"],
        kind: "aim",
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
        indicator: function (config, pokemon) {
            const dense = !!(config && config.dense);
            const context: NumberContext = { pokemon: pokemon!, skill: skills[featherdanceId], detail: { values: config } };
            const reach = pokemon ? p(featherdanceId, "reach", context) : 6;
            return { radius: reach, geometry: "line", style: "plume", color: 0xF6F3EA, label: dense ? "羽毛舞·厚羽" : "羽毛舞" };
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
            // 提交时锁定发射点与方向，与 LivingActions.projectile 用的是同一组数据；弹体路程由所选落点限制，不再一律飞满射程。
            const launch = action.origin();
            const offset = action.targetPosition().minus(launch);
            const direction = offset.length() < 0.01 ? action.direction() : offset.unit();
            const requested = offset.length();
            const travel = Math.max(0.5, Math.min(action.range(), requested > 0.01 ? requested : action.range()));
            const landing = launch.plus(direction.scale(travel));
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
                // 只有真实着地才铺绒雾：探不到支撑面时只留下覆羽，不硬造一片悬空的地云。
                const ground = featherdanceGround(scope, point);
                if (ground === null) return;
                WorldEffects.field(scope, featherdanceField, ground, radius,
                    { drop: drop, ticks: down, tufts: tufts, marked: marked }, fieldTicks);
                WorldFeedback.emit(scope, featherdanceScene, 1, ground,
                    { moment: "settle", radius: radius, drop: drop, feathers: tufts }, 32);
                sound(current, "minecraft:block.wool.place");
            }
            const flight = LivingActions.projectile(action, {
                speed: speed, range: travel, radius: strandRadius, lifetime: 50,
                appearance: { sprite: "cobblemon:generic/grass/smallleaf_white", scale: 0.8, tint: 0xF6F3EA },
                impact: function (current, hit) {
                    const target = hit.target();
                    settle(current, hit.position(), target !== null && !current.world().friendly(target) ? target : null);
                }
            }, function (current) {
                // 云团耗尽：读弹体自己的真实末点，命中后仍可读；不用满射程点或旧瞄准点假造终点。
                const scope = current.world();
                const end = scope.projectilePosition(flight);
                settle(current, end === null ? landing : end, null);
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
