/**
 * 波动冲 / wavecrash 的出手方式。
 *
 * 核心念头：把水聚成贴身的壳，整个人连着水墙一起涌出去——撞实的一刻水壳在接触面炸开，把目标浇透并冲开。
 * 施法者本身湿透（雨里、水里）时水势更盛；厚水壳让威力更高、反伤更轻、浇得更久，代价是涌得更短更慢。
 *
 * 三幕：
 *   起（windup，提交前）：水从四周收拢成壳，只播预告。
 *   涌（surge → impact / spill）：提交后逐刻沿瞄准方向涌进，trace 撞上活体即结算 surge 接触伤害，
 *       按 recoil 比例反伤自己（共享结算），把目标沿涌进方向冲开 push 格并浇上湿身
 *       （共享身份 world_combat:status/soaked，与水流裂破同一件事）；一路无人则水壳散开、白涌一趟。
 *
 * 与同族分开：舍身冲撞是干身猛撞、撞完双方被弹开；勇鸟猛攻从空中俯冲穿线；木槌用坚硬躯体砸地。
 * 波动冲的辨识点是水：它把目标浇湿，而且施法者湿透时更狠。配置 thick 由 resolve 改时序、由公式改数值。
 */
namespace PokemonSkills {
    const wavecrashScene = "world_combat:move_wavecrash";
    const WavecrashSoaked = "world_combat:wavecrash_soaked";
    const wavecrashHitText = "world_combat.move.wavecrash.text.hit";
    const wavecrashDrenchText = "world_combat.move.wavecrash.text.drench";
    const wavecrashSpillText = "world_combat.move.wavecrash.text.spill";

    define({
        id: "wavecrash",
        name: "Wave Crash",
        description: "The user shrouds itself in water and slams into the target with its whole body to inflict damage. This also damages the user quite a lot.",
        uses: ["裹水冲开一个目标", "把目标浇透，留给后续的水与电", "在雨里或水里冲出去，水势更盛"],
        kind: "enemy",
        range: 4.2,
        maxRange: 7.6,
        prepare: 9,
        active: 34,
        recover: 9,
        cooldown: 44,
        style: "water",
        defaults: { thick: false, ai: { maxChase: 10, preferDry: true } },
        fields: [],
        indicator: function (config, pokemon) {
            return { radius: p("wavecrash", "collisionRadius", pokemon) * 1.7, geometry: "line", style: "water",
                color: 0x4F9FD4, label: config && config.thick === true ? "厚水壳波动冲" : "波动冲" };
        },
        resolve: function (pokemon, config, world, actor, attributes) {
            const context: NumberContext = { pokemon, skill: skills["wavecrash"], detail: { values: config }, world: world || null, actor: actor || null, attributes };
            return {
                prepare: Math.round(p("wavecrash", "cloak", context)),
                recover: Math.round(p("wavecrash", "aftercast", context)),
                cooldown: Math.round(p("wavecrash", "recharge", context)),
                active: skills["wavecrash"].active,
                range: p("wavecrash", "rush", context) + 0.5
            };
        },
        windup: function (action, config, prepare) {
            action.present("world_combat:move_wavecrash:cloak", wavecrashScene, 1, action.origin(),
                JSON.stringify({ moment: "cloak", thick: !!(config && config.thick) }));
            return prepare;
        },
        execute: function (action, move, config, done) {
            const world = action.world();
            const actor = action.actor();
            const length = p("wavecrash", "rush", action);
            const pace = p("wavecrash", "pace", action);
            const radius = p("wavecrash", "collisionRadius", action);
            const traceAhead = p("wavecrash", "traceAhead", action);
            const minimumMove = p("wavecrash", "minimumMove", action);
            const power = p("wavecrash", "surge", action);
            const recoil = p("wavecrash", "recoil", action);
            const drenchTicks = Math.max(20, Math.round(p("wavecrash", "drench", action)));
            const push = p("wavecrash", "push", action);
            const spray = Math.round(p("wavecrash", "spray", action));
            const thick = !!(config && config.thick);
            const self = world.observe(actor);
            const wet = self !== null && self.wet();
            const direction = aim(action);
            const scale = radius / 0.6;
            const boost = (wet ? 1.15 : 1) * (thick ? 1.08 : 1);
            const intensity = Math.max(0.6, Math.min(2.6, power / 115 * boost));
            let travelled = 0, settled = false;

            WorldFeedback.emit(world, wavecrashScene, 1, action.origin(),
                { moment: "surge", spray: spray, scale: scale, intensity: intensity, wet: wet ? 1 : 0, thick: thick ? 1 : 0 }, 60);
            sound(action, "cobblemon:move.waterpulse.actor");
            sound(action, "minecraft:item.trident.riptide_1");

            function spill(current: CombatAction): void {
                if (settled) return;
                settled = true;
                const scope = current.world(), body = scope.observe(actor);
                if (body !== null) {
                    WorldFeedback.emit(scope, wavecrashScene, 1, body.position(),
                        { moment: "spill", spray: spray, scale: scale }, 24);
                    WorldFeedback.text(scope, body.position().plus(WorldCombat.point(0, 1.3, 0)), wavecrashSpillText, [], 24);
                }
                sound(current, "minecraft:entity.generic.splash");
                done(current);
            }

            function advance(current: CombatAction): void {
                const scope = current.world(), origin = current.origin();
                const step = Math.min(pace, Math.max(0, length - travelled));
                if (step <= 0.001) { spill(current); return; }
                const delta = direction.scale(step);
                const hit = current.trace(origin, origin.plus(delta.scale(traceAhead)), radius);
                if (hit.hitEntity()) {
                    const target = hit.target(), point = hit.position();
                    const landed = impact(current, hit, "wavecrash", power,
                        { damage: damageSpec("wavecrash", "surge"), contact: true, recoil: recoil });
                    WorldFeedback.emit(scope, wavecrashScene, 1, point,
                        { moment: "impact", target: target ? String(target.ref()) : "", spray: spray, scale: scale,
                            intensity: Math.max(0.6, Math.min(2.6, power / 110 * boost)) }, 30);
                    sound(current, "cobblemon:impact.water");
                    if (landed && target !== null && scope.valid(target)) {
                        scope.displace(target, direction.scale(push));
                        if (!CombatStatus.has(scope, target, "soaked")) {
                            CombatStatus.apply(scope, target, "soaked", WavecrashSoaked, drenchTicks);
                            WorldFeedback.emit(scope, wavecrashScene, 1, point,
                                { moment: "drench", target: String(target.ref()), spray: spray, scale: scale }, 26);
                            WorldFeedback.text(scope, point.plus(WorldCombat.point(0, 1.4, 0)), wavecrashDrenchText, [], 26);
                        } else {
                            WorldFeedback.text(scope, point.plus(WorldCombat.point(0, 1.4, 0)), wavecrashHitText, [], 24);
                        }
                    }
                    settled = true;
                    done(current);
                    return;
                }
                const moved = scope.displace(actor, delta);
                travelled += moved;
                if (hit.blocked() || moved < minimumMove || travelled >= length) { spill(current); return; }
                WorldFeedback.keep(scope, "wavecrash:wake:" + String(actor.ref()), wavecrashScene, 1, origin,
                    { moment: "surge", spray: spray, scale: scale, intensity: intensity,
                        ratio: Math.min(1, travelled / Math.max(0.001, length)) }, 8);
                current.after(1, advance);
            }

            advance(action);
        }
    });
}
