/**
 * 猛扑 / lunge 的出手方式。
 *
 * 核心念头：把整个身体抛出去的一记跳扑。后腿蓄力、贴着地面向前扑进，把全部体重压在一撞上；撞实之后
 *   对手被撞得后仰、挥不动手（攻击下降），自己则停在落点。它是本组单体最重的一记，也唯一承诺方向。
 *
 * 两幕（提交前只播预告）：
 *   蓄（coil，提交前）：后腿蓄力、甲壳收紧，只播一记预告。
 *   扑（leap → crash → pin，提交后）：朝目标方向逐刻扑进 `reach` 格（每刻 `leap`）；trace 撞上活体即结算
 *       `pounce` 接触伤害、把目标沿扑进方向顶开 `push` 格、让它的攻击下降 `stages` 级；撞空或撞墙/冲满射程
 *       就收势，落空只留一路尘。
 *
 * 与同族分开：广域破坏是原地扫一圈、bittermalice 隔空放怨念、热带踢是带火的挑踢；猛扑是**把自己送出去**的
 *   一记向前重撞，赌的是方向和提前量。降攻对所有战斗者同一条路（NativeEffects.boost）。
 *
 * 配置 `heavy` 由公式改威力／顶开／扑进与时序；提交后才触碰世界。
 */
namespace PokemonSkills {
    const lungeScene = "world_combat:move_lunge";
    const lungeDropText = "world_combat.move.lunge.text.drop";
    const lungeMissText = "world_combat.move.lunge.text.miss";
    const lungeMinimumMove = 0.02;

    /** 把方向压平到水平面；退化时朝 +Z。 */
    function lungeHeading(direction: CombatPoint): CombatPoint {
        const flat = WorldCombat.point(direction.x(), 0, direction.z());
        return flat.length() < 0.01 ? WorldCombat.point(0, 0, 1) : flat.unit();
    }

    define({
        freeMovement: true,
        id: "lunge",
        cooldownParameter: "recharge",
        name: "Lunge",
        description: "后腿蓄力、把整个身体朝目标抛出去，用全部体重压在一撞上：撞实后造成接触伤害并把目标顶开，同时让它的攻击下降一级。全力式更重、顶得更开、扑得更远，但更慢。",
        uses: ["冲上去压低对手的物理输出", "把单个硬目标撞开、撞得它挥不动手", "抢在对手贴身之前先扑进去"],
        kind: "enemy",
        range: 2.8,
        maxRange: 5.4,
        prepare: 8,
        active: 0,
        recover: 7,
        cooldown: 24,
        style: "pounce",
        defaults: { heavy: false, ai: { maxChase: 7, finish: true } },
        fields: [flag("heavy", "全力式")],
        indicator: function (config, pokemon) {
            return { radius: pokemon ? p("lunge", "reach", pokemon) : 2.8, geometry: "line", style: "pounce", color: 0x9ACD32,
                label: config && config.heavy === true ? "猛扑·全力式" : "猛扑" };
        },
        resolve: function (pokemon, config, world, actor, attributes) {
            const context: NumberContext = { pokemon, skill: skills["lunge"], detail: { values: config }, world: world || null, actor: actor || null, attributes };
            return {
                prepare: Math.round(p("lunge", "tempo", context)),
                recover: Math.round(p("lunge", "recover", context)),
                cooldown: Math.round(p("lunge", "recharge", context)),
                active: 0,
                range: p("lunge", "reach", context)
            };
        },
        windup: function (action, config, prepare) {
            action.present("world_combat:move_lunge:coil", lungeScene, 1, action.origin(),
                JSON.stringify({ moment: "coil", windup: prepare, heavy: config && config.heavy === true ? 1 : 0 }));
            return prepare;
        },
        execute: function (action, move, config, done) {
            const world = action.world();
            const actor = action.actor();
            const target = action.target();
            if (target === null) { done(action); return; }
            const power = p("lunge", "pounce", action);
            const length = Math.max(1.4, p("lunge", "reach", action));
            const cruise = Math.max(0.4, p("lunge", "leap", action));
            const radius = Math.max(0.42, p("lunge", "radius", action));
            const push = Math.max(0.2, p("lunge", "push", action));
            const stages = Math.max(1, Math.round(p("lunge", "stages", action)));
            const chitin = Math.max(10, Math.round(p("lunge", "chitin", action)));
            const traceAhead = 1.15;
            const scale = Math.max(0.6, Math.min(2.2, radius / 0.5));
            const intensity = Math.max(0.6, Math.min(2.4, power / 70));
            const direction = lungeHeading(aim(action));
            let travelled = 0, struck = false, settled = false;

            function finish(current: CombatAction): void {
                if (settled) return;
                settled = true;
                if (!struck) {
                    const body = current.world().observe(actor);
                    const at = body === null ? current.origin() : body.position();
                    WorldFeedback.emit(current.world(), lungeScene, 1, at, { moment: "miss", chitin: chitin, scale: scale, intensity: intensity }, 22);
                    WorldFeedback.text(current.world(), at.plus(WorldCombat.point(0, 1.0, 0)), lungeMissText, [], 20);
                }
                done(current);
            }

            function strike(current: CombatAction, hit: CombatImpact): void {
                const scope = current.world();
                const victim = hit.target();
                const at = hit.position();
                const landed = victim !== null && impact(current, hit, "lunge", power, { damage: damageSpec("lunge", "pounce"), contact: true });
                struck = true;
                WorldFeedback.emit(scope, lungeScene, 1, at,
                    { moment: "crash", target: victim !== null ? String(victim.ref()) : "", chitin: chitin, stages: stages, scale: scale, intensity: intensity }, 28);
                if (landed && victim !== null && scope.valid(victim)) {
                    scope.displace(victim, direction.scale(push));
                    if (scope.valid(victim)) NativeEffects.boost(scope, victim, "atk", -stages);
                    if (scope.valid(victim)) {
                        const body = scope.observe(victim);
                        WorldFeedback.emit(scope, lungeScene, 1, body !== null ? body.position() : at,
                            { moment: "pin", target: String(victim.ref()), stages: stages, chitin: chitin, scale: scale, intensity: intensity }, 24);
                        WorldFeedback.text(scope, at.plus(WorldCombat.point(0, 1.2, 0)), lungeDropText, [stages], 24);
                    }
                    scope.sound("cobblemon:impact.bug", at, 16, "{}");
                }
                finish(current);
            }

            function advance(current: CombatAction): void {
                const scope = current.world();
                const origin = current.origin();
                const step = Math.min(cruise, Math.max(0, length - travelled));
                if (step <= 0.001) { finish(current); return; }
                const delta = direction.scale(step);
                const hit = current.trace(origin, origin.plus(delta.scale(traceAhead)), radius);
                if (hit.hitEntity()) { strike(current, hit); return; }
                const moved = scope.displace(actor, delta);
                travelled += moved;
                WorldFeedback.keep(scope, "lunge:leap:" + action.id(), lungeScene, 1, origin,
                    { moment: "leap", direction: [direction.x(), direction.y(), direction.z()], chitin: chitin, scale: scale, intensity: intensity }, 12);
                if (hit.blocked() || moved < lungeMinimumMove || travelled >= length) { finish(current); return; }
                current.after(1, advance);
            }

            sound(action, "cobblemon:move.leechlife.actor");
            advance(action);
        }
    });
}
