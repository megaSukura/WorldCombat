/**
 * 金属爪 / metalclaw 的出手方式。
 *
 * 核心念头：贴身一对铁爪沿自由准心左右各劈一下，爪刃劈中活物就被磨出锋口；磨出的物攻让下一记劈得更重。
 *   它是四式里最近、最快、最便宜的一记——不靠单次伤害，靠贴着目标连打把物攻一点点喂起来。
 *
 * 两幕：
 *   起（windup，提交前）：双爪在身侧张开、刃口亮起一层冷光，只播预告，可被打断。
 *   劈（execute，提交后）：沿自由 aim 朝前一记 `trace`（含友方与墙），爪迹画到真实首碰点；
 *       命中非友方即结算 `rake` 接触伤害，并沿当刻真实爪路把目标带开。连爪式在 `gap` 刻后补第二记——
 *       第二记读取当前准心、只允许小幅修正，不强行追着原来的选点转。每记命中各掷一次磨利，
 *       用 `NativeEffects` 的有效等级差计算实际涨了多少物攻；上限由 `sharpenStages` 共享，满级或被拒就不再播成功。
 *       两记都空只留一道空劈的风。
 *
 * 与同族分开：钢翼是横向一扇、把面前的人一起扫开、磨的是防御；金属爪是贴脸两点、磨的是攻击，越劈越重。
 *   本招的配置是「重爪式」（一记更重）与「连爪式」（两记），与独立招式「磨爪」无关。
 *
 * 自由瞄准：`kind: "aim"` 允许任何阵营实体或世界点，空挥合法；攻击权限仍由命中层控制。
 * 配置 `hone`（重爪式）由 resolve 改时序、由公式改威力／几率／击退。
 */
namespace PokemonSkills {
    const metalclawScene = "world_combat:move_metalclaw";
    const metalclawSharpenText = "world_combat.move.metalclaw.text.sharpen";
    const metalclawHitText = "world_combat.move.metalclaw.text.hit";
    const metalclawMissText = "world_combat.move.metalclaw.text.miss";

    function metalclawVertex(point: CombatPoint): number[] { return [point.x(), point.y(), point.z()]; }

    /** 第二记的准心修正：读当刻控制点／目标点，但相对第一记方向只允许小幅偏转，不整记甩向新目标。 */
    function metalclawAim(action: CombatAction, base: CombatPoint): CombatPoint {
        let current = base;
        try {
            const parsed = JSON.parse(action.control());
            const samples = parsed && parsed.samples;
            if (samples && samples.length && samples[0].point && samples[0].point.length === 3) {
                const aimed = WorldCombat.point(samples[0].point[0], samples[0].point[1], samples[0].point[2]);
                const delta = aimed.minus(action.origin());
                if (delta.length() > 0.05) current = delta.unit();
            }
        } catch (error) { }
        if (current === base) {
            try {
                const delta = action.targetPosition().minus(action.origin());
                if (delta.length() > 0.05) current = delta.unit();
            } catch (error) { }
        }
        const dot = current.x() * base.x() + current.y() * base.y() + current.z() * base.z();
        const angle = Math.acos(Math.max(-1, Math.min(1, dot)));
        const limit = Math.PI / 5;
        if (angle <= limit || angle < 1e-4) return current;
        const t = limit / angle;
        const blended = WorldCombat.point(base.x() * (1 - t) + current.x() * t,
            base.y() * (1 - t) + current.y() * t, base.z() * (1 - t) + current.z() * t);
        return blended.length() < 1e-4 ? base : blended.unit();
    }

    define({
        id: "metalclaw",
        cooldownParameter: "recharge",
        name: "Metal Claw",
        description: "贴脸沿自由准心连爪目标：连爪式左右两记、重爪式一记更重；每记命中都有几率磨利、提高自身物攻。空挥合法，墙会挡下钢爪。",
        uses: ["贴身左右两爪连劈", "用命中把物攻一点点磨起来", "开战几拍里把自己喂成重手"],
        kind: "aim",
        range: 2.6,
        maxRange: 3.4,
        prepare: 6,
        active: 0,
        recover: 6,
        cooldown: 22,
        style: "claw",
        defaults: { hone: false, ai: { maxChase: 6, buildUp: true } },
        fields: [],
        indicator: function (config, pokemon) {
            return { radius: p("metalclaw", "reach", pokemon) + 0.4, geometry: "cone", style: "claw", color: 0xC8CEDA,
                label: config && config.hone === true ? "重爪式" : "金属爪" };
        },
        resolve: function (pokemon, config, world, actor, attributes) {
            const context: NumberContext = { pokemon: pokemon, skill: skills["metalclaw"], detail: { values: config },
                world: world || null, actor: actor || null, attributes: attributes };
            return {
                prepare: Math.round(p("metalclaw", "tempo", context)),
                recover: Math.round(p("metalclaw", "aftercast", context)),
                cooldown: Math.round(p("metalclaw", "recharge", context)),
                active: 0,
                // 目标选择按身体外缘多算 0.4 格身体余量；实际爪迹仍是 reach。
                range: p("metalclaw", "reach", context) + 0.4
            };
        },
        windup: function (action, config, prepare) {
            action.present("world_combat:move_metalclaw:windup", metalclawScene, 1, action.origin(),
                JSON.stringify({ moment: "windup", hone: config && config.hone === true, windup: prepare }));
            return prepare;
        },
        execute: function (action, move, config, done) {
            const world = action.world();
            const actor = action.actor();
            const body = world.observe(actor);
            if (body === null) { done(action); return; }
            const reach = p("metalclaw", "reach", action);
            const radius = p("metalclaw", "radius", action);
            const power = p("metalclaw", "rake", action);
            const chance = Math.max(0.02, Math.min(0.9, p("metalclaw", "sharpenChance", action)));
            const cap = Math.max(1, Math.round(p("metalclaw", "sharpenStages", action)));
            const knock = p("metalclaw", "knock", action);
            const sparks = Math.max(6, Math.round(p("metalclaw", "sparks", action)));
            const gap = Math.max(2, Math.round(p("metalclaw", "gap", action)));
            const hone = !!(config && config.hone === true);
            const direction = aim(action);
            const scale = Math.max(0.6, Math.min(2.0, radius / 0.5));
            const intensity = Math.max(0.5, Math.min(2.4, power / 55));
            let landed = 0, gained = 0, settled = false;

            function finish(current: CombatAction): void {
                if (settled) return;
                settled = true;
                if (landed === 0) {
                    const scope = current.world(), self = scope.observe(actor);
                    const from = self === null ? current.origin() : self.position();
                    WorldFeedback.emit(scope, metalclawScene, 1, from.plus(direction.scale(reach * 0.6)),
                        { moment: "miss", sparks: Math.round(sparks * 0.5), scale: scale }, 18);
                    WorldFeedback.text(scope, from.plus(WorldCombat.point(0, 1.0, 0)), metalclawMissText, [], 20);
                }
                done(current);
            }

            /** 劈中后的磨利掷骰：每记各掷一次，整次施放共享 cap；按有效物攻实际增量播，满级或被拒不留成功回执。 */
            function sharpen(current: CombatAction, point: CombatPoint, index: number): void {
                if (gained >= cap) return;
                const scope = current.world();
                if (scope.random() >= chance) return;
                const delta = NativeEffects.boost(scope, actor, "atk", 1);
                if (delta <= 0) return;
                gained += delta;
                // 磨利只在实际涨了物攻的那一记、贴判定位置闪一下爪尖。
                WorldFeedback.emit(scope, metalclawScene, 1, point,
                    { moment: "sharpen", target: String(actor.ref()), side: index, stages: gained, scale: scale, intensity: intensity }, 26);
                const self = scope.observe(actor);
                const at = self === null ? point : self.position();
                WorldFeedback.text(scope, at.plus(WorldCombat.point(0, self === null ? 1.5 : self.height() + 0.1, 0)),
                    metalclawSharpenText, [gained], 28);
                sound(current, "minecraft:block.anvil.land");
            }

            function rake(current: CombatAction, index: number, towards: CombatPoint): void {
                const scope = current.world();
                const self = scope.observe(actor);
                if (self === null) { finish(current); return; }
                const from = self.position(), to = from.plus(towards.scale(reach));
                const trace = current.trace(from, to, radius, true);
                const contact = trace.position();
                const lander = trace.hitEntity() ? trace.target() : null;
                const victim = lander !== null && scope.valid(lander) && !scope.friendly(lander) ? lander : null;
                // 爪迹直接用判定那条线的真实 from→首碰点，画到哪就判到哪。
                WorldFeedback.emit(scope, metalclawScene, 1, from,
                    { moment: "rake", side: index, sparks: sparks, scale: scale, intensity: intensity,
                      path: [metalclawVertex(from), metalclawVertex(contact)] }, 16);
                sound(current, "minecraft:entity.player.attack.sweep");
                if (victim !== null) {
                    const landedHit = impact(current, trace, "metalclaw", power,
                        { damage: damageSpec("metalclaw", "rake"), contact: true });
                    if (landedHit) {
                        landed++;
                        if (scope.valid(victim)) {
                            // 推距沿实际 trace 方向（身体中心→首碰点），而不是预设的准心方向。
                            const push = contact.minus(from);
                            scope.hitDisplace(victim, (push.length() < 1e-4 ? towards : push.unit()).scale(knock));
                        }
                        WorldFeedback.emit(scope, metalclawScene, 1, contact,
                            { moment: "hit", target: String(victim.ref()), side: index, sparks: sparks, scale: scale, intensity: intensity }, 20);
                        if (index === 0 || landed === 1)
                            WorldFeedback.text(scope, contact.plus(WorldCombat.point(0, 1.1, 0)), metalclawHitText, [], 22);
                        sound(current, "cobblemon:impact.steel");
                        sharpen(current, contact, index);
                    }
                }
                if (!hone && index === 0) {
                    current.after(gap, function (next: CombatAction) { rake(next, 1, metalclawAim(next, towards)); });
                    return;
                }
                finish(current);
            }

            rake(action, 0, direction);
        }
    });
}
