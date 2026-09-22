/**
 * 攀瀑 / waterfall 的出手方式。
 *
 * 核心念头：水从身后涌成一道竖直水帘，缩身蓄势后整身扑出，像瀑布从高处砸下——撞实的一刻水帘
 * 拍在目标身上，把它冲退并震懵（畏缩）。比波动冲短、比铁头快，落点是「被水拍懵」而不是「被浇透或砸飞」；
 * 下着雨时水势更盛，威力与震懵都抬一档。
 *
 * 三幕：
 *   起（windup，提交前）：水从身后涌起、裹住身体，只播预告。
 *   扑（surge → impact / spill）：提交后逐刻沿瞄准方向扑出，一路拖着下降的水帘；trace 撞上活体即结算
 *       crash 接触伤害，按 shove 把目标冲退，并按 flinchChance 把它震懵（本单元的共享身份畏缩载体）。
 *   落（spill）：一个都没撞上时，水帘在尽头拍散、白扑一趟。
 *
 * 畏缩：施加本单元声明的 MobEffect（共享身份 `world_combat:status/flinch`，只借身份、行为自写）并投递
 * `world_combat:interrupt`；下方门禁在窗口内拒绝新动作，伤害阶段不受影响。
 * 配置 `torrent` 由 resolve 改时序、由公式改威力／距离／概率，提交后才触碰世界。
 */
namespace PokemonSkills {
    const waterfallScene = "world_combat:move_waterfall";
    const waterfallFlinchEffect = "world_combat:waterfall_flinch";
    const waterfallFlinchText = "world_combat.move.waterfall.text.flinch";
    const waterfallMissText = "world_combat.move.waterfall.text.miss";

    function waterfallFlinch(world: CombatWorld, target: CombatActor, ticks: number): boolean {
        if (MobEffects.apply(world, target, waterfallFlinchEffect, ticks, 0) === null) return false;
        world.deliver(target, "world_combat:interrupt");
        return true;
    }

    define({
        id: "waterfall",
        name: "Waterfall",
        description: "The user charges at the target and may make it flinch.",
        uses: ["贴身冲开或留住一个目标", "把它震懵，给队友制造输出窗口", "在雨里扑出去，水势更盛"],
        kind: "enemy",
        range: 3.4,
        maxRange: 6.2,
        prepare: 9,
        active: 26,
        recover: 9,
        cooldown: 38,
        style: "water",
        defaults: { torrent: false, ai: { maxChase: 9, preferUnflinched: true } },
        fields: [],
        indicator: function (config, pokemon) {
            return { radius: p("waterfall", "collisionRadius", pokemon) * 1.7, geometry: "line", style: "water",
                color: 0x3E8FCB, label: config && config.torrent === true ? "瀑落式攀瀑" : "攀瀑" };
        },
        resolve: function (pokemon, config, world, actor, attributes) {
            const context: NumberContext = { pokemon, skill: skills["waterfall"], detail: { values: config }, world: world || null, actor: actor || null, attributes };
            return {
                prepare: Math.round(p("waterfall", "tempo", context)),
                recover: Math.round(p("waterfall", "aftercast", context)),
                cooldown: Math.round(p("waterfall", "recharge", context)),
                active: skills["waterfall"].active,
                range: p("waterfall", "pounce", context) + 0.5
            };
        },
        windup: function (action, config, prepare) {
            action.present("waterfall:gather", waterfallScene, 1, action.origin(),
                JSON.stringify({ moment: "gather", torrent: config && config.torrent === true }));
            return prepare;
        },
        execute: function (action, move, config, done) {
            const world = action.world();
            const length = p("waterfall", "pounce", action);
            const pace = p("waterfall", "pace", action);
            const radius = p("waterfall", "collisionRadius", action);
            const traceAhead = p("waterfall", "traceAhead", action);
            const minimumMove = p("waterfall", "minimumMove", action);
            const power = p("waterfall", "crash", action);
            const chance = Math.max(0.02, Math.min(0.9, p("waterfall", "flinchChance", action)));
            const flinchTicks = Math.max(1, Math.round(p("waterfall", "flinchTicks", action)));
            const shove = p("waterfall", "shove", action);
            const spray = Math.max(6, Math.round(p("waterfall", "spray", action)));
            const curtain = p("waterfall", "curtain", action);
            const torrent = !!(config && config.torrent);
            const self = world.observe(action.actor());
            const raining = self !== null && WorldEnvironment.read(world, self.position()).rain > 0.15;
            const direction = aim(action);
            const scale = radius / 0.6;
            const intensity = Math.max(0.6, Math.min(2.6, power / 95 * (raining ? 1.14 : 1) * (torrent ? 1.08 : 1)));
            let travelled = 0, settled = false;

            function finish(current: CombatAction): void { if (!settled) { settled = true; done(current); } }

            WorldFeedback.emit(world, waterfallScene, 1, action.origin(),
                { moment: "surge", spray: spray, curtain: curtain, scale: scale, intensity: intensity,
                    rain: raining ? 1 : 0, torrent: torrent ? 1 : 0 }, 60);
            sound(action, "cobblemon:move.hydropump.actor");
            sound(action, "minecraft:item.trident.riptide_1");

            function spill(current: CombatAction): void {
                const scope = current.world(), body = scope.observe(current.actor());
                if (body !== null) {
                    WorldFeedback.emit(scope, waterfallScene, 1, body.position(),
                        { moment: "spill", spray: spray, curtain: curtain, scale: scale }, 24);
                    WorldFeedback.text(scope, body.position().plus(WorldCombat.point(0, 1.2, 0)), waterfallMissText, [], 22);
                }
                sound(current, "minecraft:entity.generic.splash");
                finish(current);
            }

            function advance(current: CombatAction): void {
                const scope = current.world(), origin = current.origin();
                const step = Math.min(pace, Math.max(0, length - travelled));
                if (step <= 0.001) { spill(current); return; }
                const delta = direction.scale(step);
                const hit = current.trace(origin, origin.plus(delta.scale(traceAhead)), radius);
                if (hit.hitEntity()) {
                    const target = hit.target(), point = hit.position();
                    const landed = target !== null && impact(current, hit, "waterfall", power,
                        { damage: damageSpec("waterfall", "crash"), contact: true });
                    WorldFeedback.emit(scope, waterfallScene, 1, point,
                        { moment: "impact", target: target ? String(target.ref()) : "", spray: spray,
                            curtain: curtain, scale: scale, intensity: intensity }, 30);
                    sound(current, "cobblemon:impact.water");
                    if (landed && target !== null && scope.valid(target)) {
                        scope.displace(target, direction.scale(shove));
                        if (scope.random() < chance && waterfallFlinch(scope, target, flinchTicks)) {
                            WorldFeedback.emit(scope, waterfallScene, 1, point, { moment: "flinch", target: String(target.ref()) }, 26);
                            WorldFeedback.text(scope, point.plus(WorldCombat.point(0, 1.35, 0)), waterfallFlinchText, [], 24);
                        }
                    }
                    finish(current);
                    return;
                }
                const moved = scope.displace(current.actor(), delta);
                travelled += moved;
                if (hit.blocked() || moved < minimumMove || travelled >= length) { spill(current); return; }
                WorldFeedback.keep(scope, "waterfall:wake:" + String(current.actor().ref()), waterfallScene, 1, origin,
                    { moment: "surge", spray: spray, curtain: curtain, scale: scale, intensity: intensity,
                        ratio: Math.min(1, travelled / Math.max(0.001, length)) }, 8);
                current.after(1, advance);
            }

            advance(action);
        }
    });

}
