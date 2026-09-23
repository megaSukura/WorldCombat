/**
 * 佯攻 / feint 的出手方式。
 *
 * 核心念头：一次故意的假动作。身体一矮、向前虚晃，逼对手把守护用出去，随后一戳把守护掀掉、真正落进去——
 *   它掀得越干净，露出的破绽越大。没有守护时，它只是一记极快的戳击。
 *
 * 三幕（提交前只播预告）：
 *   晃（wind，提交前）：压身、起手，只播一记虚晃的预告。
 *   扑（charge → jab）：提交后朝目标扑 `reach` 格（每刻 `rush`），贴上即先扫掉目标身上最多 `wardBreak` 层
 *       守护（`world_combat:guard` 的 dispel），再按 `jab × (1 + 每层破绽)` 结算一次伤害并把目标顶开一点。
 *   收（peel）：被掀掉的守护当场碎成冷光，浮字报出掀掉的层数；扑空只留一路虚晃。
 *
 * 与同族分开：强力钻是压上全部重量的直线凿穿，佯攻是**先掀后戳**的轻快探路；两者都能处理守护，但玩家凭
 *   「快、轻、把罩整层掀掉」认出佯攻。守护是共享机制 GuardEffects（守住、看穿、广域防守、硬化……同一套），
 *   所以对宝可梦、原版生物、其他模组生物和玩家一视同仁。
 *
 * 配置 `commit` 由公式改威力／破绽／掀护层数／突进与时序；提交后才触碰世界。
 */
namespace PokemonSkills {
    const feintScene = "world_combat:move_feint";
    const feintPeelText = "world_combat.move.feint.text.peel";
    const feintHitText = "world_combat.move.feint.text.hit";
    const feintMissText = "world_combat.move.feint.text.miss";
    /** 表现里的参考半径：`data.scale = 实际判定半径 / 这个数`。 */
    const feintReferenceRadius = 0.5;

    /** 掀掉目标身上最多 `budget` 层保护守护；返回真正掀掉的层数。守护是共享机制，来源不限。 */
    function feintStrip(world: CombatWorld, victim: CombatActor, budget: number): number {
        const guards = GuardEffects.barriers(world, victim);
        let broken = 0;
        for (let index = 0; index < guards.length && broken < budget; index++) {
            if (world.operation(guards[index].id(), "world_combat:dispel", "{}")) broken++;
        }
        return broken;
    }

    define({
        freeMovement: true,
        id: "feint",
        cooldownParameter: "recharge",
        name: "Feint",
        description: "一次假动作把对手撑起的守护掀掉，紧接着的一戳才真正打进去；掀掉的守护层数越多，这一下越重。对没有守护的目标，它仍是一记极快的戳击。",
        uses: ["掀掉对手撑起的守护，为下一记重击开路", "用极短的起手，抢在守护替对手挡下重击前把它掀掉", "对没有守护的目标补一记极快的戳击"],
        kind: "enemy",
        range: 2.2,
        maxRange: 3.6,
        prepare: 4,
        active: 0,
        recover: 5,
        cooldown: 22,
        style: "feint",
        defaults: { commit: false, ai: { maxChase: 7, breakGuard: true } },
        fields: [flag("commit", "实招")],
        indicator: function (config, pokemon) {
            return { radius: pokemon ? p("feint", "reach", pokemon) : 2.0, geometry: "line", style: "feint", color: 0xE8D9A0,
                label: config && config.commit === true ? "佯攻·实招" : "佯攻" };
        },
        resolve: function (pokemon, config, world, actor, attributes) {
            const context: NumberContext = { pokemon, skill: skills["feint"], detail: { values: config }, world: world || null, actor: actor || null, attributes };
            return {
                prepare: Math.round(p("feint", "tempo", context)),
                recover: Math.round(p("feint", "recover", context)),
                cooldown: Math.round(p("feint", "recharge", context)),
                active: 0,
                range: p("feint", "reach", context) + 0.3
            };
        },
        windup: function (action, config, prepare) {
            action.present("world_combat:move_feint:wind", feintScene, 1, action.origin(),
                JSON.stringify({ moment: "wind", commit: config && config.commit === true ? 1 : 0,
                    sparks: Math.round(p("feint", "sparks", action)) }));
            return prepare;
        },
        execute: function (action, move, config, done) {
            const world = action.world();
            const actor = action.actor();
            const target = action.target();
            const reach = Math.max(1.2, p("feint", "reach", action));
            const rush = Math.max(0.3, p("feint", "rush", action));
            const radius = Math.max(0.35, p("feint", "radius", action));
            const jab = p("feint", "jab", action);
            const expose = p("feint", "expose", action);
            const budget = Math.max(1, Math.round(p("feint", "wardBreak", action)));
            const push = p("feint", "push", action);
            const sparks = Math.max(6, Math.round(p("feint", "sparks", action)));
            const scale = radius / feintReferenceRadius;
            const contactGap = 0.6;
            let travelled = 0;

            sound(action, "cobblemon:move.quickattack.actor");

            /** 贴上目标：先掀守护，再按破绽加成结算这一戳；都没贴上就只留一路虚晃。 */
            function strike(current: CombatAction, at: CombatPoint): void {
                const scope = current.world();
                const self = scope.observe(actor);
                const selfAt = self !== null ? self.position() : current.origin();
                const victim = target !== null && scope.valid(target) ? target : null;
                let broken = 0, landed = false, power = jab;
                if (victim !== null && !scope.friendly(victim) && at.minus(selfAt).length() <= reach + radius + 0.9) {
                    broken = feintStrip(scope, victim, budget);
                    power = jab * (1 + expose * broken);
                    landed = hurt(current, victim, "feint", power, { damage: damageSpec("feint", "jab") });
                    if (landed && scope.valid(victim)) {
                        const away = WorldCombat.point(at.x() - selfAt.x(), 0, at.z() - selfAt.z());
                        if (away.length() >= 0.05) scope.displace(victim, away.unit().scale(push));
                    }
                }
                WorldFeedback.emit(scope, feintScene, 1, at,
                    { moment: landed ? (broken > 0 ? "peel" : "jab") : "miss", target: victim === null ? "" : String(victim.ref()),
                        landed: landed ? 1 : 0, broken: broken, power: Math.round(power), sparks: sparks, scale: scale,
                        intensity: Math.max(0.5, Math.min(2.2, power / 34)) }, 24);
                if (broken > 0) {
                    sound(current, "minecraft:block.glass.break");
                    WorldFeedback.text(scope, at.plus(WorldCombat.point(0, 1.2, 0)), feintPeelText, [broken], 30);
                } else if (landed) {
                    sound(current, "cobblemon:impact.normal");
                    WorldFeedback.text(scope, at.plus(WorldCombat.point(0, 1.05, 0)), feintHitText, [], 24);
                } else {
                    sound(current, "minecraft:entity.player.attack.weak");
                    WorldFeedback.text(scope, at.plus(WorldCombat.point(0, 1.0, 0)), feintMissText, [], 22);
                }
                done(current);
            }

            /** 朝目标扑进：每刻推进 `rush`，贴上或冲满 `reach` 就结算。 */
            function chase(current: CombatAction): void {
                const scope = current.world();
                const self = scope.observe(actor);
                if (self === null) { done(current); return; }
                const victim = target !== null && scope.valid(target) ? target : null;
                if (victim === null) { strike(current, action.targetPosition()); return; }
                const body = scope.observe(victim);
                if (body === null) { strike(current, action.targetPosition()); return; }
                const delta = body.position().minus(self.position());
                const flat = WorldCombat.point(delta.x(), 0, delta.z());
                const distance = flat.length();
                if (distance <= contactGap + 0.35 || travelled >= reach) { strike(current, body.position()); return; }
                const heading = flat.length() < 1e-6 ? aim(current) : flat.unit();
                const room = Math.min(rush, Math.max(0, distance - contactGap), Math.max(0, reach - travelled));
                if (room <= 0.03) { strike(current, body.position()); return; }
                const moved = scope.displace(actor, heading.scale(room));
                travelled += moved;
                WorldFeedback.keep(scope, "feint:rush:" + String(current.actor().ref()), feintScene, 1, self.position(),
                    { moment: "rush", direction: [heading.x(), 0, heading.z()], sparks: sparks, scale: scale }, 8);
                if (moved < room * 0.5) { strike(current, body.position()); return; }
                current.after(1, function (next: CombatAction) { chase(next); });
            }

            WorldFeedback.emit(world, feintScene, 1, action.origin(),
                { moment: "wind", sparks: sparks, scale: scale }, 14);
            chase(action);
        }
    });
}
