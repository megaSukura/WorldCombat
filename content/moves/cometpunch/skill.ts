/**
 * 连续拳 / cometpunch 的出手方式。
 *
 * 核心念头：**站定、双拳朝固定拳道密集直击**——施法者扎住脚步，一双拳头一下接一下沿起手锁定的方向砸出去，
 *   拳影在身前叠成一片白光；本族单拳最重，拳数靠物攻与耐力堆，后拳一拳比一拳密。它是唯一的「拳」招，带 punch flag，
 *   会与铁拳一类的拳击加成联动。拳道在提交那刻锁死，**不能拐头追人**：原目标走开、拳道里没人，这一串照常收。
 *
 * 选取 `kind: "aim"`：可以点任意阵营实体，也可以只给一个方向起手。提交与执行都不要求存在敌人；纯方向空打会沿固定拳道
 *   把整串演完，真实接触才结算伤害，方块会拦住拳路。
 *
 * 幕：
 *   起（brace，提交前）：沉肩收拳、拳面亮起一线白光，只播预告。
 *   击（flurry → hit / miss / out，提交后）：最多 `punches` 拳。每一拳沿身前固定拳道（聚焦式一条窄道、乱打式一片固定扇面）
 *       判定，最多 `maxTargets` 个非友方各挨一记 `punch` 接触伤害并按 `push` 顶退；每拳独立掷 `accuracy`，擦空这串就停。
 *   收（settle）：这一串砸完（或目标先倒/被推出拳道）收拳，浮字报出命中了几拳。
 *
 * 与同族分开：连环巴掌是两只手掌贴身横向来回拨、每掌更轻；猛推是双掌把人一路推向墙；投球在远处抛球。
 *   只有连续拳是**站定、双拳朝固定拳道密集直击**，也是唯一的拳击（punch）招。
 *
 * 配置 `scatter`（乱打式）由公式改威力／拳数／扇面／顶退；提交后才触碰世界。
 */
namespace PokemonSkills {
    /** 把水平方向绕世界 Y 轴转 `degrees`，做乱打的微小摆拳（只影响表现，不影响固定拳道判定）。 */
    function cometpunchTurn(direction: CombatPoint, degrees: number): CombatPoint {
        const flat = WorldGeometry.flatUnit(direction);
        const angle = degrees * Math.PI / 180, cos = Math.cos(angle), sin = Math.sin(angle);
        return WorldCombat.point(flat.x() * cos - flat.z() * sin, 0, flat.x() * sin + flat.z() * cos).unit();
    }

    define({
        id: cometpunchId,
        cooldownParameter: "recharge",
        name: "Comet Punch",
        description: "站定、双拳朝身前固定拳道密集直击：一下接一下砸出去，拳影叠成一片。拳道在起手锁死、后拳越来越密，不能拐头追人；原目标走开就照常收串，只给方向空打会把整串演完。聚焦式砸在一条窄道上、每拳更重；乱打式罩一片固定扇面、一记能盖到并排的敌人。",
        uses: ["站定一串很重的连拳", "对单个厚目标用聚焦式堆单拳份量", "乱打式一记盖到并排的第二个敌人", "只朝一个方向起手，沿固定拳道空打完整串"],
        kind: "aim",
        range: 2.7,
        maxRange: 3.7,
        prepare: 5,
        active: 0,
        recover: 6,
        cooldown: 24,
        maximumTicks: 240,
        style: "flurry",
        defaults: { scatter: false, ai: { maxChase: 6, crowds: true, leaveStation: false } },
        fields: [],
        indicator: function (config, pokemon) {
            const context: NumberContext = { pokemon: pokemon!, skill: skills[cometpunchId], detail: { values: config } };
            return { radius: p(cometpunchId, "reach", context), geometry: "cone", style: "flurry", color: 0xFFE08A,
                label: config && config.scatter === true ? "连续拳·乱打式" : "连续拳·聚焦式" };
        },
        resolve: function (pokemon, config, world, actor, attributes) {
            const context: NumberContext = { pokemon: pokemon, skill: skills[cometpunchId], detail: { values: config },
                world: world || null, actor: actor || null, attributes: attributes };
            return {
                prepare: Math.round(p(cometpunchId, "tempo", context)),
                recover: Math.round(p(cometpunchId, "settle", context)),
                cooldown: Math.round(p(cometpunchId, "recharge", context)),
                active: 0,
                range: p(cometpunchId, "reach", context)
            };
        },
        windup: function (action, config, prepare) {
            const punches = Math.max(2, Math.min(5, Math.round(p(cometpunchId, "punches", action))));
            const sparks = Math.max(10, Math.round(p(cometpunchId, "sparks", action)));
            action.present("cometpunch:brace:" + action.id(), cometpunchScene, 1, action.origin(),
                JSON.stringify({ moment: "brace", punches: punches, sparks: sparks, windup: prepare,
                    scatter: config && config.scatter === true ? 1 : 0 }));
            return prepare;
        },
        execute: function (action, move, config, done) {
            const world = action.world();
            const actor = action.actor();
            const power = p(cometpunchId, "punch", action);
            const punches = Math.max(2, Math.min(5, Math.round(p(cometpunchId, "punches", action))));
            const gap = Math.max(2, Math.round(p(cometpunchId, "gap", action)));
            const reach = p(cometpunchId, "reach", action);
            const cone = p(cometpunchId, "cone", action);
            const cap = Math.max(1, Math.round(p(cometpunchId, "maxTargets", action)));
            const push = p(cometpunchId, "push", action);
            const accuracy = Math.max(0.05, Math.min(0.99, p(cometpunchId, "accuracy", action)));
            const sparks = Math.max(10, Math.round(p(cometpunchId, "sparks", action)));
            const scatter = !!(config && config.scatter === true);
            const band = { below: 1.0, above: 2.0 };
            const scale = Math.max(0.6, Math.min(1.6, reach / 2.7));
            const intensity = Math.max(0.5, Math.min(2.4, power / 19));
            // 提交那刻锁死拳道：整串不随旧目标转身。
            const heading = WorldGeometry.flatUnit(NativeSemantics.aim(action, move,
                WorldGeometry.flatUnit(action.targetPosition().minus(action.origin()), action.direction()), 1.3));
            let index = 0, landed = 0, targetRef = "", settled = false;

            function finish(current: CombatAction): void { if (!settled) { settled = true; done(current); } }

            function settle(current: CombatAction): void {
                const scope = current.world();
                const self = scope.observe(actor);
                const at = self !== null ? self.position() : current.origin();
                WorldFeedback.emit(scope, cometpunchScene, 1, at,
                    { moment: "settle", punches: punches, landed: landed, sparks: sparks, scale: scale }, 18);
                if (landed > 0)
                    WorldFeedback.text(scope, at.plus(WorldCombat.point(0, 1.15, 0)), cometpunchTallyText, [landed, punches], 22);
                finish(current);
            }

            function flurry(current: CombatAction): void {
                if (settled) return;
                if (index >= punches) { settle(current); return; }
                const scope = current.world();
                const self = scope.observe(actor);
                if (self === null) { settle(current); return; }
                const origin = self.position();
                const shot = index + 1;
                const laneHalf = Math.max(0.35, Math.min(0.8, self.width() * 0.5));
                // 固定拳道：聚焦式一条窄道，乱打式一片固定扇面，都不随目标转。
                const region = scatter
                    ? WorldGeometry.sector(origin, heading, reach, Math.max(12, cone), band)
                    : WorldGeometry.lane(origin, heading, reach, laneHalf, band);
                // 已锁定的原目标走出固定拳道：不追旋，提前收串。
                if (targetRef !== "") {
                    const victim = scope.actor(targetRef);
                    const body = victim !== null && scope.valid(victim) ? scope.observe(victim) : null;
                    if (body === null || !region.contains(body.position())) {
                        WorldFeedback.emit(scope, cometpunchScene, 1, origin.plus(heading.scale(reach)),
                            { moment: "out", target: targetRef, index: shot, punches: punches, sparks: sparks, scale: scale,
                                direction: [heading.x(), heading.y(), heading.z()] }, 18);
                        WorldFeedback.text(scope, origin.plus(WorldCombat.point(0, 1.0, 0)), cometpunchOutText, [landed], 20);
                        settle(current);
                        return;
                    }
                }
                // 拳影逐拳加密：后拳间隔更短，表现里的速度线数量随 shot 抬升。
                const swing = scatter ? cometpunchTurn(heading, (scope.random() * 2 - 1) * cone / 2) : heading;
                WorldFeedback.emit(scope, cometpunchScene, 1, origin,
                    { moment: "flurry", target: targetRef === "" ? undefined : targetRef,
                        direction: [swing.x(), swing.y(), swing.z()], fixed: [heading.x(), heading.y(), heading.z()],
                        dense: Math.min(9, 3 + shot), index: shot, punches: punches, sparks: sparks,
                        scale: scale, intensity: intensity, scatter: scatter ? 1 : 0 }, 16);
                sound(current, "minecraft:entity.player.attack.strong");
                if (scope.random() > accuracy) {
                    WorldFeedback.emit(scope, cometpunchScene, 1, origin.plus(heading.scale(reach * 0.8)),
                        { moment: "miss", target: targetRef === "" ? undefined : targetRef, index: shot, punches: punches, sparks: sparks, scale: scale }, 16);
                    WorldFeedback.text(scope, origin.plus(WorldCombat.point(0, 1.0, 0)), cometpunchMissText, [shot], 18);
                    settle(current);
                    return;
                }
                let hits = 0;
                WorldGeometry.selectEnemies(scope, region, function (other, facts) {
                    if (hits >= cap) return;
                    if (!scope.clear(origin, facts.position())) return;
                    if (!hurt(current, other, cometpunchId, power, { damage: damageSpec(cometpunchId, "punch"), contact: true })) return;
                    hits++;
                    landed++;
                    if (targetRef === "") targetRef = String(other.ref());
                    const at = scope.closestPoint(other, origin);
                    if (scope.valid(other)) scope.hitDisplace(other, WorldCombat.point(heading.x(), 0, heading.z()).scale(push));
                    WorldFeedback.emit(scope, cometpunchScene, 1, at,
                        { moment: "hit", target: String(other.ref()), index: shot, punches: punches, sparks: sparks,
                            push: Math.round(push * 100) / 100, scale: scale, intensity: intensity, scatter: scatter ? 1 : 0 }, 20);
                    scope.sound("cobblemon:impact.normal", at, 14, "{}");
                });
                if (hits === 0) {
                    // 已锁定的目标落空就收串；纯方向空打则沿固定拳道演完。
                    if (targetRef !== "") {
                        WorldFeedback.text(scope, origin.plus(WorldCombat.point(0, 1.0, 0)), cometpunchMissText, [shot], 18);
                        settle(current);
                        return;
                    }
                }
                index = shot;
                if (index >= punches) { settle(current); return; }
                // 后拳更密：每一拳把间隔压 1 刻，总时长不超过原来的匀速串。
                const nextGap = Math.max(2, gap - index);
                current.after(nextGap, function (next: CombatAction) { flurry(next); });
            }

            sound(action, "cobblemon:move.closecombat.actor_1");
            WorldFeedback.emit(world, cometpunchScene, 1, action.origin(),
                { moment: "brace", punches: punches, sparks: sparks, scale: scale, intensity: intensity, scatter: scatter ? 1 : 0 }, 16);
            flurry(action);
        }
    });
}
