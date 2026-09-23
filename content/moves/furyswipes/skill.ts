/**
 * 乱抓 / furyswipes —— 出手方式。
 *
 * 核心念头：**贴身游走乱抓**——爪子先向目标一侧抓下第一道，随即侧移换位，从另一个角度再抓；一道道从不同方向
 *   交错落在同一个目标身上。它照顾的是身前一片扇形，但每道都换一个站位，所以被缠上的人得一直转身；抓空一道
 *   这趟就散。它是本族唯一把位移做进连击的招：不是站定打，是边绕边抓。
 *
 * 幕：
 *   起（raise，提交前）：压低身位、亮爪，爪尖聚起细光；`action.present`，可打断、不花 PP。
 *   抓（cut，提交后）：`cuts` 道。每一道施法者先绕目标侧移 `step` 格（扑抓式改为前压），再朝目标所在的扇形
 *       判定：扇内至多 `maxTargets` 个非友方各吃一记 `rake` 接触伤害；每一道独立掷 `accuracy`，落空即收。
 *   收（settle）：这一趟爪势收住、余尘落定。
 *
 * 与同族分开：乱击是站定定点突刺、扫尾拍打是原地整圈旋尾、骨棒乱打是掷骨夯地；只有乱抓会绕圈换位，
 *   反制方式是背对墙壁断掉它的侧移空间，或用贴身的范围招逼它站定。
 *
 * 配置 `pounce`（扑抓式）由 resolve 改时序、由公式改威力／爪距／张角／换位与命中率；提交后才触碰世界。
 */
namespace PokemonSkills {
    /** 水平右向量：绕目标侧移的左右方向；方向接近竖直时退化为世界 X 轴。 */
    function furyswipesSide(direction: CombatPoint): CombatPoint {
        const side = WorldCombat.point(-direction.z(), 0, direction.x());
        return side.length() < 0.001 ? WorldCombat.point(1, 0, 0) : side.unit();
    }

    define({
        id: furyswipesId,
        cooldownParameter: "recharge",
        name: "Fury Swipes",
        description: "The user attacks by raking the target with claws, scythes, or the like. This move hits two to five times in a row.",
        uses: ["贴身绕目标左右换位，一道道抓下去", "抓侧后，逼目标不停转身", "扑抓式改成前压，把目标按在一面猛抓"],
        kind: "enemy",
        range: 2.6,
        maxRange: 3.6,
        prepare: 6,
        active: 0,
        recover: 6,
        cooldown: 24,
        maximumTicks: 200,
        style: "flurry",
        defaults: { pounce: false, ai: { maxChase: 6, finish: true, leaveStation: true } },
        fields: [],
        indicator: function (config, pokemon) {
            const context: NumberContext = { pokemon: pokemon!, skill: skills[furyswipesId], detail: { values: config } };
            return { radius: p(furyswipesId, "reach", context), geometry: "cone", style: "flurry", color: 0xF2F6FF,
                label: config && config.pounce === true ? "乱抓·扑抓式" : "乱抓·游走式" };
        },
        resolve: function (pokemon, config, world, actor, attributes) {
            const context: NumberContext = { pokemon: pokemon, skill: skills[furyswipesId], detail: { values: config },
                world: world || null, actor: actor || null, attributes: attributes };
            return {
                prepare: Math.round(p(furyswipesId, "tempo", context)),
                recover: Math.round(p(furyswipesId, "settle", context)),
                cooldown: Math.round(p(furyswipesId, "recharge", context)),
                active: 0,
                range: p(furyswipesId, "reach", context) + 0.3
            };
        },
        windup: function (action, config, prepare) {
            const cuts = Math.max(2, Math.min(5, Math.round(p(furyswipesId, "cuts", action))));
            const dust = Math.max(6, Math.round(p(furyswipesId, "dust", action)));
            action.present("furyswipes:raise:" + action.id(), furyswipesScene, 1, action.origin(),
                JSON.stringify({ moment: "raise", cuts: cuts, dust: dust, windup: prepare,
                    pounce: config && config.pounce === true ? 1 : 0 }));
            return prepare;
        },
        execute: function (action, move, config, done) {
            const world = action.world();
            const actor = action.actor();
            const target = action.target();
            if (target === null || !world.valid(target)) { done(action); return; }
            const targetRef = String(target.ref());
            const power = p(furyswipesId, "rake", action);
            const cuts = Math.max(2, Math.min(5, Math.round(p(furyswipesId, "cuts", action))));
            const gap = Math.max(2, Math.round(p(furyswipesId, "gap", action)));
            const reach = p(furyswipesId, "reach", action);
            const span = p(furyswipesId, "span", action);
            const step = p(furyswipesId, "step", action);
            const accuracy = Math.max(0.05, Math.min(0.99, p(furyswipesId, "accuracy", action)));
            const dust = Math.max(8, Math.round(p(furyswipesId, "dust", action)));
            const cap = Math.max(1, Math.round(1 + (p(furyswipesId, "span", action) - 130) / 60));
            const pounce = !!(config && config.pounce === true);
            const band = { below: 1.1, above: 2.3 };
            let index = 0, landed = 0, settled = false;

            function finish(current: CombatAction): void { if (!settled) { settled = true; done(current); } }

            function settle(current: CombatAction): void {
                const scope = current.world();
                const self = scope.observe(actor);
                const at = self !== null ? self.position() : current.origin();
                WorldFeedback.emit(scope, furyswipesScene, 1, at,
                    { moment: "settle", cuts: cuts, landed: landed, dust: dust }, 18);
                if (landed > 0)
                    WorldFeedback.text(scope, at.plus(WorldCombat.point(0, 1.1, 0)), furyswipesTallyText, [landed], 22);
                finish(current);
            }

            function cut(current: CombatAction): void {
                if (settled) return;
                if (index >= cuts) { settle(current); return; }
                const scope = current.world();
                const victim = scope.actor(targetRef);
                const vbody = victim !== null && scope.valid(victim) ? scope.observe(victim) : null;
                let self = scope.observe(actor);
                if (self === null || vbody === null) { finish(current); return; }
                let heading = vbody.position().minus(self.position());
                if (heading.length() < 0.05) heading = current.direction();
                heading = heading.unit();
                const side = furyswipesSide(heading);
                // 换位：游走式左右交替侧移，扑抓式改为朝目标前压（把目标按在一面）。
                if (step > 0.05) {
                    const shift = pounce ? heading.scale(step * 0.8) : side.scale(index % 2 === 0 ? step : -step);
                    scope.displace(actor, shift);
                    self = scope.observe(actor) || self;
                }
                const origin = self.position();
                // 命中 80：共享偏角让方向真的会歪；歪出扇面就抓空。
                const aimed = NativeSemantics.aim(current, move, heading, 1.2);
                const shot = index + 1;
                WorldFeedback.emit(scope, furyswipesScene, 1, origin,
                    { moment: "cut", index: shot, cuts: cuts, reach: reach, span: span, dust: dust,
                        intensity: Math.max(0.5, Math.min(2, power / 22)),
                        direction: [aimed.x(), aimed.y(), aimed.z()], pounce: pounce ? 1 : 0 }, 18);
                if (scope.random() > accuracy) {
                    WorldFeedback.emit(scope, furyswipesScene, 1, origin,
                        { moment: "miss", direction: [aimed.x(), aimed.y(), aimed.z()], index: shot, cuts: cuts, reach: reach, span: span, dust: dust }, 18);
                    WorldFeedback.text(scope, origin.plus(WorldCombat.point(0, 1.0, 0)), furyswipesMissText, [shot], 20);
                    settle(current);
                    return;
                }
                let hits = 0;
                WorldGeometry.selectEnemies(scope, WorldGeometry.sector(origin, aimed, reach, span, band), function (other, facts) {
                    if (hits >= cap) return;
                    if (!hurt(current, other, furyswipesId, power, { damage: damageSpec(furyswipesId, "rake"), contact: true })) return;
                    hits++;
                    landed++;
                    const at = facts.position();
                    WorldFeedback.emit(scope, furyswipesScene, 1, at,
                        { moment: "hit", target: String(other.ref()), index: shot, cuts: cuts, dust: dust,
                            pounce: pounce ? 1 : 0, intensity: Math.max(0.5, Math.min(2, power / 22)),
                            scale: Math.max(0.6, Math.min(1.8, span / 130)) }, 20);
                    scope.sound("cobblemon:impact.normal", at, 14, "{}");
                });
                if (hits === 0) {
                    WorldFeedback.emit(scope, furyswipesScene, 1, origin,
                        { moment: "miss", direction: [aimed.x(), aimed.y(), aimed.z()], index: shot, cuts: cuts, reach: reach, span: span, dust: dust }, 18);
                    WorldFeedback.text(scope, origin.plus(WorldCombat.point(0, 1.0, 0)), furyswipesMissText, [shot], 20);
                    settle(current);
                    return;
                }
                index = shot;
                if (index >= cuts) { settle(current); return; }
                current.after(gap, cut);
            }

            sound(action, "minecraft:entity.player.attack.sweep");
            cut(action);
        }
    });
}
