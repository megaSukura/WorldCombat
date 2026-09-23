/**
 * 吸取拳 / drainpunch 的出手方式。
 *
 * 核心念头：站定一记直拳抵进对手，把力气顺着拳路抽回自己身上——本族最短、最快、唯一「脚下不动」的物理吸招。
 *   它不冲、不扑，靠拳距和出手速度把一段贴身距离变成命中；抽回来的力量沿手臂回流，画面上从对手直连到拳面。
 *
 * 两幕：
 *   起（windup，提交前）：拳头攥紧、指节亮起暖光，只播预告。
 *   拳（punch → sap / miss，提交后）：朝目标推出直拳，命中结算 `jab` 接触拳击伤害，伤害的一部分经共享 `drain`
 *       抽回自身，同时沿「目标→拳面」抽出一道回流；打空只散开一圈尘。连打式把这一幕展开成三拳，逐拳间隔 `gaps` 刻。
 *
 * 与同族分开：木角是带身体的冲撞、可贯穿；吸血是咬住不放的持续抽吸；悔念剑是扇面斩击；只有吸取拳站着出拳，
 *   凭「拳距最短、出手最快、力量顺拳路回流」被认出。配置 `combo` 让它在「一记直拳」与「三连拳」两种形状间取舍。
 *
 * 命中、防御、相性与暴击走共享 `impact`；回复走共享伤害载荷的 `drain`，对宝可梦、原版生物、玩家同一条路。
 */
namespace PokemonSkills {
    const drainPunchScene = "world_combat:move_drainpunch";
    const drainPunchHitText = "world_combat.move.drainpunch.text.hit";
    const drainPunchSapText = "world_combat.move.drainpunch.text.sap";
    const drainPunchMissText = "world_combat.move.drainpunch.text.miss";

    define({
        id: "drainpunch",
        cooldownParameter: "recharge",
        name: "Drain Punch",
        description: "A standing straight punch that drives into the foe and siphons the force back up the arm. The shortest, quickest physical drain of the family; a three-jab string trades per-hit drain for total damage.",
        uses: ["贴身时用最短的一拳抢输出", "边打边把伤害换成回血", "连打式一次压出三段伤害"],
        kind: "enemy",
        range: 2.4,
        maxRange: 3.6,
        prepare: 6,
        active: 1,
        recover: 6,
        cooldown: 22,
        style: "punch",
        defaults: { combo: false, ai: { maxChase: 6, healBelow: 0.85 } },
        fields: [],
        indicator: function (config, pokemon) {
            return { radius: p("drainpunch", "reach", pokemon) + 0.3, geometry: "line", style: "punch", color: 0xE8A24A,
                label: config && config.combo === true ? "吸取拳·连打" : "吸取拳" };
        },
        resolve: function (pokemon, config, world, actor, attributes) {
            const context: NumberContext = { pokemon: pokemon, skill: skills["drainpunch"], detail: { values: config }, world: world || null, actor: actor || null, attributes: attributes };
            return {
                prepare: Math.round(p("drainpunch", "tempo", context)),
                recover: Math.round(p("drainpunch", "aftercast", context)),
                cooldown: Math.round(p("drainpunch", "recharge", context)),
                active: skills["drainpunch"].active,
                range: p("drainpunch", "reach", context) + 0.3
            };
        },
        windup: function (action, config, prepare) {
            action.present("world_combat:drainpunch:" + action.id(), drainPunchScene, 1, action.origin(),
                JSON.stringify({ moment: "windup", combo: config && config.combo === true ? 1 : 0 }));
            return prepare;
        },
        execute: function (action, move, config, done) {
            const world = action.world();
            const combo = config && config.combo === true;
            const power = p("drainpunch", "jab", action);
            const share = p("drainpunch", "sap", action);
            const radius = p("drainpunch", "fist", action);
            const gap = Math.max(1, Math.round(p("drainpunch", "gaps", action)));
            const total = combo ? 3 : 1;
            const selected = action.target();
            const targetRef = selected !== null && world.valid(selected) ? String(selected.ref()) : "";
            const motes = Math.max(8, Math.round(power * 0.3 + share * 40));
            const scale = Math.max(0.6, Math.min(1.8, radius / 0.4));
            const intensity = Math.max(0.6, Math.min(2.2, power / 75));
            let settled = false;

            function finish(current: CombatAction): void { if (!settled) { settled = true; done(current); } }
            function victim(scope: CombatWorld): CombatActor | null {
                const value = targetRef === "" ? null : scope.actor(targetRef);
                return value !== null && scope.valid(value) ? value : null;
            }
            function whiff(current: CombatAction, at: CombatPoint, index: number): void {
                const scope = current.world();
                WorldFeedback.emit(scope, drainPunchScene, 1, at, { moment: "miss", motes: motes, scale: scale, punch: index + 1 }, 16);
                if (index === 0) WorldFeedback.text(scope, at.plus(WorldCombat.point(0, 0.9, 0)), drainPunchMissText, [], 18);
                sound(current, "minecraft:entity.player.attack.weak");
                if (index + 1 >= total) finish(current); else current.after(gap, function (next: CombatAction) { punch(next, index + 1); });
            }

            function punch(current: CombatAction, index: number): void {
                const scope = current.world(), me = scope.observe(current.actor()), foe = victim(scope);
                const body = foe !== null ? scope.observe(foe) : null;
                if (me === null) { finish(current); return; }
                if (body === null) { whiff(current, me.position().plus(WorldCombat.point(0, 1, 0)), index); return; }
                const dx = body.position().x() - me.position().x(), dz = body.position().z() - me.position().z();
                const distance = Math.max(0.01, Math.sqrt(dx * dx + dz * dz));
                const forward = WorldCombat.point(dx / distance, 0, dz / distance);
                const hit = current.trace(me.position(), me.position().plus(forward.scale(Math.min(3.6, distance + 0.6))), radius);
                sound(current, index === 0 ? "minecraft:entity.player.attack.strong" : "minecraft:entity.player.attack.weak");
                if (!hit.hitEntity()) { whiff(current, me.position().plus(forward.scale(Math.min(3.6, distance + 0.6))), index); return; }
                const struck = hit.target(), at = hit.position();
                WorldFeedback.emit(scope, drainPunchScene, 1, at,
                    { moment: "punch", target: struck !== null ? String(struck.ref()) : "", motes: motes, scale: scale,
                        intensity: intensity, punch: index + 1, punches: total, combo: combo ? 1 : 0 }, 20);
                const landed = impact(current, hit, "drainpunch", power,
                    { damage: damageSpec("drainpunch", "jab"), contact: true, punch: true, drain: share });
                if (landed && struck !== null && scope.valid(struck)) {
                    const self = scope.observe(current.actor());
                    const from = self === null ? current.origin() : self.position();
                    const flow = from.minus(at), span = flow.length();
                    const inward = span < 0.05 ? WorldCombat.point(0, 1, 0) : flow.unit();
                    WorldFeedback.emit(scope, drainPunchScene, 1, at,
                        { moment: "sap", path: ["target", "source"], target: String(struck.ref()),
                            direction: [inward.x(), inward.y(), inward.z()], span: span, motes: motes, scale: scale,
                            punch: index + 1 }, 24);
                    sound(current, "cobblemon:move.bulletpunch.target");
                    WorldFeedback.text(scope, at.plus(WorldCombat.point(0, 1.05, 0)), drainPunchHitText, [], 20);
                    WorldFeedback.text(scope, from.plus(WorldCombat.point(0, 1.2, 0)), drainPunchSapText, [Math.round(share * 100)], 20);
                }
                if (index + 1 >= total) finish(current); else current.after(gap, function (next: CombatAction) { punch(next, index + 1); });
            }

            punch(action, 0);
        }
    });
}
