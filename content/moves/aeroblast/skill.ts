/**
 * 气旋攻击 / aeroblast —— 注册与动作。
 *
 * 核心念头：把空气拧成一束细涡流，蓄足后朝锁定方向连续极短地压出三拍；每一拍沿这条射线只咬住**第一个**
 *   可见的敌人，把它沿弹道推开一点点。它不是一颗会炸开一圈的炮弹，而是一条短时间钉在远距方向上的细束。
 *
 * 幕：
 *   起（windup，提交前）：空气在口边旋起、越拧越紧，只播预告，可被打断。
 *   射（beam × beats）：提交时锁定方向，之后不再弯曲追人；每一拍从身前沿该方向做一次真实 `trace`，
 *       射线在**第一个活体或挡墙处**截断——命中活体则结算 `blast / beats` 并沿射线推开 `push / beats`（合计不增），
 *       命中方块则这一拍在墙面收束。三拍各只伤沿线首个可见敌人；空束照常耗尽，不产生圆形溅射。
 *
 * 选取：`kind: "aim"`——方向或世界点都能瞄，提交后可空放；命中权限仍由命中层判断。
 *
 * 高暴击沿用原生 critRatio 2 的共享结算；暴击命中时由本单元监听器在命中点补一记更亮的白色涡光。
 */
namespace PokemonSkills {
    define({
        id: aeroblastId,
        cooldownParameter: "recharge",
        name: "Aeroblast",
        description: "把空气拧成一束细涡流，朝锁定方向短促地压出三拍；每一拍沿射线只咬住第一个可见敌人、把它沿弹道推开，挡墙即截束，不再炸开圆形气环。容易击中要害。蓄力式增强威力与射程，速射式缩短准备时间。",
        uses: ["把空气拧成一支涡流锥笔直射出去", "命中处炸成气环、把主目标冲开", "远距离打击单个目标"],
        kind: "enemy",
        range: 16,
        maxRange: 22,
        prepare: 12,
        active: 0,
        recover: 10,
        cooldown: 60,
        style: "air",
        defaults: { charge: false, ai: { maxChase: 20, finishLow: true } },
        fields: [],
        indicator: function (config, pokemon) {
            return { radius: p(aeroblastId, "reach", pokemon), geometry: "line", style: "air", color: 0xBFE8F0,
                label: config && config.charge === true ? "蓄力气旋攻击" : "气旋攻击" };
        },
        resolve: function (pokemon, config, world, actor, attributes) {
            const context: NumberContext = { pokemon: pokemon, skill: skills[aeroblastId], detail: { values: config },
                world: world || null, actor: actor || null, attributes: attributes };
            return {
                prepare: Math.round(p(aeroblastId, "tempo", context)),
                recover: Math.round(p(aeroblastId, "aftercast", context)),
                cooldown: Math.round(p(aeroblastId, "recharge", context)),
                active: 0,
                range: p(aeroblastId, "reach", context)
            };
        },
        windup: function (action, config, prepare) {
            action.present("aeroblast:charge", aeroblastScene, 1, action.origin(),
                JSON.stringify({ moment: "charge", charge: config && config.charge === true }));
            return prepare;
        },
        execute: function (action, move, config, done) {
            const direction = aim(action);
            const power = p(aeroblastId, "blast", action);
            const reach = p(aeroblastId, "reach", action);
            const radius = p(aeroblastId, "radius", action);
            const push = p(aeroblastId, "push", action);
            const pulse = Math.max(1, Math.round(p(aeroblastId, "pulse", action)));
            const spiral = Math.max(12, Math.round(p(aeroblastId, "spiral", action)));
            const beats = Math.max(1, Math.round(p(aeroblastId, "beats", action)));
            const perBeat = power / beats;
            const scale = Math.max(0.6, Math.min(2.2, reach / aeroblastReference));
            const intensity = Math.max(0.6, Math.min(2.6, power / 100));
            const directionList = [direction.x(), direction.y(), direction.z()];
            let hits = 0, settled = false;

            function finish(current: CombatAction): void {
                if (settled) return;
                settled = true;
                const scope = current.world(), body = scope.observe(action.actor());
                const at = body === null ? current.origin() : body.position();
                if (hits === 0) {
                    WorldFeedback.emit(scope, aeroblastScene, 1, at, { moment: "miss", scale: scale, intensity: intensity }, 20);
                    WorldFeedback.text(scope, at.plus(WorldCombat.point(0, 1.0, 0)), aeroblastMissText, [], 22);
                } else {
                    WorldFeedback.text(scope, at.plus(WorldCombat.point(0, 1.2, 0)), aeroblastBurstText, [hits], 24);
                }
                done(current);
            }

            function strike(current: CombatAction, index: number): void {
                if (settled) return;
                const scope = current.world();
                const body = scope.observe(action.actor());
                // 射线从身体前缘之外起步，避免把自己当成首个接触；起点随体型外移。
                const muzzle = body === null ? 0.6 : Math.min(1.4, body.width() * 0.5 + 0.25);
                const from = current.origin().plus(direction.scale(muzzle));
                const ray = from.plus(direction.scale(Math.max(0.3, reach - muzzle)));
                // 真实射线：在第一个活体或挡墙处截断，判定与画出的长度读同一个落点。
                const contact = current.trace(from, ray, radius, false);
                const point = contact.position();
                const victim = contact.hitEntity() ? contact.target() : null;
                let landed = false;
                if (victim !== null && scope.valid(victim) && !scope.friendly(victim)) {
                    landed = impact(current, contact, aeroblastId, perBeat,
                        { damage: damageSpec(aeroblastId, "blast") });
                    if (landed) {
                        hits++;
                        const away = point.minus(from);
                        if (away.length() > 0.01 && scope.valid(victim))
                            scope.hitDisplace(victim, away.unit().scale(push / beats));
                    }
                }
                const span = point.minus(from).length();
                WorldFeedback.emit(scope, aeroblastScene, 1, from,
                    { moment: "flight", path: [[from.x(), from.y(), from.z()], [point.x(), point.y(), point.z()]],
                        direction: directionList, length: span, radius: radius, spiral: spiral,
                        scale: scale, intensity: intensity, pulse: index + 1, beats: beats,
                        landed: landed ? 1 : 0 }, pulse + 14);
                if (landed) {
                    WorldFeedback.emit(scope, aeroblastScene, 1, point,
                        { moment: "burst", target: victim !== null ? String(victim.ref()) : "", radius: radius, spiral: spiral,
                            scale: scale, intensity: intensity }, 24);
                    sound(current, "minecraft:entity.breeze.wind_burst");
                } else if (contact.target() === null && contact.blocked()) {
                    WorldFeedback.emit(scope, aeroblastScene, 1, point,
                        { moment: "wall", radius: radius, scale: scale, intensity: intensity }, 20);
                    sound(current, "minecraft:item.shield.break");
                }
                if (index + 1 < beats) {
                    current.after(pulse, function (next: CombatAction) { strike(next, index + 1); });
                } else {
                    finish(current);
                }
            }

            sound(action, "minecraft:entity.breeze.shoot");
            sound(action, "cobblemon:move.gust.actor");
            strike(action, 0);
        }
    });

    // 要害：共享结算判定为暴击后，在命中点补一记更亮的白色气环与浮字（暴击率来自原生 critRatio 2）。
    WorldCombat.on("world_combat:move_aeroblast/vital", "world_combat:damage_applied", "", function (event) {
        const data = JSON.parse(String(event.data()));
        if (String(data.move) !== aeroblastId || data.critical !== true || !(data.actual > 0)) return;
        const target = event.target(), world = event.world();
        if (target === null || typeof data.x !== "number") return;
        const at = WorldCombat.point(data.x, data.y, data.z), ratio = (data.actual || 0) / 16;
        WorldFeedback.emit(world, aeroblastScene, 1, at,
            { moment: "crit", target: String(target.ref()), spiral: Math.max(20, Math.min(80, Math.round(ratio * 5))),
                radius: Math.max(0.34, Math.min(1.2, ratio * 0.5)) }, 26);
        WorldFeedback.text(world, at.plus(WorldCombat.point(0, 1.25, 0)), aeroblastCritText, [], 30);
        world.sound("minecraft:entity.player.attack.crit", at, 14, "{}");
    });
}
