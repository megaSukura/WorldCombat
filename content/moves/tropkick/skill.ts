/**
 * 热带踢 / tropkick 的出手方式。
 *
 * 核心念头：一记自下而上、裹着南国热浪的脚踢。沉身垫步、脚上带着火，踢中把对手挑得离地、向后仰倒，
 *   热浪在落点烧出一圈焦痕；被烤得没了火气，攻击下降。它是本组出手最快、回气最短的一记。
 *
 * 两幕（提交前只播预告）：
 *   沉（wind，提交前）：重心下沉、脚边火星聚起，只播一记预告。
 *   踢（kick → scorch，提交后）：朝目标垫步踢进 `lunge` 格（每刻 `cruise`）；trace 撞上活体即结算 `kick`
 *       接触伤害、让目标攻击下降 `stages` 级，并把落点烧出一圈半径 `scorch` 的焦痕；踏地式把目标低平踢退 `push` 格，
 *       挑飞式改把目标朝上挑起 `launch` 格（打断贴身、逼它重新落地）。
 *
 * 与同族分开：猛扑是把自己送出去的重撞、广域破坏是原地宽扫、bittermalice 隔空放怨念；热带踢是**带火的一脚**，
 *   出手最快，踏地更重、挑飞能打断。降攻对所有战斗者同一条路（NativeEffects.boost）。
 *
 * 配置 `launch` 由公式改威力／挑飞／焦痕与时序；提交后才触碰世界。
 */
namespace PokemonSkills {
    const tropkickScene = "world_combat:move_tropkick";
    const tropkickDropText = "world_combat.move.tropkick.text.drop";
    const tropkickLaunchText = "world_combat.move.tropkick.text.launch";
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
        description: "沉身垫步，把裹着南国热浪的一脚自下而上踢出去：命中造成接触伤害并把目标顶开（或挑到半空），同时让它的攻击下降一级；落点被热浪烧出一圈焦痕。踏地式踢得更重，挑飞式把目标挑起来。",
        uses: ["贴身时压低对手的物理输出", "把对手挑离地面、逼它重新落地", "用最快的一脚先卸掉威胁"],
        kind: "enemy",
        range: 2.4,
        maxRange: 4.4,
        prepare: 6,
        active: 0,
        recover: 6,
        cooldown: 22,
        style: "kick",
        defaults: { launch: false, ai: { maxChase: 6, finish: true } },
        fields: [flag("launch", "挑飞式")],
        indicator: function (config, pokemon) {
            return { radius: pokemon ? p("tropkick", "lunge", pokemon) + 0.6 : 3.0, geometry: "line", style: "kick", color: 0xE8B87A,
                label: config && config.launch === true ? "热带踢·挑飞式" : "热带踢" };
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
                JSON.stringify({ moment: "wind", windup: prepare, launch: config && config.launch === true ? 1 : 0 }));
            return prepare;
        },
        execute: function (action, move, config, done) {
            const movementScenes = WorldFeedback.actionScenes(tropkickScene);
            const world = action.world();
            const actor = action.actor();
            const target = action.target();
            if (target === null) { movementScenes.finish(action, done); return; }
            const launchMode = !!(config && config.launch === true);
            const power = p("tropkick", "kick", action);
            const length = Math.max(1.2, p("tropkick", "lunge", action));
            const cruise = Math.max(0.4, p("tropkick", "cruise", action));
            const radius = Math.max(0.4, p("tropkick", "radius", action));
            const push = Math.max(0.15, p("tropkick", "push", action));
            const stages = Math.max(1, Math.round(p("tropkick", "stages", action)));
            const launchHeight = Math.max(0.4, p("tropkick", "launch", action));
            const embers = Math.max(10, Math.round(p("tropkick", "embers", action)));
            const scorch = Math.max(0.8, p("tropkick", "scorch", action));
            const scale = Math.max(0.6, Math.min(2.2, radius / 0.48));
            const intensity = Math.max(0.6, Math.min(2.4, power / 62));
            const direction = tropkickHeading(aim(action));
            const liftVelocity = Math.min(1.1, Math.sqrt(Math.max(0.05, launchHeight) * 0.16));
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

            function strike(current: CombatAction, hit: CombatImpact): void {
                const scope = current.world();
                const victim = hit.target();
                const at = hit.position();
                const landed = victim !== null && impact(current, hit, "tropkick", power, { damage: damageSpec("tropkick", "kick"), contact: true });
                struck = true;
                let feet = at.y() - 0.7;
                const body = victim !== null && scope.valid(victim) ? scope.observe(victim) : null;
                if (body !== null) feet = at.y() - body.height() / 2;
                WorldFeedback.emit(scope, tropkickScene, 1, at,
                    { moment: "hit", target: victim !== null ? String(victim.ref()) : "", embers: embers, launch: launchMode ? 1 : 0,
                        scorch: scorch, scale: scale, intensity: intensity }, 30);
                WorldFeedback.emit(scope, tropkickScene, 1, WorldCombat.point(at.x(), feet + 0.02, at.z()),
                    { moment: "scorch", point: [at.x(), feet + 0.02, at.z()], scorch: scorch, embers: embers, scale: Math.max(0.6, Math.min(2.0, scorch / 1.1)),
                        launch: launchMode ? 1 : 0, intensity: intensity }, 34);
                if (landed && victim !== null && scope.valid(victim)) {
                    if (launchMode) scope.motion(victim, WorldCombat.point(direction.x() * push * 0.35, liftVelocity, direction.z() * push * 0.35), true);
                    else scope.displace(victim, direction.scale(push));
                    if (scope.valid(victim)) NativeEffects.boost(scope, victim, "atk", -stages);
                    WorldFeedback.text(scope, at.plus(WorldCombat.point(0, 1.2, 0)),
                        launchMode ? tropkickLaunchText : tropkickDropText, [stages], 24);
                    scope.sound("cobblemon:impact.grass", at, 16, "{}");
                    scope.sound("minecraft:block.fire.extinguish", at, 12, "{}");
                }
                finish(current);
            }

            function advance(current: CombatAction): void {
                const scope = current.world();
                const origin = current.origin();
                const step = Math.min(cruise, Math.max(0, length - travelled));
                if (step <= 0.001) { finish(current); return; }
                const delta = direction.scale(step);
                const swept = sweepStep(current, delta, radius);
                const hit = swept.hit;
                if (hit.hitEntity()) { strike(current, hit); return; }
                const moved = swept.moved;
                travelled += moved;
                movementScenes.show(current, "kick", origin, { moment: "kick", direction: [direction.x(), direction.y(), direction.z()], embers: embers, scale: scale, intensity: intensity });
                if (hit.blocked() || moved < tropkickMinimumMove || travelled >= length) { finish(current); return; }
                current.after(1, advance);
            }

            sound(action, "cobblemon:move.firespin.actor");
            advance(action);
        }
    });
}
