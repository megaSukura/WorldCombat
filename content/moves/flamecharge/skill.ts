/**
 * 蓄能焰袭 / flamecharge 的出手方式。
 *
 * 核心念头：火焰裹身的一次蓄能冲锋。起手把火收拢到全身，压低身形；提交后低头沿直线撞过去，
 * 全身的火越跑越旺；撞中后借着这股动量把自己的速度再抬一级。全身湿透时火势打折。
 *
 * 两幕：
 *   起（flare，提交前）：火焰从四周收拢包住全身，火星向内卷。
 *   冲（rush → hit → boost）：提交后逐刻沿瞄准方向冲锋，身周拖着火与火星；命中结算伤害与击退，
 *       贯穿式会继续撞穿并沿路点到后面的人（后续目标吃贯穿占比），命中即提速；一路无人则火焰收熄。
 *
 * 与同族分开：起草是草绿的一次窜跃、流水旋舞是多拍水舞，蓄能焰袭是**直线火焰冲锋**，
 * 配置 `pierce` 决定它停在第一个目标身上还是撞穿一条线。
 */
namespace PokemonSkills {
    const flamechargeScene = "world_combat:move_flamecharge";
    const flamechargeHitText = "world_combat.move.flamecharge.text.hit";
    const flamechargeHasteText = "world_combat.move.flamecharge.text.haste";
    const flamechargeFizzleText = "world_combat.move.flamecharge.text.fizzle";

    function flamechargeHasteNow(current: CombatAction, stages: number): void {
        const world = current.world(), self = current.actor();
        NativeEffects.boost(world, self, "spe", stages);
        const body = world.observe(self);
        if (body === null) return;
        WorldFeedback.emit(world, flamechargeScene, 1, body.position(), { moment: "boost", stages: stages }, 30);
        WorldFeedback.text(world, body.position().plus(WorldCombat.point(0, 1.3, 0)), flamechargeHasteText, [stages], 34);
        world.sound("minecraft:block.fire.extinguish", body.position(), 14, "{}");
    }

    define({
        freeMovement: true,
        id: "flamecharge",
        cooldownParameter: "trail",
        name: "蓄能焰袭",
        description: "裹着火焰沿直线冲锋：撞中的第一个目标吃一记重击并被带开，随后自身提速；开启贯穿时会继续撞穿，把身后撞到的对手各吃一记较轻的伤害。",
        uses: ["直线撞中一个落单的对手", "沿一条线把挤在一起的对手一起点着", "命中后提速，趁势追下去"],
        kind: "enemy",
        range: 5,
        maxRange: 7,
        prepare: 9,
        active: 0,
        recover: 8,
        cooldown: 44,
        style: "charge",
        defaults: { pierce: false, ai: { maxChase: 11, preferClusters: true } },
        fields: [],
        indicator: function (config, pokemon) {
            return { radius: p("flamecharge", "sprint", pokemon) + 0.8, geometry: "line", style: "fire", color: 0xF08030, label: "蓄能焰袭" };
        },
        resolve: function (pokemon, config, world, actor, attributes) {
            const context: NumberContext = { pokemon, skill: skills["flamecharge"], detail: { values: config }, world, actor, attributes };
            const pierce = !!(config && config.pierce);
            return {
                prepare: Math.round(p("flamecharge", "flare", context)),
                recover: Math.round(p("flamecharge", "recover", context)),
                cooldown: Math.round(p("flamecharge", "trail", context)) + (pierce ? 10 : 0),
                active: 0,
                range: p("flamecharge", "sprint", context) + 1.2
            };
        },
        windup: function (action, config, prepare) {
            action.present("world_combat:move_flamecharge:flare", flamechargeScene, 1, action.origin(),
                JSON.stringify({ moment: "flare", pierce: !!(config && config.pierce) }));
            return prepare;
        },
        execute: function (action, move, config, done) {
            const world = action.world();
            const actor = action.actor();
            const sprint = p("flamecharge", "sprint", action);
            const pace = p("flamecharge", "pace", action);
            const radius = p("flamecharge", "cloak", action);
            const traceAhead = p("flamecharge", "traceAhead", action);
            const minimumMove = p("flamecharge", "minimumMove", action);
            const power = p("flamecharge", "rush", action);
            const through = p("flamecharge", "through", action);
            const haste = Math.max(1, Math.round(p("flamecharge", "haste", action)));
            const push = p("flamecharge", "push", action);
            const heat = Math.round(p("flamecharge", "heat", action));
            const pierce = !!(config && config.pierce);
            const direction = aim(action);
            const intensity = Math.max(0.6, Math.min(2.4, power / 55));
            const scale = radius / 0.6;
            const struck: { [ref: string]: boolean } = {};
            let travelled = 0, firstHit = false, boosted = false, settled = false;
            function finish(current: CombatAction): void { if (!settled) { settled = true; done(current); } }

            sound(action, "cobblemon:move.flamecharge.actor");
            WorldFeedback.emit(world, flamechargeScene, 1, action.origin(),
                { moment: "rush", heat: heat, scale: scale, intensity: intensity }, Math.max(30, Math.round(sprint / pace) + 20));

            function strikeAt(current: CombatAction, hit: CombatImpact): void {
                const scope = current.world(), target = hit.target(), point = hit.position();
                if (target === null) return;
                const ref = String(target.ref());
                if (struck[ref]) return;
                struck[ref] = true;
                const amount = firstHit ? power * through : power;
                firstHit = true;
                const landed = impact(current, hit, "flamecharge", amount, { damage: damageSpec("flamecharge", "rush"), contact: true });
                WorldFeedback.emit(scope, flamechargeScene, 1, point,
                    { moment: "hit", heat: heat, scale: scale, intensity: Math.max(0.6, Math.min(2.4, amount / 55)) }, 28);
                sound(current, "cobblemon:move.flamecharge.target");
                if (scope.valid(target)) scope.displace(target, direction.scale(push));
                if (landed && !boosted) { boosted = true; flamechargeHasteNow(current, haste); }
            }

            function advance(current: CombatAction): void {
                const scope = current.world(), here = current.origin();
                const step = Math.min(pace, Math.max(0, sprint - travelled));
                if (step <= 0.001) { finish(current); return; }
                const delta = direction.scale(step);
                const hit = current.trace(here, here.plus(delta.scale(traceAhead)), radius);
                if (hit.hitEntity()) {
                    strikeAt(current, hit);
                    if (!pierce) { finish(current); return; }
                }
                const moved = scope.displace(actor, delta);
                travelled += moved;
                if (hit.blocked() || moved < minimumMove || travelled >= sprint) {
                    if (!firstHit) {
                        const body = scope.observe(actor);
                        if (body !== null) {
                            WorldFeedback.emit(scope, flamechargeScene, 1, body.position(), { moment: "fizzle", scale: scale }, 20);
                            WorldFeedback.text(scope, body.position().plus(WorldCombat.point(0, 1.1, 0)), flamechargeFizzleText, [], 22);
                        }
                    } else {
                        WorldFeedback.text(scope, here, flamechargeHitText, [Object.keys(struck).length], 24);
                    }
                    finish(current);
                    return;
                }
                WorldFeedback.keep(scope, "flamecharge:wake:" + String(actor.ref()), flamechargeScene, 1, here,
                    { moment: "wake", heat: heat, scale: scale }, 8);
                current.after(1, advance);
            }
            advance(action);
        }
    });
}
