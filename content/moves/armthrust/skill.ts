/**
 * 猛推 / armthrust 的出手方式。
 *
 * 核心念头：**张开双手、一下接一下把人往外推**——施法者摊开两只手掌向前推撞，每一推都必中（原生 100 命中），
 *   把对手沿推的方向顶开一段。它卖的是「把人推向世界」：被顶到墙、石头或树干上的对手，除了推撞伤害还会
 *   多挨一记 `slam` 撞墙伤害。推进式让施法者跟着对手走、把整串吃满；立推式站定不动，一次把人顶很远，
 *   但下一推可能就够不着了。
 *
 * 选取 `kind: "aim"`：可以点任意阵营实体，也可以只给一个方向起手。第一推在身前推撞走廊里取最近的首敌，
 *   之后只维持这个首敌；它被推出射程或倒下，这一串就收手。命中权限仍由命中层按敌我结算。
 *
 * 撞墙判定：只有目标背后确有原生方块挡住这一次推、并且这一推确实被它限住（不是被抗性/移动拒绝吃掉）时，
 *   才追加 `slam`。抗击退的 Boss 照常吃推撞伤害，但不会被硬生生算成撞墙。
 *
 * 幕：
 *   起（brace，提交前）：双手张开、掌心朝前，掌缘聚起一线拳气，只播预告。
 *   推（thrust → hit / slam / out，提交后）：最多 `thrusts` 推。每一推朝目标方向把对手沿水平方向顶开 `push` 格，
 *       结算一次 `thrust` 接触伤害；若目标背后有真实方块阻挡且这一推被限住，额外结算 `slam` 并在真实方块表面播撞墙幕。
 *       推进式随后把施法者向前跟 `step` 格，把距离压回射程内；目标已被推得超出臂展则这串到此为止（`out`）。
 *   收（settle）：推完收手，浮字报出推中几推、撞了几次墙。
 *
 * 与同族分开：连环巴掌是贴身横向来回拨、会失手；连续拳是双拳朝固定拳道密集直击；投球在远处抛球。
 *   只有猛推是**必中的推撞**，并且把「撞到世界」做成追加伤害——反制方式是不要背靠墙站。
 *
 * 配置 `drive`（推进式）由公式改威力／推数／顶开／追步；提交后才触碰世界。
 */
namespace PokemonSkills {
    define({
        freeMovement: true,
        id: armthrustId,
        cooldownParameter: "recharge",
        name: "Arm Thrust",
        description: "张开双手的一串必中推撞：一掌接一掌把对手朝前推出去，被顶到墙、石头或树干上时还会多挨一记撞墙伤害。可以点敌人，也可以只给一个方向起手，第一推只维持同一个近敌。推进式跟着对手走、把整串吃满；立推式站定不动，一次把人顶很远。",
        uses: ["张开双手的一串必中推撞", "把对手推向墙、石头或树干，撞上时多挨一记", "推进式跟着对手走，把整串吃满", "只朝一个方向起手，推空就收手"],
        kind: "aim",
        range: 2.5,
        maxRange: 3.4,
        prepare: 5,
        active: 0,
        recover: 7,
        cooldown: 23,
        maximumTicks: 240,
        style: "shove",
        defaults: { drive: true, ai: { maxChase: 6, wall: true, leaveStation: false } },
        fields: [],
        indicator: function (config, pokemon) {
            const context: NumberContext = { pokemon: pokemon!, skill: skills[armthrustId], detail: { values: config } };
            return { radius: p(armthrustId, "reach", context), geometry: "line", style: "shove", color: 0xE0A46A,
                label: config && config.drive === true ? "猛推·推进式" : "猛推·立推式" };
        },
        resolve: function (pokemon, config, world, actor, attributes) {
            const context: NumberContext = { pokemon: pokemon, skill: skills[armthrustId], detail: { values: config },
                world: world || null, actor: actor || null, attributes: attributes };
            return {
                prepare: Math.round(p(armthrustId, "tempo", context)),
                recover: Math.round(p(armthrustId, "settle", context)),
                cooldown: Math.round(p(armthrustId, "recharge", context)),
                active: 0,
                range: p(armthrustId, "reach", context)
            };
        },
        windup: function (action, config, prepare) {
            const thrusts = Math.max(2, Math.min(5, Math.round(p(armthrustId, "thrusts", action))));
            const knuckles = Math.max(10, Math.round(p(armthrustId, "knuckles", action)));
            action.present("armthrust:brace:" + action.id(), armthrustScene, 1, action.origin(),
                JSON.stringify({ moment: "brace", thrusts: thrusts, knuckles: knuckles, windup: prepare,
                    drive: config && config.drive === true ? 1 : 0 }));
            return prepare;
        },
        execute: function (action, move, config, done) {
            const world = action.world();
            const actor = action.actor();
            const power = p(armthrustId, "thrust", action);
            const thrusts = Math.max(2, Math.min(5, Math.round(p(armthrustId, "thrusts", action))));
            const gap = Math.max(2, Math.round(p(armthrustId, "gap", action)));
            const reach = p(armthrustId, "reach", action);
            const push = p(armthrustId, "push", action);
            const step = p(armthrustId, "step", action);
            const slam = p(armthrustId, "slam", action);
            const knuckles = Math.max(10, Math.round(p(armthrustId, "knuckles", action)));
            const drive = !!(config && config.drive === true);
            const band = { below: 1.0, above: 2.0 };
            const scale = Math.max(0.6, Math.min(1.6, reach / 2.5));
            const intensity = Math.max(0.5, Math.min(2.2, power / 16));
            // 提交那刻锁死推撞走廊：整串不随目标转身。
            const heading = WorldGeometry.flatUnit(NativeSemantics.aim(action, move,
                WorldGeometry.flatUnit(action.targetPosition().minus(action.origin()), action.direction()), 1.3));
            let index = 0, landed = 0, wallHits = 0, targetRef = "", settled = false;

            function finish(current: CombatAction): void { if (!settled) { settled = true; done(current); } }

            function settle(current: CombatAction): void {
                const scope = current.world();
                const self = scope.observe(actor);
                const at = self !== null ? self.position() : current.origin();
                WorldFeedback.emit(scope, armthrustScene, 1, at,
                    { moment: "settle", thrusts: thrusts, landed: landed, walls: wallHits, knuckles: knuckles, scale: scale }, 18);
                if (landed > 0)
                    WorldFeedback.text(scope, at.plus(WorldCombat.point(0, 1.15, 0)), armthrustTallyText, [landed, wallHits], 22);
                finish(current);
            }

            function thrust(current: CombatAction): void {
                if (settled) return;
                if (index >= thrusts) { settle(current); return; }
                const scope = current.world();
                const self = scope.observe(actor);
                if (self === null) { settle(current); return; }
                const origin = self.position();
                const shot = index + 1;
                const laneHalf = Math.max(0.35, Math.min(0.8, self.width() * 0.5));
                let victim: CombatActor | null = null;
                if (targetRef !== "") {
                    const candidate = scope.actor(targetRef);
                    if (candidate !== null && scope.valid(candidate) && !scope.friendly(candidate)) victim = candidate;
                } else {
                    // 第一推：在身前推撞走廊里取最近的首敌。
                    WorldGeometry.selectEnemies(scope, WorldGeometry.lane(origin, heading, reach, laneHalf, band), function (other) {
                        if (victim !== null) return;
                        victim = other;
                    });
                }
                if (victim === null) {
                    // 推空：没有首敌可推，这一串到此为止。
                    WorldFeedback.emit(scope, armthrustScene, 1, origin.plus(heading.scale(reach)),
                        { moment: "out", index: shot, thrusts: thrusts, knuckles: knuckles, scale: scale,
                            direction: [heading.x(), heading.y(), heading.z()] }, 16);
                    WorldFeedback.text(scope, origin.plus(WorldCombat.point(0, 1.0, 0)), armthrustOutText, [landed], 20);
                    settle(current);
                    return;
                }
                const victimRef = String(victim.ref());
                const body = scope.observe(victim);
                if (body === null) { settle(current); return; }
                const gapNow = WorldCombat.point(body.position().x() - origin.x(), 0, body.position().z() - origin.z()).length();
                // 目标被推出射程：收场。
                if (gapNow > reach + 0.4) {
                    WorldFeedback.emit(scope, armthrustScene, 1, origin.plus(heading.scale(Math.min(reach, gapNow))),
                        { moment: "out", target: victimRef, index: shot, thrusts: thrusts, knuckles: knuckles, scale: scale }, 16);
                    WorldFeedback.text(scope, origin.plus(WorldCombat.point(0, 1.0, 0)), armthrustOutText, [landed], 20);
                    settle(current);
                    return;
                }
                // 掌前推：判定与表现共用这条走廊。
                const pushHeading = WorldGeometry.flatUnit(body.position().minus(origin), heading);
                WorldFeedback.emit(scope, armthrustScene, 1, origin,
                    { moment: "thrust", target: victimRef, index: shot, thrusts: thrusts, reach: Math.round(reach * 100) / 100,
                        direction: [pushHeading.x(), pushHeading.y(), pushHeading.z()], knuckles: knuckles, scale: scale,
                        intensity: intensity, drive: drive ? 1 : 0 }, 18);
                sound(current, "minecraft:entity.player.attack.strong");
                if (!hurt(current, victim, armthrustId, power, { damage: damageSpec(armthrustId, "thrust"), contact: true })) {
                    settle(current);
                    return;
                }
                landed++;
                index = shot;
                targetRef = victimRef;
                // 推开：走原生受击位移，抗推者不被硬移。
                const moved = scope.valid(victim) ? scope.hitDisplace(victim, pushHeading.scale(push)) : push;
                const at = scope.observe(victim);
                const point = at !== null ? at.position() : body.position();
                // 撞墙证据：目标背后确有原生方块挡住这一推，且这一推确实被它限住；抗击退/移动拒绝不算。
                const resistance = scope.attributeValue(victim, "minecraft:generic.knockback_resistance");
                const refused = resistance !== null && resistance.value() >= 0.9;
                const clip = refused ? null : scope.clipBlocks(body.position(),
                    body.position().plus(pushHeading.scale(push + Math.max(0.4, body.width()))));
                const blocked = clip !== null && clip.blocked();
                const pinned = !refused && blocked && moved < push - 0.05;
                if (pinned) {
                    wallHits++;
                    const wallPoint = clip !== null ? clip.position() : point;
                    if (hurt(current, victim, armthrustId, slam, { damage: damageSpec(armthrustId, "slam") }))
                        WorldFeedback.text(scope, point.plus(WorldCombat.point(0, 1.05, 0)), armthrustSlamText, [], 20);
                    WorldFeedback.emit(scope, armthrustScene, 1, wallPoint,
                        { moment: "slam", target: victimRef, index: shot, thrusts: thrusts, direction: [pushHeading.x(), pushHeading.y(), pushHeading.z()],
                            knuckles: knuckles, scale: scale, intensity: Math.max(0.6, intensity * 1.2),
                            face: clip !== null ? clip.blockFace() : "" }, 22);
                    scope.sound("minecraft:entity.generic.big_fall", wallPoint, 16, "{}");
                } else {
                    WorldFeedback.emit(scope, armthrustScene, 1, point,
                        { moment: "hit", target: victimRef, index: shot, thrusts: thrusts, direction: [pushHeading.x(), pushHeading.y(), pushHeading.z()],
                            push: Math.round(push * 100) / 100, knuckles: knuckles, scale: scale, intensity: intensity }, 20);
                    scope.sound("cobblemon:impact.fighting", point, 14, "{}");
                }
                // 推进式：把身位重新压回射程内，好让下一推够得着；走原生可达位移，撞墙照实停住。
                if (drive && step > 0.05) {
                    const after = scope.observe(victim);
                    const distance = after !== null ? WorldCombat.point(after.position().x() - origin.x(), 0, after.position().z() - origin.z()).length() : 0;
                    const advance = Math.min(step, Math.max(0, distance - 1.0));
                    if (advance > 0.05) scope.displace(actor, pushHeading.scale(advance));
                }
                if (index >= thrusts) { settle(current); return; }
                current.after(gap, function (next: CombatAction) { thrust(next); });
            }

            sound(action, "minecraft:entity.player.attack.strong");
            WorldFeedback.emit(world, armthrustScene, 1, action.origin(),
                { moment: "brace", thrusts: thrusts, knuckles: knuckles, scale: scale, intensity: intensity, drive: drive ? 1 : 0 }, 16);
            thrust(action);
        }
    });
}
