/**
 * 神鸟猛击 / skyattack 的出手方式。
 *
 * 核心念头：先停在原地收光蓄一整拍，再腾到目标上方，笔直坠下砸成一道从天上落下的重击——
 *   像一枚被拉满的弓攒到最后才放出去的箭。蓄势那一拍是它明摆着的破绽：对手看得见，可以走开或打断。
 *
 * 三幕：
 *   蓄（windup，提交前）：停在原地收光、脚下起风，只播预告，可被打断且不花 PP。
 *   腾（execute 前半）：提交后向上腾起，爬到落点上方 `altitude` 高度；头顶被压住就只爬到多少算多少。
 *   坠（execute 后半 → strike / land）：对准目标当时所在的那一点笔直坠落，逐刻推进并 trace；
 *       坠到敌人身上结算 plunge 非接触伤害、按 flinchChance 掷畏缩；没人被压到就在落点砸出冲击环。
 *       落点固定在起跳那一刻，坠落途中对手走开就会落空——原生的 90 命中在这里是位置判定。
 *
 * 与同族分开：勇鸟猛攻是贴地水平俯冲、穿过目标并反震自己；神鸟猛击是蓄一拍后从高空垂直砸下的一击，
 *   不反伤，蓄势这段是它独有的破绽。
 * 畏缩：施加本单元声明的 MobEffect（共享身份 `world_combat:status/flinch`，只借身份、行为自写）并投递
 * `world_combat:interrupt`；下方门禁在窗口内拒绝新动作，伤害阶段不受影响。
 *
 * 配置 highDive（高空式）由 resolve 改时序、由公式改高度/威力/畏缩，提交后才触碰世界。
 */
namespace PokemonSkills {
    const skyattackScene = "world_combat:move_skyattack";
    const skyattackHitText = "world_combat.move.skyattack.text.hit";
    const skyattackFlinchText = "world_combat.move.skyattack.text.flinch";
    const skyattackMissText = "world_combat.move.skyattack.text.miss";
    const skyattackFlinchEffect = "world_combat:skyattack_flinch";

    function skyattackFlinch(world: CombatWorld, target: CombatActor, ticks: number): boolean {
        if (MobEffects.apply(world, target, skyattackFlinchEffect, ticks, 0) === null) return false;
        world.deliver(target, "world_combat:interrupt");
        return true;
    }

    define({
        id: "skyattack",
        cooldownParameter: "recharge",
        name: "Sky Attack",
        description: "The user charges in place, then plunges straight down onto the target from high above; a heavy blow that can make the target flinch.",
        uses: ["先蓄一拍再从上空砸下一记重击", "越过地面阻挡打到远处的目标", "把飞在空中的对手也压下来"],
        kind: "enemy",
        range: 6,
        maxRange: 12,
        prepare: 26,
        active: 40,
        recover: 12,
        cooldown: 60,
        style: "sky",
        maximumTicks: 260,
        defaults: { highDive: false, ai: { maxChase: 18, preferAirborne: true } },
        fields: [],
        indicator: function (config, pokemon) {
            return { radius: pokemon ? p("skyattack", "impactRadius", pokemon) * 1.6 : 1.8, geometry: "area", style: "sky",
                color: 0xFFE8A8, label: config && config.highDive === true ? "高空式神鸟猛击" : "神鸟猛击" };
        },
        resolve: function (pokemon, config, world, actor, attributes) {
            const context: NumberContext = { pokemon, skill: skills["skyattack"], detail: { values: config }, world: world || null, actor: actor || null, attributes };
            return {
                prepare: Math.round(p("skyattack", "charge", context)),
                recover: Math.round(p("skyattack", "aftercast", context)),
                cooldown: Math.round(p("skyattack", "recharge", context)),
                active: skills["skyattack"].active,
                range: p("skyattack", "altitude", context) + 2.5
            };
        },
        windup: function (action, config, prepare) {
            const shock = Math.max(8, Math.round(p("skyattack", "shock", action) * 0.5));
            action.present("skyattack:charge", skyattackScene, 1, action.origin(),
                JSON.stringify({ moment: "charge", charge: prepare, orbs: shock, highDive: config && config.highDive ? 1 : 0 }));
            return prepare;
        },
        execute: function (action, move, config, done) {
            const world = action.world();
            const actor = action.actor();
            const target = action.target();
            const altitude = p("skyattack", "altitude", action);
            const descend = p("skyattack", "descend", action);
            const radius = p("skyattack", "impactRadius", action);
            const traceAhead = p("skyattack", "traceAhead", action);
            const minimumMove = p("skyattack", "minimumMove", action);
            const power = p("skyattack", "plunge", action);
            const chance = p("skyattack", "flinchChance", action);
            const flinchTicks = Math.round(p("skyattack", "flinchTicks", action));
            const shock = Math.max(8, Math.round(p("skyattack", "shock", action)));
            const highDive = !!(config && config.highDive);
            const scale = Math.max(0.6, Math.min(2.0, radius / 1.1));
            const intensity = Math.max(0.6, Math.min(2.4, power / 130));

            const observed = target !== null && world.valid(target) ? world.observe(target) : null;
            const dropPoint = observed !== null ? observed.position() : action.targetPosition();
            let settled = false;

            function finish(current: CombatAction): void {
                if (settled) return;
                settled = true;
                done(current);
            }

            function land(current: CombatAction, at: CombatPoint, struck: boolean): void {
                const scope = current.world();
                WorldFeedback.emit(scope, skyattackScene, 1, at,
                    { moment: "land", shock: shock, scale: scale, intensity: intensity, struck: struck ? 1 : 0, highDive: highDive ? 1 : 0 }, 26);
                if (!struck) {
                    WorldFeedback.text(scope, at.plus(WorldCombat.point(0, 0.8, 0)), skyattackMissText, [], 24);
                    sound(current, "cobblemon:impact.flying");
                }
                sound(current, "minecraft:entity.generic.big_fall");
                finish(current);
            }

            function plunge(current: CombatAction): void {
                const scope = current.world(), self = scope.observe(actor);
                if (self === null) { land(current, dropPoint, false); return; }
                const here = self.position(), delta = dropPoint.minus(here), gap = delta.length();
                if (gap <= 0.4) { land(current, dropPoint, false); return; }
                const step = Math.min(descend, gap), direction = delta.unit();
                const hit = current.trace(here, here.plus(direction.scale(step + traceAhead)), radius);
                if (hit.hitEntity()) {
                    const victim = hit.target();
                    if (victim !== null && String(victim.ref()) !== String(actor.ref()) && !scope.friendly(victim)) {
                        const at = hit.position();
                        const landed = impact(current, hit, "skyattack", power,
                            { damage: damageSpec("skyattack", "plunge"), contact: false });
                        WorldFeedback.emit(scope, skyattackScene, 1, at,
                            { moment: "strike", target: String(victim.ref()), shock: shock, scale: scale,
                                intensity: Math.max(0.6, Math.min(2.4, power / 120)) }, 26);
                        sound(current, "cobblemon:impact.flying");
                        if (landed && scope.valid(victim)) {
                            WorldFeedback.text(scope, at.plus(WorldCombat.point(0, 1.4, 0)), skyattackHitText, [], 26);
                            if (scope.random() < chance && skyattackFlinch(scope, victim, flinchTicks)) {
                                WorldFeedback.emit(scope, skyattackScene, 1, at, { moment: "flinch", target: String(victim.ref()) }, 22);
                                WorldFeedback.text(scope, at.plus(WorldCombat.point(0, 1.6, 0)), skyattackFlinchText, [], 22);
                            }
                        }
                        land(current, at, true);
                        return;
                    }
                }
                const moved = scope.displace(actor, direction.scale(step));
                if (hit.blocked() || moved < minimumMove) { land(current, self.position(), false); return; }
                WorldFeedback.keep(scope, "skyattack:fall:" + action.id(), skyattackScene, 1, self.position(),
                    { moment: "fall", shock: shock, scale: scale, intensity: intensity,
                        ratio: Math.min(1, 1 - gap / Math.max(0.001, altitude)) }, 8);
                current.after(1, function (next: CombatAction) { plunge(next); });
            }

            function rise(current: CombatAction, climbed: number): void {
                const scope = current.world(), self = scope.observe(actor);
                if (self === null) { plunge(current); return; }
                const topY = dropPoint.y() + altitude;
                if (self.position().y() >= topY - 0.1 || climbed >= altitude) { plunge(current); return; }
                const remaining = topY - self.position().y();
                const step = Math.min(descend, remaining);
                const moved = scope.displace(actor, WorldCombat.point(0, step, 0));
                if (moved < step * 0.5) { plunge(current); return; }
                WorldFeedback.keep(scope, "skyattack:rise:" + action.id(), skyattackScene, 1, self.position(),
                    { moment: "rise", shock: shock, scale: scale, intensity: intensity,
                        ratio: Math.min(1, (climbed + moved) / Math.max(0.001, altitude)) }, 8);
                current.after(1, function (next: CombatAction) { rise(next, climbed + moved); });
            }

            sound(action, "minecraft:entity.breeze.charge");
            sound(action, "minecraft:entity.phantom.flap");
            WorldFeedback.emit(world, skyattackScene, 1, action.origin(),
                { moment: "rise", shock: shock, scale: scale, intensity: intensity, ratio: 0 }, 24);
            rise(action, 0);
        }
    });

}
