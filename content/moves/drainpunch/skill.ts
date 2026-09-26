/**
 * 吸取拳 / drainpunch 的出手方式。
 *
 * 核心念头：站定一记直拳抵进对手，把力气顺着拳路抽回自己身上——本族最短、最快、唯一「脚下不动」的物理吸招。
 *   它不冲、不扑，靠拳距和出手速度把一段贴身距离变成命中；抽回来的力量沿手臂回流，画面上从对手直连到拳面。
 *
 * 两幕：
 *   起（windup，提交前）：拳头攥紧、指节亮起暖光，只播预告。
 *   拳（punch → sap / miss，提交后）：朝目标或瞄准方向推出直拳，命中结算 `jab` 接触拳击伤害，伤害的一部分经共享
 *       `drain` 抽回自身，同时沿「目标→拳面」抽出一道回流；打空或打在墙上只收拳散尘，不回血。连打式把这一幕展开成
 *       三拳，每拳重新按当前朝向短扫，逐拳间隔 `gaps` 刻。
 *
 * 与同族分开：木角是带身体的冲撞、可贯穿；吸血是咬住不放的持续抽吸；悔念剑是扇面斩击；只有吸取拳站着出拳，
 *   凭「拳距最短、出手最快、力量顺拳路回流」被认出。配置 `combo` 让它在「一记直拳」与「三连拳」两种形状间取舍。
 *
 * 命中、防御、相性与暴击走共享 `impact`；回复走共享伤害载荷的 `drain`，对宝可梦、原版生物、玩家同一条路。
 * 选择是 `aim`：可指敌、可只朝一个方向；拳头沿真实首碰点停下，友方身体与墙都会截住拳路（伤害许可仍独立）。
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
        description: "近身出拳击打目标或朝一个方向打，命中造成伤害后把其中一部分转回自身；打空或打在墙上不回血。",
        uses: ["贴身时用最短的一拳抢输出", "边打边把伤害换成回血", "连打式一次压出三段伤害"],
        kind: "aim",
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
            const combo = config && config.combo === true;
            const power = p("drainpunch", "jab", action);
            const share = p("drainpunch", "sap", action);
            const radius = p("drainpunch", "fist", action);
            const reach = p("drainpunch", "reach", action);
            const gap = Math.max(1, Math.round(p("drainpunch", "gaps", action)));
            const total = combo ? 3 : 1;
            const motes = Math.max(8, Math.round(power * 0.3 + share * 40));
            const scale = Math.max(0.6, Math.min(1.8, radius / 0.4));
            const intensity = Math.max(0.6, Math.min(2.2, power / 75));
            let settled = false;

            function finish(current: CombatAction): void { if (!settled) { settled = true; done(current); } }
            /** 每拳重新取当前朝向：活着的敌人身体优先，其次是瞄准点，最后退回动作方向。 */
            function heading(current: CombatAction, scope: CombatWorld): CombatPoint {
                const selected = current.target();
                const body = selected !== null && scope.valid(selected) ? scope.observe(selected) : null;
                const me = scope.observe(current.actor());
                const origin = me === null ? current.origin() : me.position();
                const point = body !== null ? body.position() : current.targetPosition();
                const delta = point.minus(origin);
                return delta.length() < 0.05 ? current.direction() : delta.unit();
            }
            function whiff(current: CombatAction, at: CombatPoint, index: number): void {
                const scope = current.world();
                WorldFeedback.emit(scope, drainPunchScene, 1, at, { moment: "miss", motes: motes, scale: scale, punch: index + 1 }, 16);
                if (index === 0) WorldFeedback.text(scope, at.plus(WorldCombat.point(0, 0.9, 0)), drainPunchMissText, [], 18);
                sound(current, "minecraft:entity.player.attack.weak");
                if (index + 1 >= total) finish(current); else current.after(gap, function (next: CombatAction) { punch(next, index + 1); });
            }

            function punch(current: CombatAction, index: number): void {
                const scope = current.world(), me = scope.observe(current.actor());
                if (me === null) { finish(current); return; }
                const forward = heading(current, scope);
                const hit = current.trace(me.position(), me.position().plus(forward.scale(reach + 0.6)), radius, true);
                sound(current, index === 0 ? "minecraft:entity.player.attack.strong" : "minecraft:entity.player.attack.weak");
                const struck = hit.target();
                // 墙、空处、非活体与友方身体都会截住拳路，但都不结算伤害也不回血：收拳，继续自己的连打节奏。
                if (!hit.hitEntity() || struck === null || scope.friendly(struck)) { whiff(current, hit.position(), index); return; }
                const at = hit.position();
                const struckRef = String(struck.ref());
                WorldFeedback.emit(scope, drainPunchScene, 1, at,
                    { moment: "punch", target: struckRef, motes: motes, scale: scale,
                        intensity: intensity, punch: index + 1, punches: total, combo: combo ? 1 : 0 }, 20);
                const before = me.health();
                const landed = impact(current, hit, "drainpunch", power,
                    { damage: damageSpec("drainpunch", "jab"), contact: true, punch: true, drain: share });
                const after = scope.observe(current.actor());
                const healed = landed && after !== null ? Math.max(0, after.health() - before) : 0;
                // 只有这一拳真的把血抽回来时才画回流，强弱由实际治疗量决定；目标是否已被打倒都不影响已发生的回血。
                if (healed > 0) {
                    const self = scope.observe(current.actor());
                    const from = self === null ? current.origin() : self.position();
                    const flow = from.minus(at), span = flow.length();
                    const inward = span < 0.05 ? WorldCombat.point(0, 1, 0) : flow.unit();
                    const healedRatio = self === null ? 0 : healed / Math.max(1, self.maxHealth());
                    WorldFeedback.emit(scope, drainPunchScene, 1, at,
                        { moment: "sap", path: ["target", "source"], target: struckRef,
                            direction: [inward.x(), inward.y(), inward.z()], span: span,
                            motes: Math.max(5, Math.round(healed * 6)), scale: scale,
                            intensity: Math.max(0.5, Math.min(2.4, healedRatio * 40)), punch: index + 1 }, 24);
                    sound(current, "cobblemon:move.bulletpunch.target");
                    WorldFeedback.text(scope, at.plus(WorldCombat.point(0, 1.05, 0)), drainPunchHitText, [], 20);
                    WorldFeedback.text(scope, from.plus(WorldCombat.point(0, 1.2, 0)), drainPunchSapText, [Math.round(healed * 10) / 10], 20);
                }
                if (index + 1 >= total) finish(current); else current.after(gap, function (next: CombatAction) { punch(next, index + 1); });
            }

            punch(action, 0);
        }
    });
}
