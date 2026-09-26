/**
 * 热带踢 / tropkick 的出手方式。
 *
 * 核心念头：沉身垫步，一记低平、裹着南国热浪的侧踢扫向对手的支撑腿，把它踢得站不稳、打不出力（攻击下降）；
 *   踢完自己回身收脚、后撤小半步重新站稳。不上挑、不在地面留焦圈——它是本族出手最快、回气最短的一记。
 *
 * 两幕（提交前只播预告）：
 *   沉（wind，提交前）：重心下沉、脚边火星聚起，只播一记预告。
 *   踢（kick → hit / miss，提交后）：朝瞄准方向垫步踢进 `lunge` 格（每刻 `cruise`）；trace 撞上活体即结算 `kick`
 *       接触伤害、让目标攻击下降 `stages` 级；踢实后施术者沿反方向后撤 `retreat` 格收脚（受原生可站空间限制，
 *       后方站不下就原地收势）。踢空只是空收一脚。
 *
 * 选择是自由的：`kind: "aim"` 收任意阵营实体或一个世界点；没有实体目标时用选中的点／方向空踢、照样收脚。
 *   伤害被拒绝时不动、不降攻。
 *
 * 与同族分开：猛扑是把自己送出去的重撞、广域破坏是原地宽扫、bittermalice 隔空放怨念、blazekick 是点火上挑；
 *   热带踢是**低平的一脚**，出手最快，踢完往回收步而不是把人挑起来。降攻对所有战斗者同一条路（NativeEffects.boost）。
 */
namespace PokemonSkills {
    const tropkickScene = "world_combat:move_tropkick";
    const tropkickDropText = "world_combat.move.tropkick.text.drop";
    const tropkickMissText = "world_combat.move.tropkick.text.miss";
    const tropkickMinimumMove = 0.02;

    function tropkickHeading(direction: CombatPoint): CombatPoint {
        const flat = WorldCombat.point(direction.x(), 0, direction.z());
        return flat.length() < 0.01 ? WorldCombat.point(0, 0, 1) : flat.unit();
    }

    define({
        freeMovement: true,
        id: "tropkick",
        cooldownParameter: "recharge",
        name: "Trop Kick",
        description: "沉身垫步，把裹着南国热浪的一脚低平踢向对手的支撑腿：命中造成接触伤害、让目标的攻击下降一级；踢实后回身收脚、后撤小半步重新站稳（后方站不下就原地收势）。出手最快、回气最短，踢空只是空收一脚。",
        uses: ["贴身时压低对手的物理输出", "用最快的一脚先卸掉威胁", "踢完借后撤收步拉开一点身位"],
        kind: "aim",
        range: 2.4,
        maxRange: 4.4,
        prepare: 6,
        active: 0,
        recover: 6,
        cooldown: 22,
        style: "kick",
        defaults: { ai: { maxChase: 6, finish: true } },
        fields: [],
        indicator: function (config, pokemon) {
            return { radius: pokemon ? p("tropkick", "lunge", pokemon) + 0.6 : 3.0, geometry: "line", style: "kick", color: 0xE8B87A,
                label: "热带踢" };
        },
        resolve: function (pokemon, config, world, actor, attributes) {
            const context: NumberContext = { pokemon, skill: skills["tropkick"], detail: { values: config }, world: world || null, actor: actor || null, attributes };
            return {
                prepare: Math.round(p("tropkick", "tempo", context)),
                recover: Math.round(p("tropkick", "recover", context)),
                cooldown: Math.round(p("tropkick", "recharge", context)),
                active: 0,
                range: p("tropkick", "lunge", context) + 0.6
            };
        },
        windup: function (action, config, prepare) {
            action.present("world_combat:move_tropkick:wind", tropkickScene, 1, action.origin(),
                JSON.stringify({ moment: "wind", windup: prepare }));
            return prepare;
        },
        execute: function (action, move, config, done) {
            const movementScenes = WorldFeedback.actionScenes(tropkickScene);
            const actor = action.actor();
            action.releaseTarget();
            const power = p("tropkick", "kick", action);
            const length = Math.max(1.2, p("tropkick", "lunge", action));
            const cruise = Math.max(0.4, p("tropkick", "cruise", action));
            const radius = Math.max(0.4, p("tropkick", "radius", action));
            const stages = Math.max(1, Math.round(p("tropkick", "stages", action)));
            const retreat = Math.max(0.3, p("tropkick", "retreat", action));
            const embers = Math.max(10, Math.round(p("tropkick", "embers", action)));
            const scale = Math.max(0.6, Math.min(2.2, radius / 0.48));
            const intensity = Math.max(0.6, Math.min(2.4, power / 62));
            const direction = tropkickHeading(aim(action));
            let travelled = 0, struck = false, settled = false;

            function finish(current: CombatAction): void {
                if (settled) return;
                settled = true;
                if (!struck) {
                    const body = current.world().observe(actor);
                    const at = body === null ? current.origin() : body.position();
                    WorldFeedback.emit(current.world(), tropkickScene, 1, at, { moment: "miss", embers: embers, scale: scale, intensity: intensity }, 22);
                    WorldFeedback.text(current.world(), at.plus(WorldCombat.point(0, 1.0, 0)), tropkickMissText, [], 20);
                }
                movementScenes.finish(current, done);
            }

            /** 踢实后回身收脚：沿反方向后撤半步；后方放不下身子就原地收势。 */
            function recover(current: CombatAction): void {
                const scope = current.world();
                const body = scope.observe(actor);
                if (body === null) { finish(current); return; }
                const width = Math.max(0.2, body.width()), height = Math.max(0.2, body.height());
                const back = direction.scale(-retreat);
                const feet = body.position().plus(WorldCombat.point(0, -height / 2, 0));
                let moved = 0;
                if (retreat > 0.01 && LivingActions.freeSpace(scope, feet.plus(back), width, height)) moved = scope.displace(actor, back);
                const after = scope.observe(actor);
                const where = after !== null ? after.position() : body.position();
                WorldFeedback.emit(scope, tropkickScene, 1, where,
                    { moment: "retract", embers: embers, retreat: Math.round(retreat * 100) / 100, moved: Math.round(moved * 100) / 100,
                        scale: scale, intensity: intensity }, 24);
                finish(current);
            }

            function strike(current: CombatAction, hit: CombatImpact): void {
                const scope = current.world();
                const victim = hit.target();
                const at = hit.position();
                const landed = victim !== null && impact(current, hit, "tropkick", power, { damage: damageSpec("tropkick", "kick"), contact: true });
                struck = true;
                WorldFeedback.emit(scope, tropkickScene, 1, at,
                    { moment: "hit", target: victim !== null ? String(victim.ref()) : "", direction: [direction.x(), 0, direction.z()],
                        embers: embers, scale: scale, intensity: intensity }, 30);
                if (landed && victim !== null && scope.valid(victim)) {
                    NativeEffects.boost(scope, victim, "atk", -stages);
                    WorldFeedback.text(scope, at.plus(WorldCombat.point(0, 1.2, 0)), tropkickDropText, [stages], 24);
                    scope.sound("cobblemon:impact.grass", at, 16, "{}");
                    scope.sound("minecraft:block.fire.extinguish", at, 12, "{}");
                }
                recover(current);
            }

            function advance(current: CombatAction): void {
                const scope = current.world();
                const origin = current.origin();
                const step = Math.min(cruise, Math.max(0, length - travelled));
                if (step <= 0.001) { recover(current); return; }
                const delta = direction.scale(step);
                const swept = sweepStep(current, delta, radius);
                const hit = swept.hit;
                if (hit.hitEntity()) { strike(current, hit); return; }
                const moved = swept.moved;
                travelled += moved;
                movementScenes.show(current, "kick", origin, { moment: "kick", direction: [direction.x(), direction.y(), direction.z()], embers: embers, scale: scale, intensity: intensity });
                if (hit.blocked() || moved < tropkickMinimumMove || travelled >= length) { recover(current); return; }
                current.after(1, advance);
            }

            sound(action, "cobblemon:move.firespin.actor");
            advance(action);
        }
    });
}
