/**
 * 十字劈 / crosschop 的出手方式。
 *
 * 核心念头：双手交叉举过头顶，在身前同一个竖直挥击面上先后劈出两道斜线——第一笔从左上落到右下，`gap` 刻后第二笔
 *   从右上落到左下。两笔都穿过锁定的交叉点并继续越过，不在交点戛然而止；每刻只沿刀尖刚划过的那一小段真实刃迹
 *   结算，撞墙就停在墙上。只有同一个实体两笔都真正吃到，第二笔才带破势加成；对手在第一笔之后侧移离开挥击面、
 *   或第二笔首次碰到的是旁人，就只剩普通一劈。
 *
 * 两幕（提交前只播预告）：
 *   起（windup，提交前）：双臂交叉举高，只播预告。
 *   劈（guard → seam → cut / wall / miss，提交后）：提交时锁定挥击中心 C 与朝向；单位右轴 R、上轴 U 张成竖直
 *       挥击面，半宽 w 取本招展开、半高 h 取身高。第一笔 A=C-R*w+U*h 到 B=C+R*w-U*h，逐刻从上一刀尖到当前
 *       刀尖只判一小段并裁到真实墙面；`gap` 刻后第二笔 D=C+R*w+U*h 到 E=C-R*w-U*h，同样逐刻判新子段，不再重新
 *       对准目标——第二笔首次接触仍为第一笔目标才有破势加成。
 *
 * 与同族分开：十字剪是两把镰刀从左右合拢、扫过两片半扇面；劈瓦是贴地宽弧；上菜是不接触的窄走廊。
 *   十字劈是唯一「在同一个竖直面里、两道斜劈先后交叉、第一劈替第二劈开门」的贴身双击。
 */
namespace PokemonSkills {
    function crosschopVertex(point: CombatPoint): number[] { return [point.x(), point.y(), point.z()]; }

    define({
        id: crosschopId,
        cooldownParameter: "recharge",
        name: "Cross Chop",
        description: "双臂交叉举过头顶，在身前同一个竖直挥击面上先后劈出两道交叉的斜劈：第一笔从左上落到右下，第二笔隔一瞬从右上落到左下，都穿过锁定的交叉点。第一笔沿真实刃迹把对手的架势撞开，第二笔只对第一笔劈中的同一个敌人才切得更深；对手在间隔里侧移离开挥击面、或第二笔首次碰到旁人身上就只剩普通一劈。撞墙停在墙上，不会隔墙伤人。双劈式两劈等重、出手更快，但没有破势加成。",
        uses: ["在同一竖直面上先后扫出两道交叉的斜劈", "第一劈撞开架势，第二劈切得更深", "在贴身距离结算两次接触伤害"],
        kind: "aim",
        range: 2.4,
        maxRange: 3.2,
        prepare: 8,
        active: 0,
        recover: 7,
        cooldown: 30,
        style: "cross",
        defaults: { guard: true, ai: { maxChase: 5, pointBlank: true } },
        fields: [],
        indicator: function (config, pokemon) {
            return { radius: pokemon ? p(crosschopId, "reach", pokemon) : 2.4, geometry: "line", style: "cross",
                color: 0xD24B3E, label: config && config.guard === false ? "双劈式" : "破势式" };
        },
        resolve: function (pokemon, config, world, actor, attributes) {
            var context: NumberContext = { pokemon: pokemon, skill: skills[crosschopId], detail: { values: config },
                world: world || null, actor: actor || null, attributes: attributes };
            return {
                prepare: Math.round(p(crosschopId, "tempo", context)),
                recover: Math.round(p(crosschopId, "aftercast", context)),
                cooldown: Math.round(p(crosschopId, "recharge", context)),
                active: 0,
                range: p(crosschopId, "reach", context)
            };
        },
        windup: function (action, config, prepare) {
            action.present(crosschopScene + ":windup", crosschopScene, 1, action.origin(),
                JSON.stringify({ moment: "windup", windup: prepare, guard: config && config.guard !== false ? 1 : 0 }));
            return prepare;
        },
        execute: function (action, move, config, done) {
            var world = action.world();
            var actor = action.actor();
            var body = world.observe(actor);
            if (body === null) { done(action); return; }
            var scenes = WorldFeedback.actionScenes(crosschopScene);
            var chop = p(crosschopId, "chop", action);
            var seam = Math.max(0, p(crosschopId, "seam", action));
            var gap = Math.max(2, Math.round(p(crosschopId, "gap", action)));
            var reach = Math.max(1.8, action.range());
            var spread = Math.max(0.35, p(crosschopId, "spread", action));
            var gauge = Math.max(0.12, Math.min(0.4, spread * 0.3));
            var scale = Math.max(0.6, Math.min(2.0, spread / 0.6));
            var intensity = Math.max(0.6, Math.min(2.4, chop / 50));
            // 挥击面的两条半轴：半宽取展开的交叉幅度，半高随身高；两笔都在这个竖直面内。
            var halfWidth = spread;
            var halfHeight = Math.max(0.5, Math.min(1.2, body.height() * 0.45));
            var swing = Math.max(2, Math.min(4, Math.round(gap / 2)));
            // 提交时锁定挥击中心与朝向：用含竖直瞄准的稳定基，R/U 张成的竖直面朝向前方。
            var frame = WorldGeometry.basis(aim(action), WorldCombat.point(0, 0, 1));
            var selectedPoint=action.targetPosition(),distance=selectedPoint.minus(body.position()).length();
            var at=body.position().plus(frame.forward.scale(Math.min(reach,distance>.01?distance:reach)));
            var frontWall=WorldGeometry.blockHit(world,body.position(),at);if(frontWall)at=frontWall.position();
            action.releaseTarget();
            action.data("world_combat:move_crosschop/point", JSON.stringify({ x: at.x(), y: at.y(), z: at.z() }));
            var firstFrom = at.minus(frame.right.scale(halfWidth)).plus(frame.up.scale(halfHeight));
            var firstTo = at.plus(frame.right.scale(halfWidth)).minus(frame.up.scale(halfHeight));
            var secondFrom = at.plus(frame.right.scale(halfWidth)).plus(frame.up.scale(halfHeight));
            var secondTo = at.minus(frame.right.scale(halfWidth)).minus(frame.up.scale(halfHeight));
            var firstRef = "", secondRef = "";
            var settled = false, cancelled = false;

            function wallSound(scope: CombatWorld, point: CombatPoint): void { scope.sound("minecraft:block.deepslate.break", point, 14, "{}"); }

            function finish(current: CombatAction): void {
                if (settled) return;
                settled = true;
                if (firstRef === "" && secondRef === "") {
                    var scope = current.world();
                    WorldFeedback.emit(scope, crosschopScene, 1, at, { moment: "miss", scale: scale }, 20);
                    WorldFeedback.text(scope, at.plus(WorldCombat.point(0, 0.9, 0)), crosschopMissText, [], 22);
                }
                scenes.finish(current, done);
            }

            /** 沿 from→to 用 `swing` 刻扫过；每刻只判上一刀尖到当前刀尖的新子段，撞墙停下，实体只在首次接触结算一次。 */
            function stroke(current: CombatAction, from: CombatPoint, to: CombatPoint, isSecond: boolean, next: (action: CombatAction) => void): void {
                var delta = to.minus(from), total = swing, passed = 0, struck = false;
                function step(cur: CombatAction): void {
                    var scope = cur.world();
                    var actual = scope.observe(actor);
                    // 施法者被推到够不到锁定挥击中心时取消剩余笔：阈值取本次实际出手距离，另加身体半径作边界余量，不用固定扩程。
                    if (actual === null) { cancelled = true; next(cur); return; }
                    var reachLimit = reach + actual.width() * 0.5 + 0.3;
                    if (actual.position().minus(at).length() > reachLimit) { cancelled = true; next(cur); return; }
                    var before = from.plus(delta.scale(passed / total));
                    passed++;
                    var tip = from.plus(delta.scale(Math.min(1, passed / total)));
                    var reachBlock=WorldGeometry.blockHit(scope,actual.position(),before);
                    if(reachBlock){wallSound(scope,reachBlock.position());next(cur);return;}
                    var tipBlock=WorldGeometry.blockHit(scope,actual.position(),tip);if(tipBlock)tip=tipBlock.position();
                    var contact = cur.trace(before, tip, gauge, true);
                    var wall = contact.blocked() && !contact.hitEntity();
                    var stop = wall ? contact.position() : tip;
                    var victim = contact.hitEntity() ? contact.target() : null;
                    if (victim !== null && (String(victim.ref()) === String(actor.ref()) || scope.friendly(victim))) victim = null;
                    scenes.show(cur, isSecond ? "second" : "first", at,
                        { moment: isSecond ? "seam" : "guard", side: isSecond ? 1 : -1,
                            path: [crosschopVertex(before), crosschopVertex(stop)], point: crosschopVertex(stop),
                            spread: spread, scale: scale, intensity: intensity });
                    if (victim !== null && !struck) {
                        struck = true;
                        var power = isSecond && firstRef !== "" && firstRef === String(victim.ref()) ? chop * (1 + seam) : chop;
                        if (impact(cur, contact, crosschopId, power, { damage: damageSpec(crosschopId, "chop"), contact: true },isSecond?"second":"first")) {
                            if (isSecond) secondRef = String(victim.ref()); else firstRef = String(victim.ref());
                            var now = scope.observe(victim);
                            var point = now === null ? stop : now.position();
                            WorldFeedback.emit(scope, crosschopScene, 1, point,
                                { moment: "cut", target: String(victim.ref()), second: isSecond ? 1 : 0, power: power,
                                    count: Math.round(8 + power * 0.3),
                                    scale: scale, intensity: Math.max(0.5, Math.min(2.4, power / 50)) }, 18);
                            scope.sound("cobblemon:impact.fighting", point, 14, "{}");
                            if (!isSecond) WorldFeedback.text(scope, point.plus(WorldCombat.point(0, 1.15, 0)), crosschopBreakText, [], 20);
                            if (isSecond && firstRef !== "" && firstRef === secondRef) {
                                WorldFeedback.emit(scope, crosschopScene, 1, point,
                                    { moment: "cross", target: secondRef, count: Math.round(10 + chop * 0.3), scale: scale }, 20);
                                WorldFeedback.text(scope, point.plus(WorldCombat.point(0, 1.25, 0)), crosschopCrossText, [], 24);
                            }
                        }
                    }
                    if (wall) {
                        WorldFeedback.emit(scope, crosschopScene, 1, stop, { moment: "wall", face: contact.blockFace(), scale: scale }, 18);
                        wallSound(scope, stop);
                        next(cur);
                        return;
                    }
                    if (passed >= total) { next(cur); return; }
                    cur.after(1, step);
                }
                step(current);
            }

            function second(current: CombatAction): void {
                if (cancelled) { finish(current); return; }
                stroke(current, secondFrom, secondTo, true, finish);
            }

            function handoff(current: CombatAction): void {
                scenes.stop(current, "first");
                if (cancelled) { finish(current); return; }
                current.after(Math.max(1,gap-swing+1), second);
            }

            sound(action, "minecraft:entity.player.attack.strong");
            stroke(action, firstFrom, firstTo, false, handoff);
        }
    });
}
