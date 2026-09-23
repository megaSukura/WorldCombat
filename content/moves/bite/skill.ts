/**
 * 咬住 / bite 的出手方式。
 *
 * 核心念头：一口钩住不松——短促扑出，獠牙咬实，把目标朝自己**拽近**一步；那一下的刺痛与失衡
 * 让它有机会一滞。它是畏缩家族里最快、最便宜的一式，也是唯一会把对手拉回身前的起手。
 *
 * 两幕：
 *   起（windup，提交前）：压低身子、口边泛起暗色牙光，只播预告表现。
 *   咬（pounce → bite / whiff）：提交后沿瞄准方向逐刻推进；trace 撞上活体即结算 fang 接触咬合、
 *       把目标朝自己拽近 drag 格、按 flinchChance 掷畏缩；撞空则扑到尽头刹住。
 *   果（hit / miss / flinch）：命中浮字与暗色迸溅，畏缩的浮“咬懵”并按共享身份挂上本单元效果。
 *
 * 与同族分开：头锤把人顶开、意念头锤会拐弯、虫咬与精神之牙咬的是树果与屏障；
 * 只有咬住把目标拽回身前——玩家凭“被咬的人反而更贴近对手”把它认出来。
 *
 * 畏缩：施加本单元声明的 MobEffect（共享身份 `world_combat:status/flinch`，只借身份、行为自写）并投递
 * `world_combat:interrupt`；下方门禁在窗口内拒绝新动作，伤害阶段不受影响。
 *
 * 配置 `deep`（死咬式）由 resolve 改时序、由公式改威力／拽回／几率，提交后才触碰世界。
 */
namespace PokemonSkills {
    const biteScene = "world_combat:move_bite";
    const biteFlinchEffect = "world_combat:bite_flinch";
    const biteHitText = "world_combat.move.bite.text.hit";
    const biteDragText = "world_combat.move.bite.text.drag";
    const biteFlinchText = "world_combat.move.bite.text.flinch";
    const biteMissText = "world_combat.move.bite.text.miss";

    function biteFlinch(world: CombatWorld, target: CombatActor, ticks: number): boolean {
        if (MobEffects.apply(world, target, biteFlinchEffect, ticks, 0) === null) return false;
        world.deliver(target, "world_combat:interrupt");
        return true;
    }

    define({
        freeMovement: true,
        id: "bite",
        cooldownParameter: "recharge",
        name: "Bite",
        description: "短促扑出、一口钩住：冷却最短的近身咬合，咬实后有几率把目标咬懵，并把它朝自己拽近一步——它的价值在抢节奏与留人。",
        uses: ["用最短冷却的近身咬击抢节奏", "把想拉开距离的对手拽回身前", "为下一次贴身出手留住目标"],
        kind: "enemy",
        range: 2.4,
        maxRange: 3.6,
        prepare: 5,
        active: 18,
        recover: 6,
        cooldown: 14,
        style: "bite",
        defaults: { deep: false, ai: { maxChase: 9, reelIn: true } },
        fields: [],
        indicator: function (config, pokemon) {
            return { radius: (pokemon ? p("bite", "grip", pokemon) : 0.4) * 1.5, geometry: "line", style: "bite",
                color: 0x8A6AA8, label: config && config.deep === true ? "死咬" : "咬住" };
        },
        resolve: function (pokemon, config, world, actor, attributes) {
            const context: NumberContext = { pokemon: pokemon, skill: skills["bite"], detail: { values: config }, world: world || null, actor: actor || null, attributes: attributes };
            return {
                prepare: Math.round(p("bite", "tempo", context)),
                recover: Math.round(p("bite", "aftercast", context)),
                cooldown: Math.round(p("bite", "recharge", context)),
                active: skills["bite"].active,
                range: p("bite", "reach", context) + 0.35
            };
        },
        windup: function (action, config, prepare) {
            action.present("world_combat:bite:" + action.id(), biteScene, 1, action.origin(),
                JSON.stringify({ moment: "windup", deep: config && config.deep === true }));
            return prepare;
        },
        execute: function (action, move, config, done) {
            const movementScenes = WorldFeedback.actionScenes(biteScene);
            const world = action.world();
            const length = p("bite", "reach", action);
            const speed = p("bite", "lunge", action);
            const radius = p("bite", "grip", action);
            const power = p("bite", "fang", action);
            const drag = p("bite", "drag", action);
            const chance = p("bite", "flinchChance", action);
            const flinchTicks = Math.round(p("bite", "flinchTicks", action));
            const direction = aim(action);
            const scale = radius / 0.4;
            const intensity = Math.max(0.5, Math.min(2.0, power / 62));
            let travelled = 0, settled = false;

            movementScenes.show(action, "pounce", action.origin(), { moment: "pounce", scale: scale, intensity: intensity, drag: Math.round(drag * 100) / 100 });
            sound(action, "minecraft:entity.fox.bite");

            function finish(current: CombatAction): void { if (!settled) { settled = true; movementScenes.finish(current, done); } }

            function whiff(current: CombatAction, at: CombatPoint): void {
                const scope = current.world();
                WorldFeedback.emit(scope, biteScene, 1, at, { moment: "miss", scale: scale }, 20);
                WorldFeedback.text(scope, at.plus(WorldCombat.point(0, 1.15, 0)), biteMissText, [], 20);
                sound(current, "minecraft:entity.player.attack.sweep");
                finish(current);
            }

            function advance(current: CombatAction): void {
                const scope = current.world();
                const origin = current.origin();
                const step = Math.min(speed, Math.max(0, length - travelled));
                if (step <= 0.001) { whiff(current, origin); return; }
                const delta = direction.scale(step);
                const swept = sweepStep(current, delta, radius), hit = swept.hit;
                if (hit.hitEntity()) {
                    const target = hit.target();
                    const at = hit.position();
                    const landed = target !== null && impact(current, hit, "bite", power,
                        { damage: damageSpec("bite", "fang"), contact: true, bite: true });
                    WorldFeedback.emit(scope, biteScene, 1, at,
                        { moment: "bite", target: target ? String(target.ref()) : "", scale: scale, intensity: intensity,
                            drag: Math.round(drag * 100) / 100, morsels: Math.max(10, Math.round(power * 0.2)) }, 26);
                    if (landed && target !== null && scope.valid(target)) {
                        // 獠牙钩住皮肉：把目标朝施法者拽近，而不是顶开。
                        const pull = current.origin().minus(at);
                        const pullDirection = pull.length() < 0.05 ? direction.scale(-1) : pull.unit();
                        WorldFeedback.emit(scope, biteScene, 1, at,
                            { moment: "drag", direction: [pullDirection.x(), pullDirection.y(), pullDirection.z()],
                                drag: Math.max(4, Math.round(drag * 8)) }, 18);
                        scope.displace(target, direction.scale(-drag));
                        WorldFeedback.text(scope, at.plus(WorldCombat.point(0, 1.2, 0)), biteHitText, [], 22);
                        WorldFeedback.text(scope, at.plus(WorldCombat.point(0, 0.95, 0)), biteDragText, [Math.round(drag * 10) / 10], 22);
                        sound(current, "cobblemon:impact.dark");
                        if (scope.random() < chance && biteFlinch(scope, target, flinchTicks)) {
                            WorldFeedback.emit(scope, biteScene, 1, at, { moment: "flinch", target: String(target.ref()) }, 24);
                            WorldFeedback.text(scope, at.plus(WorldCombat.point(0, 1.35, 0)), biteFlinchText, [], 24);
                        }
                    } else {
                        sound(current, "minecraft:entity.player.attack.sweep");
                    }
                    finish(current);
                    return;
                }
                const moved = swept.moved + (hit.hitEntity() && swept.remaining.length() > 0.001 ? scope.displace(current.actor(), swept.remaining) : 0);
                travelled += moved;
                if (hit.blocked() || moved < p("bite", "minimumMove", current) || travelled >= length) {
                    whiff(current, origin);
                    return;
                }
                current.after(1, advance);
            }

            advance(action);
        }
    });

}
