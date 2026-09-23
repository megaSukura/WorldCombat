/**
 * 搏命 / finalgambit 的出手方式。
 *
 * 念头的形状：站定、把全身的气血往上提（windup，可被打断）→ 扑向对手（dash）→ 贴上去的一刻把此刻剩下的
 * 全部生命一次性炸出去（detonate）→ 自己倒下（faint）。打空或打不动（属性免疫）时使用者不倒——这是原生
 * selfdestruct: "ifHit" 的意思。留手式只押上一半生命，打完留下一口气。
 *
 * 三幕：windup（charge）→ dash → detonate（+ 殒 / 留手 / 空响）。收招为 0，detonate 当刻动作即结束。
 */
namespace PokemonSkills {
    const finalgambitScene = "world_combat:move_finalgambit";
    const finalgambitHitText = "world_combat.move.finalgambit.text.hit";
    const finalgambitFaintText = "world_combat.move.finalgambit.text.faint";
    const finalgambitSpentText = "world_combat.move.finalgambit.text.spent";
    const finalgambitMissText = "world_combat.move.finalgambit.text.miss";

    function finalgambitAim(action: CombatAction): CombatPoint {
        const wanted = action.targetPosition().minus(action.origin());
        return wanted.length() < 0.01 ? action.direction() : wanted.unit();
    }

    function finalgambitVector(direction: CombatPoint): number[] { return [direction.x(), direction.y(), direction.z()]; }

    define({
        freeMovement: true,
        id: "finalgambit",
        name: "Final Gambit",
        description: "拼命自爆：扑向对手，命中造成等于自己当前生命的固定伤害，随后自己倒下。满血时最重、残血时最轻；打空或被属性免疫挡下不消耗生命、也不倒。留手式把伤害降到 55%%、结算后保留 1 点生命不倒下，代价是冷却更久。",
        uses: ["满血时一换一打空高价值目标", "把挡路的强敌拖下水", "留手式赌一记重伤但保命"],
        kind: "enemy",
        range: 2.6,
        maxRange: 4.4,
        prepare: 14,
        active: 20,
        recover: 0,
        cooldown: 70,
        style: "gamble",
        defaults: { spare: false, ai: { maxChase: 6, lethal: true, cornered: 0.25, leaveStation: true } },
        fields: [],
        indicator: function (config, pokemon) {
            return { radius: p("finalgambit", "collisionRadius", pokemon), geometry: "line", style: "gamble", color: 0xC0392B, label: "搏命" };
        },
        resolve: function (pokemon, config, world, actor, attributes) {
            const context: NumberContext = { pokemon: pokemon, skill: skills["finalgambit"], detail: { values: config }, world: world, actor: actor, attributes: attributes };
            const spare = !!(config && config.spare);
            return {
                prepare: p("finalgambit", "gamble", context),
                recover: p("finalgambit", "recover", context),
                cooldown: p("finalgambit", "cooldown", context) + (spare ? 8 : 0),
                range: p("finalgambit", "lunge", context) + 0.6
            };
        },
        windup: function (action, config, prepare) {
            const body = action.sense().observe(action.actor());
            const spare = !!(config && config.spare);
            action.present("world_combat:move_finalgambit:charge", finalgambitScene, 1, action.origin(), JSON.stringify({
                moment: "charge", spare: spare,
                stake: body === null || body.maxHealth() <= 0 ? 0 : body.health() / body.maxHealth()
            }));
            return prepare;
        },
        execute: function (action, move, config, done) {
            const world = action.world(), self = action.actor();
            const spare = !!(config && config.spare);
            const damage = p("finalgambit", "damage", action);
            const length = p("finalgambit", "lunge", action);
            const speed = p("finalgambit", "lungeSpeed", action);
            const radius = p("finalgambit", "collisionRadius", action);
            const blast = p("finalgambit", "blastRadius", action);
            const stagger = p("finalgambit", "stagger", action);
            const stride = p("finalgambit", "maximumStride", action);
            const direction = finalgambitAim(action);
            const start = world.observe(self);
            if (start === null) { done(action); return; }
            const share = start.maxHealth() <= 0 ? 1 : Math.min(1, damage / start.maxHealth());
            let travelled = 0, settled = false;

            WorldFeedback.emit(world, finalgambitScene, 1, action.origin(),
                { moment: "dash", direction: finalgambitVector(direction), scale: radius / 0.5 }, 40);
            sound(action, "minecraft:entity.ravager.attack");

            /** 结清自我牺牲：全力把当前生命全部花掉（陷入濒死），留手只花到剩一口气。 */
            function spend(current: CombatAction): void {
                const scope = current.world(), body = scope.observe(self);
                if (body === null) return;
                if (spare) scope.health(self, -(Math.max(0, body.health() - 1)), "world_combat:finalgambit_cost");
                else scope.health(self, -body.health(), "world_combat:finalgambit_cost");
            }

            function finish(current: CombatAction, missed: boolean, at: CombatPoint): void {
                if (settled) return;
                settled = true;
                if (missed) {
                    WorldFeedback.emit(current.world(), finalgambitScene, 1, at, { moment: "miss", scale: radius / 0.5 }, 20);
                    WorldFeedback.text(current.world(), at.plus(WorldCombat.point(0, 1.2, 0)), finalgambitMissText, [], 20);
                    sound(current, "minecraft:entity.player.attack.sweep");
                    done(current);
                    return;
                }
                spend(current);
                const scope = current.world(), body = scope.observe(self);
                if (body !== null)
                    WorldFeedback.emit(scope, finalgambitScene, 1, body.position(), { moment: "fall", scale: blast / 1.2 }, 22);
                done(current);
            }

            function detonate(current: CombatAction, target: CombatActor, at: CombatPoint): void {
                const scope = current.world();
                const landed = finalgambitRawHit(current, target, damage, true);
                WorldFeedback.emit(scope, finalgambitScene, 1, at,
                    { moment: "detonate", target: String(target.ref()), count: Math.round(20 + share * 60), scale: blast / 1.2 }, 30);
                sound(current, "minecraft:entity.generic.explode");
                if (!landed) {
                    // 打不动（属性免疫）：原生只有「打中」才自我牺牲，这里同样不倒。
                    WorldFeedback.text(scope, at.plus(WorldCombat.point(0, 1.2, 0)), finalgambitMissText, [], 22);
                    settled = true;
                    done(current);
                    return;
                }
                WorldFeedback.text(scope, at.plus(WorldCombat.point(0, 1.3, 0)), finalgambitHitText, [Math.round(damage)], 26);
                if (scope.valid(target)) scope.displace(target, direction.scale(stagger));
                const body = scope.observe(self);
                if (body !== null) {
                    WorldFeedback.text(scope, body.position().plus(WorldCombat.point(0, 1.1, 0)),
                        spare ? finalgambitSpentText : finalgambitFaintText, [], 26);
                    WorldFeedback.emit(scope, finalgambitScene, 1, body.position(), { moment: spare ? "spent" : "faint", scale: blast / 1.2 }, 26);
                }
                finish(current, false, at);
            }

            function advance(current: CombatAction): void {
                const scope = current.world();
                const origin = current.origin();
                const step = Math.min(speed, Math.max(0, length - travelled));
                if (step <= 0.001) { finish(current, true, origin); return; }
                const delta = direction.scale(step);
                const hit = current.trace(origin, origin.plus(delta.scale(1.4)), radius + stride);
                if (hit.hitEntity()) {
                    const target = hit.target();
                    if (target !== null && !scope.friendly(target)) { detonate(current, target, hit.position()); return; }
                }
                const moved = scope.displace(current.actor(), delta);
                travelled += moved;
                if (hit.blocked() || moved < p("finalgambit", "maximumStride", current) || travelled >= length) {
                    finish(current, true, origin);
                    return;
                }
                current.after(1, advance);
            }

            advance(action);
        }
    });
}
