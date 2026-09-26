/**
 * 种子机关枪 / bulletseed 的出手方式。
 *
 * 核心念头：**一梭真种子按节拍连发**——每 `gap` 刻喷出一发真投递，前一发还在空中，后一发已经出膛；
 *   每发自己飞、自己撞，命中在撞击那一刻结算，不再靠计时必中。它是本组唯一的物理连发，
 *   卖的是「这一梭子有多少发」：短了嫌亏、长了才爽。
 *
 * 幕：
 *   起（charge，提交前）：口边把籽囤成一簇、越聚越紧，只播预告。
 *   喷（volley，提交后）：按 `gap` 独立喷出每一发（带 `spread` 偏角），空中可同时存在多发籽；每发按
 *       当刻自由瞄准发射，原目标倒下或走开都不影响剩余的籽继续扫射。撞上非友方活体结算一次 `pellet`
 *       物理伤害、崩出 `husk` 片碎壳；打到硬面只有壳屑，飞到射程尽头只散籽。
 *   收（husk）：全发喷完且在场弹都结束后收势，脚边撒一撮空壳。
 *
 * 与同族分开：种子炸弹是把一荚硬种高抛、从上方落下；能量球是单个实心球命中后长草；
 *   种子机关枪是**贴地连珠的密集小撞击**——没有弧线、没有地面残留，只有一梭子噗噗噗的籽。
 *
 * 配置 `heavy`（重籽）由公式改威力／发数／散布／速度与时序；提交后才触碰世界。
 */
namespace PokemonSkills {
    const bulletseedScene = "world_combat:move_bulletseed";

    /** 当刻自由瞄准：按住技能键时读控制点（逐发可转向），AI 或未声明的输入回退到动作选点。 */
    function bulletseedAim(action: CombatAction): CombatPoint {
        try {
            const parsed = JSON.parse(action.control());
            const samples = parsed && parsed.samples;
            if (samples && samples.length && samples[0].point && samples[0].point.length === 3)
                return WorldCombat.point(samples[0].point[0], samples[0].point[1], samples[0].point[2]);
        } catch (error) { }
        try { return action.targetPosition(); } catch (error) { }
        return action.origin().plus(WorldCombat.point(0, 0, 1));
    }

    define({
        id: "bulletseed",
        cooldownParameter: "recharge",
        name: "Bullet Seed",
        description: "把籽按节拍一发发独立喷出：上一发还在空中，下一发已经出膛，每发各撞一次、按实际首碰者结算。当刻瞄向哪、这一发就飞哪，原目标倒下后剩余的籽仍可继续扫射。重籽少而重、飞得紧；速射多而轻、散得开。",
        uses: ["中近距离用一梭真投递压住移动路线", "对低防目标靠发数堆伤害", "起手快、能连发，贴着对手持续施压"],
        kind: "aim",
        range: 8,
        maxRange: 12,
        prepare: 8,
        active: 0,
        recover: 7,
        cooldown: 26,
        maximumTicks: 240,
        style: "verdant",
        defaults: { heavy: false, ai: { maxChase: 9, finish: true } },
        fields: [],
        indicator: function (config, pokemon) {
            return { radius: p("bulletseed", "reach", pokemon), geometry: "line", style: "verdant",
                color: 0x9CCB3C, label: config && config.heavy === true ? "重籽机关枪" : "速射机关枪" };
        },
        resolve: function (pokemon, config, world, actor, attributes) {
            const context: NumberContext = { pokemon, skill: skills["bulletseed"], detail: { values: config },
                world: world || null, actor: actor || null, attributes };
            return {
                prepare: Math.round(p("bulletseed", "tempo", context)),
                recover: Math.round(p("bulletseed", "aftercast", context)),
                cooldown: Math.round(p("bulletseed", "recharge", context)),
                active: 0,
                range: p("bulletseed", "reach", context)
            };
        },
        windup: function (action, config, prepare) {
            action.present("bulletseed:charge", bulletseedScene, 1, action.origin(),
                JSON.stringify({ moment: "charge", shots: Math.round(p("bulletseed", "shots", action)),
                    heavy: config && config.heavy === true ? 1 : 0 }));
            return prepare;
        },
        execute: function (action, move, config, done) {
            const power = p("bulletseed", "pellet", action);
            const shots = Math.max(2, Math.min(5, Math.round(p("bulletseed", "shots", action))));
            const gap = Math.max(2, Math.round(p("bulletseed", "gap", action)));
            const speed = Math.max(0.6, p("bulletseed", "velocity", action));
            const radius = Math.max(0.12, p("bulletseed", "radius", action));
            const spread = Math.max(1, p("bulletseed", "spread", action));
            const husk = Math.max(8, Math.round(p("bulletseed", "husk", action)));
            const heavy = !!(config && config.heavy);
            const scale = Math.max(0.6, Math.min(1.8, radius / 0.2));
            const intensity = Math.max(0.5, Math.min(2.0, power / 25));
            const range = action.range();
            const scenes = WorldFeedback.actionScenes(bulletseedScene);
            let fired = 0, active = 0, settled = false;

            function rest(current: CombatAction): void {
                const scope = current.world(), body = scope.observe(action.actor());
                const at = body !== null ? body.position() : current.origin();
                WorldFeedback.emit(scope, bulletseedScene, 1, at,
                    { moment: "husk", shot: fired, shots: shots, husk: husk, scale: scale, intensity: intensity, done: 1 }, 18);
            }

            function finish(current: CombatAction): void {
                if (settled || fired < shots || active > 0) return;
                settled = true;
                rest(current);
                scenes.finish(current, done);
            }

            function release(current: CombatAction): void { active--; finish(current); }

            /** 发出一发真投递：方向读当刻自由瞄准、带散布；命中由真实撞击结算。 */
            function shoot(current: CombatAction): void {
                if (settled) return;
                if (fired >= shots) { finish(current); return; }
                const scope = current.world();
                const body = scope.observe(action.actor());
                const origin = body !== null ? body.position() : current.origin();
                const index = fired + 1;
                fired++;
                let aimed = bulletseedAim(current);
                const watched = current.target();
                if (watched !== null && scope.valid(watched)) {
                    const state = scope.observe(watched);
                    if (state !== null) {
                        const delta = state.position().minus(origin);
                        const eta = delta.length() / Math.max(0.2, speed);
                        const drift = state.velocity();
                        aimed = aimed.plus(WorldCombat.point(drift.x() * eta, 0, drift.z() * eta));
                    }
                }
                let direction = aimed.minus(origin);
                if (direction.length() < 0.05) direction = current.direction();
                direction = direction.unit();
                const angle = (scope.random() * 2 - 1) * spread * Math.PI / 180;
                const cos = Math.cos(angle), sin = Math.sin(angle);
                direction = WorldCombat.point(direction.x() * cos - direction.z() * sin, direction.y(),
                    direction.x() * sin + direction.z() * cos);
                let resolved = false, closed = false;
                const key = "shot:" + index;
                active++;
                const flight = LivingActions.projectile(current, {
                    speed: speed, range: range, radius: radius, direction: direction, gravity: 0,
                    lifetime: Math.max(24, Math.round(range / Math.max(0.2, speed) + 16)),
                    appearance: { item: "minecraft:wheat_seeds", scale: Math.max(0.6, Math.min(1.6, radius * 2.4)) },
                    impact: function (inner: CombatAction, hit: CombatImpact) {
                        resolved = true;
                        scenes.stop(inner, key);
                        const stage = inner.world(), victim = hit.target(), at = hit.position();
                        if (victim !== null && stage.valid(victim) && !stage.friendly(victim)) {
                            const landed = impact(inner, hit, "bulletseed", power,
                                { damage: damageSpec("bulletseed", "pellet"), flags: { bullet: true } });
                            WorldFeedback.emit(stage, bulletseedScene, 1, at,
                                { moment: landed ? "hit" : "husk", target: String(victim.ref()), shot: index, shots: shots,
                                    husk: landed ? husk : Math.round(husk * 0.5), scale: scale,
                                    intensity: landed ? intensity : Math.max(0.4, intensity * 0.7) }, 18);
                            if (landed) sound(inner, "cobblemon:impact.grass");
                        } else {
                            WorldFeedback.emit(stage, bulletseedScene, 1, at,
                                { moment: "husk", shot: index, shots: shots, husk: Math.round(husk * 0.5),
                                    scale: scale, intensity: Math.max(0.4, intensity * 0.7) }, 18);
                        }
                        if (!closed) { closed = true; release(inner); }
                    }
                }, function (inner: CombatAction) {
                    if (!resolved) {
                        scenes.stop(inner, key);
                        WorldFeedback.emit(inner.world(), bulletseedScene, 1, origin.plus(direction.scale(range)),
                            { moment: "husk", shot: index, shots: shots, husk: Math.round(husk * 0.5),
                                scale: scale, intensity: Math.max(0.4, intensity * 0.7) }, 18);
                    }
                    if (!closed) { closed = true; release(inner); }
                });
                sound(current, "minecraft:entity.arrow.shoot");
                scenes.show(current, key, origin,
                    { moment: "volley", projectile: flight, shot: index, shots: shots, husk: husk,
                        scale: scale, intensity: intensity, heavy: heavy ? 1 : 0 });
                if (fired < shots) current.after(gap, shoot);
                else finish(current);
            }

            sound(action, "cobblemon:move.seedbomb.actor");
            shoot(action);
        }
    });

    // 玩家按住技能键连喷一梭、每发之间可转向扫射；AI 提交仍带一个目标点，读同一条控制输入。
    WorldCombat.preview("world_combat:bulletseed", JSON.stringify({ input: { version: 1, steps: ["point"], sustained: true } }));
}
