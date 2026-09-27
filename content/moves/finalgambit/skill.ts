/**
 * 搏命 / finalgambit 的出手方式。
 *
 * 念头的形状：站定、把全身的气血往上提（windup，可被打断；光与核心的体积随押上的生命比例增长）→ 扑向对手（dash）→
 * 贴上去的一刻先按原生结算打出「等于自己当前生命的固定伤害」，真的打出回执后，再把这笔生命经 `world.payHealth`
 * 自付掉（detonate）→ 自己倒下（faint）或留手留下一口气（spent）。打空、被属性免疫挡下或被原生拒绝时不倒、不付。
 *
 * 三幕：windup（charge）→ dash → detonate（+ 殒 / 留手 / 拒绝 / 空响）。收招为 0，detonate 当刻动作即结束。
 * 代价走原生自付入口，吸取/无敌/减伤不替代价打折：实际支付不完整时不谎报「倒下」或「留手」。
 */
namespace PokemonSkills {
    const finalgambitScene = "world_combat:move_finalgambit";
    const finalgambitHitText = "world_combat.move.finalgambit.text.hit";
    const finalgambitFaintText = "world_combat.move.finalgambit.text.faint";
    const finalgambitSpentText = "world_combat.move.finalgambit.text.spent";
    const finalgambitUnpaidText = "world_combat.move.finalgambit.text.unpaid";
    const finalgambitMissText = "world_combat.move.finalgambit.text.miss";

    function finalgambitAim(action: CombatAction): CombatPoint {
        const wanted = action.targetPosition().minus(action.origin());
        return wanted.length() < 0.01 ? action.direction() : wanted.unit();
    }

    function finalgambitVector(direction: CombatPoint): number[] { return [direction.x(), direction.y(), direction.z()]; }

    /** 原生布尔事实的安全读取（读不到按 false，不外推）。 */
    function finalgambitNativeFlag(native: any, method: string): boolean {
        if (native === null || native === undefined || typeof native[method] !== "function") return false;
        try { return !!native[method](); } catch (error) { return false; }
    }

    /** 原生数值事实的安全读取（读不到按 0）。 */
    function finalgambitNativeAmount(native: any, method: string): number {
        if (native === null || native === undefined || typeof native[method] !== "function") return 0;
        try { const value = Number(native[method]()); return isFinite(value) ? value : 0; } catch (error) { return 0; }
    }

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
            const stake = body === null || body.maxHealth() <= 0 ? 0 : Math.max(0, Math.min(1, body.health() / body.maxHealth()));
            // 起手的光量与本命核心的体积直接读押注比例（0..1），让"押多大"从画面读得出来。
            action.present("world_combat:move_finalgambit:charge", finalgambitScene, 1, action.origin(), JSON.stringify({
                moment: "charge", spare: spare, stake: stake,
                count: Math.round(6 + stake * 30), core: Math.round(3 + stake * 18), scale: 0.6 + stake * 0.8
            }));
            return prepare;
        },
        execute: function (action, move, config, done) {
            const movementScenes = WorldFeedback.actionScenes(finalgambitScene);
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
            if (start === null) { movementScenes.finish(action, done); return; }
            const share = start.maxHealth() <= 0 ? 1 : Math.min(1, damage / start.maxHealth());
            let travelled = 0, settled = false;

            movementScenes.show(action, "dash", action.origin(), { moment: "dash", direction: finalgambitVector(direction), scale: radius / 0.5 });
            sound(action, "minecraft:entity.ravager.attack");

            /** 经原生自付入口结清自我牺牲：全力花掉当前生命，留手花到剩 1 点；返回实际支付。 */
            function spend(current: CombatAction): { due: number; paid: number } {
                const scope = current.world(), body = scope.observe(self);
                if (body === null) return { due: 0, paid: 0 };
                const due = spare ? Math.max(0, body.health() - 1) : body.health();
                const paid = due > 0 ? scope.payHealth(due, "world_combat:finalgambit_cost", spare ? 1 : 0) : 0;
                return { due: due, paid: paid };
            }

            /** 只结动作：扑空的对谈已在 finish 里写出；倒下与留手由 detonate 在支付回执后写。 */
            function finish(current: CombatAction, missed: boolean, at: CombatPoint): void {
                if (settled) return;
                settled = true;
                if (missed) {
                    WorldFeedback.emit(current.world(), finalgambitScene, 1, at, { moment: "miss", scale: radius / 0.5 }, 20);
                    WorldFeedback.text(current.world(), at.plus(WorldCombat.point(0, 1.2, 0)), finalgambitMissText, [], 20);
                    sound(current, "minecraft:entity.player.attack.sweep");
                }
                movementScenes.finish(current, done);
            }

            function detonate(current: CombatAction, target: CombatActor, at: CombatPoint): void {
                const scope = current.world();
                const landed = finalgambitRawHit(current, target, damage, true);
                if (!landed) {
                    // 打不动（属性免疫）或原生拒绝：不播爆炸、不写自毁。
                    WorldFeedback.emit(scope, finalgambitScene, 1, at, { moment: "miss", scale: radius / 0.5 }, 20);
                    WorldFeedback.text(scope, at.plus(WorldCombat.point(0, 1.2, 0)), finalgambitMissText, [], 22);
                    settled = true;
                    movementScenes.finish(current, done);
                    return;
                }
                // 伤害回执成立后才播爆炸；这是单体撞击，冲击沿扑身方向压出，不画成环状群伤。
                WorldFeedback.emit(scope, finalgambitScene, 1, at,
                    { moment: "detonate", target: String(target.ref()), count: Math.round(20 + share * 60),
                      scale: blast / 1.2, direction: finalgambitVector(direction) }, 30);
                sound(current, "minecraft:entity.generic.explode");
                WorldFeedback.text(scope, at.plus(WorldCombat.point(0, 1.3, 0)), finalgambitHitText, [Math.round(damage)], 26);
                if (scope.valid(target)) scope.hitDisplace(target, direction.scale(stagger));
                const selfBody = scope.observe(self);
                const selfPoint = selfBody !== null ? selfBody.position() : at;
                // 全力式支付成功身体即倒下，动作作用域随之失效，倒下回报必须趁身体还在时发出；
                // 先据原生事实确认这具身体会被扣血（无无敌、无吸收），支付不完整时下面的存活性再改写为「未支付」。
                const native = scope.valid(self) ? scope.nativeEntity(self) : null;
                const canFall = !finalgambitNativeFlag(native, "isInvulnerable") && finalgambitNativeAmount(native, "getAbsorptionAmount") <= 1e-4;
                if (!spare && canFall) {
                    WorldFeedback.text(scope, selfPoint.plus(WorldCombat.point(0, 1.1, 0)), finalgambitFaintText, [], 26);
                    WorldFeedback.emit(scope, finalgambitScene, 1, selfPoint, { moment: "faint", scale: blast / 1.2 }, 26);
                }
                const cost = spend(current);
                const paidFull = cost.due <= 0 || cost.paid + 1e-4 >= cost.due;
                if (scope.valid(self)) {
                    if (paidFull && spare) {
                        WorldFeedback.text(scope, selfPoint.plus(WorldCombat.point(0, 1.1, 0)), finalgambitSpentText, [], 26);
                        WorldFeedback.emit(scope, finalgambitScene, 1, selfPoint, { moment: "spent", scale: blast / 1.2 }, 26);
                    } else if (!paidFull) {
                        // 实际没支付完整：改写为未支付，不谎报倒下或留手。
                        WorldFeedback.text(scope, selfPoint.plus(WorldCombat.point(0, 1.1, 0)), finalgambitUnpaidText, [], 26);
                        WorldFeedback.emit(scope, finalgambitScene, 1, selfPoint, { moment: "miss", scale: blast / 1.2 }, 24);
                    }
                }
                settled = true;
                movementScenes.finish(current, done);
            }

            function advance(current: CombatAction): void {
                const scope = current.world();
                const origin = current.origin();
                const step = Math.min(speed, Math.max(0, length - travelled));
                if (step <= 0.001) { finish(current, true, origin); return; }
                const delta = direction.scale(step);
                const swept = sweepStep(current, delta, radius + stride), hit = swept.hit;
                if (hit.hitEntity()) {
                    const target = hit.target();
                    if (target !== null && !scope.friendly(target)) { detonate(current, target, hit.position()); return; }
                }
                const moved = swept.moved + (hit.hitEntity() && swept.remaining.length() > 0.001 ? scope.displace(current.actor(), swept.remaining) : 0);
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
