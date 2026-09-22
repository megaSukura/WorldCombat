/**
 * 藤鞭 / vinewhip 的出手方式。
 *
 * 核心念头：细藤绷直、朝目标快抽一道窄线——这是本族里最快、最省、也最轻的一记；它没有大起手，
 * 能一记接一记地抽，靠的是节奏与数量，而不是单发的分量。双抽式会在一次动作里连着抽两下。
 *
 * 两幕（多一抽时在第二记重复命中）：
 *   起（read）：细藤从身体侧面绷起、蓄势，只播预告。
 *   抽（flick → hit… / miss）：提交后沿瞄准方向抽出一道窄线；`WorldGeometry.lane` 圈出窄线里的非友方，
 *       每人结算一次 `lash` 接触伤害。双抽式在 interval 刻后再抽一记；一记都没中就播落空。
 *
 * 与同族分开：强力鞭打是远而宽的横扫、缠绕是贴身绞缠减速、百万吨重踢是直线单体踢飞；
 * 藤鞭的辨识点是「短促、快、可以连着抽」的一道细亮鞭痕。提交后才触碰世界。
 */
namespace PokemonSkills {
    const vinewhipScene = "world_combat:move_vinewhip";
    const vinewhipHitText = "world_combat.move.vinewhip.text.hit";
    const vinewhipMissText = "world_combat.move.vinewhip.text.miss";

    define({
        id: "vinewhip",
        name: "Vine Whip",
        description: "The target is struck with slender, whiplike vines to inflict damage.",
        uses: ["一记快而便宜的贴身抽击", "在对手让位前连着抽两下", "打断沿一条线冲过来的目标"],
        kind: "enemy",
        range: 3.1,
        maxRange: 4.1,
        prepare: 5,
        active: 12,
        recover: 5,
        cooldown: 14,
        style: "lash",
        defaults: { double: false, ai: { maxChase: 5, interrupt: true, finish: true } },
        fields: [],
        indicator: function (config, pokemon) {
            return { radius: p("vinewhip", "reach", pokemon) + 0.4, geometry: "line", style: "lash",
                color: 0x9BD05A, label: config && config.double === true ? "藤鞭·双抽" : "藤鞭" };
        },
        resolve: function (pokemon, config, world, actor, attributes) {
            const context: NumberContext = { pokemon, skill: skills["vinewhip"], detail: { values: config }, world: world || null, actor: actor || null, attributes };
            const double = !!(config && config.double);
            return {
                prepare: Math.round(p("vinewhip", "tempo", context)),
                recover: Math.round(p("vinewhip", "aftercast", context)),
                cooldown: Math.round(p("vinewhip", "recharge", context)),
                active: skills["vinewhip"].active,
                range: p("vinewhip", "reach", context) + (double ? 0.3 : 0.4)
            };
        },
        windup: function (action, config, prepare) {
            action.present("world_combat:move_vinewhip:read", vinewhipScene, 1, action.origin(),
                JSON.stringify({ moment: "read", double: config && config.double === true ? 1 : 0, windup: prepare }));
            return prepare;
        },
        execute: function (action, move, config, done) {
            const world = action.world();
            const reach = p("vinewhip", "reach", action);
            const width = p("vinewhip", "width", action);
            const power = p("vinewhip", "lash", action);
            const strokes = Math.max(1, Math.min(2, Math.round(p("vinewhip", "strokes", action))));
            const interval = Math.max(3, Math.round(p("vinewhip", "interval", action)));
            const notes = Math.max(8, Math.round(p("vinewhip", "notes", action)));
            const double = !!(config && config.double);
            const direction = aim(action);
            const scale = width / 0.45;
            let settled = false, totalHits = 0;

            sound(action, "cobblemon:move.razorleaf.actor_1");
            WorldFeedback.emit(world, vinewhipScene, 1, action.origin(),
                { moment: "flick", direction: [direction.x(), direction.y(), direction.z()], reach: reach,
                    strokes: strokes, interval: interval, notes: notes, scale: scale, double: double ? 1 : 0 }, interval * strokes + 16);

            function finish(current: CombatAction): void { if (!settled) { settled = true; done(current); } }

            /** 一记抽击：窄线里的非友方各挨一下；不是最后一记就排下一记。 */
            function lash(current: CombatAction, stroke: number): void {
                const scope = current.world(), origin = current.origin();
                let hits = 0;
                WorldGeometry.selectEnemies(scope, WorldGeometry.lane(origin, direction, reach, width, { below: 1.8, above: 1.6 }),
                    function (target, facts) {
                        if (hits >= 2) return;
                        const landed = hurt(current, target, "vinewhip", power, { damage: damageSpec("vinewhip", "lash"), contact: true });
                        if (!landed) return;
                        hits++; totalHits++;
                        WorldFeedback.emit(scope, vinewhipScene, 1, facts.position(),
                            { moment: "hit", target: String(target.ref()), notes: notes, scale: scale, stroke: stroke + 1,
                                intensity: Math.max(0.6, Math.min(2.2, power / 48)) }, 20);
                        WorldFeedback.text(scope, facts.position().plus(WorldCombat.point(0, 1.1, 0)), vinewhipHitText, [], 20);
                    });
                if (stroke + 1 < strokes) { current.after(interval, function (next: CombatAction) { lash(next, stroke + 1); }); return; }
                if (totalHits === 0) {
                    WorldFeedback.emit(scope, vinewhipScene, 1, origin, { moment: "miss", notes: Math.round(notes * 0.6), scale: scale }, 18);
                    WorldFeedback.text(scope, origin.plus(WorldCombat.point(0, 1.1, 0)), vinewhipMissText, [], 18);
                }
                sound(current, totalHits > 0 ? "cobblemon:impact.grass" : "minecraft:entity.player.attack.weak");
                finish(current);
            }

            lash(action, 0);
        }
    });
}
