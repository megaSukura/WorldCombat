/**
 * 猛推 / armthrust 的出手方式。
 *
 * 核心念头：**张开双手、一下接一下把人往外推**——施法者摊开两只手掌向前推撞，每一推都必中（原生 100 命中），
 *   把对手沿推的方向顶开一段。它卖的是「把人推向世界」：被顶到墙、石头或树干上的对手，除了推撞伤害还会
 *   多挨一记 `slam` 撞墙伤害。推进式让施法者跟着对手走、把整串吃满；立推式站定不动，一次把人顶很远，
 *   但下一推可能就够不着了。
 *
 * 幕：
 *   起（brace，提交前）：双手张开、掌心朝前，掌缘聚起一线拳气，只播预告。
 *   推（thrust → hit / slam / out，提交后）：最多 `thrusts` 推。每一推朝目标方向把对手沿水平方向顶开 `push` 格，
 *       结算一次 `thrust` 接触伤害；若实际被顶开的距离明显小于预期，说明撞上了世界，额外结算 `slam` 并播撞墙幕。
 *       推进式随后把施法者向前跟 `step` 格，把距离压回射程内；目标已被推得超出臂展则这串到此为止（`out`）。
 *   收（settle）：推完收手，浮字报出推中几推、撞了几次墙。
 *
 * 与同族分开：连环巴掌是贴身横向来回拨、会失手；连续拳是双拳朝一点密集直击；投球在远处抛球。
 *   只有猛推是**必中的推撞**，并且把「撞到世界」做成追加伤害——反制方式是不要背靠墙站。
 *
 * 配置 `drive`（推进式）由公式改威力／推数／顶开／追步；提交后才触碰世界。
 */
namespace PokemonSkills {
    /** 施法者水平朝目标的方向；太近时退回当前朝向。 */
    function armthrustHeading(origin: CombatPoint, target: CombatPoint, fallback: CombatPoint): CombatPoint {
        const delta = WorldCombat.point(target.x() - origin.x(), 0, target.z() - origin.z());
        if (delta.length() > 0.05) return delta.unit();
        const flat = WorldCombat.point(fallback.x(), 0, fallback.z());
        return flat.length() < 1e-6 ? WorldCombat.point(0, 0, 1) : flat.unit();
    }

    define({
        id: armthrustId,
        cooldownParameter: "recharge",
        name: "Arm Thrust",
        description: "The user attacks the target with open-palmed arm thrusts. This move hits two to five times in a row.",
        uses: ["张开双手的一串必中推撞", "把对手一路推向墙、石头或树干，撞上时多挨一记", "推进式跟着对手走，把整串吃满"],
        kind: "enemy",
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
            const target = action.target();
            if (target === null || !world.valid(target)) { done(action); return; }
            const targetRef = String(target.ref());
            const power = p(armthrustId, "thrust", action);
            const thrusts = Math.max(2, Math.min(5, Math.round(p(armthrustId, "thrusts", action))));
            const gap = Math.max(2, Math.round(p(armthrustId, "gap", action)));
            const reach = p(armthrustId, "reach", action);
            const push = p(armthrustId, "push", action);
            const step = p(armthrustId, "step", action);
            const slam = p(armthrustId, "slam", action);
            const knuckles = Math.max(10, Math.round(p(armthrustId, "knuckles", action)));
            const drive = !!(config && config.drive === true);
            const scale = Math.max(0.6, Math.min(1.6, reach / 2.5));
            const intensity = Math.max(0.5, Math.min(2.2, power / 16));
            let index = 0, landed = 0, wallHits = 0, settled = false;

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
                const victim = scope.actor(targetRef);
                const body = victim !== null && scope.valid(victim) ? scope.observe(victim) : null;
                const self = scope.observe(actor);
                if (self === null || body === null) { settle(current); return; }
                const origin = self.position();
                const shot = index + 1;
                const heading = armthrustHeading(origin, body.position(), current.direction());
                const headingVec = [heading.x(), heading.y(), heading.z()];
                const gapNow = WorldCombat.point(body.position().x() - origin.x(), 0, body.position().z() - origin.z()).length();
                // 站定式把对手推远了：够不到就收场。
                if (gapNow > reach + 0.4) {
                    WorldFeedback.emit(scope, armthrustScene, 1, origin.plus(heading.scale(Math.min(reach, gapNow))),
                        { moment: "out", target: targetRef, index: shot, thrusts: thrusts, knuckles: knuckles, scale: scale }, 16);
                    WorldFeedback.text(scope, origin.plus(WorldCombat.point(0, 1.0, 0)), armthrustOutText, [landed], 20);
                    settle(current);
                    return;
                }
                WorldFeedback.emit(scope, armthrustScene, 1, origin,
                    { moment: "thrust", target: targetRef, index: shot, thrusts: thrusts, reach: Math.round(reach * 100) / 100,
                        direction: headingVec, knuckles: knuckles, scale: scale, intensity: intensity, drive: drive ? 1 : 0 }, 18);
                sound(current, "minecraft:entity.player.attack.strong");
                if (!hurt(current, victim!, armthrustId, power, { damage: damageSpec(armthrustId, "thrust"), contact: true })) {
                    settle(current);
                    return;
                }
                landed++;
                index = shot;
                // 推开：实际位移明显小于预期，说明对手撞上了世界。
                const moved = scope.valid(victim!) ? scope.displace(victim!, heading.scale(push)) : push;
                const blocked = push > 0.2 && moved < push * 0.75 && push - moved > 0.12;
                const at = scope.observe(victim!);
                const point = at !== null ? at.position() : body.position();
                if (blocked) {
                    wallHits++;
                    if (hurt(current, victim!, armthrustId, slam, { damage: damageSpec(armthrustId, "slam") }))
                        WorldFeedback.text(scope, point.plus(WorldCombat.point(0, 1.05, 0)), armthrustSlamText, [], 20);
                    WorldFeedback.emit(scope, armthrustScene, 1, point,
                        { moment: "slam", target: targetRef, index: shot, thrusts: thrusts, direction: headingVec,
                            knuckles: knuckles, scale: scale, intensity: Math.max(0.6, intensity * 1.2) }, 22);
                    scope.sound("minecraft:entity.generic.big_fall", point, 16, "{}");
                } else {
                    WorldFeedback.emit(scope, armthrustScene, 1, point,
                        { moment: "hit", target: targetRef, index: shot, thrusts: thrusts, direction: headingVec,
                            push: Math.round(push * 100) / 100, knuckles: knuckles, scale: scale, intensity: intensity }, 20);
                    scope.sound("cobblemon:impact.fighting", point, 14, "{}");
                }
                // 推进式：把身位重新压回射程内，好让下一推够得着。
                if (drive && step > 0.05) {
                    const after = scope.observe(victim!);
                    const distance = after !== null ? WorldCombat.point(after.position().x() - origin.x(), 0, after.position().z() - origin.z()).length() : 0;
                    const advance = Math.min(step, Math.max(0, distance - 1.0));
                    if (advance > 0.05) scope.displace(actor, heading.scale(advance));
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
