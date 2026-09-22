/**
 * 摔打 / slam 的出手方式。
 *
 * 核心念头：**把长肢高高扬起，朝对手当时站的地方摔下去**——扬起的那一瞬砸点就定死了，之后砸落。
 * 站在那个圆里的人各挨一记全族最重的接触伤害、被震开一段；在落下前挪开的人就只看着它砸空。
 * 原生 75 命中在这里是**一个看得见的躲避窗口**（`fallTicks`）：站住不动就吃满，侧身就走掉。
 *
 * 三幕：
 *   起（windup，提交前）：长肢高举过头、脚下扬尘的预告。
 *   标记（mark）：提交后砸点定在对手当前位置，地面亮出一个会缩的圆，持续 `fallTicks` 刻——这就是可以躲开的窗口。
 *   砸（land）：落下时圆内的非友方各结算一记 impact 接触伤害、被背向震开 `shockPush` 格；圆里没人则只是
 *       砸出一地尘土（whiff），仍然留下坑印一样的尘。
 *
 * 与同族分开：拍击瞬发而便宜、扇面一扫；摔打慢、重、落点先画出来，是全族最高的单发也最容易落空。
 * 配置 `heavy`（沉砸式）由 resolve 改时序、由公式改威力／坑径／震距与砸落时长，提交后才触碰世界。
 */
namespace PokemonSkills {
    const slamScene = "world_combat:move_slam";
    const slamHitText = "world_combat.move.slam.text.hit";
    const slamMissText = "world_combat.move.slam.text.miss";

    define({
        id: "slam",
        name: "Slam",
        description: "The user raises a long tail, vine or limb high and brings it down where the target stands. The mark is set the moment it is raised, so stepping aside before it lands dodges it.",
        uses: ["对站桩或刚被定住的目标砸一发最重的单体伤害", "预判落点把堵在门口的目标震开", "在被缠住的目标身上补一记收割"],
        kind: "enemy",
        range: 3.0,
        maxRange: 4.2,
        prepare: 11,
        active: 16,
        recover: 12,
        cooldown: 46,
        style: "slam",
        defaults: { heavy: false, ai: { maxChase: 5, preferStill: true } },
        fields: [],
        indicator: function (config, pokemon) {
            return { radius: p("slam", "reach", pokemon) + 0.3, geometry: "circle", style: "slam", color: 0xC7A97B,
                label: config && config.heavy === true ? "沉砸式" : "疾砸式" };
        },
        resolve: function (pokemon, config, world, actor, attributes) {
            const context: NumberContext = { pokemon: pokemon, skill: skills["slam"], detail: { values: config },
                world: world || null, actor: actor || null, attributes: attributes };
            return {
                prepare: Math.round(p("slam", "tempo", context)),
                recover: Math.round(p("slam", "aftercast", context)),
                cooldown: Math.round(p("slam", "recharge", context)),
                active: skills["slam"].active,
                range: p("slam", "reach", context)
            };
        },
        windup: function (action, config, prepare) {
            action.present("world_combat:move_slam:raise", slamScene, 1, action.origin(),
                JSON.stringify({ moment: "raise", heavy: config && config.heavy === true ? 1 : 0, windup: prepare }));
            return prepare;
        },
        execute: function (action, move, config, done) {
            const world = action.world();
            const mark = action.targetPosition();
            action.releaseTarget();
            const crater = Math.max(0.7, p("slam", "crater", action));
            const power = p("slam", "impact", action);
            const push = Math.max(0.15, p("slam", "shockPush", action));
            const dust = Math.max(10, Math.round(p("slam", "dust", action)));
            const fall = Math.max(4, Math.round(p("slam", "fallTicks", action)));
            const scale = Math.max(0.7, Math.min(2.2, crater / 1.0));
            const intensity = Math.max(0.6, Math.min(2.4, power / 90));
            let settled = false;

            function finish(current: CombatAction): void { if (!settled) { settled = true; done(current); } }

            WorldFeedback.emit(world, slamScene, 1, mark,
                { moment: "mark", radius: crater, fall: fall, scale: scale, intensity: intensity }, fall + 6);
            sound(action, "minecraft:entity.player.attack.strong");

            function land(current: CombatAction): void {
                const scope = current.world();
                const struck: string[] = [];
                WorldGeometry.selectEnemies(scope, WorldGeometry.ring(mark, 0, crater, { below: 2.0, above: 2.4 }),
                    function (victim, facts) {
                        if (!hurt(current, victim, "slam", power,
                            { damage: damageSpec("slam", "impact"), contact: true })) return;
                        struck.push(String(victim.ref()));
                        const away = facts.position().minus(mark);
                        const flat = WorldCombat.point(away.x(), 0, away.z());
                        const direction = flat.length() < 0.05 ? WorldCombat.point(0, 0, 1) : flat.unit();
                        scope.displace(victim, direction.scale(push));
                        WorldFeedback.emit(scope, slamScene, 1, facts.position(),
                            { moment: "hit", target: String(victim.ref()), dust: dust, scale: scale, intensity: intensity }, 22);
                    });
                WorldFeedback.emit(scope, slamScene, 1, mark,
                    { moment: "impact", radius: crater, dust: dust, hits: struck.length, scale: scale, intensity: intensity }, 30);
                sound(current, "cobblemon:impact.ground");
                if (struck.length === 0) {
                    WorldFeedback.emit(scope, slamScene, 1, mark, { moment: "whiff", radius: crater, scale: scale }, 18);
                    WorldFeedback.text(scope, mark.plus(WorldCombat.point(0, 1.0, 0)), slamMissText, [], 22);
                } else {
                    WorldFeedback.text(scope, mark.plus(WorldCombat.point(0, 1.4, 0)), slamHitText, [struck.length], 24);
                }
                finish(current);
            }

            action.after(fall, function (next: CombatAction) { land(next); });
        }
    });
}
