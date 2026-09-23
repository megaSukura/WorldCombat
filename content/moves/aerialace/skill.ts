/**
 * 燕返 / aerialace 的出手方式。
 *
 * 核心念头：一步掠身而过，借速度把对手晃开视线，掠过的那条线本身就是刀路——因为人是朝对手冲过去的，刀必中。
 *
 * 两幕：
 *   起（gather，提交前）：压低身子，脚下的风线聚拢（可被打断的预告）。
 *   掠（dash → cut → past）：提交后逐刻朝目标掠去，每刻把路径扫一遍；扫到的人按 `cuts` 挨刀，
 *       掠到目标身上（或撞墙、走完射程）后落在对手身后。
 *   目标若在起手时已离场，收势空挥。
 *
 * 与同族分开：修长之角是锁定后一发直线突刺、刀在角尖；燕返是**一整条掠过的刀路**，扫到路上的人，
 * 人还会落到对手的身后，把对手甩在背后。
 */
namespace PokemonSkills {
    const aerialaceScene = "world_combat:move_aerialace";
    const aerialaceCutText = "world_combat.move.aerialace.text.cut";
    const aerialaceMissText = "world_combat.move.aerialace.text.miss";

    define({
        freeMovement: true,
        id: "aerialace",
        name: "Aerial Ace",
        description: "一步掠身而过，借速度晃开对手视线再切斩；因为人是朝对手冲过去的，刀必中。掠过的那条线本身就是刀路，扫到路上的敌人各挨数刀，没被挡住时最后落在对手身后。",
        uses: ["一步掠身而过的交叉快斩", "扫过一条线上的所有敌人", "掠过目标落到它身后"],
        kind: "enemy",
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
            let heading = aim(action);
            let travelled = 0;
            const struck: { [ref: string]: boolean } = Object.create(null);
            let settled = false;

            sound(action, "cobblemon:move.aerialace.actor_1");

            function finish(current: CombatAction): void {
                if (settled) return;
                settled = true;
                const scope = current.world();
                const body = scope.observe(actor);
                if (body !== null)
                    WorldFeedback.emit(scope, aerialaceScene, 1, body.position(),
                        { moment: "past", cuts: cuts, scale: scale, skim: skim }, 20);
                movementScenes.finish(current, done);
            }

            function miss(current: CombatAction): void {
                if (settled) return;
                settled = true;
                const scope = current.world();
                WorldFeedback.emit(scope, aerialaceScene, 1, current.origin(), { moment: "miss", scale: scale }, 18);
                WorldFeedback.text(scope, current.origin().plus(WorldCombat.point(0, 1.2, 0)), aerialaceMissText, [], 20);
                movementScenes.finish(current, done);
            }

            /** 一刀路扫到某人：按刀数重复结算，全部挥空则不算命中。 */
            function strike(current: CombatAction, victim: CombatActor, point: CombatPoint, primary: boolean): void {
                const scope = current.world();
                let landed = false;
                for (let cut = 0; cut < cuts; cut++) {
                    if (!scope.valid(victim)) break;
                    if (hurt(current, victim, "aerialace", slash, { damage: damageSpec("aerialace", "slash"), contact: true, slice: true }))
                        landed = true;
                }
                if (!landed) return;
                WorldFeedback.emit(scope, aerialaceScene, 1, point,
                    { moment: "cut", target: String(victim.ref()), cuts: cuts, notes: notes, primary: primary,
                      scale: scale, intensity: intensity,
                      path: [[start.x(), start.y(), start.z()], [point.x(), point.y(), point.z()]] }, 24);
                if (primary) {
                    const body = scope.observe(victim);
                    if (body !== null) WorldFeedback.text(scope, body.position().plus(WorldCombat.point(0, 1.2, 0)), aerialaceCutText, [cuts], 24);
                }
                scope.sound("cobblemon:impact.flying", point, 14, "{}");
            }

            function advance(current: CombatAction): void {
                const scope = current.world();
                const self = scope.observe(actor);
                if (self === null) { finish(current); return; }
                const here = self.position();
                // 逐刻把朝向对准目标当前位置：人是追着对手掠过去的，所以刀够得到。
                if (selected !== null && scope.valid(selected)) {
                    const body = scope.observe(selected);
                    if (body !== null) {
                        const desired = body.position().minus(here);
                        if (desired.length() > 0.05) heading = desired.unit();
                    }
                }
                const step = Math.min(speed, pursuit - travelled);
                if (step <= 0.001) { finish(current); return; }
                const delta = heading.scale(step);
                const swept = sweepStep(current, delta, radius), hit = swept.hit;
                if (hit.hitEntity()) {
                    const victim = hit.target();
                    if (victim !== null && !scope.friendly(victim) && !struck[String(victim.ref())]) {
                        struck[String(victim.ref())] = true;
                        strike(current, victim, hit.position(), selected !== null && String(victim.ref()) === String(selected.ref()));
                    }
                }
                const moved = swept.moved + (hit.hitEntity() && swept.remaining.length() > 0.001 ? scope.displace(actor, swept.remaining) : 0);
                travelled += moved;
                if (hit.blocked() || moved < 0.05 || travelled >= pursuit - 0.001) { finish(current); return; }
                current.after(1, advance);
            }

            movementScenes.show(action, "dash", start, { moment: "dash", cuts: cuts, scale: scale, intensity: intensity, skim: skim });

            if (selected === null || !world.valid(selected)) { miss(action); return; }
            advance(action);
        }
    });
}
