/**
 * 爱心印章 / heartstamp 的出手方式。
 *
 * 核心念头：先认真卖一次萌，把对手的警惕放下来，再扑上去补一记重击；补击正好落在破绽窗口里时，
 * 才算「乘机」，打得更重、更容易把它拍懵。两拍分开，玩家能读出「爱心先到、重击后到」，也来得及走开。
 *
 * 两幕：
 *   起（windup，提交前）：抬眼、摆出可爱姿势的预告。
 *   骗（feint）：提交后朝目标放出一颗爱心，给对方挂上共享身份 `world_combat:status/offguard`（疏忽）——
 *       本单元发明的新状态，物品栏可见，别人以后也能消费。
 *   击（dash → seize/hit/miss）：隔 `feint` 刻后朝目标扑过去（逐刻 trace）；撞上时若目标仍带着疏忽，
 *       就消耗掉它，这一击乘上乘机倍率、畏缩几率也乘上乘机倍率；窗口过了就打一记平击。扑空则收势。
 *
 * 与同族的区分：麻麻刺刺是一路带着电撞上去；爱心印章是先骗再打，胜负手在补击是否落在破绽窗口里。
 *
 * 畏缩：施加本单元声明的 MobEffect（共享身份 `world_combat:status/flinch`）并投递
 * `world_combat:interrupt`；全局起手门禁在窗口内拒绝新动作，伤害阶段不受影响。
 */
namespace PokemonSkills {
    const heartstampScene = "world_combat:move_heartstamp";
    const heartstampFlinchEffect = "world_combat:heartstamp_flinch";
    const heartstampOffguardEffect = "world_combat:heartstamp_offguard";
    const heartstampFlinchText = "world_combat.move.heartstamp.text.flinch";
    const heartstampFeintText = "world_combat.move.heartstamp.text.feint";
    const heartstampSeizeText = "world_combat.move.heartstamp.text.seize";
    const heartstampHitText = "world_combat.move.heartstamp.text.hit";
    const heartstampMissText = "world_combat.move.heartstamp.text.miss";

    function heartstampFlinch(world: CombatWorld, target: CombatActor, ticks: number): boolean {
        if (MobEffects.apply(world, target, heartstampFlinchEffect, ticks, 0) === null) return false;
        world.deliver(target, "world_combat:interrupt");
        return true;
    }

    define({
        freeMovement: true,
        id: "heartstamp",
        cooldownParameter: "recharge",
        name: "Heart Stamp",
        description: "先卖一次萌，让对方进入短暂的疏忽窗口，再扑上去补一记重击；补击若落在窗口里就乘机打得更重、更容易把人拍懵。窗口很短，离得远等冲过去就过期了。",
        uses: ["近身骗一下再补重击", "把对手拍懵，抢一次先手", "对已经放松警惕的目标乘机加深一击"],
        kind: "enemy",
        range: 4.6,
        maxRange: 8,
        prepare: 8,
        active: 0,
        recover: 7,
        cooldown: 22,
        style: "heart",
        defaults: { guile: false, ai: { maxChase: 8, seizeFirst: true } },
        fields: [],
        indicator: function (config, pokemon) {
            return { radius: p("heartstamp", "lunge", pokemon), geometry: "line", style: "heart", color: 0xE68BB4,
                label: config && config.guile === true ? "爱心印章·心机" : "爱心印章" };
        },
        resolve: function (pokemon, config, world, actor, attributes) {
            const context: NumberContext = { pokemon, skill: skills["heartstamp"], detail: { values: config }, world: world || null, actor: actor || null, attributes };
            return {
                prepare: Math.round(p("heartstamp", "wink", context)),
                recover: Math.round(p("heartstamp", "settle", context)),
                cooldown: Math.round(p("heartstamp", "recharge", context)),
                active: 0,
                range: p("heartstamp", "lunge", context) + 1.2
            };
        },
        windup: function (action, config, prepare) {
            action.present("heartstamp:windup", heartstampScene, 1, action.origin(),
                JSON.stringify({ moment: "windup", guile: config && config.guile === true, windup: prepare }));
            return prepare;
        },
        execute: function (action, move, config, done) {
            const movementScenes = WorldFeedback.actionScenes(heartstampScene);
            const world = action.world();
            const stamp = p("heartstamp", "stamp", action);
            const seize = p("heartstamp", "seize", action);
            const startle = p("heartstamp", "startle", action);
            const charmTicks = Math.max(10, Math.round(p("heartstamp", "charmTicks", action)));
            const feint = Math.max(1, Math.round(p("heartstamp", "feint", action)));
            const lunge = p("heartstamp", "lunge", action);
            const pace = p("heartstamp", "pace", action);
            const radius = p("heartstamp", "radius", action);
            const chance = p("heartstamp", "flinchChance", action);
            const flinchTicks = Math.round(p("heartstamp", "flinchTicks", action));
            const scale = radius / 0.55;
            let travelled = 0, settled = false;

            function finish(current: CombatAction): void { if (!settled) { settled = true; movementScenes.finish(current, done); } }

            function miss(current: CombatAction): void {
                const scope = current.world();
                const body = scope.observe(current.actor());
                if (body !== null) {
                    WorldFeedback.emit(scope, heartstampScene, 1, body.position(), { moment: "miss", scale: scale }, 20);
                    WorldFeedback.text(scope, body.position().plus(WorldCombat.point(0, 1.1, 0)), heartstampMissText, [], 22);
                }
                finish(current);
            }

            /** 扑到的一刻：结算这一击，并检查目标是否仍在疏忽窗口里。 */
            function land(current: CombatAction, hit: CombatImpact, direction: CombatPoint): void {
                if (settled) return;
                const scope = current.world();
                const victim = hit.target();
                if (victim === null || !scope.valid(victim)) { finish(current); return; }
                const offguard = CombatStatus.has(scope, victim, "offguard");
                if (offguard) MobEffects.consumeTagged(scope, victim, "world_combat:status/offguard");
                const power = stamp * (offguard ? seize : 1);
                const roll = chance * (offguard ? startle : 1);
                const landed = hurt(current, victim, "heartstamp", power,
                    { damage: damageSpec("heartstamp", "stamp"), contact: true });
                WorldFeedback.emit(scope, heartstampScene, 1, hit.position(),
                    { moment: offguard ? "seize" : "hit", target: String(victim.ref()), scale: scale,
                        intensity: Math.max(0.5, Math.min(2, power / 60)), offguard: offguard ? 1 : 0 }, 28);
                sound(current, "cobblemon:impact.psychic");
                if (landed) {
                    if (scope.valid(victim)) scope.displace(victim, direction.scale(0.6));
                    WorldFeedback.text(scope, hit.position().plus(WorldCombat.point(0, 1.3, 0)),
                        offguard ? heartstampSeizeText : heartstampHitText, [], 26);
                    if (scope.random() < roll && heartstampFlinch(scope, victim, flinchTicks)) {
                        WorldFeedback.emit(scope, heartstampScene, 1, hit.position(), { moment: "flinch", target: String(victim.ref()) }, 24);
                        WorldFeedback.text(scope, hit.position().plus(WorldCombat.point(0, 1.1, 0)), heartstampFlinchText, [], 24);
                    }
                }
                finish(current);
            }

            function advance(current: CombatAction): void {
                const scope = current.world();
                const here = current.origin();
                let direction = aim(current);
                const victim = current.target();
                if (victim !== null && scope.valid(victim)) {
                    const at = scope.observe(victim);
                    if (at !== null) {
                        const delta = at.position().minus(here);
                        if (delta.length() > 0.05) direction = delta.unit();
                    }
                }
                const remaining = lunge - travelled;
                if (remaining <= 0.001) { miss(current); return; }
                const step = Math.min(pace, remaining);
                const delta = direction.scale(step);
                const swept = sweepStep(current, delta, radius), hit = swept.hit;
                if (hit.hitEntity()) { land(current, hit, direction); return; }
                const moved = swept.moved + (hit.hitEntity() && swept.remaining.length() > 0.001 ? scope.displace(current.actor(), swept.remaining) : 0);
                travelled += moved;
                if (hit.blocked() || moved < 0.05) { miss(current); return; }
                movementScenes.show(current, "dash", here, { moment: "dash", scale: scale, travelled: Math.min(1, travelled / Math.max(0.001, lunge)) });
                current.after(1, advance);
            }

            function feintNow(current: CombatAction): void {
                const scope = current.world();
                const victim = current.target();
                const at = victim !== null && scope.valid(victim) ? scope.observe(victim) : null;
                if (victim === null || at === null) { finish(current); return; }
                CombatStatus.apply(scope, victim, "offguard", heartstampOffguardEffect, charmTicks);
                WorldFeedback.emit(scope, heartstampScene, 1, at.position(),
                    { moment: "feint", target: String(victim.ref()), scale: scale, charm: charmTicks / 20,
                        hearts: Math.max(6, Math.round(6 + charmTicks / 20 * 2)) }, 26);
                WorldFeedback.text(scope, at.position().plus(WorldCombat.point(0, 1.2, 0)), heartstampFeintText, [], 26);
                sound(current, "minecraft:block.note_block.chime");
                current.after(feint, function (next) { advance(next); });
            }

            feintNow(action);
        }
    });

}
