/**
 * 燕返 / aerialace 的出手方式。
 *
 * 核心念头：一步掠身而过，掠过的那条线本身就是刀路——扫到谁，谁就挨刀；因为人是从对手身侧穿过去的，
 * 没被挡住时最后落在对手身后，把对手甩在背后。
 *
 * 两幕：
 *   起（gather，提交前）：压低身子，脚下的风线聚拢（可被打断的预告）。
 *   掠（dash → cut → past / miss / wall）：提交时把方向锁死为指向选定点（实体、世界点或方向），逐刻沿直线掠去，
 *       每刻把这一段扫一遍；扫到的人按 `cuts` 挨刀。掠到目标身上仍会继续穿过落到另一侧。
 *       没有命中率判定，但刀路只结算真正扫过的身体：对手横移出这条线，或墙挡在前面，这一掠就落空、停在墙前。
 *
 * 与同族分开：修长之角是锁定后一发直线突刺、角在角尖且会有限转向；燕返是**一整条掠过的直线刀路**，
 * 扫到路上的人，人落到对手身后，横向完全靠玩家锁定。
 */
namespace PokemonSkills {
    const aerialaceScene = "world_combat:move_aerialace";
    const aerialaceCutText = "world_combat.move.aerialace.text.cut";
    const aerialaceMissText = "world_combat.move.aerialace.text.miss";

    define({
        freeMovement: true,
        id: "aerialace",
        name: "Aerial Ace",
        description: "一步掠身而过，掠过的那条线本身就是刀路：扫到的敌人各挨数刀，没被挡住时最后落在对手身后。没有命中率判定，但刀路只砍到真正扫过的人——对手横移出刀路、或墙挡在前面，这一掠就会落空。",
        uses: ["一步掠身而过的交叉快斩", "扫过一条直线上的所有敌人", "掠过目标落到它身后换位"],
        kind: "aim",
        range: 6,
        maxRange: 9,
        prepare: 5,
        active: 0,
        recover: 7,
        cooldown: 26,
        style: "slash",
        defaults: { skim: false, ai: { maxChase: 11, skirmish: true, leaveStation: true } },
        fields: [],
        indicator: function (config, pokemon) {
            return { radius: p("aerialace", "laneWidth", pokemon) * 1.6, geometry: "line", style: "slash", color: 0xBFE6FF, label: "燕返" };
        },
        resolve: function (pokemon, config, world, actor, attributes) {
            var context: NumberContext = { pokemon: pokemon, skill: skills["aerialace"], detail: { values: config }, world: world, actor: actor, attributes: attributes };
            var skim = !!(config && config.skim);
            return {
                prepare: Math.max(2, Math.round(p("aerialace", "prepare", context))) + (skim ? 2 : 0),
                recover: p("aerialace", "recover", context),
                cooldown: p("aerialace", "cooldown", context) + (skim ? 4 : 0),
                range: p("aerialace", "pursuit", context)
            };
        },
        windup: function (action, config, prepare) {
            action.present("world_combat:move_aerialace:gather", aerialaceScene, 1, action.origin(),
                JSON.stringify({ moment: "gather", windup: prepare, skim: !!(config && config.skim) }));
            return prepare;
        },
        execute: function (action, move, config, done) {
            const movementScenes = WorldFeedback.actionScenes(aerialaceScene);
            const world = action.world();
            const actor = action.actor();
            const skim = !!(config && config.skim);
            const pursuit = p("aerialace", "pursuit", action);
            const speed = p("aerialace", "dashSpeed", action);
            const radius = p("aerialace", "laneWidth", action);
            const cuts = Math.max(1, Math.round(p("aerialace", "cuts", action)));
            const slash = p("aerialace", "slash", action);
            const scale = radius / 0.55;
            const intensity = Math.max(0.6, Math.min(2.2, (slash * cuts) / 70));
            const notes = Math.max(12, Math.round(slash * cuts * 1.2));
            const start = action.origin();
            const selected = action.target();
            // 方向在提交那一刻锁死：刀路是一条水平的直线，对手移出这条线就会落空。
            const aimed = aim(action);
            const horizontal = WorldCombat.point(aimed.x(), 0, aimed.z());
            const heading = horizontal.length() > 0.001 ? horizontal.unit() : aimed;
            let travelled = 0;
            let cutLanded = false;
            const struck: { [ref: string]: boolean } = Object.create(null);
            let settled = false;

            sound(action, "cobblemon:move.aerialace.actor_1");

            /** 结束：真实落点由当前身体位置给出；本想扫某个实体却没扫到、或撞墙停下才算落空。 */
            function finish(current: CombatAction, whiffed: boolean, contact?: CombatImpact): void {
                if (settled) return;
                settled = true;
                const scope = current.world();
                const body = scope.observe(actor);
                const at = body === null ? current.origin() : body.position();
                if (whiffed) {
                    WorldFeedback.emit(scope, aerialaceScene, 1, at,
                        { moment: "miss", scale: scale, wall: contact !== undefined && contact.blocked() ? 1 : 0,
                          face: contact !== undefined && contact.blocked() ? contact.blockFace() : "" }, 18);
                    WorldFeedback.text(scope, at.plus(WorldCombat.point(0, 1.2, 0)), aerialaceMissText, [], 20);
                } else {
                    WorldFeedback.emit(scope, aerialaceScene, 1, at,
                        { moment: "past", cuts: cuts, scale: scale, skim: skim }, 20);
                }
                movementScenes.finish(current, done);
            }

            /** 刀路扫到某人：按刀数重复结算；真实掠过的那一段就是刀痕的路径。 */
            function strike(current: CombatAction, victim: CombatActor, point: CombatPoint, from: CombatPoint, primary: boolean): void {
                const scope = current.world();
                let landed = false;
                for (let cut = 0; cut < cuts; cut++) {
                    if (!scope.valid(victim)) break;
                    if (hurt(current, victim, "aerialace", slash, { damage: damageSpec("aerialace", "slash"), contact: true, slice: true }))
                        landed = true;
                }
                if (!landed) return;
                cutLanded = true;
                WorldFeedback.emit(scope, aerialaceScene, 1, point,
                    { moment: "cut", target: String(victim.ref()), cuts: cuts, notes: notes, primary: primary,
                      scale: scale, intensity: intensity,
                      path: [[from.x(), from.y(), from.z()], [point.x(), point.y(), point.z()]] }, 24);
                if (primary) {
                    const body = scope.observe(victim);
                    if (body !== null) WorldFeedback.text(scope, body.position().plus(WorldCombat.point(0, 1.2, 0)), aerialaceCutText, [cuts], 24);
                }
                scope.sound("cobblemon:impact.flying", point, 14, "{}");
            }

            function advance(current: CombatAction): void {
                const scope = current.world();
                const self = scope.observe(actor);
                if (self === null) { finish(current, false); return; }
                const here = self.position();
                const step = Math.min(speed, pursuit - travelled);
                if (step <= 0.001) { finish(current, false); return; }
                const delta = heading.scale(step);
                const swept = sweepStep(current, delta, radius), hit = swept.hit;
                if (hit.hitEntity()) {
                    const victim = hit.target();
                    if (victim !== null && !scope.friendly(victim) && !struck[String(victim.ref())]) {
                        struck[String(victim.ref())] = true;
                        strike(current, victim, hit.position(), here, selected !== null && String(victim.ref()) === String(selected.ref()));
                    }
                }
                const moved = swept.moved + (hit.hitEntity() && swept.remaining.length() > 0.001 ? scope.displace(actor, swept.remaining) : 0);
                travelled += moved;
                if (hit.blocked() || moved < 0.05 || travelled >= pursuit - 0.001) {
                    // 空放走完全程只算落地；本来瞄着实体却没扫到、或撞墙停住，才是落空。
                    const whiffed = !cutLanded && (selected !== null || hit.blocked());
                    finish(current, whiffed, hit);
                    return;
                }
                current.after(1, advance);
            }

            movementScenes.show(action, "dash", start,
                { moment: "dash", direction: [heading.x(), heading.y(), heading.z()], cuts: cuts, scale: scale, intensity: intensity, skim: skim });
            advance(action);
        }
    });
}
